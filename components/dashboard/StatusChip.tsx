import { Check, CircleDashed, PauseCircle, type LucideIcon } from "lucide-react";
import type { EntryStatus } from "@/lib/types";

/**
 * Status indicator. "Done" uses a green tick as a *status* signal (not a brand
 * colour — the brand palette stays blue-led per VisiLean guidelines).
 */
const STYLES: Record<
  EntryStatus,
  { label: string; icon: LucideIcon; bg: string; fg: string }
> = {
  done: { label: "Done", icon: Check, bg: "#e7f6ec", fg: "#1f8a4c" },
  progress: { label: "In progress", icon: CircleDashed, bg: "#e6f0fa", fg: "#1e5c96" },
  hold: { label: "On hold", icon: PauseCircle, bg: "#fbf1d5", fg: "#8f6606" },
};

export function StatusChip({ status }: { status: EntryStatus }) {
  const s = STYLES[status];
  const Icon = s.icon;
  return (
    <span
      className="chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={
        { backgroundColor: s.bg, color: s.fg, "--chip-color": s.fg } as React.CSSProperties
      }
    >
      <Icon size={12} strokeWidth={status === "done" ? 3 : 2} />
      {s.label}
    </span>
  );
}
