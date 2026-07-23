"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Sheet, Send, Loader2 } from "lucide-react";
import type { Category } from "@/lib/types";
import { useEntries } from "@/hooks/useEntries";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { repository } from "@/lib/data";
import { CATEGORIES, CATEGORY_MAP, APP_NAME } from "@/lib/constants";
import { inRange, usedCategories } from "@/lib/entries";
import { RANGE_OPTIONS, resolveRange, type RangeKey } from "@/lib/export/range";
import { buildReport, reportFilename } from "@/lib/export/report";
import { buildCsv } from "@/lib/export/csv";
import { downloadFile } from "@/lib/export/download";
import {
  buildMailto,
  buildReportSummary,
  sendReportEmail,
} from "@/lib/export/emailClient";
import { ReportPreview } from "@/components/export/ReportPreview";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExportPage() {
  const { entries, loading } = useEntries();
  const { user } = useAuth();
  const { toast } = useToast();

  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [managerEmails, setManagerEmails] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "pdf" | "csv" | "send">(null);

  useEffect(() => {
    if (!user) return;
    repository
      .getProfile(user.id)
      .then((p) => setManagerEmails(p?.manager_emails ?? []))
      .catch(() =>
        toast("Couldn't load your manager — retry before sending.", "error"),
      );
  }, [user, toast]);

  const range = useMemo(
    () => resolveRange(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo],
  );

  // Category options reflect only what's present in the selected range, sorted
  // in the canonical palette order (not entry-insertion order).
  const cats = useMemo(() => {
    const present = new Set(usedCategories(inRange(entries, range.from, range.to)));
    return CATEGORIES.filter((c) => present.has(c.value)).map((c) => c.value);
  }, [entries, range]);

  // If the active category is no longer in range, fall back to "all".
  useEffect(() => {
    if (category !== "all" && !cats.includes(category)) setCategory("all");
  }, [cats, category]);

  const model = useMemo(() => {
    let scoped = inRange(entries, range.from, range.to);
    if (category !== "all") scoped = scoped.filter((e) => e.category === category);
    return buildReport(scoped, {
      userName: user?.full_name || user?.email || "You",
      rangeLabel: range.label,
      from: range.from,
      to: range.to,
    });
  }, [entries, range, category, user]);

  const scopedEntries = model.groups.flatMap((g) => g.entries);

  const handleCsv = () => {
    if (model.entryCount === 0) return toast("Nothing to export in this range.", "info");
    setBusy("csv");
    try {
      downloadFile(
        reportFilename(model.meta, "csv"),
        buildCsv(scopedEntries),
        "text/csv;charset=utf-8",
      );
      toast("CSV downloaded.", "success");
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (model.entryCount === 0) return toast("Nothing to export in this range.", "info");
    setBusy("pdf");
    try {
      const { renderReportPdf } = await import("@/lib/export/pdf");
      const blob = await renderReportPdf(model);
      downloadFile(reportFilename(model.meta, "pdf"), blob, "application/pdf");
      toast("PDF downloaded.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't build PDF.", "error");
    } finally {
      setBusy(null);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleSend = async () => {
    if (model.entryCount === 0) return toast("Nothing to send in this range.", "info");
    if (managerEmails.length === 0) {
      toast("No manager assigned yet — ask your admin to assign one.", "info");
      return;
    }
    setBusy("send");
    const subject = `${APP_NAME} — ${model.meta.rangeLabel} report`;
    const summary = buildReportSummary(model);
    try {
      const { renderReportPdf } = await import("@/lib/export/pdf");
      const blob = await renderReportPdf(model);
      const filename = reportFilename(model.meta, "pdf");
      const pdfBase64 = await blobToBase64(blob);

      const result = await sendReportEmail({
        to: managerEmails,
        subject,
        summary,
        pdfBase64,
        filename,
      });

      if (result.sent) {
        toast(
          `Report sent to ${managerEmails.length} manager${managerEmails.length === 1 ? "" : "s"}.`,
          "success",
        );
      } else if (result.reason === "not-configured") {
        // Fallback: download the PDF + open a prefilled mail draft.
        downloadFile(filename, blob, "application/pdf");
        window.location.href = buildMailto(managerEmails, subject, summary);
        toast("Email isn't configured — downloaded the PDF and opened a draft.", "info");
      } else {
        toast(result.message || "Couldn't send the report.", "error");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send the report.", "error");
    } finally {
      setBusy(null);
    }
  };

  const rangeBtn = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-blue-brand bg-blue-brand/10 text-blue-brand"
        : "border-hairline text-ink hover:bg-canvas"
    }`;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-navy">Export &amp; send</h1>
      <p className="mt-1 text-sm text-muted">
        Build a report for any range and send it straight to your manager.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Controls */}
        <div className="card flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Range
            </p>
            <div className="grid grid-cols-2 gap-2">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  data-test-id={`range-${r.key}`}
                  className={rangeBtn(rangeKey === r.key)}
                  onClick={() => setRangeKey(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {rangeKey === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 text-xs text-muted">
                From
                <DatePicker
                  value={customFrom}
                  onChange={setCustomFrom}
                  testId="range-from"
                  ariaLabel="From date"
                  placeholder="From"
                />
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted">
                To
                <DatePicker
                  value={customTo}
                  onChange={setCustomTo}
                  testId="range-to"
                  ariaLabel="To date"
                  placeholder="To"
                />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Category
            </p>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category | "all")}
            >
              <SelectTrigger data-test-id="export-category" aria-label="Category filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_MAP[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-hairline pt-4">
            <div className="flex flex-col gap-2">
              <Button
                variant="cta"
                onClick={handlePdf}
                disabled={busy !== null || loading}
                data-test-id="download-pdf"
              >
                {busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleCsv}
                disabled={busy !== null || loading}
                data-test-id="download-csv"
              >
                {busy === "csv" ? <Loader2 size={16} className="animate-spin" /> : <Sheet size={16} />}
                Download CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleSend}
                disabled={busy !== null || loading}
                data-test-id="send-manager"
                className="border-blue-brand text-blue-brand hover:bg-blue-brand/10"
              >
                {busy === "send" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send to manager
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              {managerEmails.length > 0 ? (
                <>
                  {managerEmails.length === 1 ? "Manager" : "Managers"}:{" "}
                  {managerEmails.join(", ")}
                </>
              ) : (
                <>No manager assigned yet — ask your admin.</>
              )}
            </p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <ReportPreview model={model} loading={loading} />
        </div>
      </div>
    </main>
  );
}
