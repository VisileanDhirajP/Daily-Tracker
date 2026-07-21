export type Category =
  | "dev"
  | "meeting"
  | "review"
  | "docs"
  | "support"
  | "planning"
  | "other";

export type EntryStatus = "done" | "progress" | "hold";

export interface Entry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  task: string;
  category: Category;
  ticket_number: string | null;
  ticket_url: string | null;
  minutes: number;
  status: EntryStatus;
  created_at: string;
  updated_at: string;
}

/** Payload for creating/updating an entry (server fields omitted). */
export interface EntryInput {
  entry_date: string;
  task: string;
  category: Category;
  ticket_number: string | null;
  ticket_url: string | null;
  minutes: number;
  status: EntryStatus;
}

export type UserRole = "user" | "manager" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  /** Denormalised from auth so managers/admins can identify other users. */
  email: string | null;
  /** Emails of this employee's manager(s). An employee can have several. */
  manager_emails: string[];
  role: UserRole;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

/** A saved preset for one-tap logging of routine work (standup, 1:1, …). */
export interface EntryTemplate {
  id: string;
  user_id: string;
  label: string;
  task: string;
  category: Category;
  minutes: number;
  ticket_number: string | null;
  ticket_url: string | null;
  status: EntryStatus;
  created_at: string;
}

/** Payload for creating a template (server fields omitted). */
export interface TemplateInput {
  label: string;
  task: string;
  category: Category;
  minutes: number;
  ticket_number: string | null;
  ticket_url: string | null;
  status: EntryStatus;
}

/**
 * An entry enriched with its author's identity, for the manager team feed.
 * Managers see entries across several people, so each row must name its owner.
 */
export interface TeamFeedRow extends Entry {
  employee: {
    id: string;
    full_name: string;
    email: string;
  };
}
