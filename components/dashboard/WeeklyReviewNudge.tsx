"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ArrowRight, X } from "lucide-react";
import type { Entry } from "@/lib/types";
import { inRange, sumMinutes } from "@/lib/entries";
import { toHours } from "@/lib/format/time";
import { todayISO } from "@/lib/format/date";
import { currentWeek, reviewDue } from "@/lib/weekly";

const KEY = "vldt:review-dismissed";

/**
 * A gentle end-of-week nudge (Fri–Sun) summarising the week so far with a link
 * to Insights. Dismissible per week (remembered in localStorage). Renders
 * nothing outside the window or once dismissed for the current week.
 */
export function WeeklyReviewNudge({ entries }: { entries: Entry[] }) {
  const [mounted, setMounted] = useState(false);
  const [dismissedWeek, setDismissedWeek] = useState<string | null>(null);

  const today = todayISO();
  const { start, end } = currentWeek(today);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissedWeek(localStorage.getItem(KEY));
    } catch {
      /* ignore */
    }
  }, []);

  if (!mounted || !reviewDue(today) || dismissedWeek === start) return null;

  const scoped = inRange(entries, start, end);
  const minutes = sumMinutes(scoped);
  const days = new Set(scoped.map((e) => e.entry_date)).size;

  const dismiss = () => {
    setDismissedWeek(start);
    try {
      localStorage.setItem(KEY, start);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      data-test-id="weekly-review-nudge"
      className="mb-4 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-3.5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-[#8f6606]">
        <CalendarCheck size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">Wrap up your week</p>
        <p className="text-xs text-muted">
          {minutes > 0
            ? `${toHours(minutes)}h across ${scoped.length} ${scoped.length === 1 ? "entry" : "entries"} on ${days} ${days === 1 ? "day" : "days"} so far.`
            : "Nothing logged this week yet — add today's work before you sign off."}
        </p>
      </div>
      <Link
        href="/insights"
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-deep"
        data-test-id="weekly-review-open"
      >
        Review <ArrowRight size={13} />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss weekly review"
        data-test-id="weekly-review-dismiss"
        className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-white/50 hover:text-ink"
      >
        <X size={15} />
      </button>
    </div>
  );
}
