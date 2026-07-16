"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ForgotPasswordPage() {
  const { resetPassword, isMock } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Reset link sent">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={40} className="text-blue-brand" />
          <p className="text-sm text-muted">
            {isMock
              ? "In demo mode there's no real email — passwords can't be reset. In Supabase mode a reset link would arrive at your inbox."
              : `If an account exists for ${email}, a reset link is on its way.`}
          </p>
          <Link
            href="/login"
            className="btn-cta mt-2 rounded-xl px-4 py-2.5 text-sm"
            data-test-id="back-to-login"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a link to reset it."
      footer={
        <Link href="/login" className="font-medium text-blue-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          testId="forgot-email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@visilean.com"
          error={error}
        />
        <button
          type="submit"
          disabled={submitting}
          data-test-id="forgot-submit"
          className="btn-cta flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
