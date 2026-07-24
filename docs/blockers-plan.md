# Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class, trackable "blocker" (open→resolved impediment) to the Daily Tracker, surfaced on the dashboard rail with an inline flag on affected tasks and visible read-only to managers.

**Architecture:** A new `blockers` table owned per-user (independent of entries), reached through the existing `DataRepository` abstraction (mock + Supabase) and an optimistic `useBlockers` hook that mirrors `useEntries`. Pure helpers in `lib/blockers.ts` drive aging/sort/ticket-matching. UI is a right-rail `BlockersCard` + a `Modal`-hosted `BlockerForm`, an inline ⚠ flag threaded through the existing entry list, and a read-only panel on the team page.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Radix UI, Tailwind, Supabase (RLS), Jest + Testing Library.

## Global Constraints

- Design spec: `docs/blockers-design.md` (source of truth).
- `data-test-id` (four hyphens), kebab-case, on every interactive element. Card/Row deliberately **reuse** the same ids (only one renders per entry) — follow that pattern.
- User-facing copy is plain, sentence-case, active voice. No new i18n system (this app has none).
- Keep the existing `"On hold"` entry status untouched — blockers are a separate dimension. No `entry_status` enum change.
- `"use client"` on every component/hook that uses state, effects, or browser APIs.
- Repository methods take an explicit `userId: string` (mock has no session).
- localStorage keys use the `vldt:` prefix.
- Managers get **read-only** access to team blockers; never expose edit/resolve of another user's blocker.
- Commit style: `feat: …` / `test: …`, body ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Only commit when the user has authorized it** — this app's owner commits/pushes on explicit say-so.
- Verify each task: `npm run typecheck` clean for touched files; `npx jest <path>` for tasks with tests.

---

### Task 1: Types + `lib/blockers.ts` pure helpers

**Files:**
- Modify: `lib/types.ts` (append blocker types)
- Create: `lib/blockers.ts`
- Test: `lib/tests/blockers.test.ts`

**Interfaces:**
- Produces: `Blocker`, `BlockerInput`, `BlockerStatus`, `TeamBlockerRow` (types); and helpers `toBlockerInput(b)`, `blockerAgeDays(b, now?)`, `ageLabel(days)`, `ageTone(days): "muted"|"warn"|"urgent"`, `openBlockers(list)`, `sortBlockers(list)`, `blockedTicketMap(list): Map<string,string>`, `entryBlockReason(entry, map): string|null`, `seedFromEntry(entry): BlockerInput`.

- [ ] **Step 1: Add types to `lib/types.ts`**

Append at the end of the file:

```ts
export type BlockerStatus = "open" | "resolved";

export interface Blocker {
  id: string;
  user_id: string;
  reason: string;
  waiting_on: string | null;
  ticket_number: string | null;
  ticket_url: string | null;
  status: BlockerStatus;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

/** Payload for creating/updating a blocker (server fields omitted). */
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

- [ ] **Step 2: Write the failing test `lib/tests/blockers.test.ts`**

```ts
import type { Blocker, Entry } from "../types";
import {
  toBlockerInput,
  blockerAgeDays,
  ageLabel,
  ageTone,
  openBlockers,
  sortBlockers,
  blockedTicketMap,
  entryBlockReason,
  seedFromEntry,
} from "../blockers";

function blocker(over: Partial<Blocker> = {}): Blocker {
  return {
    id: "b1",
    user_id: "u1",
    reason: "Waiting on review",
    waiting_on: null,
    ticket_number: null,
    ticket_url: null,
    status: "open",
    created_at: "2026-07-20T09:00:00.000Z",
    resolved_at: null,
    updated_at: "2026-07-20T09:00:00.000Z",
    ...over,
  };
}

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    user_id: "u1",
    entry_date: "2026-07-24",
    task: "Ship the thing",
    category: "dev",
    ticket_number: "VS-1234",
    ticket_url: null,
    minutes: 60,
    status: "progress",
    created_at: "2026-07-24T09:00:00.000Z",
    updated_at: "2026-07-24T09:00:00.000Z",
    ...over,
  };
}

const NOW = new Date("2026-07-24T09:00:00.000Z");

describe("blockers helpers", () => {
  it("computes whole-day age from created_at, floored, never negative", () => {
    expect(blockerAgeDays(blocker({ created_at: "2026-07-24T08:00:00.000Z" }), NOW)).toBe(0);
    expect(blockerAgeDays(blocker({ created_at: "2026-07-20T09:00:00.000Z" }), NOW)).toBe(4);
    expect(blockerAgeDays(blocker({ created_at: "2026-07-30T09:00:00.000Z" }), NOW)).toBe(0);
  });

  it("labels and tones age by threshold", () => {
    expect(ageLabel(0)).toBe("today");
    expect(ageLabel(4)).toBe("4d");
    expect(ageTone(1)).toBe("muted");
    expect(ageTone(2)).toBe("warn");
    expect(ageTone(5)).toBe("urgent");
  });

  it("filters open blockers", () => {
    const list = [blocker({ id: "a" }), blocker({ id: "b", status: "resolved" })];
    expect(openBlockers(list).map((b) => b.id)).toEqual(["a"]);
  });

  it("sorts open-first then oldest-first; resolved by most-recent resolve", () => {
    const list = [
      blocker({ id: "new-open", created_at: "2026-07-23T09:00:00.000Z" }),
      blocker({ id: "old-open", created_at: "2026-07-19T09:00:00.000Z" }),
      blocker({ id: "res-old", status: "resolved", resolved_at: "2026-07-21T09:00:00.000Z" }),
      blocker({ id: "res-new", status: "resolved", resolved_at: "2026-07-23T09:00:00.000Z" }),
    ];
    expect(sortBlockers(list).map((b) => b.id)).toEqual([
      "old-open",
      "new-open",
      "res-new",
      "res-old",
    ]);
  });

  it("maps only OPEN, ticketed blockers by normalized ticket, aggregating dupes", () => {
    const map = blockedTicketMap([
      blocker({ id: "1", ticket_number: " vs-1234 ", reason: "First", created_at: "2026-07-19T00:00:00.000Z" }),
      blocker({ id: "2", ticket_number: "VS-1234", reason: "Second", created_at: "2026-07-20T00:00:00.000Z" }),
      blocker({ id: "3", ticket_number: "VS-9", reason: "Solo", status: "resolved" }),
      blocker({ id: "4", ticket_number: null, reason: "No ticket" }),
    ]);
    expect(map.get("vs-1234")).toBe("First (+1 more)");
    expect(map.has("vs-9")).toBe(false); // resolved excluded
    expect(map.size).toBe(1);
  });

  it("resolves an entry's block reason case-insensitively", () => {
    const map = blockedTicketMap([blocker({ ticket_number: "VS-1234", reason: "Waiting" })]);
    expect(entryBlockReason(entry({ ticket_number: "vs-1234" }), map)).toBe("Waiting");
    expect(entryBlockReason(entry({ ticket_number: "VS-0000" }), map)).toBeNull();
    expect(entryBlockReason(entry({ ticket_number: null }), map)).toBeNull();
  });

  it("seeds a blocker input from an entry", () => {
    expect(seedFromEntry(entry({ task: "Fix login", ticket_number: "VS-5", ticket_url: "https://x" }))).toEqual({
      reason: "Blocked: Fix login",
      waiting_on: null,
      ticket_number: "VS-5",
      ticket_url: "https://x",
    });
  });

  it("extracts a blocker input", () => {
    expect(toBlockerInput(blocker({ reason: "R", waiting_on: "Alex", ticket_number: "VS-1", ticket_url: null }))).toEqual({
      reason: "R",
      waiting_on: "Alex",
      ticket_number: "VS-1",
      ticket_url: null,
    });
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx jest lib/tests/blockers.test.ts`
Expected: FAIL — `Cannot find module '../blockers'`.

- [ ] **Step 4: Implement `lib/blockers.ts`**

```ts
import type { Blocker, BlockerInput, Entry } from "./types";

/** Extract the editable payload from a blocker (drops server fields). */
export function toBlockerInput(b: Blocker): BlockerInput {
  return {
    reason: b.reason,
    waiting_on: b.waiting_on,
    ticket_number: b.ticket_number,
    ticket_url: b.ticket_url,
  };
}

/** Whole days since the blocker was created, floored, never negative. */
export function blockerAgeDays(b: Blocker, now: Date = new Date()): number {
  const created = new Date(b.created_at).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / 86_400_000));
}

export function ageLabel(days: number): string {
  return days <= 0 ? "today" : `${days}d`;
}

export type AgeTone = "muted" | "warn" | "urgent";

/** <2d calm, 2–4d warn, ≥5d urgent. */
export function ageTone(days: number): AgeTone {
  if (days >= 5) return "urgent";
  if (days >= 2) return "warn";
  return "muted";
}

export function openBlockers(list: Blocker[]): Blocker[] {
  return list.filter((b) => b.status === "open");
}

/** Open first (oldest-first); then resolved (most-recently-resolved first). */
export function sortBlockers(list: Blocker[]): Blocker[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    if (a.status === "open") return a.created_at.localeCompare(b.created_at);
    return (b.resolved_at ?? "").localeCompare(a.resolved_at ?? "");
  });
}

