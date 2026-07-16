"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Plus, Pencil, CopyPlus } from "lucide-react";
import type { Entry, EntryInput } from "@/lib/types";
import { useEntries } from "@/hooks/useEntries";
import { useToast } from "@/components/ui/ToastProvider";
import { EMPTY_FILTERS, filterEntries, type EntryFilters } from "@/lib/entries";
import { formatShortDate, todayISO } from "@/lib/format/date";
import { HeaderStats } from "@/components/dashboard/HeaderStats";
import { DayNavigator } from "@/components/dashboard/DayNavigator";
import { EntryForm } from "@/components/dashboard/EntryForm";
import { EntryList } from "@/components/dashboard/EntryList";
import { Filters } from "@/components/dashboard/Filters";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function DashboardPage() {
  const { entries, loading, error, addEntry, editEntry, removeEntry } = useEntries();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [editing, setEditing] = useState<Entry | null>(null);
  const [seed, setSeed] = useState<Entry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);

  // Keyboard shortcuts: "N" opens the add-entry modal, "/" focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("entry-search")?.focus();
      } else if ((e.key === "n" || e.key === "N") && !formOpen && !pendingDelete) {
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
    setEditing(entry);
    setSeed(null);
    setSelectedDate(entry.entry_date);
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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const entry = pendingDelete;
    setPendingDelete(null);
    try {
      await removeEntry(entry.id);
      toast("Entry deleted.", "info");
    } catch {
      toast("Couldn't delete entry.", "error");
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <HeaderStats entries={entries} selectedDate={selectedDate} />

      {/* Toolbar: day navigation on the left, primary action on the right. */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-hairline bg-card/70 p-3 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <DayNavigator value={selectedDate} onChange={setSelectedDate} />
        <button
          type="button"
          onClick={openAdd}
          data-test-id="open-add-entry"
          className="btn-cta flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm"
        >
          <Plus size={16} />
          Add entry
        </button>
      </div>

      {/* Entries */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-navy">All entries</h1>
          <Link
            href="/export"
            data-test-id="dashboard-export-link"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-brand hover:underline"
          >
            <FileDown size={15} />
            Export
          </Link>
        </div>

        <Filters
          allEntries={entries}
          filtered={filtered}
          filters={filters}
          onChange={setFilters}
        />

        <div className="mt-5">
          <EntryList
            entries={filtered}
            loading={loading}
            error={error}
            filters={filters}
            editingId={editing?.id ?? null}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={setPendingDelete}
          />
        </div>
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
