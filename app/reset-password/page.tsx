"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { scorePassword } from "@/lib/auth/password";

export default function ResetPasswordPage() {
  const { updatePassword, isMock } = useAuth();
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
      // In mock mode updatePassword is a no-op, so don't claim it was saved.
      if (isMock) {
        toast("Demo mode — password changes aren't saved.", "info");
      } else {
        toast("Password updated. Please sign in.", "success");
      }
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

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
