import type { DataRepository } from "./repository";
import type {
  AuthUser,
  Entry,
  EntryInput,
  Profile,
  TeamFeedRow,
  UserRole,
} from "../types";
import { createClient } from "../supabase/client";

/**
 * Supabase-backed repository. RLS policies (user_id = auth.uid()) are the real
 * access gate; the explicit `.eq("user_id", userId)` filters are belt-and-braces.
 */
export const supabaseRepository: DataRepository = {
  async listEntries(userId: string): Promise<Entry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Entry[];
  },

  async createEntry(userId: string, input: EntryInput): Promise<Entry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("entries")
      .insert({ ...input, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    return data as Entry;
  },

  async updateEntry(userId: string, id: string, input: EntryInput): Promise<Entry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("entries")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Entry;
  },

  async deleteEntry(userId: string, id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as Profile) ?? null;
  },

  async updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name">>,
  ): Promise<Profile> {
    const supabase = createClient();
    // Upsert (not update) so a brand-new user with no profile row yet still
    // succeeds, matching the mock repository's create-if-missing behavior.
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...patch }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async listTeamEntries(manager: AuthUser): Promise<TeamFeedRow[]> {
    const supabase = createClient();
    // RLS ("entries_select_team"/"entries_select_admin") already narrows the
    // rows to this manager's team. We resolve author identity with a second
    // query rather than a PostgREST embed, since entries and profiles share no
    // direct FK (both only reference auth.users).
    const { data: entries, error } = await supabase
      .from("entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (entries ?? []) as Entry[];
    if (rows.length === 0) return [];

    const ids = [...new Set(rows.map((e) => e.user_id))];
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
    return rows.map((e) => ({
      ...e,
      employee: byId.get(e.user_id) ?? { id: e.user_id, full_name: "Unknown", email: "" },
    }));
  },

  async listAllProfiles(): Promise<Profile[]> {
    const supabase = createClient();
    // RLS ("profiles_select_admin") restricts this to admins.
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Profile[];
  },

  async setUserRole(targetUserId: string, role: UserRole): Promise<Profile> {
    const supabase = createClient();
    // Enforced twice server-side: RLS ("profiles_update_admin") + the
    // guard trigger. This is UX plumbing, not the security gate.
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", targetUserId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async setUserManagers(targetUserId: string, managerEmails: string[]): Promise<Profile> {
    const supabase = createClient();
    // Admin-only (RLS "profiles_update_admin" + guard trigger).
    const { data, error } = await supabase
      .from("profiles")
      .update({ manager_emails: managerEmails })
      .eq("id", targetUserId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
