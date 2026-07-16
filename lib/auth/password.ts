export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** true when acceptable for sign-up (>= 8 chars and score >= 2) */
  acceptable: boolean;
}

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

/** Lightweight, dependency-free password strength estimate. */
export function scorePassword(password: string): PasswordStrength {
  const pw = password ?? "";
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return {
    score: clamped,
    label: LABELS[clamped],
    acceptable: pw.length >= 8 && clamped >= 2,
  };
}
