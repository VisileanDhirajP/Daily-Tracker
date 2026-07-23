"use client";

import { Clock, List, CalendarCheck, TrendingUp } from "lucide-react";
import type { ReportModel } from "@/lib/export/report";
import type { EntryStatus } from "@/lib/types";
import { APP_NAME, CATEGORY_MAP } from "@/lib/constants";
import { toHours, formatDuration } from "@/lib/format/time";
import { formatLongDate, formatShortDate, toISODate } from "@/lib/format/date";
import { Wordmark } from "@/components/brand/Wordmark";

// Fixed "paper" palette so the preview mirrors the (always-light) exported PDF,
// independent of the app's light/dark theme.
const INK = "#132430";
const NAVY = "#123E66";
const MUTED = "#647587";
const HAIRLINE = "#e6edf5";
const PANEL = "#f6f9fc";
const ZEBRA = "#f7fafc";

const STATUS: Record<EntryStatus, { label: string; color: string; bg: string }> = {
  done: { label: "Done", color: "#1f7a45", bg: "#e5f3ea" },
  hold: { label: "On hold", color: "#8f6606", bg: "#fbf1d5" },
  progress: { label: "In progress", color: "#1e5c96", bg: "#e6f0fa" },
};

const STAT_ICON = { clock: Clock, list: List, calendar: CalendarCheck, trend: TrendingUp };

export function ReportPreview({
  model,
  loading = false,
}: {
  model: ReportModel;
  loading?: boolean;
}) {
  const { meta } = model;

  if (loading) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-hairline shadow-card"
        data-test-id="report-preview-loading"
        aria-busy="true"
        aria-label="Building preview"
      >
        <div className="brand-header border-b-[3px] border-gold px-6 py-5">
          <div className="h-4 w-32 animate-pulse rounded bg-white/25" />
          <div className="mt-4 h-6 w-44 animate-pulse rounded bg-white/25" />
          <div className="mt-2 h-3.5 w-28 animate-pulse rounded bg-white/20" />
        </div>
        <div className="bg-white p-6">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[#eef2f8]" />
            ))}
          </div>
          <div className="mb-6 h-2.5 w-full animate-pulse rounded-full bg-[#eef2f8]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-4">
              <div className="mb-1.5 h-7 w-full animate-pulse rounded-md bg-[#f2f6fb]" />
              <div className="h-9 w-full animate-pulse rounded-md bg-[#f7fafc]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (model.entryCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline p-10 text-center text-sm text-muted">
        No entries in this range. Pick a different range or log some work first.
      </div>
    );
  }

  const entries = model.groups.flatMap((g) => g.entries);
  const catMap = new Map<string, number>();
  for (const e of entries) catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.minutes);
  const slices = [...catMap.entries()]
    .map(([category, minutes]) => ({
      category: category as keyof typeof CATEGORY_MAP,
      minutes,
      meta: CATEGORY_MAP[category as keyof typeof CATEGORY_MAP],
    }))
    .sort((a, b) => b.minutes - a.minutes);
  const avg = model.dayCount > 0 ? toHours(Math.round(model.totalMinutes / model.dayCount)) : "0";
  const generated = formatShortDate(toISODate(new Date()));

  const stats = [
    { icon: "clock" as const, color: NAVY, bg: "#e6edf5", value: `${toHours(model.totalMinutes)}h`, label: "Total time" },
    { icon: "list" as const, color: "#2E7CC4", bg: "#e6f0fa", value: `${model.entryCount}`, label: "Entries" },
    { icon: "calendar" as const, color: "#F37E31", bg: "#fdefe4", value: `${model.dayCount}`, label: "Active days" },
    { icon: "trend" as const, color: "#7C5CD6", bg: "#efeafb", value: `${avg}h`, label: "Avg / day" },
  ];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-hairline shadow-card"
      data-test-id="report-preview"
    >
      {/* Header — navy band + gold accent rule */}
      <div className="brand-header border-b-[3px] border-gold px-6 py-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <Wordmark onDark size="sm" />
          <span className="text-xs text-blue-light">
            {formatShortDate(meta.from)} – {formatShortDate(meta.to)}
          </span>
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          Activity report
        </p>
        <p className="mt-1 text-xl font-bold text-white">{meta.userName}</p>
        <p className="mt-0.5 text-sm text-blue-light">{meta.rangeLabel}</p>
      </div>

      {/* Paper body */}
      <div className="bg-white p-6" style={{ color: INK }}>
        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = STAT_ICON[s.icon];
            return (
              <div
                key={s.label}
                className="flex items-center gap-2.5 rounded-xl border p-3"
                style={{ borderColor: HAIRLINE, backgroundColor: "#fff" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: s.bg }}
                >
                  <Icon size={17} style={{ color: s.color }} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none" style={{ color: NAVY }}>
                    {s.value}
                  </p>
                  <p
                    className="mt-1 text-[10px] uppercase tracking-wide"
                    style={{ color: MUTED }}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time by category */}
        {model.totalMinutes > 0 && slices.length > 0 && (
          <div className="mb-5">
            <p
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: MUTED }}
            >
              Time by category
            </p>
            <div
              className="flex h-2.5 overflow-hidden rounded-full"
              style={{ backgroundColor: HAIRLINE }}
            >
              {slices.map((c) => (
                <div
                  key={c.category}
                  style={{ flexGrow: c.minutes, backgroundColor: c.meta.color }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {slices.map((c) => (
                <span key={c.category} className="inline-flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.meta.color }}
                  />
                  <span style={{ color: INK }}>{c.meta.label}</span>
                  <span style={{ color: MUTED }}>
                    {toHours(c.minutes)}h · {Math.round((c.minutes / model.totalMinutes) * 100)}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Day sections */}
        {model.groups.map((g) => (
          <div key={g.date} className="mb-4">
            <div
              className="mb-1 flex items-center justify-between rounded-md border-l-[3px] px-3 py-1.5"
              style={{ backgroundColor: "#f2f6fb", borderColor: NAVY }}
            >
              <h3 className="text-sm font-bold" style={{ color: NAVY }}>
                {formatLongDate(g.date)}
              </h3>
              <span className="text-xs" style={{ color: MUTED }}>
                {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"} ·{" "}
                {formatDuration(g.totalMinutes)}
              </span>
            </div>
            <div>
              {g.entries.map((e, i) => {
                const st = STATUS[e.status];
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2"
                    style={{ backgroundColor: i % 2 === 1 ? ZEBRA : "transparent" }}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm" style={{ color: INK }}>
                      {e.task}
                    </span>
                    <span
                      className="hidden shrink-0 items-center gap-1.5 text-xs sm:flex"
                      style={{ color: MUTED }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_MAP[e.category].color }}
                      />
                      {CATEGORY_MAP[e.category].label}
                    </span>
                    <span
                      className="hidden w-20 shrink-0 truncate text-xs md:block"
                      style={{ color: MUTED }}
                    >
                      {e.ticket_number ?? "—"}
                    </span>
                    <span
                      className="w-14 shrink-0 text-right text-sm font-bold"
                      style={{ color: NAVY }}
                    >
                      {e.minutes > 0 ? formatDuration(e.minutes) : "—"}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div
          className="mt-2 flex items-center justify-between border-t pt-3 text-[11px]"
          style={{ borderColor: HAIRLINE, color: MUTED }}
        >
          <span>
            {APP_NAME} · Generated {generated}
          </span>
        </div>
      </div>
    </div>
  );
}
