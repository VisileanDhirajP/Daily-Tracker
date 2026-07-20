"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Route-level error boundary. Catches render/runtime throws in any page under
 * the root layout and shows a recoverable screen instead of a white page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; a real deployment would forward this to logging.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-brand/10 text-orange-brand">
        <AlertTriangle size={26} />
      </span>
      <div>
        <h1 className="text-lg font-bold text-navy">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          An unexpected error stopped this page from loading. Your data is safe —
          try again, or head back to the dashboard.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          data-test-id="error-retry"
          className="btn-cta inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
        >
          <RotateCw size={15} />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
