"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted/70 transition-colors focus:border-blue-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-brand disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
