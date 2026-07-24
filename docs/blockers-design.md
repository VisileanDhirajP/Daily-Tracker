# Blockers — Design Spec

_Date: 2026-07-24 · Status: approved for planning · App: `daily-tracker`_

## 1. Goal

Let a person record that **something outside their control is stopping a task from progressing or finishing** — waiting on a PR review, a decision/info from someone, a blocking ticket, or access/env being down — track it until it clears, and let their manager see it so it can actually get removed.

## 2. What a blocker _is_ here (and is not)

A blocker is a first-class item you own, with an **open → resolved** lifecycle, living **independently of any single day's entry** (it can span days). It carries a reason, optionally who/what you're waiting on, and optionally a ticket link.

It is **not** the existing `"On hold"` entry status. `"On hold"` means _"I paused this deliberately."_ A blocker means _"an external thing is stopping me."_ They are different dimensions and can co-exist (an `In progress` task can have an open blocker). **We keep `"On hold"` exactly as-is — no enum rename, no auto-status-change when a blocker is raised.**

## 3. Settled decisions

| Fork | Decision |
|---|---|
| Depth | **Tracked item with lifecycle** (new table), not a flag on an entry |
| Attachment | **Standalone**, owned by the user, with **optional** ticket link + **optional** free-text "waiting on"; raisable _from_ a task (prefilled) but not bound to it |
| Primary surface | **Dashboard right-rail card** + inline ⚠ flag on matching tasks; no new nav route |
| Manager visibility | **Yes** — managers see reports' **open** blockers, **read-only**, in the existing team feed |
| `"On hold"` status | **Unchanged**; blockers are a separate dimension |
| v1 scope cut | **Insights charts + PDF-export section deferred** to v2 |

## 4. Data model

### 4.1 Types — `lib/types.ts`

```ts
export type BlockerStatus = "open" | "resolved";

export interface Blocker {
  id: string;
  user_id: string;
  reason: string;              // required, short
  waiting_on: string | null;   // who/what — "Alex", "DevOps", "VS-9999"
  ticket_number: string | null;
  ticket_url: string | null;
  status: BlockerStatus;
  created_at: string;          // drives aging while open
  resolved_at: string | null;  // set on resolve → "was blocked 6d"
  updated_at: string;
}

/** Create/update payload (server fields omitted). */
export interface BlockerInput {
  reason: string;
  waiting_on: string | null;
  ticket_number: string | null;
  ticket_url: string | null;
}

/** A blocker enriched with its author, for the manager team feed. */
export interface TeamBlockerRow extends Blocker {
  employee: { id: string; full_name: string; email: string };
}
```

### 4.2 Migration — `supabase/migrations/0008_blockers.sql`

Mirrors the `entries` table conventions (0001) and the manager-access RLS (0003). Reuses the existing `public.set_updated_at()` trigger fn and `public.current_user_role()` helper.

```sql
-- enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'blocker_status') then
    create type blocker_status as enum ('open', 'resolved');
  end if;
end$$;

-- table
create table if not exists public.blockers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  reason        text not null,
  waiting_on    text,
  ticket_number text,
  ticket_url    text,
  status        blocker_status not null default 'open',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists blockers_user_status_idx
  on public.blockers (user_id, status, created_at desc);

-- updated_at (reuse the shared fn from 0001)
drop trigger if exists blockers_set_updated_at on public.blockers;
create trigger blockers_set_updated_at
  before update on public.blockers
  for each row execute function public.set_updated_at();

alter table public.blockers enable row level security;

-- owner: full CRUD
drop policy if exists "blockers_select_own" on public.blockers;
create policy "blockers_select_own" on public.blockers
  for select using (auth.uid() = user_id);
drop policy if exists "blockers_insert_own" on public.blockers;
create policy "blockers_insert_own" on public.blockers
  for insert with check (auth.uid() = user_id);
drop policy if exists "blockers_update_own" on public.blockers;
create policy "blockers_update_own" on public.blockers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "blockers_delete_own" on public.blockers;
create policy "blockers_delete_own" on public.blockers
  for delete using (auth.uid() = user_id);

-- manager: SELECT team members' blockers (read-only)
drop policy if exists "blockers_select_team" on public.blockers;
create policy "blockers_select_team" on public.blockers
  for select using (
    public.current_user_role() in ('manager', 'admin')
    and exists (
      select 1 from public.profiles emp
      where emp.id = blockers.user_id
        and lower(auth.jwt() ->> 'email') = any (
          select lower(e) from unnest(emp.manager_emails) as e
        )
    )
  );

-- admin: SELECT all
drop policy if exists "blockers_select_admin" on public.blockers;
create policy "blockers_select_admin" on public.blockers
  for select using (public.current_user_role() = 'admin');
```

