# Supabase Setup

To use this application with Supabase, you need to create two tables in your Supabase project:

## 1. `media_items` Table

```sql
create table media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  title text not null,
  type text not null,
  rating integer default 0,
  "dateAdded" timestamp with time zone default now(),
  "dateCompleted" timestamp with time zone,
  "watchDate" text,
  "startDate" text,
  "endDate" text,
  platform text,
  console text,
  link text,
  notes text,
  "imageUrl" text,
  tags text,
  isbn text
);

-- Enable Row Level Security (RLS)
alter table media_items enable row level security;

-- Create index for user_id to resolve unindexed foreign key and optimize queries
create index media_items_user_id_idx on media_items(user_id);

-- Create policies for multi-user support
create policy "Users can view their own media" on media_items
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own media" on media_items
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own media" on media_items
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own media" on media_items
  for delete using ((select auth.uid()) = user_id);
```

## 2. `challenges` Table

```sql
create table challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  "mediaType" text not null,
  "targetCount" integer not null,
  "startDate" text not null,
  "endDate" text not null,
  "dateCreated" timestamp with time zone default now()
);

-- Enable RLS
alter table challenges enable row level security;

-- Create index for user_id to resolve unindexed foreign key and optimize queries
create index challenges_user_id_idx on challenges(user_id);

-- Create policies for multi-user support
create policy "Users can view their own challenges" on challenges
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own challenges" on challenges
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own challenges" on challenges
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own challenges" on challenges
  for delete using ((select auth.uid()) = user_id);
```

## 3. `friendships` Table

```sql
create table friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  friend_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now(),
  constraint friendships_user_friend_unique unique (user_id, friend_id)
);

-- Enable RLS
alter table friendships enable row level security;

-- Create indexes to resolve unindexed foreign keys and optimize query joins.
-- NOTE: only friend_id is indexed on purpose. A separate friendships_user_id_idx
-- would be redundant, because lookups by user_id are already served efficiently by
-- the leading column of the composite unique key (user_id, friend_id) — the extra
-- index would only add write overhead.
create index friendships_friend_id_idx on friendships(friend_id);

-- Create policies for multi-user support
create policy "Users can view their own friendships" on friendships
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own friendships" on friendships
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can delete their own friendships" on friendships
  for delete using ((select auth.uid()) = user_id);
```

## 4. Reminders & Web Push

Reminders let a user pick a day **and time** per entry and receive a real push
notification then — even when the app is closed. Delivery is driven by a recurring
`pg_cron` job that calls the `send-reminders` Edge Function.

### A. `media_items` reminder columns

```sql
alter table media_items
  add column if not exists reminder_date date,
  add column if not exists reminder_time time,
  add column if not exists reminder_message text,
  add column if not exists reminder_sent_at timestamptz;

-- Partial index: the cron only scans not-yet-sent reminders.
create index if not exists media_items_reminder_idx
  on media_items (reminder_date) where reminder_sent_at is null;
```

`reminder_time` is intentionally **nullable**: NULL means "the user picked a date but
no particular time", which `send-reminders` resolves to the **09:00** default. Storing
NULL rather than a literal `09:00` keeps that intent visible and lets the default be
changed later in one place. Rows created before this column existed simply read as NULL
and therefore keep behaving as 09:00 reminders.

### B. `push_subscriptions` table

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now()
);

alter table push_subscriptions enable row level security;

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

create policy "Users can view their own subscriptions" on push_subscriptions
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own subscriptions" on push_subscriptions
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own subscriptions" on push_subscriptions
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own subscriptions" on push_subscriptions
  for delete using ((select auth.uid()) = user_id);
