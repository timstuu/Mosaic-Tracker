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

/** Current date (YYYY-MM-DD) in the Europe/Berlin timezone. */
function berlinToday(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
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
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
    if (!vapidPublic || !vapidPrivate) {
      throw new Error('VAPID keys are not configured')
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const today = berlinToday()

    // 1. Due reminders (service role bypasses RLS → all users).
    const { data: dueItems, error: dueErr } = await supabase
      .from('media_items')
      .select('id, user_id, title, reminder_message')
      .eq('reminder_date', today)
      .is('reminder_sent_at', null)
    if (dueErr) throw dueErr

    if (!dueItems || dueItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0, date: today }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Load subscriptions for the affected users in one query.
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
    const deadSubscriptionIds: string[] = []
    const sentItemIds: string[] = []

    // 3. Send a notification per due item to each of the user's devices.
    for (const item of dueItems) {
      const userSubs = subsByUser.get(item.user_id) || []
      const payload = JSON.stringify({
        title: 'Mosaic Reminder',
        body: item.reminder_message || item.title,
        url: '/Mosaic-Tracker/',
        tag: `reminder-${item.id}`,
      })

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          sent++
        } catch (err: any) {
          const status = err?.statusCode
          if (status === 404 || status === 410) {
            deadSubscriptionIds.push(sub.id)
          } else {
            console.error('Push send failed:', status, err?.body || err?.message)
          }
        }
      }
      sentItemIds.push(item.id)
    }

    // 4. Mark items as sent (date-bound, so they won't fire again) and prune dead subs.
    if (sentItemIds.length > 0) {
      await supabase
        .from('media_items')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', sentItemIds)
    }
    if (deadSubscriptionIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', deadSubscriptionIds)
    }

    return new Response(
      JSON.stringify({
        processed: dueItems.length,
        sent,
        prunedSubscriptions: deadSubscriptionIds.length,
        date: today,
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
