/**
 * Sanitise a user-supplied ticket URL.
 *
 * Rules:
 *  - Only `http:` / `https:` schemes are allowed.
 *  - A bare `www.` host (no scheme) is upgraded to `https://`.
 *  - `javascript:`, `data:`, `vbscript:`, `file:`, etc. are rejected.
 *  - Returns a normalised absolute URL string, or `null` if invalid.
 *
 * This matters because exported/opened data may originate from others, and the
 * URL is rendered into an anchor with `target="_blank"`.
 */
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // Reject obviously dangerous schemes early (case/space-insensitive).
  const lowered = trimmed.toLowerCase().replace(/\s+/g, "");
  if (
    lowered.startsWith("javascript:") ||
    lowered.startsWith("data:") ||
    lowered.startsWith("vbscript:") ||
    lowered.startsWith("file:")
  ) {
    return null;
  }

  // Upgrade scheme-less hosts.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  // Require a real host.
  if (!url.hostname || !url.hostname.includes(".")) {
    return null;
  }

  return url.toString();
}

/** True when the raw value sanitises to a usable link. */
export function isValidUrl(raw: string | null | undefined): boolean {
  return sanitizeUrl(raw) !== null;
}