function normalizeTicket(t: string): string {
  return t.trim().toLowerCase();
}

/** Normalized ticket → tooltip label, from OPEN blockers that carry a ticket. */
export function blockedTicketMap(list: Blocker[]): Map<string, string> {
  const open = openBlockers(list)
    .filter((b) => b.ticket_number && b.ticket_number.trim() !== "")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byTicket = new Map<string, string[]>();
  for (const b of open) {
    const key = normalizeTicket(b.ticket_number as string);
    const arr = byTicket.get(key);
    if (arr) arr.push(b.reason);
    else byTicket.set(key, [b.reason]);
  }
  const out = new Map<string, string>();
  for (const [key, reasons] of byTicket) {
    const extra = reasons.length - 1;
    out.set(key, extra > 0 ? `${reasons[0]} (+${extra} more)` : reasons[0]);
  }
  return out;
}

/** The tooltip for an entry whose ticket is blocked, or null. */
export function entryBlockReason(entry: Entry, map: Map<string, string>): string | null {
  if (!entry.ticket_number || entry.ticket_number.trim() === "") return null;
  return map.get(normalizeTicket(entry.ticket_number)) ?? null;
}

/** Seed a blocker form from a task entry (raise-from-task). */
export function seedFromEntry(entry: Entry): BlockerInput {
  return {
    reason: `Blocked: ${entry.task}`,
    waiting_on: null,
    ticket_number: entry.ticket_number,
    ticket_url: entry.ticket_url,
  };
}
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `npx jest lib/tests/blockers.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/blockers.ts lib/tests/blockers.test.ts
git commit -m "feat: blocker types + pure helpers (aging, sort, ticket-match)"
```

---

### Task 2: Supabase migration `0008_blockers.sql`

**Files:**
- Create: `supabase/migrations/0008_blockers.sql`

**Interfaces:**
- Produces: `public.blockers` table, `blocker_status` enum, owner CRUD + manager/admin read RLS. Consumed by Task 4 (Supabase repo) and the manager view (Task 12).

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Daily Tracker — blockers (trackable impediments), owner-scoped with
-- read-only manager/admin access. Mirrors entries (0001) + manager RLS (0003).
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blocker_status') then
    create type blocker_status as enum ('open', 'resolved');
  end if;
end$$;

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

-- Reuse the shared updated_at trigger fn defined in 0001.
drop trigger if exists blockers_set_updated_at on public.blockers;
create trigger blockers_set_updated_at
  before update on public.blockers
  for each row execute function public.set_updated_at();

alter table public.blockers enable row level security;

-- Owner: full CRUD.
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

-- Manager: SELECT their team's blockers (read-only). Mirrors entries_select_team.
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

-- Admin: SELECT all.
drop policy if exists "blockers_select_admin" on public.blockers;
create policy "blockers_select_admin" on public.blockers
  for select using (public.current_user_role() = 'admin');
```

- [ ] **Step 2: Verify (review checklist — no jest for SQL)**

Confirm: enum guarded by `if not exists`; table columns match the `Blocker` type field-for-field; the `set_updated_at()` fn and `current_user_role()` helper already exist (0001/0003); four owner policies + two read policies present. Mock mode needs nothing; Supabase mode requires the user to run this file.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_blockers.sql
git commit -m "feat: 0008 blockers table + enum + owner/manager RLS"
```

---

### Task 3: Repository interface + mock implementation

**Files:**
- Modify: `lib/data/repository.ts` (add 6 methods to the interface)
- Modify: `lib/data/mockRepository.ts` (implement them)
- Test: `lib/data/tests/mockRepository.test.ts` (extend)

**Interfaces:**
- Consumes: `Blocker`, `BlockerInput`, `BlockerStatus`, `TeamBlockerRow`, `AuthUser` from Task 1 / existing types.
- Produces: `repository.listBlockers(userId)`, `createBlocker(userId, input)`, `updateBlocker(userId, id, patch)`, `setBlockerStatus(userId, id, status)`, `deleteBlocker(userId, id)`, `listTeamBlockers(manager)`.

- [ ] **Step 1: Extend the interface `lib/data/repository.ts`**

Add these to the type import at the top:

```ts
import type {
  AuthUser,
  Blocker,
  BlockerInput,
  BlockerStatus,
  Entry,
  EntryInput,
  EntryTemplate,
  Profile,
  TeamBlockerRow,
  TeamFeedRow,
  TemplateInput,
  UserRole,
} from "../types";
```

Add this block inside the `DataRepository` interface (after the templates section):

```ts
  // --- Blockers (impediment tracking) --------------------------------------
  listBlockers(userId: string): Promise<Blocker[]>;
  createBlocker(userId: string, input: BlockerInput): Promise<Blocker>;
  updateBlocker(userId: string, id: string, patch: Partial<BlockerInput>): Promise<Blocker>;
  /** Resolve/reopen; stamps or clears resolved_at. */
  setBlockerStatus(userId: string, id: string, status: BlockerStatus): Promise<Blocker>;
  deleteBlocker(userId: string, id: string): Promise<void>;
  /** Open blockers of the manager's team, each tagged with its author (oldest-first). */
  listTeamBlockers(manager: AuthUser): Promise<TeamBlockerRow[]>;
```

- [ ] **Step 2: Write failing tests — append to `lib/data/tests/mockRepository.test.ts`**

Add a `blockerInput` factory near the top (after `input`):

```ts
import type { BlockerInput } from "../../types"; // add to the existing type import

function blockerInput(overrides: Partial<BlockerInput> = {}): BlockerInput {
  return {
    reason: "Waiting on review",
    waiting_on: null,
    ticket_number: "VS-1",
    ticket_url: null,
    ...overrides,
  };
}
```

Add this `describe` block at the end of the file:

