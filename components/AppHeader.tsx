"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { navItems } from "@/lib/nav";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Wordmark } from "./brand/Wordmark";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = navItems(role);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    toast("Signed out.", "info");
    router.replace("/login");
  };

  return (
    <header className="brand-header text-white md:hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/dashboard" aria-label="Daily Tracker home">
          <Wordmark onDark size="md" />
        </Link>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            data-test-id="mobile-command-trigger"
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
            className="rounded-lg p-2 text-white hover:bg-white/10"
          >
            <Search size={20} />
          </button>
          <ThemeToggle testId="mobile-theme-toggle" />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                data-test-id="mobile-menu-trigger"
                className="rounded-lg p-2 text-white hover:bg-white/10"
              >
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle>Menu</SheetTitle>
              <p className="mb-2 text-xs text-muted">{user?.full_name || user?.email}</p>
              <nav className="flex flex-col gap-1" aria-label="Primary">
                {nav.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      data-test-id={`mobile-nav-${item.id}`}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-blue-brand/10 text-blue-brand"
                          : "text-ink hover:bg-canvas"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={handleSignOut}
                data-test-id="mobile-sign-out"
                className="mt-2 flex items-center gap-2.5 rounded-lg border-t border-hairline px-3 py-2.5 text-sm text-muted hover:text-ink"
              >
                <LogOut size={17} />
                Sign out
              </button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
