/**
 * Escape a string for safe inclusion in HTML/PDF text nodes.
 * React already escapes JSX children, but export builders (CSV/PDF/mailto/plain
 * text) bypass React, so we escape explicitly there.
 */
export function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a single CSV field per RFC 4180 (quote wrap + doubled quotes). */
export function escapeCsv(input: string | number | null | undefined): string {
  const s = String(input ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
