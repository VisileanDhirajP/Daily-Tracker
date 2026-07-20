"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry, EntryInput } from "@/lib/types";
import { repository } from "@/lib/data";
import { sortEntries, toEntryInput } from "@/lib/entries";
import { useAuth } from "@/lib/auth/AuthProvider";

interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEntry: (input: EntryInput) => Promise<void>;
  editEntry: (id: string, input: EntryInput) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  /** Re-insert a previously-deleted entry (used for undo). */
  restoreEntry: (entry: Entry) => Promise<void>;
  /** Update a subset of an entry's fields (e.g. just status). */
  patchEntry: (id: string, patch: Partial<EntryInput>) => Promise<void>;
  /** Delete several entries at once. */
  removeMany: (ids: string[]) => Promise<void>;
  /** Apply the same field patch to several entries at once. */
  patchMany: (ids: string[], patch: Partial<EntryInput>) => Promise<void>;
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
      // Capture the pre-edit entry inside the updater so we never rely on a
      // stale `entries` closure (which would let us clobber concurrent edits).
      let prevEntry: Entry | undefined;
      setEntries((prev) => {
        prevEntry = prev.find((e) => e.id === id);
        return sortEntries(
          prev.map((e) =>
            e.id === id ? { ...e, ...input, updated_at: new Date().toISOString() } : e,
          ),
        );
      });
      try {
        const updated = await repository.updateEntry(userId, id, input);
        setEntries((prev) => sortEntries(prev.map((e) => (e.id === id ? updated : e))));
      } catch (e) {
        // Roll back only this entry, leaving any concurrent changes intact.
        setEntries((prev) =>
          sortEntries(prev.map((e) => (e.id === id && prevEntry ? prevEntry! : e))),
        );
        setError(e instanceof Error ? e.message : "Failed to update entry.");
        throw e;
      }
    },
    [userId],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!userId) return;
      setError(null);
      let removed: Entry | undefined;
      setEntries((prev) => {
        removed = prev.find((e) => e.id === id);
        return prev.filter((e) => e.id !== id);
      });
      try {
        await repository.deleteEntry(userId, id);
      } catch (e) {
        if (removed) setEntries((prev) => sortEntries([removed!, ...prev])); // rollback
        setError(e instanceof Error ? e.message : "Failed to delete entry.");
        throw e;
      }
    },
    [userId],
  );

  const restoreEntry = useCallback(
    async (entry: Entry) => {
      await addEntry(toEntryInput(entry));
    },
    [addEntry],
  );

  const patchEntry = useCallback(
    async (id: string, patch: Partial<EntryInput>) => {
      const current = entries.find((e) => e.id === id);
      if (!current) return;
      await editEntry(id, { ...toEntryInput(current), ...patch });
    },
    [entries, editEntry],
  );

  const removeMany = useCallback(
    async (ids: string[]) => {
      if (!userId || ids.length === 0) return;
      setError(null);
      const idSet = new Set(ids);
      let snapshot: Entry[] = [];
      setEntries((prev) => {
        snapshot = prev;
        return prev.filter((e) => !idSet.has(e.id));
      });
      // Settle every delete independently so a partial failure doesn't roll
      // back the ones that already committed server-side.
      const results = await Promise.allSettled(
        ids.map((id) => repository.deleteEntry(userId, id)),
      );
      const failedIds = new Set(
        ids.filter((_, i) => results[i].status === "rejected"),
      );
      if (failedIds.size > 0) {
        const restore = snapshot.filter((e) => failedIds.has(e.id));
        setEntries((prev) => sortEntries([...restore, ...prev]));
        setError("Some entries couldn't be deleted.");
        throw new Error("Partial delete failure");
      }
    },
    [userId],
  );

  const patchMany = useCallback(
    async (ids: string[], patch: Partial<EntryInput>) => {
      if (!userId || ids.length === 0) return;
      setError(null);
      const idSet = new Set(ids);
      const now = new Date().toISOString();
      let snapshot: Entry[] = [];
      setEntries((prev) => {
        snapshot = prev;
        return sortEntries(
          prev.map((e) => (idSet.has(e.id) ? { ...e, ...patch, updated_at: now } : e)),
        );
      });
      const results = await Promise.allSettled(
        ids.map((id) => {
          const e = snapshot.find((x) => x.id === id);
          if (!e) return Promise.resolve(null);
          return repository.updateEntry(userId, id, { ...toEntryInput(e), ...patch });
        }),
      );
      // Reconcile: use the server row for successes, roll failures back to snapshot.
      const reconciled = new Map<string, Entry>();
      results.forEach((r, i) => {
        const id = ids[i];
        if (r.status === "fulfilled" && r.value) {
          reconciled.set(id, r.value as Entry);
        } else if (r.status === "rejected") {
          const orig = snapshot.find((x) => x.id === id);
          if (orig) reconciled.set(id, orig);
        }
      });
      setEntries((prev) => sortEntries(prev.map((e) => reconciled.get(e.id) ?? e)));
      if (results.some((r) => r.status === "rejected")) {
        setError("Some entries couldn't be updated.");
        throw new Error("Partial update failure");
      }
    },
    [userId],
  );

  return {
    entries,
    loading,
    error,
    refresh,
    addEntry,
    editEntry,
    removeEntry,
    restoreEntry,
    patchEntry,
    removeMany,
    patchMany,
  };
}
