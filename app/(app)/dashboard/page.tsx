"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import type { Entry, EntryInput, EntryStatus } from "@/lib/types";
import { useEntries } from "@/hooks/useEntries";
import { useToast } from "@/components/ui/ToastProvider";
import { EMPTY_FILTERS, filterEntries, type EntryFilters } from "@/lib/entries";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatShortDate, todayISO } from "@/lib/format/date";
import { HeaderStats } from "@/components/dashboard/HeaderStats";
import { DayNavigator } from "@/components/dashboard/DayNavigator";
import { EntryForm } from "@/components/dashboard/EntryForm";
import { EntryList } from "@/components/dashboard/EntryList";
import { Filters } from "@/components/dashboard/Filters";
import { DashboardInsightsRail } from "@/components/dashboard/DashboardInsightsRail";
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
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [editing, setEditing] = useState<Entry | null>(null);
  const [seed, setSeed] = useState<Entry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"cards" | "compact">("cards");

  // Remember the chosen density across sessions.
  useEffect(() => {
    const v = localStorage.getItem("vldt:view");
    if (v === "compact" || v === "cards") setView(v);
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

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
      <HeaderStats entries={entries} selectedDate={selectedDate} />

      {/* Toolbar: day navigation on the left, primary action on the right. */}
      <div className="relative z-20 mt-5 flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <DayNavigator
          value={selectedDate}
          onChange={setSelectedDate}
          shortcutsEnabled={!formOpen && !pendingDelete}
        />
        <Button
          variant="cta"
          onClick={openAdd}
          data-test-id="open-add-entry"
          className="px-5"
        >
          <Plus size={16} />
          Add entry
        </Button>
      </div>

      {/* Entries */}
      <div className="mt-6">
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

        <Filters
          allEntries={entries}
          filtered={filtered}
          filters={filters}
          onChange={setFilters}
        />

        {/* Bulk action bar — shown while entries are selected. */}
        {selectedCount > 0 && (
          <div
            className="sticky top-0 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-brand/30 bg-blue-brand/10 p-2.5 backdrop-blur"
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

        <div className="mt-5">
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
          />
        </div>
      </div>
        </div>
        <aside className="hidden w-80 shrink-0 lg:block">
          <DashboardInsightsRail entries={entries} />
        </aside>
      </div>

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
