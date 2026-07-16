import type { Entry, EntryInput, Profile } from "../types";

/**
 * Storage-agnostic data access. Two implementations exist — a localStorage mock
 * and a Supabase-backed one — selected by `NEXT_PUBLIC_DATA_MODE`.
 *
 * Every method is scoped to the *current* authenticated user; the caller passes
 * the user id so the same interface works in both modes (mock has no server
 * session, Supabase derives it from the JWT + RLS).
 */
export interface DataRepository {
  listEntries(userId: string): Promise<Entry[]>;
  createEntry(userId: string, input: EntryInput): Promise<Entry>;
  updateEntry(userId: string, id: string, input: EntryInput): Promise<Entry>;
  deleteEntry(userId: string, id: string): Promise<void>;

  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name" | "manager_email">>,
  ): Promise<Profile>;
}
