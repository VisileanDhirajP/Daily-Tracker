"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { scorePassword } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

// Fill colour per strength score (index 0 unused). Token/brand classes so the
// meter adapts in dark mode instead of using fixed hex.
const METER_FILL = ["", "bg-orange-brand", "bg-gold", "bg-blue-brand", "bg-blue-brand"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export default function SignupPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const strength = scorePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.name = "Please enter your name.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!strength.acceptable)
      next.password = "Choose a stronger password (8+ chars, mix of types).";
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp(fullName, email.trim(), password);
      if (needsConfirmation) {
        setSent(true);
      } else {
        toast("Account created — you're in!", "success");
        router.replace("/dashboard");
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Sign up failed." });
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
          error={errors.name}
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
          error={errors.email}
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
            error={errors.password}
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i < strength.score ? METER_FILL[strength.score] : "bg-hairline",
                    )}
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
          error={errors.confirm}
        />
        {errors.form && (
          <p
            className="rounded-lg bg-orange-brand/10 px-3 py-2 text-sm text-orange-brand"
            role="alert"
          >
            {errors.form}
          </p>
        )}
        <Button
          type="submit"
          variant="cta"
          disabled={submitting}
          data-test-id="signup-submit"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