```ts
describe("mockRepository — blockers", () => {
  beforeEach(() => window.localStorage.clear());

  it("creates, lists, updates, resolves and deletes a blocker", async () => {
    const created = await mockRepository.createBlocker(USER, blockerInput());
    expect(created.id).toBeTruthy();
    expect(created.status).toBe("open");
    expect(created.resolved_at).toBeNull();

    expect(await mockRepository.listBlockers(USER)).toHaveLength(1);

    const edited = await mockRepository.updateBlocker(USER, created.id, { reason: "Now waiting on QA" });
    expect(edited.reason).toBe("Now waiting on QA");
    expect(edited.ticket_number).toBe("VS-1"); // untouched fields preserved

    const resolved = await mockRepository.setBlockerStatus(USER, created.id, "resolved");
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolved_at).toBeTruthy();

    const reopened = await mockRepository.setBlockerStatus(USER, created.id, "open");
    expect(reopened.resolved_at).toBeNull();

    await mockRepository.deleteBlocker(USER, created.id);
    expect(await mockRepository.listBlockers(USER)).toHaveLength(0);
  });

  it("throws when updating a missing blocker", async () => {
    await expect(mockRepository.updateBlocker(USER, "nope", { reason: "x" })).rejects.toThrow();
  });

  it("lists a manager's team OPEN blockers only, oldest-first, tagged with author", async () => {
    seedMockProfile(profile({ id: "e1", full_name: "Emp One", email: "e1@x.com", manager_emails: ["boss@x.com"] }));
    seedMockProfile(profile({ id: "e2", full_name: "Emp Two", email: "e2@x.com", manager_emails: ["other@x.com"] }));
    const older = await mockRepository.createBlocker("e1", blockerInput({ reason: "Older" }));
    await mockRepository.updateBlocker("e1", older.id, {}); // no-op edit
    await mockRepository.createBlocker("e1", blockerInput({ reason: "Newer" }));
    const resolved = await mockRepository.createBlocker("e1", blockerInput({ reason: "Done" }));
    await mockRepository.setBlockerStatus("e1", resolved.id, "resolved");
    await mockRepository.createBlocker("e2", blockerInput({ reason: "Not my report" }));

    const rows = await mockRepository.listTeamBlockers({ id: "mgr", email: "boss@x.com", full_name: "Boss" });
    expect(rows.map((r) => r.reason)).toEqual(["Older", "Newer"]); // e2 excluded, resolved excluded, oldest-first
    expect(rows[0].employee.full_name).toBe("Emp One");
  });
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npx jest lib/data/tests/mockRepository.test.ts`
Expected: FAIL — `mockRepository.createBlocker is not a function`.

- [ ] **Step 4: Implement in `lib/data/mockRepository.ts`**

Add to the top-of-file type import: `Blocker, BlockerInput, BlockerStatus, TeamBlockerRow`.

Add the storage key next to the others:

```ts
const BLOCKERS_KEY = (uid: string) => `vldt:blockers:${uid}`;
```

Add load/save helpers near `loadEntries`/`saveEntries`:

```ts
function loadBlockers(userId: string): Blocker[] {
  const raw = read(BLOCKERS_KEY(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Blocker[]) : [];
  } catch {
    return [];
  }
}

function saveBlockers(userId: string, list: Blocker[]): void {
  write(BLOCKERS_KEY(userId), JSON.stringify(list));
}
```

Add these methods inside the `mockRepository` object (after `deleteTemplate`):

```ts
  async listBlockers(userId: string): Promise<Blocker[]> {
    return loadBlockers(userId);
  },

  async createBlocker(userId: string, input: BlockerInput): Promise<Blocker> {
    const list = loadBlockers(userId);
    const now = isoNow();
    const b: Blocker = {
      id: newId(),
      user_id: userId,
      status: "open",
      created_at: now,
      resolved_at: null,
      updated_at: now,
      ...input,
    };
    list.push(b);
    saveBlockers(userId, list);
    return b;
  },

  async updateBlocker(userId: string, id: string, patch: Partial<BlockerInput>): Promise<Blocker> {
    const list = loadBlockers(userId);
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Blocker not found");
    const updated: Blocker = { ...list[idx], ...patch, updated_at: isoNow() };
    list[idx] = updated;
    saveBlockers(userId, list);
    return updated;
  },

  async setBlockerStatus(userId: string, id: string, status: BlockerStatus): Promise<Blocker> {
    const list = loadBlockers(userId);
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Blocker not found");
    const now = isoNow();
    const updated: Blocker = {
      ...list[idx],
      status,
      resolved_at: status === "resolved" ? now : null,
      updated_at: now,
    };
    list[idx] = updated;
    saveBlockers(userId, list);
    return updated;
  },

  async deleteBlocker(userId: string, id: string): Promise<void> {
    saveBlockers(userId, loadBlockers(userId).filter((b) => b.id !== id));
  },

  async listTeamBlockers(manager: AuthUser): Promise<TeamBlockerRow[]> {
    const profiles = loadProfiles();
    const isAdmin = profiles[manager.id]?.role === "admin";
    const mgr = manager.email.trim().toLowerCase();
    const team = Object.values(profiles).filter(
      (p) => isAdmin || p.manager_emails.some((e) => e.trim().toLowerCase() === mgr),
    );
    const rows: TeamBlockerRow[] = [];
    for (const p of team) {
      for (const b of loadBlockers(p.id)) {
        if (b.status !== "open") continue;
        rows.push({
          ...b,
          employee: { id: p.id, full_name: p.full_name, email: p.email ?? "" },
        });
      }
    }
    rows.sort((a, b) => a.created_at.localeCompare(b.created_at)); // oldest-first
    return rows;
  },
```

- [ ] **Step 5: Run and confirm pass**

Run: `npx jest lib/data/tests/mockRepository.test.ts`
Expected: PASS (existing + 3 new tests).

- [ ] **Step 6: Commit**

```bash
git add lib/data/repository.ts lib/data/mockRepository.ts lib/data/tests/mockRepository.test.ts
git commit -m "feat: blocker repo interface + mock implementation + tests"
```

---

### Task 4: Supabase repository implementation

**Files:**
- Modify: `lib/data/supabaseRepository.ts`

**Interfaces:**
- Consumes: interface from Task 3. Produces the same 6 methods against Supabase; verified by `npm run typecheck` (no live-DB jest).

- [ ] **Step 1: Add to the type import** at the top: `Blocker, BlockerInput, BlockerStatus, TeamBlockerRow`.

- [ ] **Step 2: Implement the methods** — add inside the `supabaseRepository` object (after `deleteTemplate`):

```ts
  async listBlockers(userId: string): Promise<Blocker[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blockers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Blocker[];
  },

  async createBlocker(userId: string, input: BlockerInput): Promise<Blocker> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blockers")
      .insert({ ...input, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    return data as Blocker;
  },

  async updateBlocker(userId: string, id: string, patch: Partial<BlockerInput>): Promise<Blocker> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blockers")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Blocker;
  },

  async setBlockerStatus(userId: string, id: string, status: BlockerStatus): Promise<Blocker> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blockers")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Blocker;
  },

  async deleteBlocker(userId: string, id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("blockers")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async listTeamBlockers(manager: AuthUser): Promise<TeamBlockerRow[]> {
    const supabase = createClient();
    // RLS ("blockers_select_team"/"blockers_select_admin") narrows rows to the
    // team. Resolve author identity with a second query (no direct FK to profiles).
    const { data: blockers, error } = await supabase
      .from("blockers")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (blockers ?? []) as Blocker[];
    if (rows.length === 0) return [];

    const ids = [...new Set(rows.map((b) => b.user_id))];
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    if (pErr) throw pErr;

    const byId = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        { id: p.id as string, full_name: (p.full_name as string) ?? "", email: (p.email as string) ?? "" },
      ]),
    );
    return rows.map((b) => ({
      ...b,
      employee: byId.get(b.user_id) ?? { id: b.user_id, full_name: "Unknown", email: "" },
    }));
  },
```

