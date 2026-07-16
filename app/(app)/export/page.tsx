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

export default function ExportPage() {
  const { entries } = useEntries();
  const { user } = useAuth();
  const { toast } = useToast();

  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [managerEmail, setManagerEmail] = useState("");
  const [busy, setBusy] = useState<null | "pdf" | "csv" | "send">(null);

  useEffect(() => {
    if (!user) return;
    repository
      .getProfile(user.id)
      .then((p) => setManagerEmail(p?.manager_email || ""))
      .catch(() => undefined);
  }, [user]);

  const range = useMemo(
    () => resolveRange(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo],
  );

  const cats = useMemo(() => usedCategories(entries), [entries]);

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
    if (!managerEmail) {
      toast("Set a manager email in Settings first.", "info");
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
        to: managerEmail,
        subject,
        summary,
        pdfBase64,
        filename,
      });

      if (result.sent) {
        toast(`Report sent to ${managerEmail}.`, "success");
      } else if (result.reason === "not-configured") {
        // Fallback: download the PDF + open a prefilled mail draft.
        downloadFile(filename, blob, "application/pdf");
        window.location.href = buildMailto(managerEmail, subject, summary);
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
              <label className="flex flex-col gap-1 text-xs text-muted">
                From
                <input
                  type="date"
                  data-test-id="range-from"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-hairline px-2 py-1.5 text-sm text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                To
                <input
                  type="date"
                  data-test-id="range-to"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-hairline px-2 py-1.5 text-sm text-ink"
                />
              </label>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Category
            </p>
            <select
              data-test-id="export-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | "all")}
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="all">All categories</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_MAP[c].label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-hairline pt-4">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePdf}
                disabled={busy !== null}
                data-test-id="download-pdf"
                className="btn-cta flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
              >
                {busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleCsv}
                disabled={busy !== null}
                data-test-id="download-csv"
                className="flex items-center justify-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-navy hover:bg-canvas"
              >
                {busy === "csv" ? <Loader2 size={16} className="animate-spin" /> : <Sheet size={16} />}
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={busy !== null}
                data-test-id="send-manager"
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-brand px-4 py-2.5 text-sm font-medium text-blue-brand hover:bg-blue-brand/10"
              >
                {busy === "send" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send to manager
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              {managerEmail ? (
                <>Manager: {managerEmail}</>
              ) : (
                <>No manager email set — add one in Settings.</>
              )}
            </p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <ReportPreview model={model} />
        </div>
      </div>
    </main>
  );
}
