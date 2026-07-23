"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

/** Fire this to (re)start the tour from anywhere, e.g. the command palette. */
export const START_TOUR_EVENT = "vldt:start-tour";
const SEEN_KEY = "vldt:tour-seen";

interface Step {
  selector: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    selector: '[data-test-id="open-add-entry"]',
    title: "Log your work here",
    body: "Add what you did, copy yesterday in a tap, or save routine work as one-tap templates.",
  },
  {
    selector: '[data-test-id="command-palette-trigger"]',
    title: "Jump anywhere with ⌘K",
    body: "Search pages, run actions, or just start typing to log an entry from anywhere.",
  },
  {
    selector: '[data-test-id="entry-list"]',
    title: "Your history lives here",
    body: "Filter it, edit or duplicate any entry, or drag one onto another day to move it.",
  },
  {
    selector: '[data-test-id="weekly-goal-edit"]',
    title: "Track your week",
    body: "Set a weekly hours goal and watch your streak build.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function rectOf(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Tour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Steps whose target is actually VISIBLE right now — rectOf returns null for
  // both missing and CSS-hidden elements (e.g. the desktop-only sidebar ⌘K
  // trigger is display:none on mobile, but still present in the DOM).
  const steps = active ? STEPS.filter((s) => rectOf(s.selector) !== null) : [];
  // Clamp: a resize mid-tour can shrink the list under the current index.
  const current = steps[Math.min(step, Math.max(0, steps.length - 1))];

  const finish = useCallback(() => {
    setActive(false);
    setStep(0);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-start once for a first-time visitor; also allow manual replay.
  useEffect(() => {
    let seen = "1";
    try {
      seen = localStorage.getItem(SEEN_KEY) ?? "";
    } catch {
      /* ignore */
    }
    const start = () => {
      setStep(0);
      setActive(true);
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    if (seen !== "1") t = setTimeout(start, 500); // let the dashboard settle
    window.addEventListener(START_TOUR_EVENT, start);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener(START_TOUR_EVENT, start);
    };
  }, []);

  // Track the current target's position (recompute on step, resize, scroll).
  useEffect(() => {
    if (!active || !current) return;
    const el = document.querySelector(current.selector);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => setRect(rectOf(current.selector));
    update();
    const id = setTimeout(update, 320); // after smooth scroll settles
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, current, step]);

  // Esc closes; arrows advance.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, steps.length]);

  if (!active || !current) return null;
  // If the whole run has no resolvable targets, don't get stuck.
  if (steps.length === 0) return null;

  const last = step >= steps.length - 1;
  const pad = 8;

  // Position the tooltip below the target if there's room, else above.
  const belowTop = rect ? rect.top + rect.height + pad + 6 : 120;
  const placeAbove = rect ? belowTop + 190 > window.innerHeight : false;
  const tipTop = rect
    ? placeAbove
      ? Math.max(12, rect.top - pad - 6 - 176)
      : belowTop
    : 120;
  const tipLeft = rect
    ? Math.min(Math.max(16, rect.left + rect.width / 2 - 160), window.innerWidth - 336)
    : 16;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Product tour" data-test-id="tour">
      {/* Click-catcher backdrop — clicking anywhere advances. */}
      <div
        className="absolute inset-0"
        onClick={() => (last ? finish() : setStep((s) => s + 1))}
      />

      {/* Spotlight cutout via a big box-shadow around the target. */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-gold transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(11, 44, 77, 0.62)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-hairline bg-card p-4 shadow-card"
        style={{ top: tipTop, left: tipLeft }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={finish}
          data-test-id="tour-skip"
          aria-label="Skip tour"
          className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:text-ink"
        >
          <X size={15} />
        </button>
        <p className="pr-6 text-sm font-bold text-navy">{current.title}</p>
        <p className="mt-1.5 text-sm text-muted">{current.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-4 bg-blue-brand" : "w-1.5 bg-hairline"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                data-test-id="tour-back"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted hover:text-navy"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setStep((s) => s + 1))}
              data-test-id="tour-next"
              className="btn-cta rounded-lg px-3.5 py-1.5 text-sm font-semibold"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
