"use client";

/** Trigger a browser download of a Blob or string payload. */
export function downloadFile(
  filename: string,
  content: Blob | string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Copy text to the clipboard, resolving to whether it succeeded. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
