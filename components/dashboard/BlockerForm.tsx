"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Plus } from "lucide-react";
import type { Blocker, BlockerInput } from "@/lib/types";
import { isValidUrl } from "@/lib/security/url";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface BlockerFormProps {
  editing: Blocker | null;
  /** When adding, optionally pre-fill (e.g. raised from a task). */
  seed?: Partial<BlockerInput> | null;
  onSubmit: (input: BlockerInput) => Promise<void>;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  reason: string;
  waitingOn: string;
  ticketNumber: string;
  ticketUrl: string;
}

function initialState(editing: Blocker | null, seed?: Partial<BlockerInput> | null): FormState {
  return {
    reason: editing?.reason ?? seed?.reason ?? "",
    waitingOn: editing?.waiting_on ?? seed?.waiting_on ?? "",
    ticketNumber: editing?.ticket_number ?? seed?.ticket_number ?? "",
    ticketUrl: editing?.ticket_url ?? seed?.ticket_url ?? "",
  };
}

export function BlockerForm({ editing, seed = null, onSubmit, onSuccess, onCancel }: BlockerFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(editing, seed));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setState(initialState(editing, seed));
    setError(null);
    reasonRef.current?.focus();
  }, [editing, seed]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const urlInvalid = state.ticketUrl.trim() !== "" && !isValidUrl(state.ticketUrl);

  const submit = async () => {
    if (state.reason.trim() === "") {
      setError("Reason is required.");
      reasonRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    const input: BlockerInput = {
      reason: state.reason.trim(),
      waiting_on: state.waitingOn.trim() || null,
      ticket_number: state.ticketNumber.trim() || null,
      ticket_url: state.ticketUrl.trim() || null,
    };
    try {
      await onSubmit(input);
      onSuccess();
    } catch {
      // Error toast surfaced by the caller; keep the form populated.
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const labelClass = "text-xs font-medium text-muted";

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4" data-test-id="blocker-form">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="blocker-reason" className={labelClass}>
          What&apos;s blocking you?
        </label>
        <Textarea
          ref={reasonRef}
          id="blocker-reason"
          data-test-id="blocker-reason"
          rows={2}
          required
          value={state.reason}
          onChange={(e) => set("reason", e.target.value)}
          placeholder="e.g. Waiting on PR review for the auth refactor"
          className="resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="blocker-waiting-on" className={labelClass}>
          Waiting on <span className="font-normal">(optional)</span>
        </label>
        <Input
          id="blocker-waiting-on"
          data-test-id="blocker-waiting-on"
          value={state.waitingOn}
          onChange={(e) => set("waitingOn", e.target.value)}
          placeholder="A person, team, or ticket — e.g. Alex, DevOps, VS-9999"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blocker-ticket" className={labelClass}>
            Ticket #
          </label>
          <Input
            id="blocker-ticket"
            data-test-id="blocker-ticket-number"
            value={state.ticketNumber}
            onChange={(e) => set("ticketNumber", e.target.value)}
            placeholder="VS-1234"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blocker-url" className={labelClass}>
            Ticket URL
          </label>
          <Input
            id="blocker-url"
            data-test-id="blocker-ticket-url"
            value={state.ticketUrl}
            onChange={(e) => set("ticketUrl", e.target.value)}
            placeholder="github.com/…"
            aria-invalid={urlInvalid || undefined}
            className={urlInvalid ? "border-orange-brand" : ""}
          />
        </div>
      </div>
      {urlInvalid && (
        <p className="-mt-2 text-xs text-orange-brand">
          That doesn&apos;t look like a valid http(s) link — it won&apos;t be saved as a
          clickable ticket.
        </p>
      )}

      {error && (
        <p className="text-xs text-orange-brand" role="alert">
          {error}
        </p>
      )}

      <div className="mt-1 flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-test-id="blocker-cancel">
          Cancel
        </Button>
        <Button type="submit" variant="cta" disabled={submitting} data-test-id="blocker-submit" className="flex-1">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : editing ? <Check size={16} /> : <Plus size={16} />}
          {editing ? "Save changes" : "Add blocker"}
        </Button>
      </div>
    </form>
  );
}
