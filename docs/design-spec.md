# Daily Tracker — Design Spec

**Date:** 2026-07-16
**Status:** Approved

A personal daily work-log tool for the VisiLean team. Each person records what they
worked on each day (alongside GitHub/Jira tickets), reviews history, and exports a
report to send to their manager.

---

## 1. Architecture — dual backend

The app never talks to Supabase directly. It talks to two thin, typed interfaces:

- **`AuthProvider`** (React context): `user`, `session`, `loading`, `signUp`, `signIn`,
  `signOut`, `resetPassword`, `updatePassword`.
- **`DataRepository`**: `listEntries`, `createEntry`, `updateEntry`, `deleteEntry`,
  `getProfile`, `updateProfile`.

A single env flag selects the implementation at module load:

```
NEXT_PUBLIC_DATA_MODE = mock | supabase   # default: mock
```

| Concern | `mock` | `supabase` |
|---|---|---|
| Auth | localStorage session, fake users, no email verify | Supabase Auth (email/password, verify, reset) |
| Data | localStorage, seeded with ~2 weeks of sample entries | Postgres + Row Level Security |
| Email | always mailto/download fallback | Resend if `RESEND_API_KEY` set, else fallback |

`npm install && npm run dev` runs immediately in mock mode. Flip the flag + paste keys
+ run the migration to go real. The full Supabase SQL migration (schema, enums, indexes,
RLS) ships in the repo.

## 2. Rendering / data flow

- Interactive dashboard is a client component tree under a protected layout.
- Auth guard: `middleware.ts` (supabase mode) **and** a client `<RequireAuth>` wrapper
  (works in both modes; mock has no server session).
- State: local React state + a `useEntries` hook wrapping the repository with optimistic
  add/edit/delete. No Redux.

## 3. Data model

**profiles** (1:1 with auth user): `id (uuid)`, `full_name`, `manager_email?`, `created_at`.

**entries**: `id (uuid)`, `user_id (uuid, fk, indexed)`, `entry_date (date)`,
`task (text, required)`, `category (dev|meeting|review|docs|support|planning|other)`,
`ticket_number?`, `ticket_url?`, `minutes (int, default 0)`, `status (done|progress)`,
`created_at`, `updated_at`.

RLS: users select/insert/update/delete only rows where `user_id = auth.uid()`.

## 4. Brand

Blue-led. Never green as brand/primary.

- Primary navy `#123E66`, deep `#0b2c4d`, interactive blue `#2E7CC4`, light blue `#96C0E0`.
- Accent gold `#FCBC36`, orange `#F37E31`. Ink `#132430`, muted `#647587`.
- Canvas `#eef2f8`, card `#fff`, hairline `#e6edf5`.
- Header navy gradient + faint blueprint grid overlay. Ambient blue/gold glows on canvas.
- Cards: white, ~18px radius, hairline border, blue-tinted soft shadow.
- Primary CTA: gold→orange gradient, navy text, soft orange shadow.
- Focus ring: 3px `#2E7CC4`.
- 7 category chip colours (no green) per brief.
- Wordmark: "Daily" in Montserrat Bold + "Tracker" in Poppins, beside a navy
  badge with three ascending bars (light-blue → blue → gold); UI text in Poppins.

## 5. Features

- Two-pane dashboard: left = all entries grouped by day (newest first, per-day header
  with relative label + count + total time, sticky header/filter bar); right = pinned
  log form + day navigator + quick tools. Mobile stacks vertically.
- Header stats for selected day: entry count, hours logged, day streak.
- Day navigator: prev/next arrows, Today button, date picker; ←/→ keyboard.
- Entry form: task (required), category, ticket #, ticket URL, hours+minutes, status
  toggle. `⌘/Ctrl+Enter` submits.
- Ticket pill: link (new tab, `rel=noopener noreferrer`, ↗ icon, hover fill) when valid
  URL; plain pill when number only. URL sanitised (http/https only, `www.`→https, reject
  `javascript:`/`data:`), all user content escaped.
- Entry card: category chip, time chip, ticket pill, status chip, edit/delete. Edit loads
  form + sets day; delete confirms.
- Filters: date (days-with-entries + Today/Yesterday + All), category (used only),
  ticket contains-match, Clear (disabled when inactive), live count line.
- Empty/loading/error states in the app voice.
- Copy day: plain-text bullet list for standups.

## 6. Export & send to manager

Modal: range (Today / This week [default] / This month / Custom), optional category
filter. On-screen preview grouped by day with per-day + grand totals. Download PDF
(branded, `@react-pdf/renderer`) or CSV (client-side). Send to manager: Resend if
configured (PDF attached), else download + pre-filled `mailto:` draft.

## 7. Non-functional

Security (RLS real gate, sanitise/escape input, service key server-only), responsive
(360px→desktop), a11y (keyboard, focus, contrast, aria, reduced-motion), UX polish
(optimistic updates, toasts, confirms, subtle animation), TypeScript throughout.

## 8. Routes

`/` landing/redirect · `/signup` `/login` `/forgot-password` `/reset-password` ·
`/dashboard` (protected) · `/export` (protected) · `/settings` (protected).

## 9. Testing

Unit: streak calc, minutes↔h/m, URL sanitiser, CSV builder, mock repository. UI verified
by running mock-mode app in the browser preview.
