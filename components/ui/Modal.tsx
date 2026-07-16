"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Optional glyph shown in a tinted badge left of the title. */
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}

/**
 * Accessible, vertically-centered dialog: dimmed blurred backdrop, Escape to
 * close, body scroll lock. Scrolls internally if taller than the viewport.
 */
export function Modal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  testId = "modal",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-deep/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-test-id={testId}
        className="card my-auto w-full max-w-2xl animate-slide-up p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start gap-3.5">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-brand/10 text-blue-brand">
              {icon}
            </span>
          )}
          <div className="flex-1 pt-0.5">
            <h2 className="text-lg font-bold text-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-test-id="modal-close"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-muted transition-colors hover:border-blue-light hover:bg-blue-brand/10 hover:text-blue-brand"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
