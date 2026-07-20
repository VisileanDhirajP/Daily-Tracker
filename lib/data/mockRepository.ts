import type { DataRepository } from "./repository";
import type { AuthUser, Entry, EntryInput, Profile, TeamFeedRow, UserRole } from "../types";
import { buildSeedEntries } from "./seed";

const ENTRIES_KEY = (uid: string) => `vldt:entries:${uid}`;
const PROFILES_KEY = "vldt:profiles"; // single map: { [userId]: Profile }

/** In-memory fallback when localStorage is unavailable (SSR / tests). */
const memory = new Map<string, string>();

function read(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return memory.has(key) ? memory.get(key)! : null;
}

function write(key: string, value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, value);
    return;
  }
  memory.set(key, value);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function loadEntries(userId: string): Entry[] {
  const raw = read(ENTRIES_KEY(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(userId: string, entries: Entry[]): void {
  write(ENTRIES_KEY(userId), JSON.stringify(entries));
}

function loadProfiles(): Record<string, Profile> {
  const raw = read(PROFILES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, Profile>) : {};
  } catch {
    return {};
  }
}

function saveProfiles(map: Record<string, Profile>): void {
  write(PROFILES_KEY, JSON.stringify(map));
}

function isoNow(): string {
  return new Date().toISOString();
}

function defaultProfile(userId: string): Profile {
  return {
    id: userId,
    full_name: "",
    email: null,
    manager_emails: [],
    role: "user",
    created_at: isoNow(),
  };
}

/**
 * Seed a mock user with demo entries the first time. Called by the mock auth
 * layer; kept out of the DataRepository interface so the Supabase path stays
 * clean. `specs` are the pre-built entries; omit to use the default rich set.
 */
export function seedMockUser(userId: string, entries?: Entry[]): void {
  if (read(ENTRIES_KEY(userId)) !== null) return; // already provisioned
  saveEntries(userId, entries ?? buildSeedEntries(userId));
}

/**
 * Provision a full mock profile (role/email/managers), used only by seeding.
 * By default skips if a profile already exists so it never clobbers in-app
 * changes (e.g. an admin promoting someone via /admin). `force` overwrites —
 * used on a seed-version bump to reset the authoritative demo roster.
 */
export function seedMockProfile(profile: Profile, force = false): void {
  const map = loadProfiles();
  if (map[profile.id] && !force) return;
  map[profile.id] = profile;
  saveProfiles(map);
}

export const mockRepository: DataRepository = {
  async listEntries(userId: string): Promise<Entry[]> {
    return loadEntries(userId);
  },

  async createEntry(userId: string, input: EntryInput): Promise<Entry> {
    const entries = loadEntries(userId);
    const now = isoNow();
    const entry: Entry = {
      id: newId(),
      user_id: userId,
      created_at: now,
      updated_at: now,
      ...input,
    };
    entries.push(entry);
    saveEntries(userId, entries);
    return entry;
  },

  async updateEntry(userId: string, id: string, input: EntryInput): Promise<Entry> {
    const entries = loadEntries(userId);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Entry not found");
    const updated: Entry = {
      ...entries[idx],
      ...input,
      updated_at: isoNow(),
    };
    entries[idx] = updated;
    saveEntries(userId, entries);
    return updated;
  },

  async deleteEntry(userId: string, id: string): Promise<void> {
    const entries = loadEntries(userId).filter((e) => e.id !== id);
    saveEntries(userId, entries);
  },

  async getProfile(userId: string): Promise<Profile | null> {
    return loadProfiles()[userId] ?? null;
  },

  async updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name">>,
  ): Promise<Profile> {
    const map = loadProfiles();
    const existing = map[userId] ?? defaultProfile(userId);
    const next: Profile = { ...existing, ...patch };
    map[userId] = next;
    saveProfiles(map);
    return next;
  },

  async listTeamEntries(manager: AuthUser): Promise<TeamFeedRow[]> {
    const mgr = manager.email.trim().toLowerCase();
    const team = Object.values(loadProfiles()).filter((p) =>
      p.manager_emails.some((e) => e.trim().toLowerCase() === mgr),
    );
    const rows: TeamFeedRow[] = [];
    for (const p of team) {
      for (const e of loadEntries(p.id)) {
        rows.push({
          ...e,
          employee: { id: p.id, full_name: p.full_name, email: p.email ?? "" },
        });
      }
    }
    rows.sort((a, b) =>
      a.entry_date === b.entry_date
        ? b.created_at.localeCompare(a.created_at)
        : b.entry_date.localeCompare(a.entry_date),
    );
    return rows;
  },

  async listAllProfiles(): Promise<Profile[]> {
    return Object.values(loadProfiles()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    );
  },

  async setUserRole(targetUserId: string, role: UserRole): Promise<Profile> {
    const map = loadProfiles();
    const existing = map[targetUserId] ?? defaultProfile(targetUserId);
    const next: Profile = { ...existing, role };
    map[targetUserId] = next;
    saveProfiles(map);
    return next;
  },

  async setUserManagers(targetUserId: string, managerEmails: string[]): Promise<Profile> {
    const map = loadProfiles();
    const existing = map[targetUserId] ?? defaultProfile(targetUserId);
    const next: Profile = { ...existing, manager_emails: managerEmails };
    map[targetUserId] = next;
    saveProfiles(map);
    return next;
  },
};
