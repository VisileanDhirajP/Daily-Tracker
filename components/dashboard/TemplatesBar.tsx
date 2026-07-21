"use client";

import { useState } from "react";
import { Plus, Trash2, Zap, Loader2 } from "lucide-react";
import type { Category, EntryStatus, EntryTemplate, TemplateInput } from "@/lib/types";
import { CATEGORIES, CATEGORY_MAP, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDuration, toMinutes } from "@/lib/format/time";
import { useToast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplatesBarProps {
  templates: EntryTemplate[];
  loading: boolean;
  onLog: (t: EntryTemplate) => void;
  onAdd: (input: TemplateInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const EMPTY = {
  label: "",
  task: "",
  category: "meeting" as Category,
  hours: "",
  minutes: "",
  ticket: "",
  status: "done" as EntryStatus,
};

/**
 * One-tap templates for routine work. Chips log an entry to the selected day;
 * the "＋" opens a dialog to create and manage presets.
 */
export function TemplatesBar({ templates, loading, onLog, onAdd, onRemove }: TemplatesBarProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const clampNum = (raw: string, max: number) => {
    if (raw === "") return "";
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) ? String(Math.max(0, Math.min(max, n))) : "";
  };

  const submit = async () => {
    if (form.label.trim().length < 2) return setError("Give the template a name.");
    if (form.task.trim().length < 2) return setError("Add the task it logs.");
    setError(null);
    setSaving(true);
    try {
      await onAdd({
        label: form.label.trim(),
        task: form.task.trim(),
        category: form.category,
        minutes: toMinutes(Number(form.hours), Number(form.minutes)),
        ticket_number: form.ticket.trim() || null,
        ticket_url: null,
        status: form.status,
      });
      setForm(EMPTY);
      toast("Template saved.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save template.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" data-test-id="templates-bar">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
        <Zap size={13} className="text-gold" />
        Quick log
      </span>

      {templates.map((t) => {
        const meta = CATEGORY_MAP[t.category];
        return (
          <Tooltip
            key={t.id}
            label={`${t.task}${t.minutes > 0 ? ` · ${formatDuration(t.minutes)}` : ""}`}
          >
            <button
              type="button"
              onClick={() => onLog(t)}
              data-test-id="template-chip"
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-blue-light hover:bg-blue-brand/5"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
              {t.label}
            </button>
          </Tooltip>
        );
      })}

      {!loading && templates.length === 0 && (
        <span className="text-xs text-muted">Save routine work for one-tap logging →</span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        data-test-id="templates-manage"
        className="h-7 gap-1 px-2 text-muted hover:text-blue-brand"
      >
        <Plus size={14} />
        Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>One-tap presets for routine work.</DialogDescription>
          </DialogHeader>

          {templates.length > 0 && (
            <ul className="flex flex-col gap-1.5" aria-label="Saved templates">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_MAP[t.category].color }}
                    />
                    <span className="truncate text-sm font-medium text-ink">{t.label}</span>
                    {t.minutes > 0 && (
                      <span className="shrink-0 text-xs text-muted">
                        {formatDuration(t.minutes)}
                      </span>
                    )}
                  </span>
                  <Tooltip label="Delete template">
                    <button
                      type="button"
                      onClick={() => void onRemove(t.id)}
                      data-test-id="template-delete"
                      aria-label={`Delete ${t.label}`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-hairline pt-4">
            <Input
              data-test-id="template-label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Name (e.g. Daily standup)"
            />
            <Input
              data-test-id="template-task"
              value={form.task}
              onChange={(e) => set("task", e.target.value)}
              placeholder="Task to log"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onValueChange={(v) => set("category", v as Category)}>
                <SelectTrigger data-test-id="template-category" aria-label="Category">
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
              <Select value={form.status} onValueChange={(v) => set("status", v as EntryStatus)}>
                <SelectTrigger data-test-id="template-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min={0}
                max={24}
                aria-label="Hours"
                value={form.hours}
                onChange={(e) => set("hours", clampNum(e.target.value, 24))}
                placeholder="0h"
              />
              <Input
                type="number"
                min={0}
                max={59}
                aria-label="Minutes"
                value={form.minutes}
                onChange={(e) => set("minutes", clampNum(e.target.value, 59))}
                placeholder="0m"
              />
              <Input
                value={form.ticket}
                onChange={(e) => set("ticket", e.target.value)}
                placeholder="Ticket #"
                aria-label="Ticket number"
              />
            </div>
            {error && (
              <p className="text-xs text-orange-brand" role="alert">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant="cta"
              onClick={submit}
              disabled={saving}
              data-test-id="template-save"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Add template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
