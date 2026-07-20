"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        {/* Desktop: persistent sidebar. Mobile: top bar (AppHeader). */}
        <AppSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppHeader />
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
