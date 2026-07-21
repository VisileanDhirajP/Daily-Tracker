"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { navItems } from "@/lib/nav";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/tooltip";
import { Wordmark } from "./brand/Wordmark";

/** Persistent desktop sidebar (navy brand). Hidden on mobile (see AppHeader). */
export function AppSidebar() {
  const { user, role, signOut } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const nav = navItems(role);

  const handleSignOut = async () => {
    await signOut();
    toast("Signed out.", "info");
    router.replace("/login");
  };

  return (
    <aside className="brand-header sticky top-0 hidden h-screen w-60 shrink-0 flex-col text-white md:flex">
      <div className="px-5 py-5">
        <Link href="/dashboard" aria-label="Daily Tracker home">
          <Wordmark onDark size="md" />
        </Link>
      </div>

      <button
        type="button"
        data-test-id="command-palette-trigger"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-blue-light transition-colors hover:bg-white/10 hover:text-white"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Primary">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-test-id={`nav-${item.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/15 font-medium text-white"
                  : "text-blue-light hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/15 p-3">
        <div className="mb-1 flex items-center justify-between gap-2 px-2">
          <Tooltip label={user?.email} align="start">
            <span className="min-w-0 truncate text-sm text-white">
              {user?.full_name || user?.email}
            </span>
          </Tooltip>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          data-test-id="sign-out-button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-blue-light transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
