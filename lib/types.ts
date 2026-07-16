export type Category =
  | "dev"
  | "meeting"
  | "review"
  | "docs"
  | "support"
  | "planning"
  | "other";

export type EntryStatus = "done" | "progress";

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

export interface Profile {
  id: string;
  full_name: string;
  manager_email: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}