> **User action:** run this once in the Supabase SQL editor before supabase-mode uses blockers. Mock mode needs nothing.

## 5. Repository layer

### 5.1 Interface — `lib/data/repository.ts`

```ts
// Blockers (impediment tracking)
listBlockers(userId: string): Promise<Blocker[]>;
createBlocker(userId: string, input: BlockerInput): Promise<Blocker>;
updateBlocker(userId: string, id: string, patch: Partial<BlockerInput>): Promise<Blocker>;
/** Resolve/reopen; stamps or clears resolved_at. */
setBlockerStatus(userId: string, id: string, status: BlockerStatus): Promise<Blocker>;
deleteBlocker(userId: string, id: string): Promise<void>;
/** Open blockers of the manager's team, each tagged with its author. */
listTeamBlockers(manager: AuthUser): Promise<TeamBlockerRow[]>;
```

### 5.2 Mock — `lib/data/mockRepository.ts`

- Key `vldt:blockers:<uid>` (matches `vldt:entries:<uid>`), `load/save` helpers, `newId()`, `isoNow()`.
- `setBlockerStatus`: `resolved` → set `resolved_at = isoNow()`; `open` → `resolved_at = null`.
- `listTeamBlockers`: same team-resolution as `listTeamEntries` (admin sees all; manager matches `manager_emails`), then keep only `status === "open"`, enrich with `employee`, sort **oldest-first** (`created_at` asc).

### 5.3 Supabase — `lib/data/supabaseRepository.ts`

- Columns are already snake_case = the TS field names, so rows map 1:1 (same as entries).
- `listBlockers`: `.eq("user_id", userId).order("created_at", { ascending: false })`.
- `listTeamBlockers`: select blockers joined to `profiles` (mirror `listTeamEntries`), `.eq("status","open").order("created_at", { ascending: true })`; RLS narrows rows to the team.

## 6. Derivations & utils — `lib/blockers.ts`

Pure, node-testable helpers (no React):

```ts
blockerAgeDays(b: Blocker, now?: Date): number         // whole days since created_at
ageLabel(days: number): string                          // "today" | "1d" | "4d"
ageTone(days: number): "muted" | "warn" | "urgent"      // <2 muted · 2–4 warn · ≥5 urgent
sortBlockers(list: Blocker[]): Blocker[]                 // open first, then oldest-first
openBlockers(list: Blocker[]): Blocker[]
blockedTicketSet(open: Blocker[]): Set<string>           // normalized ticket_numbers for the ⚠ flag
matchesEntry(entry: Entry, blockedTickets: Set<string>): boolean  // trimmed, case-insensitive
seedFromEntry(entry: Entry): BlockerInput                // "Blocked: <task>" + ticket copied
toBlockerInput(b: Blocker): BlockerInput
```

## 7. Hook — `hooks/useBlockers.ts`

Same shape/discipline as `useEntries`: optimistic add/edit/resolve/delete with a `blockersRef` mirror and per-row rollback; `loading`/`error`.

```ts
interface UseBlockersResult {
  blockers: Blocker[];
  open: Blocker[];               // derived, sorted
  oldestOpenAgeDays: number;     // 0 when none
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addBlocker: (input: BlockerInput) => Promise<void>;
  editBlocker: (id: string, patch: Partial<BlockerInput>) => Promise<void>;
  resolveBlocker: (id: string) => Promise<void>;
  reopenBlocker: (id: string) => Promise<void>;
  removeBlocker: (id: string) => Promise<void>;
}
```

## 8. UI

### 8.1 `BlockersCard` (right rail) — `components/dashboard/BlockersCard.tsx`
- Header: **Blockers** + count (`"2 open"`); "Add" button.
- Open list (sorted): each row = reason · optional waiting-on chip · optional clickable ticket pill · **aging badge** (`ageTone` → muted/gold/orange) · Resolve (✓) · overflow (Edit / Delete).
- Collapsed **"Resolved (N)"** disclosure showing the few most-recent resolved (Reopen / Delete).
- Empty state when nothing open: _"Nothing blocking you 🎉"_.
- `data-test-id`: `blockers-card`, `blockers-add`, `blocker-item` (prefix), `blocker-resolve`, `blocker-menu`, `blocker-edit`, `blocker-delete`, `blocker-reopen`, `blockers-show-resolved`.

