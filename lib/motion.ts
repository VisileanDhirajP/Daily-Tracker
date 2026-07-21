/**
 * Shared enter/exit motion for overlay surfaces, as Tailwind classes
 * (tailwindcss-animate). One place to tune so every dialog, popover, and menu
 * moves the same way.
 *
 * Feel: entry eases out on an expo curve (fast, then a gentle settle) with a
 * soft scale-up + small rise; exit is quicker and accelerates away. Duration &
 * timing use arbitrary properties so they reliably target `animation-*` rather
 * than the transition equivalents.
 *
 * Keep the class literals intact — Tailwind's JIT scans this file for them.
 */

const EASE_OUT = "data-[state=open]:[animation-timing-function:cubic-bezier(0.16,1,0.3,1)]";
const EASE_IN = "data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,1,1)]";
const REDUCE = "motion-reduce:animate-none";

/** Backdrop behind centered dialogs — fade only. */
export const OVERLAY_MOTION = [
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
  "data-[state=open]:[animation-duration:260ms] data-[state=closed]:[animation-duration:180ms]",
  EASE_OUT,
  EASE_IN,
  REDUCE,
].join(" ");

/**
 * Centered modal / alert panel. Uses left-1/2 + top-[48%] compensation so the
 * scale + rise plays *around the centered position* (the panel keeps its
 * -translate-x/y-1/2 centering).
 */
export const DIALOG_MOTION = [
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
  "data-[state=open]:zoom-in-[0.97] data-[state=closed]:zoom-out-[0.97]",
  "data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2",
  "data-[state=open]:slide-in-from-top-[48%] data-[state=closed]:slide-out-to-top-[48%]",
  "data-[state=open]:[animation-duration:280ms] data-[state=closed]:[animation-duration:180ms]",
  EASE_OUT,
  EASE_IN,
  REDUCE,
].join(" ");

/**
 * Command palette — horizontally centered but top-anchored (no y centering),
 * so it drops in from just above rather than rising from the middle.
 */
export const PALETTE_MOTION = [
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
  "data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98]",
  "data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2",
  "data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
  "data-[state=open]:[animation-duration:260ms] data-[state=closed]:[animation-duration:170ms]",
  EASE_OUT,
  EASE_IN,
  REDUCE,
].join(" ");

/**
 * Anchored popups (popover / dropdown / select). These sit inside a Radix
 * popper wrapper that owns positioning, so animating scale here is safe.
 */
export const POPUP_MOTION = [
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
  "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
  "data-[state=open]:[animation-duration:180ms] data-[state=closed]:[animation-duration:130ms]",
  EASE_OUT,
  EASE_IN,
  REDUCE,
].join(" ");

/**
 * Bottom-right toasts. Slide in from the right edge with a fade; slide back out
 * the same way. The stack owns `data-state` per toast (not Radix), so the exit
 * plays before the toast unmounts — see TOAST_EXIT_MS.
 */
export const TOAST_MOTION = [
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
  "data-[state=open]:slide-in-from-right-5 data-[state=closed]:slide-out-to-right-5",
  "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
  "data-[state=open]:[animation-duration:260ms] data-[state=closed]:[animation-duration:180ms]",
  EASE_OUT,
  EASE_IN,
  REDUCE,
].join(" ");

/** Keep it in sync with TOAST_MOTION's closed animation-duration. */
export const TOAST_EXIT_MS = 180;
