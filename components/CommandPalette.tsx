"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  Plus,
  Moon,
  Zap,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { navItems } from "@/lib/nav";
import { parseQuickEntry } from "@/lib/quickAdd";
import { dispatchAppCommand } from "@/lib/commands";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatDuration } from "@/lib/format/time";
import { cn } from "@/lib/utils";
import { OVERLAY_MOTION, PALETTE_MOTION } from "@/lib/motion";

/** Fired by the sidebar / mobile "Search" buttons to open the palette. */
export const OPEN_PALETTE_EVENT = "vldt:command-open";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

/**
 * Global command palette (⌘K / Ctrl-K). Jump to any page, run an action, or
 * just start typing to log an entry — parsed the same way as the quick-add bar.
 * Mounted once in the app shell so it's available on every authed page.
 */
export function CommandPalette() {
  const router = useRouter();
  const { role } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  // Open on ⌘K / Ctrl-K (and via the header/sidebar trigger event).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  const toggleTheme = () => {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("vldt:theme", next ? "dark" : "light");
    } catch {
      /* ignore storage errors */
    }
  };

  const q = query.trim();
  const lower = q.toLowerCase();

  const navCommands: Command[] = navItems(role).map((n) => ({
    id: `nav-${n.id}`,
    group: "Go to",
    label: n.label,
    icon: n.icon,
    run: () => router.push(n.href),
  }));

  const actionCommands: Command[] = [
    {
      id: "new-entry",
      group: "Actions",
      label: "New entry",
      hint: "Open the log form",
      icon: Plus,
      run: () => {
        router.push("/dashboard");
        dispatchAppCommand({ type: "new-entry" });
      },
    },
    {
      id: "toggle-theme",
      group: "Actions",
      label: "Toggle light / dark theme",
      icon: Moon,
      run: toggleTheme,
    },
    {
      id: "start-tour",
      group: "Actions",
      label: "Take a tour",
      hint: "Show the quick walkthrough",
      icon: Compass,
      run: () => {
        router.push("/dashboard");
        dispatchAppCommand({ type: "start-tour" });
      },
    },
  ];

  const staticCommands = [...navCommands, ...actionCommands].filter(
    (c) => !lower || c.label.toLowerCase().includes(lower),
  );

  // Quick-log suggestion — only when the text actually looks like an entry
  // (has a duration, a ticket, or ≥2 words) so single-word searches like
  // "insights" don't turn into a noisy "Log …" row.
  const parsed = q ? parseQuickEntry(q) : null;
  const wordCount = q ? q.split(/\s+/).length : 0;
  const showLog =
    !!parsed && (parsed.minutes > 0 || !!parsed.ticket_number || wordCount >= 2);
  const logCommand: Command | null =
    showLog && parsed
      ? {
          id: "quick-log",
          group: "Log",
          label: `Log “${parsed.task}”`,
          hint: [
            parsed.minutes > 0 ? formatDuration(parsed.minutes) : null,
            CATEGORY_MAP[parsed.category].label,
            parsed.ticket_number,
          ]
            .filter(Boolean)
            .join(" · "),
          icon: Zap,
          run: () => {
            router.push("/dashboard");
            dispatchAppCommand({ type: "quick-log", text: q });
          },
        }
      : null;

  const commands = logCommand ? [logCommand, ...staticCommands] : staticCommands;

  const runCommand = (c: Command) => {
    setOpen(false);
    c.run();
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = commands[active];
      if (c) runCommand(c);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn("fixed inset-0 z-50 bg-navy-deep/50 backdrop-blur-sm", OVERLAY_MOTION)}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "card fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden p-0",
            PALETTE_MOTION,
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>

          <div className="flex items-center gap-2.5 border-b border-hairline px-4">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              data-test-id="command-palette-input"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search pages or type to log — e.g. 2h dev VS-8301 fixed the leak"
              className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-muted"
              aria-label="Search or run a command"
            />
            <kbd className="hidden shrink-0 rounded border border-hairline px-1.5 py-0.5 text-[10px] text-muted sm:block">
              esc
            </kbd>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {commands.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                No matching commands.
              </p>
            ) : (
              commands.map((c, i) => {
                const showHeader = i === 0 || commands[i - 1].group !== c.group;
                const Icon = c.icon;
                const isActive = i === active;
                return (
                  <div key={c.id}>
                    {showHeader && (
                      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {c.group}
                      </div>
                    )}
                    <button
                      type="button"
                      data-test-id={`command-item-${c.id}`}
                      onMouseMove={() => setActive(i)}
                      onClick={() => runCommand(c)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-blue-brand/10 text-blue-brand" : "text-ink hover:bg-canvas",
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn("shrink-0", isActive ? "text-blue-brand" : "text-muted")}
                      />
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && (
                        <span className="shrink-0 truncate text-xs text-muted">{c.hint}</span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft size={11} /> select
            </span>
            <span>↑↓ navigate</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