### 8.2 `BlockerForm` dialog — `components/dashboard/BlockerForm.tsx`
- Fields: **Reason** (textarea, required), **Waiting on** (input), **Ticket #** (input), **Ticket URL** (input, reuses `isValidUrl` + the same invalid-URL hint as `EntryForm`).
- Reuses `DIALOG_MOTION`; ⌘/Ctrl+Enter to save.
- Handles both create and edit; accepts an optional `seed: Partial<BlockerInput>` (for raise-from-task).
- `data-test-id`: `blocker-form`, `blocker-reason`, `blocker-waiting-on`, `blocker-ticket-number`, `blocker-ticket-url`, `blocker-submit`, `blocker-cancel`.

### 8.3 Inline ⚠ flag on tasks — `EntryCard.tsx` / `EntryRow.tsx`
- Small amber **"Blocked"** marker (tooltip = the blocker's reason) shown when the entry's `ticket_number` is in `blockedTicketSet(open)`.
- Blockers with no ticket simply don't flag a task — they live only in the rail card.
- `data-test-id`: `entry-blocked-flag`.

### 8.4 Raise from a task
- Entry overflow menu gains **"Raise blocker"** (`data-test-id="entry-raise-blocker"`) → dispatches an app command that opens `BlockerForm` seeded via `seedFromEntry(entry)`.

### 8.5 Command palette + command bus
- `lib/commands.ts`: add `{ type: "new-blocker"; seed?: Partial<BlockerInput> }` to `AppCommand`.
- Palette gains an **"Add blocker"** command that dispatches `{ type: "new-blocker" }`.
- Dashboard `commandRef` handles `new-blocker` by opening `BlockerForm` (with any seed).

### 8.6 Dashboard wiring — `app/(app)/dashboard/page.tsx`
- Mount `useBlockers()`; render `<BlockersCard>` in the rail; pass `blockedTicketSet(open)` down through `EntryList` → `DayGroup` → `EntryCard`/`EntryRow` for the ⚠ flag.
- Add `BlockerForm` dialog state alongside the existing `EntryForm` dialog; pass `loading` for a rail skeleton, consistent with `HeaderStats`/`Filters`.

## 9. Manager team feed — `app/(app)/team/page.tsx`
- A **"Team blockers"** panel at the top: all reports' **open** blockers via `listTeamBlockers`, oldest-first, each naming person · reason · waiting-on · ticket · age. **Read-only** (no resolve/edit controls).
- `data-test-id`: `team-blockers-panel`, `team-blocker-item` (prefix).

## 10. Out of scope (v1) → future
- Insights charts (blockers over time, avg time-to-resolve).
- "Open blockers" section in the manager **PDF** (pairs well with send-to-manager; easy v2).
- Per-blocker manager opt-in sharing (we chose always-visible-to-manager).
- Comments/threads, reminders/notifications when blocked > N days, linking a blocker to a specific entry id.

## 11. Testing
- **`lib/tests/blockers.test.ts`** — pure helpers (aging thresholds, sort order, ticket normalization/match, `seedFromEntry`). Node env; no jsdom.
- **`lib/data/tests/mockRepository.test.ts`** — extend for create/update/resolve/reopen/delete + `listTeamBlockers` team-scoping and open-only filter.
- **`hooks/tests/useBlockers.test.tsx`** — optimistic + rollback (CI-runnable; local jsdom is blocked).
- Component smoke tests for `BlockersCard`/`BlockerForm` where the local jsdom limitation allows.

## 12. File-by-file change list

**New**
- `supabase/migrations/0008_blockers.sql`
- `lib/blockers.ts` (+ `lib/tests/blockers.test.ts`)
- `hooks/useBlockers.ts` (+ `hooks/tests/useBlockers.test.tsx`)
- `components/dashboard/BlockersCard.tsx`
- `components/dashboard/BlockerForm.tsx`

**Modified**
- `lib/types.ts` — `Blocker`, `BlockerInput`, `BlockerStatus`, `TeamBlockerRow`
- `lib/data/repository.ts` — 6 interface methods
- `lib/data/mockRepository.ts` — impl + `vldt:blockers:<uid>`
- `lib/data/supabaseRepository.ts` — impl
- `lib/data/tests/mockRepository.test.ts` — coverage
- `lib/commands.ts` — `new-blocker` command
- `components/dashboard/EntryCard.tsx`, `EntryRow.tsx` — ⚠ flag + "Raise blocker"
- `app/(app)/dashboard/page.tsx` — hook, rail card, dialog, flag plumbing, palette handler
- `components/CommandPalette.tsx` — "Add blocker" command
- `app/(app)/team/page.tsx` — "Team blockers" panel

## 13. Open questions
None blocking.
