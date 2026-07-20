"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./dialog";

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
 * App modal built on the accessible Radix Dialog (focus trap, scroll lock,
 * Escape/overlay close). Keeps the same props the app already uses.
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
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent data-test-id={testId} className="max-w-2xl">
        <div className="flex items-start gap-3.5">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-brand/10 text-blue-brand">
              {icon}
            </span>
          )}
          <div className="flex-1 pt-0.5 pr-8">
            <DialogTitle>{title}</DialogTitle>
            {subtitle ? (
              <DialogDescription className="mt-0.5">{subtitle}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </div>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
