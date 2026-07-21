"use client";

import { useCallback, useEffect, useState } from "react";
import type { EntryTemplate, TemplateInput } from "@/lib/types";
import { repository } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthProvider";

interface UseTemplatesResult {
  templates: EntryTemplate[];
  loading: boolean;
  addTemplate: (input: TemplateInput) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
}

/** Loads and mutates the current user's one-tap entry templates. */
export function useTemplates(): UseTemplatesResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [templates, setTemplates] = useState<EntryTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTemplates(await repository.listTemplates(userId));
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTemplate = useCallback(
    async (input: TemplateInput) => {
      if (!userId) return;
      const created = await repository.createTemplate(userId, input);
      setTemplates((prev) => [...prev, created]);
    },
    [userId],
  );

  const removeTemplate = useCallback(
    async (id: string) => {
      if (!userId) return;
      setTemplates((prev) => prev.filter((t) => t.id !== id)); // optimistic
      try {
        await repository.deleteTemplate(userId, id);
      } catch {
        void refresh(); // reconcile on failure
      }
    },
    [userId, refresh],
  );

  return { templates, loading, addTemplate, removeTemplate };
}
