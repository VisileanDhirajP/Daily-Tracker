"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Check, CopyPlus, History } from "lucide-react";
import type { Category, Entry, EntryInput, EntryStatus } from "@/lib/types";
import { CATEGORIES, CATEGORY_MAP, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { splitMinutes, toMinutes } from "@/lib/format/time";
import { isValidUrl } from "@/lib/security/url";
import { todayISO } from "@/lib/format/date";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EntryFormProps {
  /** Date pre-filled for a new entry (from the day navigator). */
  defaultDate: string;
  editing: Entry | null;
  /** When set (and not editing), pre-fill from this entry as a NEW entry. */
  seed?: Entry | null;
  /** Past entries used to autocomplete the task field (recent-first). */
  suggestions?: Entry[];
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
  suggestions = [],
  onSubmit,
  onSuccess,
  onCancel,
}: EntryFormProps) {
  const [state, setState] = useState<FormState>(() =>
    initialState(editing, seed, defaultDate),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [taskFocused, setTaskFocused] = useState(false);
  const taskRef = useRef<HTMLTextAreaElement>(null);

  // Recent-task suggestions: unique past tasks matching what's typed. Editing an
  // existing entry doesn't suggest (you're refining, not starting fresh).
  const matches = useMemo(() => {
    if (editing) return [];
    const q = state.task.trim().toLowerCase();
    if (q.length < 2) return [];
    const seen = new Set<string>();
    const out: Entry[] = [];
    for (const e of suggestions) {
      const key = e.task.trim().toLowerCase();
      if (key === q || seen.has(key)) continue;
      if (!key.includes(q)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= 6) break;
    }
    return out;
  }, [suggestions, state.task, editing]);

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

  // `min`/`max` on <input type="number"> only bind the spinner, not typing — so
  // clamp duration fields on change. Empty stays empty; junk resets to "".
  const setClamped = (key: "hours" | "minutes", raw: string, max: number) => {
    if (raw === "") return set(key, "");
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n)) return;
    set(key, String(Math.max(0, Math.min(max, n))));
  };

  const applySuggestion = (e: Entry) => {
    setState((s) => ({
      ...s,
      task: e.task,
      category: e.category,
      ticketNumber: e.ticket_number ?? "",
      ticketUrl: e.ticket_url ?? "",
    }));
    setTaskFocused(false);
    taskRef.current?.focus();
  };

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

  const labelClass = "text-xs font-medium text-muted";
  const isDuplicate = !editing && !!seed;

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="entry-task" className={labelClass}>
          Task
        </label>
        <div className="relative">
          <Textarea
            ref={taskRef}
            id="entry-task"
            data-test-id="entry-task"
            rows={2}
            required
            value={state.task}
            onChange={(e) => set("task", e.target.value)}
            onFocus={() => setTaskFocused(true)}
            onBlur={() => setTaskFocused(false)}
            placeholder="What did you work on?"
            className="resize-none"
            style={{ maxHeight: 320 }}
          />
          {taskFocused && matches.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-hairline bg-card shadow-card"
              data-test-id="task-suggestions"
            >
              <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                <History size={11} /> Recent tasks
              </p>
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-test-id="task-suggestion"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(m)}
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-canvas"
                >
                  <span className="line-clamp-1 text-sm text-ink">{m.task}</span>
                  <span className="text-xs text-muted">
                    {CATEGORY_MAP[m.category].label}
                    {m.ticket_number ? ` · ${m.ticket_number}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Date</span>
          <DatePicker
            value={state.entryDate}
            onChange={(iso) => iso && set("entryDate", iso)}
            testId="entry-date"
            ariaLabel="Entry date"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Category</span>
          <Select
            value={state.category}
            onValueChange={(v) => set("category", v as Category)}
          >
            <SelectTrigger data-test-id="entry-category" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry-ticket" className={labelClass}>
            Ticket #
          </label>
          <Input
            id="entry-ticket"
            data-test-id="entry-ticket-number"
            value={state.ticketNumber}
            onChange={(e) => set("ticketNumber", e.target.value)}
            placeholder="VS-1234"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry-url" className={labelClass}>
            Ticket URL
          </label>
          <Input
            id="entry-url"
            data-test-id="entry-ticket-url"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Time spent</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={24}
                data-test-id="entry-hours"
                aria-label="Hours"
                value={state.hours}
                onChange={(e) => setClamped("hours", e.target.value, 24)}
                placeholder="0"
                className="w-16 text-center"
              />
              <span className="text-xs text-muted">h</span>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={59}
                data-test-id="entry-minutes"
                aria-label="Minutes"
                value={state.minutes}
                onChange={(e) => setClamped("minutes", e.target.value, 59)}
                placeholder="0"
                className="w-16 text-center"
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
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs font-medium transition-colors ${
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
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-test-id="entry-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="cta"
          disabled={submitting}
          data-test-id="entry-submit"
          className="flex-1"
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
        </Button>
      </div>

      <p className="-mt-1 text-center text-[11px] text-muted">
        Tip: press <kbd className="rounded bg-canvas px-1">⌘/Ctrl</kbd> +{" "}
        <kbd className="rounded bg-canvas px-1">Enter</kbd> to save
      </p>
    </form>
  );
}
