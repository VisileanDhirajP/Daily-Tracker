"use client";

import { useMemo, useState } from "react";
import { CornerDownLeft, Loader2, Zap } from "lucide-react";
import type { EntryInput } from "@/lib/types";
import { parseQuickEntry } from "@/lib/quickAdd";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatDuration } from "@/lib/format/time";
import { Input } from "@/components/ui/input";

interface QuickAddProps {
  selectedDate: string;
  onAdd: (input: EntryInput) => Promise<void>;
}

/**
 * Keyboard-first capture. Type e.g. "2h dev VS-8301 fixed the leak" and press
 * Enter to log it to the selected day; a live preview shows how it parsed.
 */
export function QuickAdd({ selectedDate, onAdd }: QuickAddProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const parsed = useMemo(() => parseQuickEntry(text), [text]);
  const hasText = text.trim().length > 0;

  const submit = async () => {
    if (!parsed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({
        entry_date: selectedDate,
        task: parsed.task,
        category: parsed.category,
        minutes: parsed.minutes,
        ticket_number: parsed.ticket_number,
        ticket_url: null,
        status: parsed.status,
      });
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  const meta = parsed ? CATEGORY_MAP[parsed.category] : null;

  return (
    <div>
      <div className="relative">
        <Zap
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold"
        />
        <Input
          data-test-id="quick-add-input"
          aria-label="Quick add an entry"
          className="pl-9 pr-10"
          placeholder={'Log fast — e.g. "2h dev VS-8301 fixed the viewer leak"'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {submitting && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        )}
      </div>

      {hasText && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1 text-xs">
          {parsed && meta ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 font-medium text-ink">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
              {parsed.minutes > 0 && (
                <span className="rounded-full bg-canvas px-2 py-0.5 text-muted">
                  {formatDuration(parsed.minutes)}
                </span>
              )}
              {parsed.ticket_number && (
                <span className="rounded-full bg-blue-brand/10 px-2 py-0.5 font-medium text-blue-brand">
                  {parsed.ticket_number}
                </span>
              )}
              <span className="truncate text-muted">“{parsed.task}”</span>
              <span className="ml-auto inline-flex items-center gap-1 text-muted">
                <CornerDownLeft size={12} /> to log
              </span>
            </>
          ) : (
            <span className="text-muted">Keep typing — add a few words describing the task.</span>
          )}
        </div>
      )}
    </div>
  );
}
