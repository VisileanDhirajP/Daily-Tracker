import { ArrowUpRight, Ticket } from "lucide-react";
import { sanitizeUrl } from "@/lib/security/url";

interface TicketPillProps {
  ticketNumber: string | null;
  ticketUrl: string | null;
}

/**
 * Ticket pill. When a valid http(s) URL is present it renders as a link opening
 * in a new tab; otherwise a plain (non-clickable) pill. URLs are sanitised so
 * `javascript:` / `data:` never reach the anchor.
 */
export function TicketPill({ ticketNumber, ticketUrl }: TicketPillProps) {
  if (!ticketNumber && !ticketUrl) return null;

  const safeUrl = sanitizeUrl(ticketUrl);
  const label = ticketNumber || safeUrl || "";

  if (safeUrl) {
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-test-id="ticket-pill-link"
        className="group inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-blue-light bg-blue-brand/5 px-2.5 py-1 text-xs font-medium text-blue-brand transition-colors hover:bg-blue-brand hover:text-white"
        title={ticketNumber ? `${ticketNumber} — open ticket` : "Open ticket"}
      >
        <Ticket size={12} className="shrink-0" />
        <span className="truncate">{label}</span>
        <ArrowUpRight size={12} className="shrink-0 opacity-70 group-hover:opacity-100" />
      </a>
    );
  }

  return (
    <span
      data-test-id="ticket-pill-plain"
      className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-muted"
    >
      <Ticket size={12} />
      {label}
    </span>
  );
}
