import type { DataRepository } from "./repository";
import type { Entry, EntryInput, Profile } from "../types";
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
    patch: Partial<Pick<Profile, "full_name" | "manager_email">>,
  ): Promise<Profile> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
