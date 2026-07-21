"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { TOAST_MOTION, TOAST_EXIT_MS } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  action?: ToastAction;
  /** milliseconds before auto-dismiss (default 4200) */
  durationMs?: number;
}

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  /** true once dismissed — plays the exit animation before unmounting. */
  leaving?: boolean;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ACCENT: Record<ToastKind, string> = {
  success: "#2E7CC4",
  error: "#F37E31",
  info: "#647587",
};

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Flag the toast as leaving so its exit animation plays, then unmount it once
  // the animation has run (idempotent — safe to call more than once).
  const dismiss = useCallback(
    (id: number) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      );
      setTimeout(() => remove(id), TOAST_EXIT_MS);
    },
    [remove],
  );

  const toast = useCallback(
    (message: string, kind: ToastKind = "info", options?: ToastOptions) => {
      const id = ++seq;
      setToasts((prev) => [...prev, { id, kind, message, action: options?.action }]);
      setTimeout(() => dismiss(id), options?.durationMs ?? 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              data-state={t.leaving ? "closed" : "open"}
              className={cn("card flex items-center gap-3 p-3", TOAST_MOTION)}
              data-test-id="toast"
            >
              <Icon size={18} color={ACCENT[t.kind]} className="shrink-0" />
              <p className="flex-1 text-sm text-ink">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-blue-brand hover:bg-blue-brand/10"
                  data-test-id="toast-action"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-muted hover:text-ink"
                data-test-id="toast-dismiss"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
