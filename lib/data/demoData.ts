import type { UserRole } from "../types";
import type { SeedSpec } from "./seed";

/**
 * Demo roster for MOCK MODE only. Two managers and four employees, so the
 * manager team feed is populated on localhost with no backend. Note that
 * "Demo User" reports to BOTH managers — exercising the multiple-managers case.
 */
export interface DemoUser {
  id: string;
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  /** Emails of this user's manager(s). */
  manager_emails: string[];
  /** Seed entries (empty for managers who don't log their own work here). */
  specs: SeedSpec[];
}

const MANAGER = "manager@visilean.com";
const MANAGER2 = "manager2@visilean.com";

const s = (
  dayOffset: number,
  task: string,
  category: SeedSpec["input"]["category"],
  minutes: number,
  status: SeedSpec["input"]["status"] = "done",
  ticket_number: string | null = null,
  ticket_url: string | null = null,
): SeedSpec => ({
  dayOffset,
  input: { task, category, minutes, status, ticket_number, ticket_url },
});

export const DEMO_USERS: DemoUser[] = [
  {
    // Admin so the /admin role-assignment page is reachable in the demo; also
    // manages a team (employees below list this email), so /team is populated.
    id: "demo-manager-0001",
    email: MANAGER,
    full_name: "Priya Menon",
    password: "manager1234",
    role: "admin",
    manager_emails: [],
    specs: [
      s(0, "1:1s with the team + sprint planning prep", "meeting", 90),
      s(2, "Reviewed the Q3 delivery roadmap", "planning", 75),
    ],
  },
  {
    id: "demo-manager-0002",
    email: MANAGER2,
    full_name: "Tom Fisher",
    password: "manager1234",
    role: "manager",
    manager_emails: [],
    specs: [s(1, "Cross-team sync on the viewer migration", "meeting", 60)],
  },
  {
    // The built-in demo account — reports to BOTH managers (multi-manager demo).
    id: "demo-user-0001",
    email: "demo@visilean.com",
    full_name: "Demo User",
    password: "demo1234",
    role: "user",
    manager_emails: [MANAGER, MANAGER2],
    specs: [], // uses the rich DEFAULT_SPECS via buildSeedEntries (see mockAuth)
  },
  {
    id: "demo-user-0002",
    email: "alex@visilean.com",
    full_name: "Alex Kim",
    password: "demo1234",
    role: "user",
    manager_emails: [MANAGER],
    specs: [
      s(0, "Built the export PDF template", "dev", 150, "progress", "VS-8402"),
      s(1, "Paired on the Konva selection bug", "dev", 95, "done", "VS-8377"),
      s(3, "Sprint review + demo prep", "meeting", 45),
    ],
  },
  {
    id: "demo-user-0003",
    email: "sara@visilean.com",
    full_name: "Sara Okonkwo",
    password: "demo1234",
    role: "user",
    manager_emails: [MANAGER],
    specs: [
      s(0, "Triaged incoming support tickets", "support", 120, "done", "VS-8410"),
      s(2, "Wrote release notes for 4.8", "docs", 70),
      s(4, "Regression pass on the scheduler", "review", 110, "done"),
    ],
  },
  {
    id: "demo-user-0004",
    email: "lee@visilean.com",
    full_name: "Lee Zhang",
    password: "demo1234",
    role: "user",
    manager_emails: [MANAGER2],
    specs: [
      s(0, "Investigated the Gantt render slowdown", "dev", 180, "progress", "VS-8395"),
      s(1, "Backlog grooming with Tom", "planning", 50),
    ],
  },
];

/** The manager demo account surfaced by the login quick-fill in mock mode. */
export const DEMO_MANAGER_CREDENTIALS = { email: MANAGER, password: "manager1234" };
