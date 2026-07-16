# Daily Tracker

A personal daily work-log for the VisiLean team. Record what you worked on each
day (with GitHub/Jira tickets and time), review your history grouped by day, and
export a branded report to send to your manager.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**, with a
**Supabase** (Postgres + Auth + RLS) backend and a zero-setup **local mock mode**
so you can run it instantly.

---

## Features

- Email/password auth (sign up, sign in, forgot/reset password), protected routes.
- Two-pane dashboard: scrollable day-grouped history + a pinned log panel.
- Day navigator (arrows, Today, date picker, `←/→` keys) driving header stats
  (entries today, hours logged, day streak).
- Entry form: task, category (7 colour-coded types), ticket # + URL, hours/minutes,
  status toggle. `⌘/Ctrl + Enter` to save.
- Safe ticket links: sanitised URLs open in a new tab; number-only shows a plain pill.
- Filters (date / category / ticket) with a live count, empty/loading/error states,
  optimistic add/edit/delete, toasts, confirm dialogs.
- Copy-day plain-text summary for standups.
- Export: Today / **This week (default)** / This month / Custom + category filter,
  on-screen preview, **PDF** and **CSV** download, and **Send to manager** (Resend, or
  a download + `mailto:` fallback).
- Responsive (360px → desktop), keyboard-navigable, visible focus rings, dark mode,
  respects `prefers-reduced-motion`.

---

## Data modes

The app talks to two typed interfaces (`AuthProvider`, `DataRepository`) chosen by a
single env var:

| `NEXT_PUBLIC_DATA_MODE` | Auth | Data | Email |
|---|---|---|---|
| `mock` (default) | localStorage, fake accounts | localStorage, seeded demo data | download + `mailto:` |
| `supabase` | Supabase Auth (verify + reset) | Postgres + RLS | Resend if configured, else fallback |

**Mock mode is the default** — `npm install && npm run dev` just works, no backend.
A demo account is pre-seeded: **`demo@visilean.com` / `demo1234`** (the login screen
can fill it for you).

---

## Prerequisites

- Node.js 18.18+ (or 20+)
- npm

## Run locally (mock mode — no setup)

```bash
npm install
npm run dev
# open http://localhost:3000  → sign in with the demo account, or sign up
```

## Run against Supabase (real accounts + hosted data)

1. **Create a Supabase project** at <https://supabase.com>.
2. **Run the migration**: open the SQL editor and paste
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (creates tables, enums, indexes, the profile trigger, and RLS policies), then run it.
3. **Configure env**: copy `.env.example` to `.env.local` and set:
   ```bash
   NEXT_PUBLIC_DATA_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=...            # Project settings → API
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # Project settings → API (anon public)
   SUPABASE_SERVICE_ROLE_KEY=...           # server only — keep secret
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. In Supabase **Authentication → URL Configuration**, add
   `http://localhost:3000/login` and `.../reset-password` as redirect URLs (and your
   production URLs later).
5. `npm run dev`.

### Optional: real "Send to manager" email (Resend)

Without these, the app downloads the PDF and opens a pre-filled `mailto:` draft.

```bash
RESEND_API_KEY=re_...
EMAIL_FROM="Daily Tracker <you@your-verified-domain>"
```

Get a key at <https://resend.com> and verify a sending domain (or use
`onboarding@resend.dev` for testing). Set a **manager email** on the Settings page.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest unit tests (time/date/streak/url/csv/entries/mock repo/password) |

---

## Deploy to Vercel

1. Push this folder to a Git repo.
2. Import it at <https://vercel.com/new>.
3. Add the environment variables from step 3 above (and Resend vars if using email) in
   **Project → Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to your
   production URL and add that URL to Supabase's redirect list.
4. Deploy. Vercel auto-detects Next.js — no extra config.

> You can also deploy in **mock mode** for a public demo (set `NEXT_PUBLIC_DATA_MODE`
> unset or `mock`), but note mock data lives in each visitor's browser only.

---

## Project structure

```
app/
  (app)/           protected route group — layout with header + auth guard
    dashboard/     two-pane tracker
    export/        export & send-to-manager
    settings/      profile + manager email
  api/send-report/ Resend relay (501 when unconfigured → client falls back)
  login/ signup/ forgot-password/ reset-password/
components/        brand, ui primitives, dashboard, export
hooks/useEntries   repository-backed CRUD with optimistic updates
lib/
  auth/            AuthProvider (mock + supabase), mock auth, password strength
  data/            DataRepository interface + mock & supabase impls + seed
  export/          csv, pdf, report model, day summary, email client, ranges
  format/          date, time, streak (pure, unit-tested)
  security/        url sanitiser, html/csv escaping
  supabase/        browser / server / admin clients
supabase/migrations/  schema + enums + indexes + RLS
```

---

## Security notes

- In supabase mode, **RLS is the real access gate** (`user_id = auth.uid()`); the UI
  filters are secondary. The service-role key is used only server-side.
- Ticket URLs are sanitised (http/https only; `javascript:`/`data:` rejected) before
  becoming links; export builders escape all user content.
- The email relay requires a valid Supabase session in supabase mode and is a no-op
  (501) unless Resend is configured.

## License

Internal VisiLean tool.
