"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { scorePassword } from "@/lib/auth/password";

export default function ResetPasswordPage() {
  const { updatePassword, isMock, user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!scorePassword(password).acceptable)
      return setError("Choose a stronger password (8+ chars, mix of types).");
    if (password !== confirm) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      await updatePassword(password);
      if (isMock) {
        // In mock mode updatePassword is a no-op, so don't claim it was saved.
        toast("Demo mode — password changes aren't saved.", "info");
        router.replace("/login");
      } else {
        // The recovery link already established a live session, so the user is
        // signed in — take them straight in rather than bouncing via /login.
        toast("Password updated.", "success");
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

  // In Supabase mode the reset link must establish a recovery session. While it
  // resolves, show a spinner; if there's no session (expired / already-used /
  // opened on a different device), guide the user to request a fresh link.
  if (!isMock && loading) {
    return (
      <AuthShell title="Set a new password">
        <div className="flex items-center justify-center gap-2 py-8 text-muted">
          <Loader2 size={18} className="animate-spin" /> Checking your link…
        </div>
      </AuthShell>
    );
  }

  if (!isMock && !user) {
    return (
      <AuthShell title="Reset link expired">
        <p className="text-sm text-muted">
          This password reset link is invalid or has already been used. Request a
          new one and we&apos;ll email you a fresh link.
        </p>
        <Link
          href="/forgot-password"
          className="btn-cta mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm"
          data-test-id="request-new-link"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose something strong.">
      {isMock && (
        <p className="mb-4 rounded-xl border border-hairline bg-canvas p-3 text-xs text-muted">
          Demo mode: password changes aren&apos;t persisted. This screen is wired for
          Supabase mode.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="New password"
          type="password"
          testId="reset-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirm password"
          type="password"
          testId="reset-confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={error}
        />
        <button
          type="submit"
          disabled={submitting}
          data-test-id="reset-submit"
          className="btn-cta flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
