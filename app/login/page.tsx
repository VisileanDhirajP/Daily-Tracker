"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Info } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";

export default function LoginPage() {
  const { signIn, user, loading, isMock, demoCredentials, demoManagerCredentials } =
    useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast("Welcome back!", "success");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    if (demoCredentials) {
      setEmail(demoCredentials.email);
      setPassword(demoCredentials.password);
    }
  };

  const fillManagerDemo = () => {
    if (demoManagerCredentials) {
      setEmail(demoManagerCredentials.email);
      setPassword(demoManagerCredentials.password);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Log your day and keep your manager in the loop."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-blue-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {isMock && demoCredentials && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-blue-light bg-blue-brand/10 p-3 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-brand" />
          <div className="text-ink">
            <p className="font-medium">Demo mode</p>
            <p className="text-muted">
              Use{" "}
              <code className="rounded bg-white px-1">{demoCredentials.email}</code> /{" "}
              <code className="rounded bg-white px-1">{demoCredentials.password}</code>, or{" "}
              <button
                type="button"
                onClick={fillDemo}
                data-test-id="fill-demo-button"
                className="font-medium text-blue-brand hover:underline"
              >
                fill it for me
              </button>
              .
            </p>
            {demoManagerCredentials && (
              <p className="mt-1 text-muted">
                Or sign in as a{" "}
                <button
                  type="button"
                  onClick={fillManagerDemo}
                  data-test-id="fill-manager-demo-button"
                  className="font-medium text-blue-brand hover:underline"
                >
                  manager
                </button>{" "}
                to see the Team &amp; Admin views.
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          testId="login-email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@visilean.com"
        />
        <TextField
          label="Password"
          type="password"
          testId="login-password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          error={error}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          data-test-id="login-submit"
          className="btn-cta flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
