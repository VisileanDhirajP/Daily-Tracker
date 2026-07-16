"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Wordmark } from "./brand/Wordmark";

/**
 * Client-side auth guard. Works in both mock and supabase modes (mock has no
 * server session, so middleware alone can't protect it). Redirects to /login
 * once loading resolves with no user.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Wordmark size="lg" />
        <div className="flex items-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading your tracker…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
