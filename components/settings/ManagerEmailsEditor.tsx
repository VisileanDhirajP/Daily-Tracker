"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ManagerEmailsEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  description?: string;
}

/**
 * Edits a list of manager emails. Each is validated on add and de-duplicated
 * case-insensitively; managers are removed via the chip's ✕. Used by admins to
 * assign an employee's manager(s).
 */
export function ManagerEmailsEditor({
  value,
  onChange,
  label = "Managers",
  description = "Managers listed here can see this person's entries on their team page.",
}: ManagerEmailsEditorProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const email = draft.trim();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (value.some((e) => e.toLowerCase() === email.toLowerCase())) {
      setError("That manager is already added.");
      return;
    }
    onChange([...value, email]);
    setDraft("");
    setError(null);
  };

  const remove = (email: string) => onChange(value.filter((e) => e !== email));

  // Auto-commit a valid, non-duplicate draft when the field loses focus, so a
  // typed-but-not-"Add"ed email isn't silently lost when the user clicks Save.
  const commitOnBlur = () => {
    const email = draft.trim();
    if (email && EMAIL_RE.test(email) && !value.some((e) => e.toLowerCase() === email.toLowerCase())) {
      onChange([...value, email]);
      setDraft("");
      setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="manager-email-input" className="text-sm font-medium text-ink">
        {label}
      </label>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Manager emails">
          {value.map((email) => (
            <li
              key={email}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
            >
              {email}
              <Tooltip label="Remove manager">
                <button
                  type="button"
                  onClick={() => remove(email)}
                  data-test-id="remove-manager-email"
                  aria-label={`Remove ${email}`}
                  className="rounded-full p-0.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
                >
                  <X size={13} />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            id="manager-email-input"
            type="email"
            data-test-id="manager-email-input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={commitOnBlur}
            placeholder="manager@visilean.com"
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p className="mt-1 text-xs text-orange-brand" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim()}
          data-test-id="add-manager-email"
        >
          <Plus size={15} />
          Add
        </Button>
      </div>
      <p className="text-xs text-muted">{description}</p>
    </div>
  );
}
