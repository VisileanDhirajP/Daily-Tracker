"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry, EntryInput } from "@/lib/types";
import { repository } from "@/lib/data";
import { sortEntries } from "@/lib/entries";
import { useAuth } from "@/lib/auth/AuthProvider";

interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEntry: (input: EntryInput) => Promise<void>;
  editEntry: (id: string, input: EntryInput) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

/**
 * Loads and mutates the current user's entries via the active repository.
 * Add/edit/delete are optimistic with rollback + error surfacing on failure.
 */
export function useEntries(): UseEntriesResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await repository.listEntries(userId);
      setEntries(sortEntries(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntry = useCallback(
    async (input: EntryInput) => {
      if (!userId) return;
      setError(null);
      try {
        const created = await repository.createEntry(userId, input);
        setEntries((prev) => sortEntries([created, ...prev]));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add entry.");
        throw e;
      }
    },
    [userId],
  );

  const editEntry = useCallback(
    async (id: string, input: EntryInput) => {
      if (!userId) return;
      setError(null);
      const snapshot = entries;
      // Optimistic
      setEntries((prev) =>
        sortEntries(
          prev.map((e) =>
            e.id === id ? { ...e, ...input, updated_at: new Date().toISOString() } : e,
          ),
        ),
      );
      try {
        const updated = await repository.updateEntry(userId, id, input);
        setEntries((prev) => sortEntries(prev.map((e) => (e.id === id ? updated : e))));
      } catch (e) {
        setEntries(snapshot); // rollback
        setError(e instanceof Error ? e.message : "Failed to update entry.");
        throw e;
      }
    },
    [userId, entries],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!userId) return;
      setError(null);
      const snapshot = entries;
      setEntries((prev) => prev.filter((e) => e.id !== id)); // optimistic
      try {
        await repository.deleteEntry(userId, id);
      } catch (e) {
        setEntries(snapshot); // rollback
        setError(e instanceof Error ? e.message : "Failed to delete entry.");
        throw e;
      }
    },
    [userId, entries],
  );

  return { entries, loading, error, refresh, addEntry, editEntry, removeEntry };
}
