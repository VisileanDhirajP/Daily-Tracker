import type { Entry } from "../types";
import { groupByDay, sumMinutes, type DayGroup } from "../entries";

export interface ReportMeta {
  userName: string;
  rangeLabel: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface ReportModel {
  meta: ReportMeta;
  groups: DayGroup[];
  totalMinutes: number;
  entryCount: number;
  dayCount: number;
}

/** Build the grouped, totalled report model shared by the preview and PDF. */
export function buildReport(entries: Entry[], meta: ReportMeta): ReportModel {
  const groups = groupByDay(entries);
  return {
    meta,
    groups,
    totalMinutes: sumMinutes(entries),
    entryCount: entries.length,
    dayCount: groups.length,
  };
}

/** A filesystem-safe slug for the report filename. */
export function reportFilename(meta: ReportMeta, ext: string): string {
  const label = meta.rangeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `daily-tracker-${label}-${meta.from}_to_${meta.to}.${ext}`;
}
