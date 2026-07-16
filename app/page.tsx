"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, FileDown, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth } from "@/lib/auth/AuthProvider";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Log every day",
    body: "Capture tasks, tickets, and time in seconds — grouped by day with streaks.",
  },
  {
    icon: FileDown,
    title: "Export & share",
    body: "One-click PDF or CSV for any range, then send it straight to your manager.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Your log is yours. Row-level security keeps each account fully isolated.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <main className="min-h-screen">
      <section className="brand-header text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-16 sm:py-24">
          <Wordmark onDark size="lg" />
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
            Your workday, logged and ready to share.
          </h1>
          <p className="max-w-xl text-blue-light sm:text-lg">
            Daily Tracker keeps a tidy record of what you shipped —
            tickets, time, and status — and turns it into a manager-ready report.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              data-test-id="landing-get-started"
              className="btn-cta flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
            >
              Get started <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              data-test-id="landing-sign-in"
              className="rounded-xl border border-white/30 px-5 py-3 text-sm text-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-5">
                <Icon size={22} className="text-blue-brand" />
                <h2 className="mt-3 font-semibold text-navy">{f.title}</h2>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 pb-10 text-sm text-muted">
        <div className="flex items-center justify-between border-t border-hairline pt-6">
          <Wordmark size="sm" />
        </div>
      </footer>
    </main>
  );
}
