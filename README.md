# 🎥 Mosaic Tracker

> A minimalist, high-performance PWA media tracking application for Movies, Series, Books, and Games. Powered by React, Vite, Tailwind CSS v4, and Supabase.

---

<div align="center">
  <p align="center">
    <b>🎨 Sleek Aesthetics</b> • <b>📊 Rich Analytics</b> • <b>👥 Friends Feed</b> • <b>📱 PWA Support</b>
  </p>
</div>

---

## ✨ Features

*   **🎥 Movies & Shows** – Look up posters and details using *The Movie Database (TMDB)* integration.
*   **📚 Books** – Find metadata through *Google Books* or *Open Library*, and scan physical barcodes using your camera.
*   **🎮 Games** – Search cover arts and track your completion progress (with IGDB integration support).
*   **📊 Analytics** – Interactive charts to visualize your media consumption and trends.
*   **👥 Social Activity Feed** – Add friends, follow their completions, and view their ratings.
*   **🎨 Premium Design** – Atmospheric dark-slate layout with fluid transitions (`motion/react`) and custom backdrop glow blurs.
*   **📶 Offline-First PWA** – Works offline with automatic data synchronization once connection is restored.

---

## 🛠️ Technology Stack

*   **Frontend**: React 19, Vite, TypeScript
*   **Styling**: Tailwind CSS v4
*   **Animations**: Motion (`motion/react`)
*   **Database & Auth**: Supabase (PostgreSQL with RLS policies)
*   **Analytics**: Recharts
*   **Barcode Scanner**: `@zxing/library`

---

## 🚀 Getting Started

### 📋 Prerequisites

*   [Node.js](https://nodejs.org/) (v22 or higher recommended)
*   A [Supabase](https://supabase.com/) project

### ⚙️ Installation & Configuration

1.  **Clone this repository** (or download the files) to your local machine.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Create a `.env` file in the root directory and add the following keys:
    ```env
    # Supabase connection keys (find in your Supabase Dashboard settings)
    VITE_SUPABASE_URL=https://your-project-id.supabase.co
    VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-key

    # Optional metadata api keys
    VITE_TMDB_API_KEY=your-tmdb-api-key
    ```

4.  **Configure Database**:
    Set up your Supabase database schema by running the SQL scripts provided in [SUPABASE_SETUP.md](file:///c:/Users/Buero/Desktop/mosaic-tracker/SUPABASE_SETUP.md).

5.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173/Mosaic-Tracker/` in your browser.

---

## 🔒 Security & Performance

This project uses **Row Level Security (RLS)** in Supabase to ensure user data isolation. RLS policies are optimized with subquery caching to reduce database load:

> [!IMPORTANT]
> The RLS select policy `(select auth.uid()) = user_id` ensures that authenticated users can only access their own entries without running expensive full-table scans.
> 
> Fremdschlüssel (foreign keys) are indexed as described in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to keep query times consistent even with thousands of entries.

### Why the client loads data the way it does

These constraints exist deliberately to keep Supabase load and the DOM small. Please keep them in place when extending the app:

*   **Server-side filtering first** – queries filter by `user_id` in the database (`.eq('user_id', …)`) and select an explicit column list, rather than fetching everything and filtering in React. **When you add a column, remember to add it to the `select(...)` list in `fetchMedia`, or it will silently never load.**
*   **Load limits** – the Tracker only renders completed entries from the **last 6 months** (older ones appear behind "Show older entries"); the Backlog renders the **first 9 entries per media type** behind a "Show more" toggle; the Friends feed uses `.limit(50)` directly in the query.
*   **Double-fetch lock** – `lastFetchedUserIdRef` tracks the current user id so React Strict Mode and rapid tab switches cannot fire duplicate parallel fetches.
*   **Retry engine** – transient network failures (`TypeError` / `Failed to fetch`) are retried up to 2 times with exponential backoff instead of leaving the UI empty.

---

## 📦 Deployment & PWA Build

To build the application for production or host it on GitHub Pages:

1.  **Build production bundle**:
    ```bash
    npm run build
    ```

2.  **Vite PWA Configuration**:
    Vite will automatically generate a service worker (`dist/sw.js`) and precache assets. Ensure your PWA icons exist at `/public/pwa-192x192.png` and `/public/pwa-512x512.png`.

3.  **GitHub Pages Settings**:
    *   If deploying to a subfolder (e.g. `https://<username>.github.io/mosaic-tracker/`), ensure to uncomment/set the base path in `vite.config.ts`.
    *   Setup actions/secrets for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to automate building and deploying via GitHub Actions.
