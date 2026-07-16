import type { Entry, EntryInput } from "../types";
import { shiftDay, todayISO } from "../format/date";

/**
 * Generate ~2 weeks of demo entries for a mock user so the dashboard is
 * populated on first run. Dates are relative to today.
 */
export function buildSeedEntries(userId: string): Entry[] {
  const t = todayISO();
  const now = new Date().toISOString();

  const specs: Array<{ dayOffset: number; input: Omit<EntryInput, "entry_date"> }> = [
    {
      dayOffset: 0,
      input: {
        task: "Wired up the two-pane dashboard layout and day navigator",
        category: "dev",
        ticket_number: "VS-8301",
        ticket_url: "https://github.com/visilean/web-ui/issues/8301",
        minutes: 195,
        status: "progress",
      },
    },
    {
      dayOffset: 0,
      input: {
        task: "Daily standup + sprint sync",
        category: "meeting",
        ticket_number: null,
        ticket_url: null,
        minutes: 30,
        status: "done",
      },
    },
    {
      dayOffset: 1,
      input: {
        task: "Reviewed PR for zone annotation cards",
        category: "review",
        ticket_number: "VS-8238",
        ticket_url: "https://github.com/visilean/web-ui/pull/8238",
        minutes: 75,
        status: "done",
      },
    },
    {
      dayOffset: 1,
      input: {
        task: "Fixed Forge viewer listener leak on PDF/DWG swap",
        category: "dev",
        ticket_number: "VS-3969",
        ticket_url: "https://jira.visilean.com/browse/VS-3969",
        minutes: 140,
        status: "done",
      },
    },
    {
      dayOffset: 2,
      input: {
        task: "Wrote docs for the BIM module guide",
        category: "docs",
        ticket_number: null,
        ticket_url: null,
        minutes: 90,
        status: "done",
      },
    },
    {
      dayOffset: 3,
      input: {
        task: "Helped QA reproduce the scheduler edge case",
        category: "support",
        ticket_number: "VS-8211",
        ticket_url: null,
        minutes: 55,
        status: "done",
      },
    },
    {
      dayOffset: 4,
      input: {
        task: "Planned the Konva 2D parity migration tickets",
        category: "planning",
        ticket_number: null,
        ticket_url: null,
        minutes: 120,
        status: "done",
      },
    },
    {
      dayOffset: 6,
      input: {
        task: "Investigated flaky Takt calendar test",
        category: "dev",
        ticket_number: "VS-8214",
        ticket_url: "https://github.com/visilean/web-ui/issues/8214",
        minutes: 100,
        status: "done",
      },
    },
    {
      dayOffset: 8,
      input: {
        task: "Retro + backlog grooming",
        category: "meeting",
        ticket_number: null,
        ticket_url: null,
        minutes: 60,
        status: "done",
      },
    },
    {
      dayOffset: 10,
      input: {
        task: "Refactored the axios interceptor error handling",
        category: "dev",
        ticket_number: "VS-7648",
        ticket_url: "https://jira.visilean.com/browse/VS-7648",
        minutes: 165,
        status: "done",
      },
    },
  ];

  return specs.map((spec, i) => {
    const entry_date = shiftDay(t, -spec.dayOffset);
    return {
      id: `seed-${i + 1}`,
      user_id: userId,
      entry_date,
      created_at: now,
      updated_at: now,
      ...spec.input,
    };
  });
}
