import type {
  AuthUser,
  Entry,
  EntryInput,
  EntryTemplate,
  Profile,
  TeamFeedRow,
  TemplateInput,
  UserRole,
} from "../types";

/**
 * Storage-agnostic data access. Two implementations exist — a localStorage mock
 * and a Supabase-backed one — selected by `NEXT_PUBLIC_DATA_MODE`.
 *
 * Every method is scoped to the *current* authenticated user; the caller passes
 * the user id so the same interface works in both modes (mock has no server
 * session, Supabase derives it from the JWT + RLS).
 */
export interface DataRepository {
  listEntries(userId: string): Promise<Entry[]>;
  createEntry(userId: string, input: EntryInput): Promise<Entry>;
  updateEntry(userId: string, id: string, input: EntryInput): Promise<Entry>;
  deleteEntry(userId: string, id: string): Promise<void>;

  getProfile(userId: string): Promise<Profile | null>;
  /**
   * Update the caller's own editable profile fields. `manager_emails` are NOT
   * here — manager assignment is admin-only (see setUserManagers).
   */
  updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name">>,
  ): Promise<Profile>;

  // --- Manager / admin (read-only team access) -----------------------------
  /**
   * Entries of everyone the given manager manages — i.e. employees whose
   * `manager_emails` includes the manager's email — each tagged with its
   * author. In Supabase mode RLS already narrows the rows to the team; in mock
   * mode the filtering is done in JS.
   */
  listTeamEntries(manager: AuthUser): Promise<TeamFeedRow[]>;
  /** All profiles (admin only; enforced by RLS in Supabase mode). */
  listAllProfiles(): Promise<Profile[]>;
  /** Change a user's role (admin only; enforced by RLS + trigger). */
  setUserRole(targetUserId: string, role: UserRole): Promise<Profile>;
  /** Assign a user's manager(s) (admin only; enforced by RLS + trigger). */
  setUserManagers(targetUserId: string, managerEmails: string[]): Promise<Profile>;

  // --- Entry templates (one-tap logging) -----------------------------------
  listTemplates(userId: string): Promise<EntryTemplate[]>;
  createTemplate(userId: string, input: TemplateInput): Promise<EntryTemplate>;
  deleteTemplate(userId: string, id: string): Promise<void>;
}
