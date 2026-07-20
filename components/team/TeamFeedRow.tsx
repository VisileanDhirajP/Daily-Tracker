import type { TeamFeedRow as TeamFeedRowData } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatDuration } from "@/lib/format/time";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryChip } from "@/components/dashboard/CategoryChip";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { TicketPill } from "@/components/dashboard/TicketPill";

/** Initials for the employee avatar (e.g. "Alex Kim" → "AK"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * A single read-only entry in the manager team feed. Purely presentational —
 * no checkbox, status control, or edit/delete actions (managers can't mutate
 * others' entries). Reuses the shared chips so it matches the dashboard.
 */
export function TeamFeedRow({ row }: { row: TeamFeedRowData }) {
  const meta = CATEGORY_MAP[row.category];

  return (
    <div
      data-test-id="team-feed-row"
      className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-hairline bg-card py-2 pl-4 pr-3"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: meta.color }}
      />

      <Tooltip label={row.employee.email || row.employee.full_name}>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-brand/10 text-[11px] font-semibold text-blue-brand"
          aria-hidden="true"
        >
          {initials(row.employee.full_name)}
        </span>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <Tooltip label={row.task} align="start">
          <p className="truncate text-sm font-medium text-ink">{row.task}</p>
        </Tooltip>
        <p className="truncate text-xs text-muted">{row.employee.full_name}</p>
      </div>

      <div className="hidden shrink-0 items-center sm:flex">
        <CategoryChip category={row.category} />
      </div>

      <span className="hidden w-14 shrink-0 text-right text-xs text-muted md:block">
        {row.minutes > 0 ? formatDuration(row.minutes) : "—"}
      </span>

      <div className="hidden max-w-[10rem] shrink-0 lg:block">
        <TicketPill ticketNumber={row.ticket_number} ticketUrl={row.ticket_url} />
      </div>

      <div className="shrink-0">
        <StatusChip status={row.status} />
      </div>
    </div>
  );
}
