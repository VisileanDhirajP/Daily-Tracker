"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BarChart3, Download, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Wordmark } from "./brand/Wordmark";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { href: "/insights", label: "Insights", icon: BarChart3, id: "insights" },
  { href: "/export", label: "Export", icon: Download, id: "export" },
  { href: "/settings", label: "Settings", icon: Settings, id: "settings" },
];

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast("Signed out.", "info");
    router.replace("/login");
  };

  return (
    <header className="brand-header text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" aria-label="Daily Tracker home">
            <Wordmark onDark size="md" />
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-test-id={`nav-${item.id}`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-blue-light hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <ThemeToggle />

          <div className="flex items-center gap-3 border-l border-white/15 pl-3">
            <span className="hidden text-sm text-white sm:inline" title={user?.email}>
              {user?.full_name || user?.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              data-test-id="sign-out-button"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-blue-light hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
