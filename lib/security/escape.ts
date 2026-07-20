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

/**
 * Escape a single CSV field per RFC 4180 (quote wrap + doubled quotes), and
 * neutralise spreadsheet formula injection: a field beginning with = + - @ (or
 * a leading tab/CR) is prefixed with a `'` so Excel/Sheets treats it as text,
 * not a live formula. The exported CSV is meant to open in a spreadsheet, so
 * this guard matters for user-entered task/ticket values.
 */
export function escapeCsv(input: string | number | null | undefined): string {
  let s = String(input ?? "");
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
