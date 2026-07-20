"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-blue-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-brand disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
