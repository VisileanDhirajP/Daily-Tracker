import type { DataRepository } from "./repository";
import type { Entry, EntryInput, Profile } from "../types";
import { buildSeedEntries } from "./seed";

const ENTRIES_KEY = (uid: string) => `vldt:entries:${uid}`;
const PROFILE_KEY = (uid: string) => `vldt:profile:${uid}`;

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

/**
 * Seed a mock user with demo entries the first time. Called by the mock auth
 * layer for the built-in demo account; kept out of the DataRepository interface
 * so the Supabase path stays clean.
 */
export function seedMockUser(userId: string): void {
  if (read(ENTRIES_KEY(userId)) !== null) return; // already provisioned
  saveEntries(userId, buildSeedEntries(userId));
}

function isoNow(): string {
  return new Date().toISOString();
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
    const raw = read(PROFILE_KEY(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  },

  async updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name" | "manager_email">>,
  ): Promise<Profile> {
    const existing = (await this.getProfile(userId)) ?? {
      id: userId,
      full_name: "",
      manager_email: null,
      created_at: isoNow(),
    };
    const next: Profile = { ...existing, ...patch };
    write(PROFILE_KEY(userId), JSON.stringify(next));
    return next;
  },
};
