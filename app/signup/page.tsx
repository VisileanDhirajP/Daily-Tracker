"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { scorePassword } from "@/lib/auth/password";

const METER_COLORS = ["#e6edf5", "#F37E31", "#FCBC36", "#2E7CC4", "#123E66"];

export default function SignupPage() {
  const { signUp, isMock } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const strength = scorePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) return setError("Please enter your name.");
    if (!strength.acceptable)
      return setError("Choose a stronger password (8+ chars, mix of types).");
    if (password !== confirm) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      await signUp(fullName, email, password);
      if (isMock) {
        toast("Account created — you're in!", "success");
        router.replace("/dashboard");
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={40} className="text-blue-brand" />
          <p className="text-sm text-muted">
            We sent a verification link to <strong className="text-ink">{email}</strong>.
            Confirm it, then sign in.
          </p>
          <Link
            href="/login"
            className="btn-cta mt-2 rounded-xl px-4 py-2.5 text-sm"
            data-test-id="goto-login"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Track your work, one day at a time."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Full name"
          testId="signup-name"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Alex Kim"
        />
        <TextField
          label="Email"
          type="email"
          testId="signup-email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@visilean.com"
        />
        <div>
          <TextField
            label="Password"
            type="password"
            testId="signup-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        i < strength.score ? METER_COLORS[strength.score] : "#e6edf5",
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">Strength: {strength.label}</p>
            </div>
          )}
        </div>
        <TextField
          label="Confirm password"
          type="password"
          testId="signup-confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          error={error}
        />
        <button
          type="submit"
          disabled={submitting}
          data-test-id="signup-submit"
          className="btn-cta flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