```

The `send-reminders` Edge Function uses the **service-role key** and therefore
bypasses RLS to read all users' due reminders and subscriptions.

### C. VAPID keys & Edge Function secrets

1. Generate a key pair once: `npx web-push generate-vapid-keys`.
2. Public key → client env `VITE_VAPID_PUBLIC_KEY` (safe to expose; add it to your
   `.env`, `.env.example`, and the GitHub Actions build secrets in `deploy.yml`).
3. Store the private key and a shared cron secret in Supabase function secrets:
   ```bash
   supabase secrets set \
     VAPID_PUBLIC_KEY=<public> \
     VAPID_PRIVATE_KEY=<private> \
     VAPID_SUBJECT=mailto:you@example.com \
     CRON_SECRET=<a-long-random-string>
   ```
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

   `VAPID_SUBJECT` must be a URL — keep the `mailto:` prefix. A bare email address
   is rejected by `web-push` at send time; the function normalises it defensively,
   but setting it correctly is clearer.
4. Deploy the function: `supabase functions deploy send-reminders`.

> [!WARNING]
> **JWT verification must be off for this function.** Edge Functions require an
> `Authorization` header by default, but `pg_cron`/`pg_net` cannot present a Supabase
> JWT. With the default setting every scheduled run is rejected by the gateway with
> `UNAUTHORIZED_NO_AUTH_HEADER` **before the function code runs** — no error surfaces
> in the app, reminders simply never arrive.
>
> `supabase/config.toml` therefore contains:
> ```toml
> [functions.send-reminders]
> verify_jwt = false
> ```
> If your CLI ignores that, deploy explicitly with
> `supabase functions deploy send-reminders --no-verify-jwt`.
>
> The endpoint is then publicly reachable and guarded solely by the `x-cron-secret`
> header the function checks itself, so **use a long, random `CRON_SECRET`**.

### D. Scheduler (pg_cron + pg_net)

Because reminders can be set to any time of day, the job runs **every 15 minutes**
rather than once daily. The function resolves the current wall-clock time in
Europe/Berlin itself, so DST needs no special handling. 15 minutes is also the
delivery granularity: a reminder set for 09:00 arrives between 09:00 and 09:15.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('send-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    )
  );
$$);
```

> [!IMPORTANT]
> **Upgrading from the daily job:** the earlier setup registered a once-a-day job
> called `send-reminders-daily`. Remove it first, otherwise it keeps running
> alongside the new one:
> ```sql
> select cron.unschedule('send-reminders-daily');
> ```

Inspect scheduled runs via `select * from cron.job_run_details order by start_time desc;`,
and the registered jobs via `select * from cron.job;`.

### E. iOS note

Web Push on iOS only works when the PWA has been added to the Home Screen and
notification permission was granted from inside the installed app (via the
"Enable Notifications" button in Settings). A normal Safari tab will not deliver.

## Environment Variables

Add the following to your environment variables in AI Studio and your local `.env` file:

- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase project anonymous key.
- `VITE_VAPID_PUBLIC_KEY`: Web Push VAPID public key (see "Reminders & Web Push").

## IGDB Game Covers

The game cover fetching was previously handled by a local Express proxy. To restore this functionality in your PWA:
1. Create a Supabase Edge Function that calls the IGDB API.
2. Store your IGDB Client ID and Secret in Supabase Secrets.
3. Update `src/services/gameService.ts` to call your Edge Function.

## Synopsis / Summary

The "Get summary" feature (genres + synopsis) is generated entirely from free metadata APIs you already use — no LLM, no API costs, no extra setup:
- Movies/Shows/Documentaries: TMDB (`fetchMediaSynopsis` in `src/services/tmdbService.ts`)
- Games: RAWG (`fetchGameSynopsis` in `src/services/gameService.ts`)
- Books: Open Library (`fetchBookSynopsis` in `src/services/bookService.ts`)

These call the same public APIs already used for search/covers and run client-side, so they work identically in local dev and on GitHub Pages.

## PWA Icons

The manifest in `vite.config.ts` expects icons at `public/pwa-192x192.png` and `public/pwa-512x512.png`. Please ensure these files exist in your `public` folder for the PWA to be fully functional.

## GitHub Pages Hosting

To host your Mosaic Tracker on GitHub Pages:

1.  **Create a Repository**: Push this code to a new GitHub repository.
2.  **Configure GitHub Actions**:
    -   Go to your repository **Settings > Secrets and variables > Actions**.
    -   Add the following **Repository secrets**:
        -   `VITE_SUPABASE_URL`: Your Supabase project URL.
        -   `VITE_SUPABASE_ANON_KEY`: Your Supabase project anonymous key.
        -   `VITE_TMDB_API_KEY`: Your TMDB API key (optional).
        -   `VITE_RAWG_API_KEY`: Your RAWG API key (optional, needed for game covers and "Get summary" on games).
3.  **Enable Pages**:
    -   Go to **Settings > Pages**.
    -   Under **Build and deployment > Source**, select **GitHub Actions**.
4.  **Base Path**:
    -   If your repository is NOT at the root (e.g., `https://<username>.github.io/mosaic-tracker/`), you MUST uncomment the `base: '/mosaic-tracker/'` line in `vite.config.ts` and replace `mosaic-tracker` with your repository name.
5.  **Deploy**: Push a change to the `main` branch, and the GitHub Action will automatically build and deploy your app.
