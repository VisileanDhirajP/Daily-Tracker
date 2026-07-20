/**
 * Daily Tracker is an internal VisiLean tool — only company emails may register.
 * Enforced in the UI (fast feedback) AND by a DB trigger on auth.users (the real
 * gate; see migration 0004). Keep this domain in sync with that trigger.
 */
export const COMPANY_EMAIL_DOMAIN = "visilean.com";

export const COMPANY_TOOL_MESSAGE =
  "Daily Tracker is an internal VisiLean tool — please sign up with your @visilean.com email.";

/** True only when `email` is a well-formed address on the company domain. */
export function isCompanyEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === COMPANY_EMAIL_DOMAIN;
}
