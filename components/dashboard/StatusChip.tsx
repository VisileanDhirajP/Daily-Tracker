import { Check, CircleDashed } from "lucide-react";
import type { EntryStatus } from "@/lib/types";

/**
 * Status indicator. "Done" uses a green tick — as a *status* signal, not a
 * brand colour (brand palette stays blue-led per VisiLean guidelines).
 */
export function StatusChip({ status }: { status: EntryStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f6ec] px-2.5 py-1 text-xs font-medium text-[#1f8a4c]">
        <Check size={12} strokeWidth={3} />
        Done
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f0fa] px-2.5 py-1 text-xs font-medium text-[#1e5c96]">
      <CircleDashed size={12} />
      In progress
    </span>
  );
}
