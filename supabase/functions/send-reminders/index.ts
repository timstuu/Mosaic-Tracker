// Supabase Edge Function: send-reminders
//
// Invoked once per day by pg_cron (via pg_net http_post). Finds media_items whose
// reminder_date is "today" in Europe/Berlin and that have not been sent yet, then
// pushes a Web Push notification to every stored subscription of the owning user.
//
// Secrets required (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

/** Used when an entry has a reminder date but no explicit time. */
const DEFAULT_REMINDER_TIME = '09:00'

/** Current date (YYYY-MM-DD) and wall-clock time (HH:MM) in Europe/Berlin. */
function berlinNow(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // avoids "24:00" for midnight
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/** "HH:MM:SS" | "HH:MM" | null -> "HH:MM", falling back to the default. */
function effectiveTime(raw: unknown): string {
  return raw ? String(raw).slice(0, 5) : DEFAULT_REMINDER_TIME
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the caller (pg_cron sends x-cron-secret).
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    // web-push demands a mailto:/https: URL here. A bare email address is the
    // obvious thing to configure and fails at send time, so normalise it.
    const rawSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
    const vapidSubject = /^(mailto:|https?:)/i.test(rawSubject.trim())
      ? rawSubject.trim()
      : `mailto:${rawSubject.trim()}`
    if (!vapidPublic || !vapidPrivate) {
      throw new Error('VAPID keys are not configured')
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { date: today, time: nowTime } = berlinNow()

    // 1. Reminders scheduled for today that have not gone out yet (service role
    //    bypasses RLS → all users). Restricting to a single day means a reminder
    //    from the past can never be resurrected, however often this runs.
    const { data: todaysItems, error: dueErr } = await supabase
      .from('media_items')
      .select('id, user_id, title, reminder_time, reminder_message')
      .eq('reminder_date', today)
      .is('reminder_sent_at', null)
    if (dueErr) throw dueErr

    // 2. Keep only those whose time has actually arrived. Zero-padded "HH:MM"
    //    compares correctly as a string.
    const dueItems = (todaysItems || []).filter(
      (i) => effectiveTime(i.reminder_time) <= nowTime,
    )

    if (dueItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0, date: today, time: nowTime }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Load subscriptions for the affected users in one query.
    const userIds = [...new Set(dueItems.map((i) => i.user_id))]
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)
    if (subErr) throw subErr

    const subsByUser = new Map<string, typeof subs>()
    for (const s of subs || []) {
      const list = subsByUser.get(s.user_id) || []
      list.push(s)
      subsByUser.set(s.user_id, list)
    }

    let sent = 0
    // A Set, not an array: the same dead subscription is hit once per due item,
    // which would otherwise inflate the pruned count and re-send to a known
    // dead endpoint.
    const deadSubscriptionIds = new Set<string>()
    const sentItemIds: string[] = []

    // 4. Send a notification per due item to each of the user's devices.
    for (const item of dueItems) {
      const userSubs = subsByUser.get(item.user_id) || []
      // iOS already appends "from <PWA name>" to the title, so repeating "Mosaic"
      // here wastes the most prominent line. The entry title is the useful part.
      const payload = JSON.stringify({
        title: item.title,
        body: item.reminder_message || 'Reminder',
        url: '/Mosaic-Tracker/',
        tag: `reminder-${item.id}`,
      })

      for (const sub of userSubs) {
        if (deadSubscriptionIds.has(sub.id)) continue
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          sent++
        } catch (err: any) {
          const status = err?.statusCode
          if (status === 404 || status === 410) {
            deadSubscriptionIds.add(sub.id)
          } else {
            console.error('Push send failed:', status, err?.body || err?.message)
          }
        }
      }
      sentItemIds.push(item.id)
    }

    // 5. Mark items as sent (date-bound, so they won't fire again) and prune dead subs.
    if (sentItemIds.length > 0) {
      await supabase
        .from('media_items')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', sentItemIds)
    }
    if (deadSubscriptionIds.size > 0) {
      await supabase.from('push_subscriptions').delete().in('id', [...deadSubscriptionIds])
    }

    return new Response(
      JSON.stringify({
        processed: dueItems.length,
        sent,
        prunedSubscriptions: deadSubscriptionIds.size,
        date: today,
        time: nowTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
