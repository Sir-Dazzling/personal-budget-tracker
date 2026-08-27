# Split — Combined Naira Budget Tracker

Shared monthly budget and expense tracker for two people (you + your brother). Currency is **₦ NGN**. Works as a web app and installable PWA on Mac and iPhone.

## Features

- Monthly combined budget with remaining / warning / over states
- Fast expense entry (amount, category, who spent, date)
- History by month with category & person breakdowns
- Dashboard: spend over time, category pie, person split, budget pace, behaviour cards
- Local mode out of the box; optional Supabase cloud sync for both phones

## Quick start (local mode)

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Sign up with any email (no password in local mode), create a household, set your budget, and start logging.

Add to Home Screen on iPhone (Safari → Share → Add to Home Screen) after you deploy.

## Cloud sync (you + brother on different devices)

1. Create a free project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql)
3. Enable Email auth in Authentication → Providers
4. Copy Project URL and anon key into `.env`:

```bash
cp .env.example .env
# edit VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

5. Restart `npm run dev`
6. One person creates the household and shares the **join code** (shown in the header) with the other

## Deploy

```bash
npm run build
```

Deploy the `dist/` folder to [Vercel](https://vercel.com), Netlify, or any static host. Set the same `VITE_SUPABASE_*` env vars in the host dashboard for cloud mode.

```bash
# Example with Vercel CLI
npx vercel --prod
```

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Local development    |
| `npm run build`| Production build     |
| `npm run preview` | Preview production |

## Stack

Vite · React · TypeScript · Recharts · Supabase (optional) · vite-plugin-pwa
