"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

// Low-level Radix primitives — use these directly only for advanced cases
// (controlled open state, custom trigger composition). Most code should use the
// ergonomic <Tooltip label="…"> wrapper below.
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-xs rounded-lg bg-navy px-2.5 py-1 text-xs font-medium text-white shadow-card data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface TooltipProps {
  /** Tooltip text. Empty/nullish renders the child with no tooltip attached. */
  label: React.ReactNode;
  /** A single focusable/hoverable element the tooltip describes. */
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Skip the tooltip without changing markup (e.g. label not yet known). */
  disabled?: boolean;
  className?: string;
}

/**
 * Branded tooltip in the app's UI language — a navy pill matching the rest of
 * the design system. Use this in place of the native `title` attribute so every
 * hover hint looks and behaves the same across the project.
 *
 *   <Tooltip label="Copy day summary">
 *     <button aria-label="Copy day summary">…</button>
 *   </Tooltip>
 *
 * `children` must be a single element (Radix clones it via `asChild`).
 */
export function Tooltip({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset,
  disabled = false,
  className,
}: TooltipProps) {
  if (disabled || label === null || label === undefined || label === "") {
    return children;
  }
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
        {label}
      </TooltipContent>
    </TooltipRoot>
  );
}
