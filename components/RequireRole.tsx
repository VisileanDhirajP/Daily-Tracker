"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserRole } from "@/lib/types";

/**
 * Client-side role guard for manager/admin pages. Nested inside RequireAuth
 * (the (app) layout), so a user is always present here. Redirects to /dashboard
 * when the role isn't permitted. This is a UX gate only — the real access
 * control is Supabase RLS, which returns nothing to an unauthorised caller.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: (role: UserRole) => boolean;
  children: ReactNode;
}) {
  const { role, roleLoading, loading } = useAuth();
  const router = useRouter();
  const permitted = allow(role);
  const resolving = loading || roleLoading;

  useEffect(() => {
    if (!resolving && !permitted) router.replace("/dashboard");
  }, [resolving, permitted, router]);

  if (resolving) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-muted">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }
  if (!permitted) return null;
  return <>{children}</>;
}
