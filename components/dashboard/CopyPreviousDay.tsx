"use client";

import { useMemo, useState } from "react";
import { CopyPlus, Loader2 } from "lucide-react";
import type { Entry, EntryInput } from "@/lib/types";
import { entriesOn, lastLoggedDayBefore, toEntryInput } from "@/lib/entries";
import { relativeLabel } from "@/lib/format/date";

interface CopyPreviousDayProps {
  entries: Entry[];
  selectedDate: string;
  onCopy: (inputs: EntryInput[]) => Promise<void>;
}

/**
 * "Today was like yesterday." When the selected day has nothing logged yet,
 * offer to copy the most recent earlier day's entries onto it. Hidden once the
 * day has any entry, or when there's no earlier day to copy from.
 */
export function CopyPreviousDay({ entries, selectedDate, onCopy }: CopyPreviousDayProps) {
  const [busy, setBusy] = useState(false);

  const source = useMemo(() => {
    if (entriesOn(entries, selectedDate).length > 0) return null;
    return lastLoggedDayBefore(entries, selectedDate);
  }, [entries, selectedDate]);

  const sourceEntries = useMemo(
    () => (source ? entriesOn(entries, source) : []),
    [entries, source],
  );

  if (!source || sourceEntries.length === 0) return null;

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onCopy(
        sourceEntries.map((e) => ({ ...toEntryInput(e), entry_date: selectedDate })),
      );
    } finally {
      setBusy(false);
    }
  };

  const n = sourceEntries.length;

  return (
    <button
      type="button"
      data-test-id="copy-previous-day"
      onClick={handle}
      disabled={busy}
      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-dashed border-hairline px-3 py-2 text-sm text-muted transition-colors hover:border-blue-light hover:bg-blue-brand/5 hover:text-blue-brand disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <CopyPlus size={15} />}
      Copy {n} {n === 1 ? "entry" : "entries"} from {relativeLabel(source, selectedDate).toLowerCase()}
    </button>
  );
}
