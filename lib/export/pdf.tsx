import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Path,
  Circle,
  pdf,
} from "@react-pdf/renderer";
import type { ReportModel } from "./report";
import type { Category, EntryStatus, TeamFeedRow } from "../types";
import { groupTeamFeedByDay, teamTotalMinutes } from "../team";
import { CATEGORY_MAP, APP_NAME } from "../constants";
import { formatDuration, toHours } from "../format/time";
import { formatLongDate, formatShortDate, toISODate } from "../format/date";

// --- Palette -----------------------------------------------------------------
const NAVY = "#123E66";
const GOLD = "#FCBC36";
const INK = "#132430";
const MUTED = "#647587";
const HAIRLINE = "#e6edf5";
const ZEBRA = "#f7fafc";
const PANEL = "#f6f9fc";

const STATUS_PDF: Record<EntryStatus, { label: string; color: string; bg: string }> = {
  done: { label: "Done", color: "#1f7a45", bg: "#e5f3ea" },
  hold: { label: "On hold", color: "#8f6606", bg: "#fbf1d5" },
  progress: { label: "In progress", color: "#1e5c96", bg: "#e6f0fa" },
};

interface CatSlice {
  category: Category;
  minutes: number;
  meta: (typeof CATEGORY_MAP)[Category];
}

/** Aggregate minutes per category, largest first — feeds the distribution bar. */
function catBreakdown(items: { category: Category; minutes: number }[]): CatSlice[] {
  const map = new Map<Category, number>();
  for (const it of items) map.set(it.category, (map.get(it.category) ?? 0) + it.minutes);
  return [...map.entries()]
    .map(([category, minutes]) => ({ category, minutes, meta: CATEGORY_MAP[category] }))
    .sort((a, b) => b.minutes - a.minutes);
}

// --- Styles ------------------------------------------------------------------
const s = StyleSheet.create({
  // paddingTop clears the fixed header (~116pt) plus a gap so content doesn't
  // butt against the gold rule — on every page the header repeats.
  page: { paddingTop: 140, paddingBottom: 48, fontSize: 10, color: INK, fontFamily: "Helvetica" },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 36,
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandMark: { marginRight: 7 },
  brandTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 0.3 },
  headerRange: { fontSize: 8.5, color: "#c9d7e6" },
  eyebrow: {
    marginTop: 15,
    fontSize: 8,
    letterSpacing: 1.6,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  reportTitle: { marginTop: 4, fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  reportSubtitle: { marginTop: 3, fontSize: 9.5, color: "#c9d7e6" },

  body: { paddingHorizontal: 36 },

  statBand: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  statValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY },
  statLabel: { fontSize: 7, color: MUTED, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

  breakdown: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bar: { flexDirection: "row", height: 9, borderRadius: 5, overflow: "hidden", backgroundColor: HAIRLINE },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  legendText: { fontSize: 8.5, color: INK },
  legendDim: { fontSize: 8.5, color: MUTED },

  daySection: { marginBottom: 12 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f2f6fb",
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 2,
  },
  dayTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  dayMeta: { fontSize: 8, color: MUTED },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 9 },
  rowAlt: { backgroundColor: ZEBRA },
  taskText: { fontSize: 9, color: INK },
  dim: { fontSize: 8.5, color: MUTED },
  timeText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "right" },

  catTag: { flexDirection: "row", alignItems: "center" },
  catDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },

  pill: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  pillText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 6,
    fontSize: 7.5,
    color: MUTED,
  },

  // Personal columns
  cTask: { width: "44%", paddingRight: 6 },
  cCat: { width: "18%" },
  cTicket: { width: "16%" },
  cTime: { width: "10%" },
  cStatus: { width: "12%", alignItems: "flex-end" },

  // Team columns
  tEmp: { width: "18%", paddingRight: 6 },
  tTask: { width: "30%", paddingRight: 6 },
  tCat: { width: "15%" },
  tTicket: { width: "13%" },
  tTime: { width: "10%" },
  tStatus: { width: "14%", alignItems: "flex-end" },
  empText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
});

// --- Shared pieces -----------------------------------------------------------
function BrandMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 40 40" style={s.brandMark}>
      <Rect x="8" y="22" width="6" height="10" rx="2" fill="#96C0E0" />
      <Rect x="17" y="15" width="6" height="17" rx="2" fill="#2E7CC4" />
      <Rect x="26" y="8" width="6" height="24" rx="2" fill="#FCBC36" />
    </Svg>
  );
}

