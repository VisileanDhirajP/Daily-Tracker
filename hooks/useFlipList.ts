"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * FLIP animation for a reordering list. Tag each animatable child with a
 * `data-flip-id`. Whenever `signature` changes, children that moved slide from
 * their previous box to the new one, and newly-added children fade + rise in.
 * Uses the Web Animations API (transform/opacity only → 60fps, no layout) and
 * no-ops under prefers-reduced-motion.
 *
 * `resetKey` marks layout-mode changes (e.g. cards ↔ compact) that re-shape
 * every row. These get their own "morph" treatment: each element glides from
 * its old-layout position with a light fade and a top-down cascade — rects are
 * matched by id across the two layouts, so the reflow reads as one motion
 * instead of a snap (and later tweens never use stale-layout rects).
 */
export function useFlipList(
  containerRef: RefObject<HTMLElement | null>,
  signature: string,
  resetKey?: string,
) {
  const prev = useRef<Map<string, DOMRect>>(new Map());
  const primed = useRef(false);
  const lastReset = useRef(resetKey);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const resetChanged = lastReset.current !== resetKey;
    lastReset.current = resetKey;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-flip-id]"));
    const next = new Map<string, DOMRect>();
    for (const el of nodes) {
      const id = el.dataset.flipId;
      if (id) next.set(id, el.getBoundingClientRect());
    }

    // Skip the very first paint (nothing to animate from) and reduced-motion.
    if (primed.current && !prefersReducedMotion()) {
      if (resetChanged) {
        // Layout-mode morph (cards ↔ compact): every element re-shapes at
        // once, so glide each from its old-layout position with a light fade
        // and a top-down cascade. Old rects are only positionally comparable
        // (sizes differ), so translate + fade — no scale (it would distort
        // text mid-flight).
        nodes.forEach((el, i) => {
          const id = el.dataset.flipId;
          const before = id ? prev.current.get(id) : undefined;
          const after = id ? next.get(id) : undefined;
          if (!before || !after) return;
          const dx = before.left - after.left;
          const dy = before.top - after.top;
          el.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.35 },
              { transform: "translate(0px, 0px)", opacity: 1 },
            ],
            {
              duration: 320,
              delay: Math.min(i, 12) * 14, // cascade, capped so long lists stay snappy
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "backwards", // hold the start frame through the stagger delay
            },
          );
        });
      } else {
        for (const el of nodes) {
          const id = el.dataset.flipId;
          if (!id) continue;
          const before = prev.current.get(id);
          const after = next.get(id);
          if (!after) continue;
          if (before) {
            const dx = before.left - after.left;
            const dy = before.top - after.top;
            if (dx || dy) {
              el.animate(
                [
                  { transform: `translate(${dx}px, ${dy}px)` },
                  { transform: "translate(0px, 0px)" },
                ],
                { duration: 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
              );
            }
          } else {
            el.animate(
              [
                { opacity: 0, transform: "translateY(8px) scale(0.98)" },
                { opacity: 1, transform: "none" },
              ],
              { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            );
          }
        }
      }
    }

    prev.current = next;
    primed.current = true;
  }, [containerRef, signature, resetKey]);
}
