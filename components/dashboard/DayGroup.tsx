"use client";

import { Copy } from "lucide-react";
import type { Entry } from "@/lib/types";
import type { DayGroup as DayGroupModel } from "@/lib/entries";
import { formatDuration } from "@/lib/format/time";
import { formatLongDate, relativeLabel } from "@/lib/format/date";
import { buildDaySummary } from "@/lib/export/daySummary";
import { copyToClipboard } from "@/lib/export/download";
import { useToast } from "@/components/ui/ToastProvider";
import { EntryCard } from "./EntryCard";

interface DayGroupProps {
  group: DayGroupModel;
  editingId: string | null;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

export function DayGroup({
  group,
  editingId,
  onEdit,
  onDuplicate,
  onDelete,
}: DayGroupProps) {
  const { toast } = useToast();
  const rel = relativeLabel(group.date);

  const handleCopy = async () => {
    const ok = await copyToClipboard(buildDaySummary(group.date, group.entries));
    toast(
      ok ? "EOD summary copied — paste it into Slack." : "Couldn't copy to clipboard.",
      ok ? "success" : "error",
    );
  };

  return (
    <section className="group/day mb-6" data-test-id="day-group">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-hairline pb-2">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3 className="text-sm font-bold text-navy">{formatLongDate(group.date)}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              rel === "Today"
                ? "bg-gold/25 text-[#8f6606]"
                : "bg-blue-brand/10 text-blue-brand"
            }`}
          >
            {rel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs font-medium text-muted">
            {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
            <span className="px-1 text-hairline">·</span>
            {formatDuration(group.totalMinutes)}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            data-test-id="copy-day-button"
            aria-label={`Copy ${formatLongDate(group.date)} summary`}
            className="rounded-lg p-1.5 text-muted transition-opacity hover:bg-canvas hover:text-blue-brand sm:opacity-0 sm:group-hover/day:opacity-100"
            title="Copy day summary"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {group.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            editing={editingId === entry.id}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
