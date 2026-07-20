"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText, Loader2, Sheet } from "lucide-react";
import type { TeamFeedRow } from "@/lib/types";
import { buildTeamCsv } from "@/lib/export/csv";
import { downloadFile } from "@/lib/export/download";
import type { TeamReportMeta } from "@/lib/export/pdf";
import { useToast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamExportMenuProps {
  rows: TeamFeedRow[];
  meta: TeamReportMeta;
}

function filename(meta: TeamReportMeta, ext: string): string {
  const label = meta.rangeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `daily-tracker-team-${label}-${meta.from}_to_${meta.to}.${ext}`;
}

/**
 * Export control for the manager team feed. Downloads exactly what's on screen
 * (the caller passes the already-filtered rows) as CSV or a formatted PDF.
 */
export function TeamExportMenu({ rows, meta }: TeamExportMenuProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "csv" | "pdf">(null);
  const empty = rows.length === 0;

  const handleCsv = () => {
    if (empty) return toast("Nothing to export in this view.", "info");
    setBusy("csv");
    try {
      downloadFile(filename(meta, "csv"), buildTeamCsv(rows), "text/csv;charset=utf-8");
      toast("CSV downloaded.", "success");
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (empty) return toast("Nothing to export in this view.", "info");
    setBusy("pdf");
    try {
      const { renderTeamReportPdf } = await import("@/lib/export/pdf");
      const blob = await renderTeamReportPdf(rows, meta);
      downloadFile(filename(meta, "pdf"), blob, "application/pdf");
      toast("PDF downloaded.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't build PDF.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          data-test-id="team-export"
          className="gap-1.5"
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          Export
          <ChevronDown size={14} className="text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Export this view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleCsv();
          }}
          data-test-id="team-export-csv"
          className="gap-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-brand/10 text-blue-brand">
            <Sheet size={16} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium">Download CSV</span>
            <span className="text-xs text-muted">Spreadsheet · current filters</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void handlePdf();
          }}
          data-test-id="team-export-pdf"
          className="gap-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-brand/10 text-orange-brand">
            <FileText size={16} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium">Download PDF</span>
            <span className="text-xs text-muted">Formatted report</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