- [ ] **Step 3: Verify types**

Run: `npm run typecheck`
Expected: no errors in `lib/data/supabaseRepository.ts` (the interface from Task 3 is now fully implemented in both repos).

- [ ] **Step 4: Commit**

```bash
git add lib/data/supabaseRepository.ts
git commit -m "feat: blocker Supabase repository implementation"
```

---

### Task 5: `useBlockers` hook

**Files:**
- Create: `hooks/useBlockers.ts`
- Test: `hooks/tests/useBlockers.test.tsx`

**Interfaces:**
- Consumes: `repository.*Blocker*` (Task 3/4), `sortBlockers`/`openBlockers`/`blockerAgeDays` (Task 1), `useAuth`.
- Produces: `useBlockers()` → `{ blockers, open, oldestOpenAgeDays, loading, error, refresh, addBlocker, editBlocker, resolveBlocker, reopenBlocker, removeBlocker }`.

- [ ] **Step 1: Write the failing test `hooks/tests/useBlockers.test.tsx`**

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useBlockers } from "../useBlockers";
import { AuthProvider } from "@/lib/auth/AuthProvider";

// Mock auth so the hook has a stable user id.
jest.mock("@/lib/auth/AuthProvider", () => {
  const actual = jest.requireActual("@/lib/auth/AuthProvider");
  return {
    ...actual,
    useAuth: () => ({ user: { id: "u1", email: "u1@x.com", full_name: "U" }, role: "user" }),
  };
});

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

describe("useBlockers", () => {
  beforeEach(() => window.localStorage.clear());

  it("loads, adds, resolves and removes optimistically", async () => {
    const { result } = renderHook(() => useBlockers(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.open).toHaveLength(0);

    await act(async () => {
      await result.current.addBlocker({
        reason: "Waiting on review",
        waiting_on: null,
        ticket_number: "VS-1",
        ticket_url: null,
      });
    });
    expect(result.current.open).toHaveLength(1);

    const id = result.current.blockers[0].id;
    await act(async () => {
      await result.current.resolveBlocker(id);
    });
    expect(result.current.open).toHaveLength(0);
    expect(result.current.blockers[0].status).toBe("resolved");

    await act(async () => {
      await result.current.removeBlocker(id);
    });
    expect(result.current.blockers).toHaveLength(0);
  });
});
```

> Note: local jsdom may be constrained in this repo; if `npx jest` can't run tsx here, this test still runs in CI. Always run `npm run typecheck` as the local gate.

- [ ] **Step 2: Run and confirm failure**

Run: `npx jest hooks/tests/useBlockers.test.tsx`
Expected: FAIL — `Cannot find module '../useBlockers'`.

- [ ] **Step 3: Implement `hooks/useBlockers.ts`**

```ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Blocker, BlockerInput, BlockerStatus } from "@/lib/types";
import { repository } from "@/lib/data";
import { blockerAgeDays, openBlockers, sortBlockers } from "@/lib/blockers";
import { useAuth } from "@/lib/auth/AuthProvider";

interface UseBlockersResult {
  blockers: Blocker[];
  open: Blocker[];
  oldestOpenAgeDays: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addBlocker: (input: BlockerInput) => Promise<void>;
  editBlocker: (id: string, patch: Partial<BlockerInput>) => Promise<void>;
  resolveBlocker: (id: string) => Promise<void>;
  reopenBlocker: (id: string) => Promise<void>;
  removeBlocker: (id: string) => Promise<void>;
}

/**
 * Loads and mutates the current user's blockers via the active repository.
 * Add/edit/status/delete are optimistic with per-row rollback, mirroring
 * useEntries.
 */