function ReportHeader({
  eyebrow,
  title,
  subtitle,
  rangeText,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  rangeText: string;
}) {
  return (
    <View style={s.header} fixed>
      <View style={s.brandRow}>
        <BrandMark />
        <Text style={s.brandTitle}>{APP_NAME}</Text>
        <View style={{ flexGrow: 1 }} />
        <Text style={s.headerRange}>{rangeText}</Text>
      </View>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.reportTitle}>{title}</Text>
      {subtitle ? <Text style={s.reportSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

type IconName = "clock" | "list" | "calendar" | "trend" | "users";

/** Minimal line icons drawn with react-pdf SVG (lucide-style), tinted per stat. */
function StatIcon({ name, color }: { name: IconName; color: string }) {
  const line = {
    stroke: color,
    strokeWidth: 2,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      {name === "clock" && (
        <>
          <Circle cx="12" cy="12" r="9" {...line} />
          <Path d="M12 7 L12 12 L16 14" {...line} />
        </>
      )}
      {name === "list" && (
        <>
          <Path d="M9 7 H18 M9 12 H18 M9 17 H18" {...line} />
          <Circle cx="5" cy="7" r="1.1" fill={color} />
          <Circle cx="5" cy="12" r="1.1" fill={color} />
          <Circle cx="5" cy="17" r="1.1" fill={color} />
        </>
      )}
      {name === "calendar" && (
        <>
          <Rect x="4" y="5" width="16" height="16" rx="2.5" {...line} />
          <Path d="M8 3 V7 M16 3 V7 M4 10 H20" {...line} />
        </>
      )}
      {name === "trend" && (
        <>
          <Path d="M4 16 L10 10 L14 13 L20 6" {...line} />
          <Path d="M15 6 H20 V11" {...line} />
        </>
      )}
      {name === "users" && (
        <>
          <Circle cx="8.5" cy="9" r="3" {...line} />
          <Path d="M3.5 18.5 C3.5 14.8 5.7 13.2 8.5 13.2 C11.3 13.2 13.5 14.8 13.5 18.5" {...line} />
          <Circle cx="16.5" cy="9.5" r="2.3" {...line} />
          <Path d="M15 13.4 C18 13.3 20.5 14.8 20.5 18.5" {...line} />
        </>
      )}
    </Svg>
  );
}

interface StatDef {
  value: string | number;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
}

function StatBand({ stats }: { stats: StatDef[] }) {
  return (
    <View style={s.statBand}>
      {stats.map((st) => (
        <View key={st.label} style={s.statCard}>
          <View style={[s.iconChip, { backgroundColor: st.bg }]}>
            <StatIcon name={st.icon} color={st.color} />
          </View>
          <View>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Per-slot accent (brand colour + soft tint) shared by both reports.
const STAT_ACCENTS: { icon: IconName; color: string; bg: string }[] = [
  { icon: "clock", color: "#123E66", bg: "#e6edf5" },
  { icon: "list", color: "#2E7CC4", bg: "#e6f0fa" },
  { icon: "calendar", color: "#F37E31", bg: "#fdefe4" },
  { icon: "trend", color: "#7C5CD6", bg: "#efeafb" },
];

function CategoryBreakdown({ slices, total }: { slices: CatSlice[]; total: number }) {
  if (total <= 0 || slices.length === 0) return null;
  return (
    <View style={s.breakdown}>
      <Text style={s.sectionLabel}>Time by category</Text>
      <View style={s.bar}>
        {slices.map((c) => (
          <View key={c.category} style={{ flexGrow: c.minutes, height: 9, backgroundColor: c.meta.color }} />
        ))}
      </View>
      <View style={s.legend}>
        {slices.map((c) => (
          <View key={c.category} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: c.meta.color }]} />
            <Text style={s.legendText}>{c.meta.label} </Text>
            <Text style={s.legendDim}>
              {toHours(c.minutes)}h · {Math.round((c.minutes / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DayHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={s.dayHeader}>
      <Text style={s.dayTitle}>{title}</Text>
      <Text style={s.dayMeta}>{meta}</Text>
    </View>
  );
}

function CategoryTag({ category }: { category: Category }) {
  const meta = CATEGORY_MAP[category];
  return (
    <View style={s.catTag}>
      <View style={[s.catDot, { backgroundColor: meta.color }]} />
      <Text style={s.dim}>{meta.label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: EntryStatus }) {
  const m = STATUS_PDF[status];
  return (
    <View style={[s.pill, { backgroundColor: m.bg }]}>
      <Text style={[s.pillText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

function Footer({ generated }: { generated: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {APP_NAME} · Generated {generated}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function dayMetaLabel(count: number, minutes: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"} · ${formatDuration(minutes)}`;
}

// --- Personal report ---------------------------------------------------------
function ReportDocument({ model, generated }: { model: ReportModel; generated: string }) {
  const { meta } = model;
  const entries = model.groups.flatMap((g) => g.entries);
  const slices = catBreakdown(entries);
  const avg = model.dayCount > 0 ? toHours(Math.round(model.totalMinutes / model.dayCount)) : "0";
  const rangeText = `${formatShortDate(meta.from)} – ${formatShortDate(meta.to)}`;

  return (
    <Document title={`${APP_NAME} — ${meta.userName}`}>
      <Page size="A4" style={s.page}>
        <ReportHeader
          eyebrow="ACTIVITY REPORT"
          title={meta.userName}
          subtitle={meta.rangeLabel}
          rangeText={rangeText}
        />

        <View style={s.body}>
          <StatBand
            stats={[
              { value: `${toHours(model.totalMinutes)}h`, label: "Total time", ...STAT_ACCENTS[0] },
              { value: model.entryCount, label: "Entries", ...STAT_ACCENTS[1] },
              { value: model.dayCount, label: "Active days", ...STAT_ACCENTS[2] },
              { value: `${avg}h`, label: "Avg / day", ...STAT_ACCENTS[3] },
            ]}
          />

          <CategoryBreakdown slices={slices} total={model.totalMinutes} />

          {model.groups.map((g) => (
            <View key={g.date} style={s.daySection} wrap={false}>
              <DayHeader title={formatLongDate(g.date)} meta={dayMetaLabel(g.entries.length, g.totalMinutes)} />
              {g.entries.map((e, i) => (
                <View key={e.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
                  <View style={s.cTask}>
                    <Text style={s.taskText}>{e.task}</Text>
                  </View>
                  <View style={s.cCat}>
                    <CategoryTag category={e.category} />
                  </View>
                  <Text style={[s.cTicket, s.dim]}>{e.ticket_number ?? "—"}</Text>
                  <Text style={[s.cTime, s.timeText]}>{formatDuration(e.minutes)}</Text>
                  <View style={s.cStatus}>
                    <StatusPill status={e.status} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Footer generated={generated} />
      </Page>
    </Document>
  );
}

/** Render the report to a PDF Blob (client-side). */
export async function renderReportPdf(model: ReportModel): Promise<Blob> {
  const generated = formatShortDate(toISODate(new Date()));
  return pdf(<ReportDocument model={model} generated={generated} />).toBlob();
}

// --- Team report (manager view: entries across several people) ---------------
export interface TeamReportMeta {
  managerName: string;
  rangeLabel: string;
  from: string;
  to: string;
}

function TeamReportDocument({
  rows,
  meta,
  generated,
}: {
  rows: TeamFeedRow[];
  meta: TeamReportMeta;
  generated: string;
}) {
  const groups = groupTeamFeedByDay(rows);
  const total = teamTotalMinutes(rows);
  const people = new Set(rows.map((r) => r.employee.id)).size;
  const slices = catBreakdown(rows);
  const rangeText = `${formatShortDate(meta.from)} – ${formatShortDate(meta.to)}`;

  return (
    <Document title={`${APP_NAME} — Team report`}>
      <Page size="A4" style={s.page}>
        <ReportHeader
          eyebrow="TEAM ACTIVITY REPORT"
          title="Team report"
          subtitle={`Manager: ${meta.managerName} · ${meta.rangeLabel}`}
          rangeText={rangeText}
        />

        <View style={s.body}>
          <StatBand
            stats={[
              { ...STAT_ACCENTS[0], value: `${toHours(total)}h`, label: "Total time" },
              { ...STAT_ACCENTS[1], value: rows.length, label: "Entries" },
              { ...STAT_ACCENTS[2], icon: "users", value: people, label: people === 1 ? "Person" : "People" },
              { ...STAT_ACCENTS[3], icon: "calendar", value: groups.length, label: "Active days" },
            ]}
          />

          <CategoryBreakdown slices={slices} total={total} />

          {groups.map((g) => (
            <View key={g.date} style={s.daySection} wrap={false}>
              <DayHeader title={formatLongDate(g.date)} meta={dayMetaLabel(g.rows.length, g.totalMinutes)} />
              {g.rows.map((r, i) => (
                <View key={r.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
                  <Text style={[s.tEmp, s.empText]}>{r.employee.full_name}</Text>
                  <View style={s.tTask}>
                    <Text style={s.taskText}>{r.task}</Text>
                  </View>
                  <View style={s.tCat}>
                    <CategoryTag category={r.category} />
                  </View>
                  <Text style={[s.tTicket, s.dim]}>{r.ticket_number ?? "—"}</Text>
                  <Text style={[s.tTime, s.timeText]}>{formatDuration(r.minutes)}</Text>
                  <View style={s.tStatus}>
                    <StatusPill status={r.status} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Footer generated={generated} />
      </Page>
    </Document>
  );
}

/** Render a manager's team report to a PDF Blob (client-side). */
export async function renderTeamReportPdf(
  rows: TeamFeedRow[],
  meta: TeamReportMeta,
): Promise<Blob> {
  const generated = formatShortDate(toISODate(new Date()));
  return pdf(<TeamReportDocument rows={rows} meta={meta} generated={generated} />).toBlob();
}
