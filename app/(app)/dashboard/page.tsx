"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileDown,
  Plus,
  Pencil,
  CopyPlus,
  Trash2,
  X,
  ChevronDown,
  LayoutGrid,
  Rows3,
  AlertTriangle,
} from "lucide-react";
import type { Blocker, BlockerInput, Entry, EntryInput, EntryStatus, EntryTemplate } from "@/lib/types";
import { useEntries } from "@/hooks/useEntries";
import { useTemplates } from "@/hooks/useTemplates";
import { useBlockers } from "@/hooks/useBlockers";
import { useToast } from "@/components/ui/ToastProvider";
import { EMPTY_FILTERS, filterEntries, type EntryFilters } from "@/lib/entries";
import { parseQuickEntry } from "@/lib/quickAdd";
import { subscribeAppCommand, type AppCommand } from "@/lib/commands";
import { blockedTicketMap, seedFromEntry, toBlockerInput } from "@/lib/blockers";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatShortDate, todayISO } from "@/lib/format/date";
import { HeaderStats } from "@/components/dashboard/HeaderStats";
import { DayNavigator } from "@/components/dashboard/DayNavigator";
import { EntryForm } from "@/components/dashboard/EntryForm";
import { EntryList } from "@/components/dashboard/EntryList";
import { Filters } from "@/components/dashboard/Filters";
import { TemplatesBar } from "@/components/dashboard/TemplatesBar";
import { CopyPreviousDay } from "@/components/dashboard/CopyPreviousDay";
import { WeeklyGoalCard } from "@/components/dashboard/WeeklyGoalCard";
import { WeeklyReviewNudge } from "@/components/dashboard/WeeklyReviewNudge";
import { BlockersCard } from "@/components/dashboard/BlockersCard";
import { BlockerForm } from "@/components/dashboard/BlockerForm";
import { Tour, START_TOUR_EVENT } from "@/components/Tour";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const {
    entries,
    loading,
    error,
    addEntry,
    editEntry,
    removeEntry,
    restoreEntry,
    patchEntry,
    removeMany,
    patchMany,
  } = useEntries();
  const {
    templates,
    loading: templatesLoading,
    addTemplate,
    removeTemplate,
  } = useTemplates();
  const {
    blockers,
    loading: blockersLoading,
    addBlocker,
    editBlocker,
    resolveBlocker,
    reopenBlocker,
    removeBlocker,
  } = useBlockers();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [editing, setEditing] = useState<Entry | null>(null);
  const [seed, setSeed] = useState<Entry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"cards" | "compact">("cards");
  const [blockerFormOpen, setBlockerFormOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [blockerSeed, setBlockerSeed] = useState<Partial<BlockerInput> | null>(null);

  // Remember the chosen density across sessions.
  useEffect(() => {
    try {
      const v = localStorage.getItem("vldt:view");
      if (v === "compact" || v === "cards") setView(v);
    } catch {
      /* storage unavailable — keep the default */
    }
  }, []);
  const changeView = (v: "cards" | "compact") => {
    setView(v);
    try {
      localStorage.setItem("vldt:view", v);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);

  // Keyboard shortcuts: "N" opens the add-entry modal, "/" focuses search.
  // Both are suppressed while a modal/confirm is open so they can't steal focus
  // or fight the dialog's focus trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (formOpen || pendingDelete) return;
      // Ignore while any Radix overlay is open (menu/select/popover/dialog) so
      // shortcuts don't steal focus from — or fire behind — an open control.
      if (
        document.querySelector(
          '[role="dialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper]',
        )
      ) {
        return;
      }
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("entry-search")?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditing(null);
        setSeed(null);
        setFormOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, pendingDelete]);

  const openAdd = () => {
    setEditing(null);
    setSeed(null);
    setFormOpen(true);
  };

  const handleEdit = (entry: Entry) => {
    // The edit form derives its date from the entry itself, so we don't move
    // the day navigator / header stats to the entry's day.
    setEditing(entry);
    setSeed(null);
    setFormOpen(true);
  };

  const handleDuplicate = (entry: Entry) => {
    // Copy this entry as a brand-new one, defaulting to today so the user just
    // confirms/edits the date.
    setEditing(null);
    setSelectedDate(todayISO());
    setSeed(entry);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setSeed(null);
  };

  const handleSubmit = async (input: EntryInput) => {
    if (editing) {
      await editEntry(editing.id, input);
      toast("Entry updated.", "success");
    } else {
      await addEntry(input);
      toast("Entry added.", "success");
      setSelectedDate(input.entry_date);
    }
  };

  const handleStatusChange = async (entry: Entry, status: EntryStatus) => {
    if (entry.status === status) return;
    try {
      await patchEntry(entry.id, { status });
      toast(`Marked ${STATUS_META[status].label.toLowerCase()}.`, "success");
    } catch {
      toast("Couldn't update status.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const entry = pendingDelete;
    setPendingDelete(null);
    // Drop the entry from any bulk selection so the "N selected" count can't
    // go stale (the restored copy gets a fresh id, so pruning is always right).
    setSelectedIds((prev) => {
      if (!prev.has(entry.id)) return prev;
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
    try {
      await removeEntry(entry.id);
      toast("Entry deleted.", "info", {
        durationMs: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void restoreEntry(entry).then(() => toast("Entry restored.", "success"));
          },
        },
      });
    } catch {
      toast("Couldn't delete entry.", "error");
    }
  };

  // ---- Selection / bulk actions -------------------------------------------
  const toggleSelect = (entry: Entry) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());
  const selectedCount = selectedIds.size;

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    const removed = entries.filter((e) => selectedIds.has(e.id));
    clearSelection();
    try {
      await removeMany(ids);
      toast(`${ids.length} ${ids.length === 1 ? "entry" : "entries"} deleted.`, "info", {
        durationMs: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void Promise.all(removed.map((r) => restoreEntry(r))).then(() =>
              toast("Restored.", "success"),
            );
          },
        },
      });
    } catch {
      toast("Couldn't delete entries.", "error");
    }
  };

  const bulkStatus = async (status: EntryStatus) => {
    const ids = [...selectedIds];
    try {
      await patchMany(ids, { status });
      toast(`${ids.length} set to ${STATUS_META[status].label.toLowerCase()}.`, "success");
      clearSelection();
    } catch {
      toast("Couldn't update entries.", "error");
    }
  };

  const logTemplate = async (t: EntryTemplate) => {
    try {
      await addEntry({
        entry_date: selectedDate,
        task: t.task,
        category: t.category,
        ticket_number: t.ticket_number,
        ticket_url: t.ticket_url,
        minutes: t.minutes,
        status: t.status,
      });
      toast(`Logged "${t.label}" to ${formatShortDate(selectedDate)}.`, "success");
    } catch {
      toast("Couldn't log that template.", "error");
    }
  };

  const quickAdd = async (input: EntryInput) => {
    try {
      await addEntry(input);
      toast("Entry added.", "success");
    } catch {
      toast("Couldn't add the entry.", "error");
    }
  };

  const copyEntries = async (inputs: EntryInput[]) => {
    try {
      // Sequential keeps insertion order deterministic and avoids racing the
      // optimistic reconcile in useEntries.
      for (const input of inputs) {
        await addEntry(input);
      }
      toast(
        `Copied ${inputs.length} ${inputs.length === 1 ? "entry" : "entries"} to ${formatShortDate(selectedDate)}.`,
        "success",
      );
    } catch {
      toast("Couldn't copy those entries.", "error");
    }
  };

  // Bridge for the global command palette. It navigates here and dispatches an
  // action; we run it against the latest handlers via a ref so the one-time
  // subscription never goes stale.
  const commandRef = useRef<(command: AppCommand) => void>(() => {});
  commandRef.current = (command: AppCommand) => {
    if (command.type === "new-entry") {
      openAdd();
    } else if (command.type === "quick-log") {
      const parsed = parseQuickEntry(command.text);
      if (parsed) {
        void quickAdd({
          entry_date: selectedDate,
          task: parsed.task,
          category: parsed.category,
          minutes: parsed.minutes,
          ticket_number: parsed.ticket_number,
          ticket_url: null,
          status: parsed.status,
        });
      } else {
        toast("Couldn't parse that — try adding a few words.", "error");
      }
    } else if (command.type === "filter-category") {
      // From a clicked category on Insights → focus the list on that category.
      setFilters({ ...EMPTY_FILTERS, category: command.category });
    } else if (command.type === "focus-date") {
      // From a clicked heatmap cell → jump the list + stats to that day.
      setSelectedDate(command.date);
      setFilters({ ...EMPTY_FILTERS, date: command.date });
    } else if (command.type === "start-tour") {
      window.dispatchEvent(new Event(START_TOUR_EVENT));
    } else if (command.type === "new-blocker") {
      openBlockerAdd(command.seed ?? null);
    }
  };
  useEffect(() => subscribeAppCommand((command) => commandRef.current(command)), []);

  const moveToDate = async (id: string, date: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.entry_date === date) return;
    try {
      await patchEntry(id, { entry_date: date });
      toast(`Moved to ${formatShortDate(date)}.`, "success");
    } catch {
      toast("Couldn't move the entry.", "error");
    }
  };

  const bulkMoveDay = async (date: string) => {
    const ids = [...selectedIds];
    try {
      await patchMany(ids, { entry_date: date });
      toast(`Moved ${ids.length} to ${formatShortDate(date)}.`, "success");
      clearSelection();
    } catch {
      toast("Couldn't move entries.", "error");
    }
  };

  const blockedTickets = useMemo(() => blockedTicketMap(blockers), [blockers]);

  const openBlockerAdd = (seed: Partial<BlockerInput> | null = null) => {
    setEditingBlocker(null);
    setBlockerSeed(seed);
    setBlockerFormOpen(true);
  };
  const handleBlockerEdit = (b: Blocker) => {
    setEditingBlocker(b);
    setBlockerSeed(null);
    setBlockerFormOpen(true);
  };
  const closeBlockerForm = () => {
    setBlockerFormOpen(false);
    setEditingBlocker(null);
    setBlockerSeed(null);
  };
  const handleBlockerSubmit = async (input: BlockerInput) => {
    if (editingBlocker) {
      await editBlocker(editingBlocker.id, input);
      toast("Blocker updated.", "success");
    } else {
      await addBlocker(input);
      toast("Blocker added.", "success");
    }
  };
  const handleBlockerResolve = async (id: string) => {
    try {
      await resolveBlocker(id);
      toast("Blocker resolved. 🎉", "success");
    } catch {
      toast("Couldn't resolve the blocker.", "error");
    }
  };
  const handleBlockerReopen = async (id: string) => {
    try {
      await reopenBlocker(id);
      toast("Blocker reopened.", "info");
    } catch {
      toast("Couldn't reopen the blocker.", "error");
    }
  };
  const handleBlockerDelete = async (b: Blocker) => {
    try {
      await removeBlocker(b.id);
      toast("Blocker removed.", "info", {
        durationMs: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void addBlocker(toBlockerInput(b)).then(() => toast("Blocker restored.", "success"));
          },
        },
      });
    } catch {
      toast("Couldn't delete the blocker.", "error");
    }
  };
  const onRaiseBlocker = (entry: Entry) => openBlockerAdd(seedFromEntry(entry));

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
      <WeeklyReviewNudge entries={entries} />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Capture controls + at-a-glance stats — right rail on desktop, top on mobile. */}
        <aside className="order-1 w-full shrink-0 lg:order-2 lg:w-80">
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <HeaderStats entries={entries} selectedDate={selectedDate} stacked loading={loading} />

            <div className="card flex flex-col gap-3 p-4">
              {/* Date drives which day new entries land on — kept with Add entry. */}
              <div className="relative z-20">
                <DayNavigator
                  value={selectedDate}
                  onChange={setSelectedDate}
                  shortcutsEnabled={!formOpen && !pendingDelete}
                  compact
                />
              </div>
              <Button
                variant="cta"
                onClick={openAdd}
                data-test-id="open-add-entry"
                className="w-full"
              >
                <Plus size={16} />
                Add entry
              </Button>
              <CopyPreviousDay
                entries={entries}
                selectedDate={selectedDate}
                onCopy={copyEntries}
              />
              <TemplatesBar
                templates={templates}
                loading={templatesLoading}
                onLog={logTemplate}
                onAdd={addTemplate}
                onRemove={removeTemplate}
              />
            </div>

            <BlockersCard
              blockers={blockers}
              loading={blockersLoading}
              onAdd={() => openBlockerAdd()}
              onEdit={handleBlockerEdit}
              onResolve={handleBlockerResolve}
              onReopen={handleBlockerReopen}
              onDelete={handleBlockerDelete}
            />

            <WeeklyGoalCard entries={entries} />
          </div>
        </aside>

        {/* Entry list */}
        <div className="order-2 min-w-0 flex-1 lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-base font-bold text-navy">All entries</h1>
            <div className="flex items-center gap-3">
              <div
                className="inline-flex rounded-lg border border-hairline p-0.5"
                role="group"
                aria-label="List density"
              >
                {(
                  [
                    { key: "cards", icon: LayoutGrid, label: "Card view" },
                    { key: "compact", icon: Rows3, label: "Compact view" },
                  ] as const
                ).map(({ key, icon: Icon, label }) => (
                  <Tooltip key={key} label={label}>
                    <button
                      type="button"
                      onClick={() => changeView(key)}
                      aria-pressed={view === key}
                      aria-label={label}
                      data-test-id={`view-${key}`}
                      className={`rounded-md p-1.5 transition-colors ${
                        view === key
                          ? "bg-blue-brand/10 text-blue-brand"
                          : "text-muted hover:text-navy"
                      }`}
                    >
                      <Icon size={15} />
                    </button>
                  </Tooltip>
                ))}
              </div>
              <Link
                href="/export"
                data-test-id="dashboard-export-link"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-brand hover:underline"
              >
                <FileDown size={15} />
                Export
              </Link>
            </div>
          </div>

          <div className="mb-4">
            <Filters
              allEntries={entries}
              filtered={filtered}
              filters={filters}
              onChange={setFilters}
              loading={loading}
            />
          </div>

          {/* Bulk action bar — shown while entries are selected. */}
          {selectedCount > 0 && (
            <div
              className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-brand/30 bg-blue-brand/10 p-2.5 backdrop-blur"
              data-test-id="bulk-bar"
            >
              <span className="text-sm font-semibold text-navy">
                {selectedCount} selected
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-test-id="bulk-status">
                      Set status
                      <ChevronDown size={13} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {STATUS_ORDER.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        data-test-id={`bulk-status-${s}`}
                        onSelect={() => void bulkStatus(s)}
                      >
                        {STATUS_META[s].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center gap-1 text-xs text-muted">
                  Move to
                  <DatePicker
                    value=""
                    onChange={(iso) => iso && void bulkMoveDay(iso)}
                    testId="bulk-move-day"
                    ariaLabel="Move selected to date"
                    placeholder="Pick day"
                    className="w-36"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                  data-test-id="bulk-delete"
                >
                  <Trash2 size={13} />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  data-test-id="bulk-clear"
                  className="text-muted"
                >
                  <X size={13} />
                  Clear
                </Button>
              </div>
            </div>
          )}

          <EntryList
            entries={filtered}
            loading={loading}
            error={error}
            filters={filters}
            view={view}
            editingId={editing?.id ?? null}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={setPendingDelete}
            onMoveToDate={moveToDate}
            blockedTickets={blockedTickets}
            onRaiseBlocker={onRaiseBlocker}
          />
        </div>
      </div>

      <Tour />

      <Modal
        open={formOpen}
        title={editing ? "Edit entry" : seed ? "Duplicate entry" : "Log an entry"}
        subtitle={
          editing
            ? undefined
            : seed
              ? "Copy of an existing entry — pick a new date and save"
              : `Logging to ${formatShortDate(selectedDate)}`
        }
        icon={
          editing ? (
            <Pencil size={20} />
          ) : seed ? (
            <CopyPlus size={20} />
          ) : (
            <Plus size={20} />
          )
        }
        onClose={closeForm}
        testId="entry-modal"
      >
        <EntryForm
          defaultDate={selectedDate}
          editing={editing}
          seed={seed}
          suggestions={entries}
          onSubmit={handleSubmit}
          onSuccess={closeForm}
          onCancel={closeForm}
        />
      </Modal>

      <Modal
        open={blockerFormOpen}
        title={editingBlocker ? "Edit blocker" : "Add a blocker"}
        subtitle={editingBlocker ? undefined : "Track something that's stopping a task"}
        icon={<AlertTriangle size={20} />}
        onClose={closeBlockerForm}
        testId="blocker-modal"
      >
        <BlockerForm
          editing={editingBlocker}
          seed={blockerSeed}
          onSubmit={handleBlockerSubmit}
          onSuccess={closeBlockerForm}
          onCancel={closeBlockerForm}
        />
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete entry?"
        message={
          pendingDelete
            ? `"${pendingDelete.task.slice(0, 80)}${
                pendingDelete.task.length > 80 ? "…" : ""
              }" will be permanently removed.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
