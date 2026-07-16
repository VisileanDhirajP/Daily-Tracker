export type DataMode = "mock" | "supabase";

/** Resolved once at module load. Defaults to "mock" so the app runs with no setup. */
export const DATA_MODE: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "supabase" ? "supabase" : "mock";

export const IS_MOCK = DATA_MODE === "mock";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
