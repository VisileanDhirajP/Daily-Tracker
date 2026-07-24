"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
