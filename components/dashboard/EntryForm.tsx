"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Check, CopyPlus } from "lucide-react";
import type { Category, Entry, EntryInput, EntryStatus } from "@/lib/types";
import { CATEGORIES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { splitMinutes, toMinutes } from "@/lib/format/time";
import { isValidUrl } from "@/lib/security/url";
import { todayISO } from "@/lib/format/date";

interface EntryFormProps {
  /** Date pre-filled for a new entry (from the day navigator). */
  defaultDate: string;
  editing: Entry | null;
  /** When set (and not editing), pre-fill from this entry as a NEW entry. */
  seed?: Entry | null;
  onSubmit: (input: EntryInput) => Promise<void>;
  /** Called after a successful add/edit (closes the modal). */
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  entryDate: string;
  task: string;
  category: Category;
  ticketNumber: string;
  ticketUrl: string;
  hours: string;
  minutes: string;
  status: EntryStatus;
}

function emptyState(date: string): FormState {
  return {
    entryDate: date,
    task: "",
    category: "dev",
    ticketNumber: "",
    ticketUrl: "",
    hours: "",
    minutes: "",
    status: "progress",
  };
}

function fromEntry(e: Entry): FormState {
  const { hours, minutes } = splitMinutes(e.minutes);
  return {
    entryDate: e.entry_date,
    task: e.task,
    category: e.category,
    ticketNumber: e.ticket_number ?? "",
    ticketUrl: e.ticket_url ?? "",
    hours: hours ? String(hours) : "",
    minutes: minutes ? String(minutes) : "",
    status: e.status,
  };
}

function initialState(
  editing: Entry | null,
  seed: Entry | null | undefined,
  defaultDate: string,
): FormState {
  if (editing) return fromEntry(editing);
  // Duplicate: copy fields but start on a fresh date the user will confirm.
  if (seed) return { ...fromEntry(seed), entryDate: defaultDate };
  return emptyState(defaultDate);
}

export function EntryForm({
  defaultDate,
  editing,
  seed = null,
  onSubmit,
  onSuccess,
  onCancel,
}: EntryFormProps) {
  const [state, setState] = useState<FormState>(() =>
    initialState(editing, seed, defaultDate),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const taskRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setState(initialState(editing, seed, defaultDate));
    setError(null);
    taskRef.current?.focus();
  }, [editing, seed, defaultDate]);

  // Auto-grow the task field so pasted multi-line content stays visible.
  useEffect(() => {
    const el = taskRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [state.task]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const urlInvalid = state.ticketUrl.trim() !== "" && !isValidUrl(state.ticketUrl);

  const submit = async () => {
    if (state.task.trim() === "") {
      setError("Task is required.");
      taskRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    const input: EntryInput = {
      entry_date: state.entryDate || todayISO(),
      task: state.task.trim(),
      category: state.category,
      ticket_number: state.ticketNumber.trim() || null,
      ticket_url: state.ticketUrl.trim() || null,
      minutes: toMinutes(Number(state.hours), Number(state.minutes)),
      status: state.status,
    };
    try {
      await onSubmit(input);
      onSuccess();
    } catch {
      // Error toast is surfaced by the caller; keep the form populated.
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

  const inputClass =
    "w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-blue-brand";
  const labelClass = "text-xs font-medium text-muted";
  const isDuplicate = !editing && !!seed;

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="entry-task" className={labelClass}>
          Task
        </label>
        <textarea
          ref={taskRef}
          id="entry-task"
          data-test-id="entry-task"
          rows={4}
          required
          value={state.task}
          onChange={(e) => set("task", e.target.value)}
          placeholder="What did you work on?"
          className={`${inputClass} resize-none leading-relaxed`}
          style={{ maxHeight: 320 }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry-date" className={labelClass}>
            Date
          </label>
          <input
            id="entry-date"
            type="date"
            data-test-id="entry-date"
            value={state.entryDate}
            onChange={(e) => e.target.value && set("entryDate", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry-category" className={labelClass}>
            Category
          </label>
          <select
            id="entry-category"
            data-test-id="entry-category"
            value={state.category}
            onChange={(e) => set("category", e.target.value as Category)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry-ticket" className={labelClass}>
            Ticket #
          </label>
          <input
            id="entry-ticket"
            data-test-id="entry-ticket-number"
            value={state.ticketNumber}
            onChange={(e) => set("ticketNumber", e.target.value)}
            placeholder="VS-1234"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry-url" className={labelClass}>
            Ticket URL
          </label>
          <input
            id="entry-url"
            data-test-id="entry-ticket-url"
            value={state.ticketUrl}
            onChange={(e) => set("ticketUrl", e.target.value)}
            placeholder="github.com/…"
            aria-invalid={urlInvalid || undefined}
            className={`${inputClass} ${urlInvalid ? "border-orange-brand" : ""}`}
          />
        </div>
      </div>
      {urlInvalid && (
        <p className="-mt-2 text-xs text-orange-brand">
          That doesn&apos;t look like a valid http(s) link — it won&apos;t be saved as a
          clickable ticket.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Time spent</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                data-test-id="entry-hours"
                aria-label="Hours"
                value={state.hours}
                onChange={(e) => set("hours", e.target.value)}
                placeholder="0"
                className={`${inputClass} w-16 text-center`}
              />
              <span className="text-xs text-muted">h</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={59}
                data-test-id="entry-minutes"
                aria-label="Minutes"
                value={state.minutes}
                onChange={(e) => set("minutes", e.target.value)}
                placeholder="0"
                className={`${inputClass} w-16 text-center`}
              />
              <span className="text-xs text-muted">m</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Status</label>
          <div
            className="flex rounded-xl border border-hairline p-0.5"
            role="group"
            aria-label="Status"
          >
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                data-test-id={`entry-status-${s}`}
                aria-pressed={state.status === s}
                onClick={() => set("status", s)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors ${
                  state.status === s ? "bg-navy text-white" : "text-muted hover:text-navy"
                }`}
              >
                {state.status === s && s === "done" && <Check size={12} />}
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-orange-brand" role="alert">
          {error}
        </p>
      )}

      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          data-test-id="entry-cancel"
          className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          data-test-id="entry-submit"
          className="btn-cta flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editing ? (
            <Check size={16} />
          ) : isDuplicate ? (
            <CopyPlus size={16} />
          ) : (
            <Plus size={16} />
          )}
          {editing ? "Save changes" : isDuplicate ? "Add copy" : "Add entry"}
        </button>
      </div>

      <p className="-mt-1 text-center text-[11px] text-muted">
        Tip: press <kbd className="rounded bg-canvas px-1">⌘/Ctrl</kbd> +{" "}
        <kbd className="rounded bg-canvas px-1">Enter</kbd> to save
      </p>
    </form>
  );
}