export function useBlockers(): UseBlockersResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Blocker[]>([]);
  useEffect(() => {
    ref.current = blockers;
  }, [blockers]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBlockers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await repository.listBlockers(userId);
      setBlockers(sortBlockers(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load blockers.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addBlocker = useCallback(
    async (input: BlockerInput) => {
      if (!userId) return;
      setError(null);
      try {
        const created = await repository.createBlocker(userId, input);
        setBlockers((prev) => sortBlockers([created, ...prev]));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add blocker.");
        throw e;
      }
    },
    [userId],
  );

  const editBlocker = useCallback(
    async (id: string, patch: Partial<BlockerInput>) => {
      if (!userId) return;
      setError(null);
      let prev: Blocker | undefined;
      setBlockers((list) => {
        prev = list.find((b) => b.id === id);
        return sortBlockers(
          list.map((b) =>
            b.id === id ? { ...b, ...patch, updated_at: new Date().toISOString() } : b,
          ),
        );
      });
      try {
        const updated = await repository.updateBlocker(userId, id, patch);
        setBlockers((list) => sortBlockers(list.map((b) => (b.id === id ? updated : b))));
      } catch (e) {
        setBlockers((list) => sortBlockers(list.map((b) => (b.id === id && prev ? prev! : b))));
        setError(e instanceof Error ? e.message : "Failed to update blocker.");
        throw e;
      }
    },
    [userId],
  );

  const setStatus = useCallback(
    async (id: string, status: BlockerStatus) => {
      if (!userId) return;
      setError(null);
      const now = new Date().toISOString();
      let prev: Blocker | undefined;
      setBlockers((list) => {
        prev = list.find((b) => b.id === id);
        return sortBlockers(
          list.map((b) =>
            b.id === id
              ? { ...b, status, resolved_at: status === "resolved" ? now : null, updated_at: now }
              : b,
          ),
        );
      });
      try {
        const updated = await repository.setBlockerStatus(userId, id, status);
        setBlockers((list) => sortBlockers(list.map((b) => (b.id === id ? updated : b))));
      } catch (e) {
        setBlockers((list) => sortBlockers(list.map((b) => (b.id === id && prev ? prev! : b))));
        setError(e instanceof Error ? e.message : "Failed to update blocker.");
        throw e;
      }
    },
    [userId],
  );

  const resolveBlocker = useCallback((id: string) => setStatus(id, "resolved"), [setStatus]);
  const reopenBlocker = useCallback((id: string) => setStatus(id, "open"), [setStatus]);

  const removeBlocker = useCallback(
    async (id: string) => {
      if (!userId) return;
      setError(null);
      let removed: Blocker | undefined;
      setBlockers((list) => {
        removed = list.find((b) => b.id === id);
        return list.filter((b) => b.id !== id);
      });
      try {
        await repository.deleteBlocker(userId, id);
      } catch (e) {
        if (removed) setBlockers((list) => sortBlockers([removed!, ...list]));
        setError(e instanceof Error ? e.message : "Failed to delete blocker.");
        throw e;
      }
    },
    [userId],
  );

  const open = useMemo(() => openBlockers(blockers), [blockers]);
  const oldestOpenAgeDays = useMemo(
    () => open.reduce((max, b) => Math.max(max, blockerAgeDays(b)), 0),
    [open],
  );

  return {
    blockers,
    open,
    oldestOpenAgeDays,
    loading,
    error,
    refresh,
    addBlocker,
    editBlocker,
    resolveBlocker,
    reopenBlocker,
    removeBlocker,
  };
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx jest hooks/tests/useBlockers.test.tsx` (Expected: PASS) and `npm run typecheck` (Expected: clean).

- [ ] **Step 5: Commit**

```bash
git add hooks/useBlockers.ts hooks/tests/useBlockers.test.tsx
git commit -m "feat: useBlockers optimistic hook + test"
```

---

### Task 6: Command bus — `new-blocker`

**Files:**
- Modify: `lib/commands.ts`

**Interfaces:**
- Produces: `AppCommand` union gains `{ type: "new-blocker"; seed?: Partial<BlockerInput> }`. Consumed by Tasks 10 (dashboard handler) and 11 (palette).

- [ ] **Step 1: Update `lib/commands.ts`**

Change the import line to add `BlockerInput`:

```ts
import type { BlockerInput, Category } from "./types";
```

Add the member to the union:

```ts
export type AppCommand =
  | { type: "new-entry" }
  | { type: "quick-log"; text: string }
  | { type: "filter-category"; category: Category }
  | { type: "focus-date"; date: string }
  | { type: "start-tour" }
  | { type: "new-blocker"; seed?: Partial<BlockerInput> };
```

- [ ] **Step 2: Confirm the existing bus test still passes**

Run: `npx jest lib/tests/commands.test.ts`
Expected: PASS unchanged — `dispatchAppCommand`/`subscribeAppCommand` are type-agnostic, so the new union member doesn't affect runtime behavior.

- [ ] **Step 3: Commit**

```bash
git add lib/commands.ts
git commit -m "feat: add new-blocker app command"
```

---

### Task 7: `BlockerForm` dialog body

**Files:**
- Create: `components/dashboard/BlockerForm.tsx`

**Interfaces:**
- Consumes: `Blocker`, `BlockerInput`, `isValidUrl`, ui `Input`/`Textarea`/`Button`.
- Produces: `<BlockerForm editing seed? onSubmit onSuccess onCancel />` — renders inside a `Modal` (like `EntryForm`).

- [ ] **Step 1: Implement `components/dashboard/BlockerForm.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Plus } from "lucide-react";
import type { Blocker, BlockerInput } from "@/lib/types";
import { isValidUrl } from "@/lib/security/url";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface BlockerFormProps {
  editing: Blocker | null;
  /** When adding, optionally pre-fill (e.g. raised from a task). */
  seed?: Partial<BlockerInput> | null;
  onSubmit: (input: BlockerInput) => Promise<void>;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  reason: string;
  waitingOn: string;
  ticketNumber: string;
  ticketUrl: string;
}

function initialState(editing: Blocker | null, seed?: Partial<BlockerInput> | null): FormState {
  return {
    reason: editing?.reason ?? seed?.reason ?? "",
    waitingOn: editing?.waiting_on ?? seed?.waiting_on ?? "",
    ticketNumber: editing?.ticket_number ?? seed?.ticket_number ?? "",
    ticketUrl: editing?.ticket_url ?? seed?.ticket_url ?? "",
  };
}

export function BlockerForm({ editing, seed = null, onSubmit, onSuccess, onCancel }: BlockerFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(editing, seed));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setState(initialState(editing, seed));
    setError(null);
    reasonRef.current?.focus();
  }, [editing, seed]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const urlInvalid = state.ticketUrl.trim() !== "" && !isValidUrl(state.ticketUrl);

  const submit = async () => {
    if (state.reason.trim() === "") {
      setError("Reason is required.");
      reasonRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    const input: BlockerInput = {
      reason: state.reason.trim(),
      waiting_on: state.waitingOn.trim() || null,
      ticket_number: state.ticketNumber.trim() || null,
      ticket_url: state.ticketUrl.trim() || null,
    };
    try {
      await onSubmit(input);
      onSuccess();
    } catch {
      // Error toast surfaced by the caller; keep the form populated.
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const labelClass = "text-xs font-medium text-muted";

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="blocker-reason" className={labelClass}>
          What&apos;s blocking you?
        </label>
        <Textarea
          ref={reasonRef}
          id="blocker-reason"
          data-test-id="blocker-reason"
          rows={2}
          required
          value={state.reason}
          onChange={(e) => set("reason", e.target.value)}
          placeholder="e.g. Waiting on PR review for the auth refactor"
          className="resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="blocker-waiting-on" className={labelClass}>
          Waiting on <span className="font-normal">(optional)</span>
        </label>
        <Input
          id="blocker-waiting-on"
          data-test-id="blocker-waiting-on"
          value={state.waitingOn}
          onChange={(e) => set("waitingOn", e.target.value)}
          placeholder="A person, team, or ticket — e.g. Alex, DevOps, VS-9999"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blocker-ticket" className={labelClass}>
            Ticket #
          </label>
          <Input
            id="blocker-ticket"
            data-test-id="blocker-ticket-number"
            value={state.ticketNumber}
            onChange={(e) => set("ticketNumber", e.target.value)}
            placeholder="VS-1234"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blocker-url" className={labelClass}>
            Ticket URL
          </label>
          <Input
            id="blocker-url"
            data-test-id="blocker-ticket-url"
            value={state.ticketUrl}
            onChange={(e) => set("ticketUrl", e.target.value)}
            placeholder="github.com/…"
            aria-invalid={urlInvalid || undefined}
            className={urlInvalid ? "border-orange-brand" : ""}
          />
        </div>
      </div>
      {urlInvalid && (
        <p className="-mt-2 text-xs text-orange-brand">
          That doesn&apos;t look like a valid http(s) link — it won&apos;t be saved as a
          clickable ticket.
        </p>
      )}

      {error && (
        <p className="text-xs text-orange-brand" role="alert">
          {error}
        </p>
      )}

      <div className="mt-1 flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-test-id="blocker-cancel">
          Cancel
        </Button>
        <Button type="submit" variant="cta" disabled={submitting} data-test-id="blocker-submit" className="flex-1">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : editing ? <Check size={16} /> : <Plus size={16} />}
          {editing ? "Save changes" : "Add blocker"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean for `components/dashboard/BlockerForm.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/BlockerForm.tsx
git commit -m "feat: BlockerForm dialog body"
```

---

### Task 8: `BlockersCard` rail component

**Files:**
- Create: `components/dashboard/BlockersCard.tsx`

**Interfaces:**
- Consumes: `Blocker`, `openBlockers`/`sortBlockers`/`blockerAgeDays`/`ageLabel`/`ageTone`/`AgeTone` (Task 1), `TicketPill`, `Tooltip`.
- Produces: `<BlockersCard blockers loading onAdd onEdit onResolve onReopen onDelete />`.

- [ ] **Step 1: Implement `components/dashboard/BlockersCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Check, Pencil, Trash2, RotateCcw, ChevronDown, User } from "lucide-react";
import type { Blocker } from "@/lib/types";
import { ageLabel, ageTone, blockerAgeDays, openBlockers, type AgeTone } from "@/lib/blockers";
import { Tooltip } from "@/components/ui/tooltip";
import { TicketPill } from "./TicketPill";

interface BlockersCardProps {
  blockers: Blocker[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (b: Blocker) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (b: Blocker) => void;
}

const TONE: Record<AgeTone, { bg: string; fg: string }> = {
  muted: { bg: "#eef1f5", fg: "#4a5666" },
  warn: { bg: "#fbf1d5", fg: "#8f6606" },
  urgent: { bg: "#fdefe4", fg: "#bd5a19" },
};

function AgeBadge({ b }: { b: Blocker }) {
  const days = blockerAgeDays(b);
  const tone = TONE[ageTone(days)];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
      title={`Blocked ${ageLabel(days)}`}
    >
      {ageLabel(days)}
    </span>
  );
}

export function BlockersCard({ blockers, loading, onAdd, onEdit, onResolve, onReopen, onDelete }: BlockersCardProps) {
  const [showResolved, setShowResolved] = useState(false);
  const open = openBlockers(blockers);
  const resolved = blockers
    .filter((b) => b.status === "resolved")
    .sort((a, b) => (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""))
    .slice(0, 5);

  return (
    <div className="card p-4" data-test-id="blockers-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <AlertTriangle size={13} className="text-orange-brand" />
          Blockers{open.length > 0 ? ` · ${open.length} open` : ""}
        </span>
        <button
          type="button"
          onClick={onAdd}
          data-test-id="blockers-add"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-brand hover:underline"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-canvas" />
          ))}
        </div>
      ) : open.length === 0 ? (
        <p className="rounded-xl bg-canvas px-3 py-4 text-center text-xs text-muted">
          Nothing blocking you 🎉
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((b) => (
            <li
              key={b.id}
              data-test-id="blocker-item"
              className="group rounded-xl border border-hairline p-2.5"
            >
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink">{b.reason}</p>
                <AgeBadge b={b} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {b.waiting_on && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2 py-0.5 text-[11px] text-muted">
                    <User size={10} /> {b.waiting_on}
                  </span>
                )}
                <TicketPill ticketNumber={b.ticket_number} ticketUrl={b.ticket_url} />
                <div className="ml-auto flex items-center gap-0.5">
                  <Tooltip label="Mark resolved">
                    <button
                      type="button"
                      onClick={() => onResolve(b.id)}
                      data-test-id="blocker-resolve"
                      aria-label="Mark blocker resolved"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-[#1f8a4c]"
                    >
                      <Check size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Edit blocker">
                    <button
                      type="button"
                      onClick={() => onEdit(b)}
                      data-test-id="blocker-edit"
                      aria-label="Edit blocker"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
                    >
                      <Pencil size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete blocker">
                    <button
                      type="button"
                      onClick={() => onDelete(b)}
                      data-test-id="blocker-delete"
                      aria-label="Delete blocker"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-2">
          <button
            type="button"
            onClick={() => setShowResolved((v) => !v)}
            data-test-id="blockers-show-resolved"
            aria-expanded={showResolved}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-navy"
          >
            Resolved ({resolved.length})
            <ChevronDown size={13} className={showResolved ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {showResolved && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {resolved.map((b) => (
                <li key={b.id} className="flex items-center gap-2 rounded-lg bg-canvas px-2.5 py-1.5" data-test-id="blocker-item">
                  <Check size={12} className="shrink-0 text-[#1f8a4c]" />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted line-through">{b.reason}</span>
                  <Tooltip label="Reopen">
                    <button
                      type="button"
                      onClick={() => onReopen(b.id)}
                      data-test-id="blocker-reopen"
                      aria-label="Reopen blocker"
                      className="rounded-lg p-1 text-muted transition-colors hover:text-blue-brand"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean for `components/dashboard/BlockersCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/BlockersCard.tsx
git commit -m "feat: BlockersCard rail component"
```

---

### Task 9: Inline ⚠ flag + "Raise blocker" on entries

**Files:**
- Modify: `components/dashboard/EntryList.tsx`
- Modify: `components/dashboard/DayGroup.tsx`
- Modify: `components/dashboard/EntryCard.tsx`
- Modify: `components/dashboard/EntryRow.tsx`

**Interfaces:**
- Consumes: `entryBlockReason` (Task 1).
- Produces: `EntryList`/`DayGroup` accept `blockedTickets?: Map<string,string>` + `onRaiseBlocker?: (entry: Entry) => void`; `EntryCard`/`EntryRow` accept `blockedReason?: string | null` + `onRaiseBlocker?`. Consumed by Task 10.

- [ ] **Step 1: `EntryList.tsx` — add two props and pass them down**

Add to `EntryListProps` (after `onMoveToDate?`):

```ts
  /** Normalized ticket → reason, for the inline "blocked" flag. */
  blockedTickets?: Map<string, string>;
  /** Raise a blocker seeded from this entry. */
  onRaiseBlocker?: (entry: Entry) => void;
```

Destructure them in the function signature (after `onMoveToDate,`): `blockedTickets, onRaiseBlocker,`.

Pass them to `<DayGroup>` (add after `onMoveToDate={onMoveToDate}`):

```tsx
          blockedTickets={blockedTickets}
          onRaiseBlocker={onRaiseBlocker}
```

- [ ] **Step 2: `DayGroup.tsx` — thread props, compute per-entry reason**

Add the import:

```ts
import { entryBlockReason } from "@/lib/blockers";
```

Add to `DayGroupProps` (after `onMoveToDate?`):

```ts
  blockedTickets?: Map<string, string>;
  onRaiseBlocker?: (entry: Entry) => void;
```

Destructure them (after `onMoveToDate,`): `blockedTickets, onRaiseBlocker,`.

In the `group.entries.map` callback, extend the `shared` object:

```tsx
          const shared = {
            entry,
            editing: editingId === entry.id,
            selected: selectedIds.has(entry.id),
            onToggleSelect,
            onStatusChange,
            onEdit,
            onDuplicate,
            onDelete,
            blockedReason: blockedTickets ? entryBlockReason(entry, blockedTickets) : null,
            onRaiseBlocker,
          };
```

- [ ] **Step 3: `EntryCard.tsx` — flag chip + raise button**

Add `AlertTriangle` to the lucide import:

```ts
import { Clock, Pencil, Trash2, CopyPlus, GripVertical, AlertTriangle } from "lucide-react";
```

Add to `EntryCardProps` (after `onDelete`):

```ts
  blockedReason?: string | null;
  onRaiseBlocker?: (entry: Entry) => void;
```

Destructure them in the signature (after `onDelete,`): `blockedReason = null, onRaiseBlocker,`.

Add the "Raise blocker" button as the first action, inside the action `<div>` (before the Edit `<Tooltip>`):

```tsx
          {onRaiseBlocker && (
            <Tooltip label="Raise a blocker">
              <button
                type="button"
                onClick={() => onRaiseBlocker(entry)}
                data-test-id="entry-raise-blocker"
                aria-label="Raise a blocker"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
              >
                <AlertTriangle size={15} />
              </button>
            </Tooltip>
          )}
```

Add the flag chip in the meta row, right after `<CategoryChip … />`:

```tsx
        {blockedReason && (
          <Tooltip label={blockedReason}>
            <span
              data-test-id="entry-blocked-flag"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: "#fdefe4", color: "#bd5a19" }}
            >
              <AlertTriangle size={12} /> Blocked
            </span>
          </Tooltip>
        )}
```

- [ ] **Step 4: `EntryRow.tsx` — compact flag + raise button**

Add `AlertTriangle` to the lucide import:

```ts
import { Pencil, Trash2, CopyPlus, GripVertical, AlertTriangle } from "lucide-react";
```

Add to `EntryRowProps` (after `onDelete`):

```ts
  blockedReason?: string | null;
  onRaiseBlocker?: (entry: Entry) => void;
```

Destructure them (after `onDelete,`): `blockedReason = null, onRaiseBlocker,`.

Add an icon-only flag right after the task `<Tooltip>…</Tooltip>` block (before the category `<div>`):

```tsx
      {blockedReason && (
        <Tooltip label={blockedReason} align="start">
          <span
            data-test-id="entry-blocked-flag"
            aria-label="Blocked"
            className="hidden shrink-0 items-center rounded-full p-1 sm:flex"
            style={{ backgroundColor: "#fdefe4", color: "#bd5a19" }}
          >
            <AlertTriangle size={12} />
          </span>
        </Tooltip>
      )}
```

Add the "Raise blocker" button as the first action inside the trailing action `<div>` (before the Edit `<Tooltip>`):

```tsx
        {onRaiseBlocker && (
          <Tooltip label="Raise a blocker">
            <button
              type="button"
              onClick={() => onRaiseBlocker(entry)}
              data-test-id="entry-raise-blocker"
              aria-label="Raise a blocker"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
            >
              <AlertTriangle size={14} />
            </button>
          </Tooltip>
        )}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean (props are optional, so no existing caller breaks).

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/EntryList.tsx components/dashboard/DayGroup.tsx components/dashboard/EntryCard.tsx components/dashboard/EntryRow.tsx
git commit -m "feat: inline blocked flag + raise-blocker action on entries"
```

---

### Task 10: Wire blockers into the dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useBlockers` (Task 5), `BlockersCard` (Task 8), `BlockerForm` (Task 7), `blockedTicketMap`/`seedFromEntry`/`toBlockerInput` (Task 1), the `new-blocker` command (Task 6), the new `EntryList` props (Task 9).

- [ ] **Step 1: Add imports** (with the other imports at the top)

```ts
import type { Blocker, BlockerInput } from "@/lib/types";
import { useBlockers } from "@/hooks/useBlockers";
import { BlockersCard } from "@/components/dashboard/BlockersCard";
import { BlockerForm } from "@/components/dashboard/BlockerForm";
import { blockedTicketMap, seedFromEntry, toBlockerInput } from "@/lib/blockers";
import { AlertTriangle } from "lucide-react";
```

(Add `Blocker, BlockerInput` to the existing `@/lib/types` import instead of a duplicate line if you prefer; both compile.)

- [ ] **Step 2: Mount the hook** — after the `useTemplates()` destructure:

```ts
  const {
    blockers,
    loading: blockersLoading,
    addBlocker,
    editBlocker,
    resolveBlocker,
    reopenBlocker,
    removeBlocker,
  } = useBlockers();
```

- [ ] **Step 3: Add blocker UI state** — after the `view` state:

```ts
  const [blockerFormOpen, setBlockerFormOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [blockerSeed, setBlockerSeed] = useState<Partial<BlockerInput> | null>(null);
```

- [ ] **Step 4: Add handlers** — after `moveToDate`/`bulkMoveDay`:

```ts
  const blockedTickets = useMemo(() => blockedTicketMap(blockers), [blockers]);

  const openBlockerAdd = (seed: Partial<BlockerInput> | null = null) => {
    setEditingBlocker(null);
    setBlockerSeed(seed);
    setBlockerFormOpen(true);
  };
  const handleBlockerEdit = (b: Blocker) => {
    setEditingBlocker(b);
    setBlockerSeed(null);
    setBlockerFormOpen(true);
  };
  const closeBlockerForm = () => {
    setBlockerFormOpen(false);
    setEditingBlocker(null);
    setBlockerSeed(null);
  };
  const handleBlockerSubmit = async (input: BlockerInput) => {
    if (editingBlocker) {
      await editBlocker(editingBlocker.id, input);
      toast("Blocker updated.", "success");
    } else {
      await addBlocker(input);
      toast("Blocker added.", "success");
    }
  };
  const handleBlockerResolve = async (id: string) => {
    try {
      await resolveBlocker(id);
      toast("Blocker resolved. 🎉", "success");
    } catch {
      toast("Couldn't resolve the blocker.", "error");
    }
  };
  const handleBlockerReopen = async (id: string) => {
    try {
      await reopenBlocker(id);
      toast("Blocker reopened.", "info");
    } catch {
      toast("Couldn't reopen the blocker.", "error");
    }
  };
  const handleBlockerDelete = async (b: Blocker) => {
    try {
      await removeBlocker(b.id);
      toast("Blocker removed.", "info", {
        durationMs: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void addBlocker(toBlockerInput(b)).then(() => toast("Blocker restored.", "success"));
          },
        },
      });
    } catch {
      toast("Couldn't delete the blocker.", "error");
    }
  };
  const onRaiseBlocker = (entry: Entry) => openBlockerAdd(seedFromEntry(entry));
```

- [ ] **Step 5: Handle the `new-blocker` command** — inside `commandRef.current`, add a branch before the closing brace:

```ts
    } else if (command.type === "new-blocker") {
      openBlockerAdd(command.seed ?? null);
    }
```

(It attaches to the existing `if/else if` chain that currently ends at `start-tour`.)

- [ ] **Step 6: Render `BlockersCard` in the rail** — inside the `<aside>`'s sticky column, add it after the capture-controls `card` `</div>` and before `<WeeklyGoalCard … />`:

```tsx
            <BlockersCard
              blockers={blockers}
              loading={blockersLoading}
              onAdd={() => openBlockerAdd()}
              onEdit={handleBlockerEdit}
              onResolve={handleBlockerResolve}
              onReopen={handleBlockerReopen}
              onDelete={handleBlockerDelete}
            />
```

- [ ] **Step 7: Pass the flag props to `EntryList`** — add these two props to the `<EntryList … />` element:

```tsx
            blockedTickets={blockedTickets}
            onRaiseBlocker={onRaiseBlocker}
```

- [ ] **Step 8: Render the BlockerForm modal** — after the entry `<Modal>…</Modal>` block (before `<ConfirmDialog … />`):

```tsx
      <Modal
        open={blockerFormOpen}
        title={editingBlocker ? "Edit blocker" : "Add a blocker"}
        subtitle={editingBlocker ? undefined : "Track something that's stopping a task"}
        icon={<AlertTriangle size={20} />}
        onClose={closeBlockerForm}
        testId="blocker-modal"
      >
        <BlockerForm
          editing={editingBlocker}
          seed={blockerSeed}
          onSubmit={handleBlockerSubmit}
          onSuccess={closeBlockerForm}
          onCancel={closeBlockerForm}
        />
      </Modal>
```

- [ ] **Step 9: Typecheck + build**

Run: `npm run typecheck` (Expected: clean) then `npm run build` (Expected: compiles; the dashboard route builds).

- [ ] **Step 10: Browser smoke (mock mode)**

Start the dev server via the preview tool (`{name}` from `.claude/launch.json`, or add one running `npm run dev`). In the app: add a blocker via the rail card → it appears with an age badge; add an entry with ticket `VS-1234`, then add a blocker with ticket `VS-1234` → the entry shows the ⚠ "Blocked" flag; resolve the blocker → flag clears and it moves to "Resolved". Confirm no console errors.

- [ ] **Step 11: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "feat: wire blockers into the dashboard (rail card, form, inline flag)"
```

---

### Task 11: Command palette — "Add blocker"

**Files:**
- Modify: `components/CommandPalette.tsx`

**Interfaces:**
- Consumes: `dispatchAppCommand({ type: "new-blocker" })` (Task 6).

- [ ] **Step 1: Add `AlertTriangle`** to the lucide import block.

- [ ] **Step 2: Add the action command** — append to the `actionCommands` array (after `start-tour`):

```ts
    {
      id: "new-blocker",
      group: "Actions",
      label: "Add blocker",
      hint: "Flag something in your way",
      icon: AlertTriangle,
      run: () => {
        router.push("/dashboard");
        dispatchAppCommand({ type: "new-blocker" });
      },
    },
```

- [ ] **Step 3: Typecheck + smoke**

Run: `npm run typecheck` (clean). In the browser: press ⌘K, type "blocker", Enter → dashboard opens the Add-blocker modal.

- [ ] **Step 4: Commit**

```bash
git add components/CommandPalette.tsx
git commit -m "feat: add-blocker command in the palette"
```

---

### Task 12: Team blockers panel (manager read-only)

**Files:**
- Create: `components/team/TeamBlockersPanel.tsx`
- Modify: `app/(app)/team/page.tsx`

**Interfaces:**
- Consumes: `repository.listTeamBlockers` (Task 3/4), `TeamBlockerRow`, `blockerAgeDays`/`ageLabel`/`ageTone`/`AgeTone` (Task 1), `TicketPill`.
- Produces: `<TeamBlockersPanel rows />`.

- [ ] **Step 1: Implement `components/team/TeamBlockersPanel.tsx`**

```tsx
"use client";

import { AlertTriangle, User } from "lucide-react";
import type { TeamBlockerRow } from "@/lib/types";
import { ageLabel, ageTone, blockerAgeDays, type AgeTone } from "@/lib/blockers";
import { TicketPill } from "@/components/dashboard/TicketPill";

const TONE: Record<AgeTone, { bg: string; fg: string }> = {
  muted: { bg: "#eef1f5", fg: "#4a5666" },
  warn: { bg: "#fbf1d5", fg: "#8f6606" },
  urgent: { bg: "#fdefe4", fg: "#bd5a19" },
};

/** Read-only summary of the team's open blockers (oldest-first). */
export function TeamBlockersPanel({ rows }: { rows: TeamBlockerRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card mt-6 p-4" data-test-id="team-blockers-panel">
      <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <AlertTriangle size={13} className="text-orange-brand" />
        Team blockers · {rows.length} open
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const days = blockerAgeDays(r);
          const tone = TONE[ageTone(days)];
          return (
            <li
              key={r.id}
              data-test-id="team-blocker-item"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline p-2.5"
            >
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
                <User size={11} /> {r.employee.full_name || r.employee.email || "Unknown"}
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">{r.reason}</span>
              {r.waiting_on && (
                <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2 py-0.5 text-[11px] text-muted">
                  waiting on {r.waiting_on}
                </span>
              )}
              <TicketPill ticketNumber={r.ticket_number} ticketUrl={r.ticket_url} />
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: tone.bg, color: tone.fg }}
                title={`Blocked ${ageLabel(days)}`}
              >
                {ageLabel(days)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Fetch team blockers in `app/(app)/team/page.tsx`**

Add to the type import: `TeamBlockerRow` →

```ts
import type { Category, EntryStatus, TeamBlockerRow, TeamFeedRow as TeamFeedRowData } from "@/lib/types";
```

Add the import:

```ts
import { TeamBlockersPanel } from "@/components/team/TeamBlockersPanel";
```

Add state next to `rows`:

```ts
  const [blockerRows, setBlockerRows] = useState<TeamBlockerRow[]>([]);
```

In the existing `useEffect` that calls `listTeamEntries`, also load blockers. Replace the `.then((r) => { if (active) setRows(r); })` chain with a combined load:

```ts
    Promise.all([repository.listTeamEntries(user), repository.listTeamBlockers(user)])
      .then(([entriesRes, blockersRes]) => {
        if (!active) return;
        setRows(entriesRes);
        setBlockerRows(blockersRes);
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setBlockerRows([]);
          toast("Couldn't load the team feed. Please retry.", "error");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
```

- [ ] **Step 3: Render the panel** — right after the header `</div>` block that closes the title/mode row (before the `{/* Filters */}` card), add:

```tsx
      {!loading && <TeamBlockersPanel rows={blockerRows} />}
```

- [ ] **Step 4: Typecheck + build + smoke**

Run: `npm run typecheck` (clean) and `npm run build`. Smoke (mock mode): as a manager account with a report who has an open blocker, the Team page shows the "Team blockers" panel oldest-first with the report's name + age. A user with no reports sees no panel.

- [ ] **Step 5: Commit**

```bash
git add components/team/TeamBlockersPanel.tsx "app/(app)/team/page.tsx"
git commit -m "feat: read-only team blockers panel for managers"
```

---

### Task 13: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Type-check the whole app**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in touched files.

- [ ] **Step 3: Run the blocker test suites**

Run: `npx jest lib/tests/blockers.test.ts lib/data/tests/mockRepository.test.ts hooks/tests/useBlockers.test.tsx lib/tests/commands.test.ts`
Expected: all green.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 5: End-to-end browser smoke (mock mode)** — via the preview browser tools:
  1. Add a blocker from the rail → appears with an age badge; empty state gone.
  2. Raise a blocker from a task's ⚠ action → form pre-filled with "Blocked: <task>" + ticket.
  3. Entry with a matching ticket shows the ⚠ "Blocked" flag; tooltip = the reason.
  4. Resolve → moves to "Resolved (N)"; reopen restores it; delete → undo toast re-adds it.
  5. ⌘K → "Add blocker" opens the modal.
  6. Team page (manager account) shows the read-only "Team blockers" panel.
  7. No console errors anywhere.

- [ ] **Step 6: Remind the user of the DB step**

Supabase mode requires the user to run `supabase/migrations/0008_blockers.sql` in the Supabase SQL editor before blockers persist in production. Mock mode needs nothing.

---

## Self-Review

**Spec coverage:** table + enum + RLS (Task 2), types (Task 1), repo interface + mock + Supabase (Tasks 3–4), `useBlockers` (Task 5), `lib/blockers.ts` helpers (Task 1), `BlockersCard` (Task 8), `BlockerForm` (Task 7), inline ⚠ flag (Task 9), raise-from-task (Tasks 9–10), palette command (Tasks 6, 11), dashboard wiring (Task 10), manager team panel (Task 12), tests (Tasks 1, 3, 5), "On hold" left untouched (no enum change anywhere). v1 scope cuts (Insights/PDF) intentionally absent. All spec sections map to a task.

**Placeholder scan:** no "TBD"/"add error handling"/"similar to". Every code and test step shows complete code; every run step gives an exact command + expected outcome.

**Type consistency:** `Blocker`/`BlockerInput`/`BlockerStatus`/`TeamBlockerRow` used identically across tasks; repo methods `listBlockers`/`createBlocker`/`updateBlocker`/`setBlockerStatus`/`deleteBlocker`/`listTeamBlockers` match between interface (Task 3), mock (Task 3), Supabase (Task 4), and hook (Task 5). Hook returns `{ blockers, open, oldestOpenAgeDays, loading, error, refresh, addBlocker, editBlocker, resolveBlocker, reopenBlocker, removeBlocker }`; dashboard (Task 10) consumes exactly those. Helper names (`blockedTicketMap`, `entryBlockReason`, `seedFromEntry`, `toBlockerInput`, `ageTone`, `ageLabel`, `blockerAgeDays`, `openBlockers`, `sortBlockers`) are consistent between Task 1 and all consumers. `AppCommand` `new-blocker` shape (`{ type; seed? }`) matches dispatch (Task 11) and handler (Task 10).
