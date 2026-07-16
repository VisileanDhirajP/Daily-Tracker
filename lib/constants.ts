import type { Category, EntryStatus } from "./types";

export interface CategoryMeta {
  value: Category;
  label: string;
  /** solid dot / accent colour */
  color: string;
  /** soft chip background */
  bg: string;
  /** chip ink colour */
  ink: string;
}

/** Category chip palette — distinct, modern, no green (per VisiLean brand). */
export const CATEGORIES: CategoryMeta[] = [
  { value: "dev", label: "Development", color: "#123E66", bg: "#e6edf5", ink: "#123E66" },
  { value: "meeting", label: "Meeting", color: "#2E7CC4", bg: "#e6f0fa", ink: "#1e5c96" },
  { value: "review", label: "Review / QA", color: "#F37E31", bg: "#fdefe4", ink: "#bd5a19" },
  { value: "docs", label: "Documentation", color: "#E0A011", bg: "#fbf1d5", ink: "#8f6606" },
  { value: "support", label: "Support", color: "#1499C9", bg: "#e3f4fb", ink: "#0d6d90" },
  { value: "planning", label: "Planning", color: "#7C5CD6", bg: "#efeafb", ink: "#593fae" },
  { value: "other", label: "Other", color: "#64748B", bg: "#eef1f5", ink: "#4a5666" },
];

export const CATEGORY_MAP: Record<Category, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.value] = c;
    return acc;
  },
  {} as Record<Category, CategoryMeta>,
);

export const STATUS_META: Record<
  EntryStatus,
  { label: string; short: string; emoji: string }
> = {
  progress: { label: "In progress", short: "in progress", emoji: "🔄" },
  hold: { label: "On hold", short: "on hold", emoji: "⏸️" },
  done: { label: "Done", short: "done", emoji: "✅" },
};

/** Status options in display order (drives the form toggle). */
export const STATUS_ORDER: EntryStatus[] = ["progress", "hold", "done"];

export const APP_NAME = "Daily Tracker";
