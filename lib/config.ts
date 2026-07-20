export type DataMode = "mock" | "supabase";

/** Resolved once at module load. Defaults to "mock" so the app runs with no setup. */
export const DATA_MODE: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "supabase" ? "supabase" : "mock";

export const IS_MOCK = DATA_MODE === "mock";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Fail loud on a misconfigured production deploy rather than silently serving a
// localStorage demo or pointing auth links at localhost.
if (process.env.NODE_ENV === "production") {
  if (!process.env.NEXT_PUBLIC_DATA_MODE) {
    console.warn(
      "[config] NEXT_PUBLIC_DATA_MODE is unset in production — defaulting to 'mock' " +
        "(browser localStorage, no persistence). Set it to 'supabase'.",
    );
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.warn(
      "[config] NEXT_PUBLIC_SITE_URL is unset in production — auth confirmation / " +
        "password-reset links will point to localhost.",
    );
  }
}
