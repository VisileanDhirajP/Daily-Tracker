"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  testId: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, hint, error, testId, id, className, ...rest }, ref) {
    const inputId = id ?? testId;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          data-test-id={testId}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-brand disabled:opacity-60 ${
            error ? "border-orange-brand" : "border-hairline focus:border-blue-brand"
          } ${className ?? ""}`}
          {...rest}
        />
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
        {error && (
          <p className="text-xs text-orange-brand" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
