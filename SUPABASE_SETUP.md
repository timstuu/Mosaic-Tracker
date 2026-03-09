# Supabase Setup

To use this application with Supabase, you need to create two tables in your Supabase project:

## 1. `media_items` Table

```sql
create table media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  title text not null,
  type text not null,
  status text not null,
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

-- Create policies for multi-user support
create policy "Users can view their own media" on media_items
  for select using (auth.uid() = user_id);

create policy "Users can insert their own media" on media_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own media" on media_items
  for update using (auth.uid() = user_id);

create policy "Users can delete their own media" on media_items
  for delete using (auth.uid() = user_id);
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

-- Create policies for multi-user support
create policy "Users can view their own challenges" on challenges
  for select using (auth.uid() = user_id);

create policy "Users can insert their own challenges" on challenges
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own challenges" on challenges
  for update using (auth.uid() = user_id);

create policy "Users can delete their own challenges" on challenges
  for delete using (auth.uid() = user_id);
```

## Environment Variables

Add the following to your environment variables in AI Studio and your local `.env` file:

- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase project anonymous key.

## IGDB Game Covers

The game cover fetching was previously handled by a local Express proxy. To restore this functionality in your PWA:
1. Create a Supabase Edge Function that calls the IGDB API.
2. Store your IGDB Client ID and Secret in Supabase Secrets.
3. Update `src/services/gameService.ts` to call your Edge Function.

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
3.  **Enable Pages**:
    -   Go to **Settings > Pages**.
    -   Under **Build and deployment > Source**, select **GitHub Actions**.
4.  **Base Path**:
    -   If your repository is NOT at the root (e.g., `https://<username>.github.io/mosaic-tracker/`), you MUST uncomment the `base: '/mosaic-tracker/'` line in `vite.config.ts` and replace `mosaic-tracker` with your repository name.
5.  **Deploy**: Push a change to the `main` branch, and the GitHub Action will automatically build and deploy your app.
