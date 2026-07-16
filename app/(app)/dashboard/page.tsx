"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Plus } from "lucide-react";
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
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (entry: Entry) => {
    setEditing(entry);
    setSelectedDate(entry.entry_date);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
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
            onDelete={setPendingDelete}
          />
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "Edit entry" : "Log an entry"}
        subtitle={editing ? undefined : `Logging to ${formatShortDate(selectedDate)}`}
        onClose={closeForm}
        testId="entry-modal"
      >
        <EntryForm
          defaultDate={selectedDate}
          editing={editing}
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
