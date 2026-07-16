import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  pdf,
} from "@react-pdf/renderer";
import type { ReportModel } from "./report";
import { CATEGORY_MAP, APP_NAME } from "../constants";
import { formatDuration, toHours } from "../format/time";
import { formatLongDate, formatShortDate } from "../format/date";

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 48, fontSize: 10, color: "#132430" },
  header: {
    backgroundColor: "#123E66",
    color: "#ffffff",
    paddingVertical: 22,
    paddingHorizontal: 36,
  },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  brandMark: {
    marginRight: 8,
  },
  brandTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  metaRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 9, color: "#eef2f8" },
  body: { paddingHorizontal: 36, paddingTop: 20 },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e6edf5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#123E66" },
  statLabel: { fontSize: 8, color: "#647587", marginTop: 2 },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#eef2f8",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  dayTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#123E66" },
  dayMeta: { fontSize: 8, color: "#647587" },
  entryRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f8",
  },
  cTask: { width: "46%", paddingRight: 6 },
  cCat: { width: "16%" },
  cTicket: { width: "18%" },
  cTime: { width: "10%", textAlign: "right" },
  cStatus: { width: "10%", textAlign: "right" },
  taskText: { fontSize: 9 },
  dim: { fontSize: 8, color: "#647587" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#647587",
  },
});

function ReportDocument({ model }: { model: ReportModel }) {
  const { meta } = model;
  return (
    <Document title={`${APP_NAME} — ${meta.userName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brandRow}>
            <Svg width={16} height={16} viewBox="0 0 40 40" style={styles.brandMark}>
              <Rect x="8" y="22" width="6" height="10" rx="2" fill="#96C0E0" />
              <Rect x="17" y="15" width="6" height="17" rx="2" fill="#2E7CC4" />
              <Rect x="26" y="8" width="6" height="24" rx="2" fill="#FCBC36" />
            </Svg>
            <Text style={styles.brandTitle}>{APP_NAME}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{meta.userName}</Text>
            <Text style={styles.metaText}>
              {meta.rangeLabel}: {formatShortDate(meta.from)} – {formatShortDate(meta.to)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.summaryCard}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{toHours(model.totalMinutes)}h</Text>
              <Text style={styles.statLabel}>Total time</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{model.entryCount}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{model.dayCount}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>

          {model.groups.map((g) => (
            <View key={g.date} wrap={false}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{formatLongDate(g.date)}</Text>
                <Text style={styles.dayMeta}>
                  {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"} ·{" "}
                  {formatDuration(g.totalMinutes)}
                </Text>
              </View>
              {g.entries.map((e) => (
                <View key={e.id} style={styles.entryRow}>
                  <View style={styles.cTask}>
                    <Text style={styles.taskText}>{e.task}</Text>
                  </View>
                  <Text style={[styles.cCat, styles.dim]}>
                    {CATEGORY_MAP[e.category].label}
                  </Text>
                  <Text style={[styles.cTicket, styles.dim]}>
                    {e.ticket_number ?? "—"}
                  </Text>
                  <Text style={styles.cTime}>{formatDuration(e.minutes)}</Text>
                  <Text style={[styles.cStatus, styles.dim]}>
                    {e.status === "done" ? "Done" : e.status === "hold" ? "Hold" : "WIP"}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>{APP_NAME}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Render the report to a PDF Blob (client-side). */
export async function renderReportPdf(model: ReportModel): Promise<Blob> {
  return pdf(<ReportDocument model={model} />).toBlob();
}

/** Render the report to a base64 data string (server-side email attachment). */
export async function renderReportPdfBase64(model: ReportModel): Promise<string> {
  const instance = pdf(<ReportDocument model={model} />);
  const buffer = await instance.toBuffer();
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    // toBuffer returns a Node stream in the server runtime.
    const stream = buffer as unknown as NodeJS.ReadableStream;
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    stream.on("error", reject);
  });
}
