/**
 * A tiny in-process command bus. The command palette (mounted in the app shell)
 * can fire an action that only the dashboard knows how to perform — "open the
 * log form", "log this text". The palette navigates to /dashboard and dispatches
 * the command; the dashboard subscribes and runs it.
 *
 * If no listener is mounted yet (the palette navigated in from another page and
 * the dashboard hasn't mounted), the command is buffered and delivered to the
 * next subscriber, so the action survives the route change.
 */

import type { BlockerInput, Category } from "./types";

export type AppCommand =
  | { type: "new-entry" }
  | { type: "quick-log"; text: string }
  | { type: "filter-category"; category: Category }
  | { type: "focus-date"; date: string }
  | { type: "start-tour" }
  | { type: "new-blocker"; seed?: Partial<BlockerInput> };

type Listener = (command: AppCommand) => void;

const listeners = new Set<Listener>();
let pending: AppCommand | null = null;

/** Deliver a command to the active listener(s), or buffer it for the next one. */
export function dispatchAppCommand(command: AppCommand): void {
  if (listeners.size > 0) {
    listeners.forEach((listener) => listener(command));
  } else {
    pending = command;
  }
}

/** Subscribe to commands; drains any buffered command immediately. */
export function subscribeAppCommand(listener: Listener): () => void {
  listeners.add(listener);
  if (pending) {
    const buffered = pending;
    pending = null;
    listener(buffered);
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: reset module state between cases. */
export function __resetAppCommands(): void {
  listeners.clear();
  pending = null;
}
