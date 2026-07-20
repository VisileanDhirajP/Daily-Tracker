import type { AuthUser, Profile } from "../types";
import { seedMockUser, seedMockProfile } from "../data/mockRepository";
import { buildEntriesFromSpecs, buildSeedEntries } from "../data/seed";
import { DEMO_USERS, DEMO_MANAGER_CREDENTIALS } from "../data/demoData";

/**
 * localStorage-backed fake auth for mock mode. NOT secure — passwords are stored
 * in plain text in the browser. This exists purely so the app runs end-to-end
 * with zero backend setup. Real auth is Supabase (see AuthProvider).
 */

interface StoredUser extends AuthUser {
  password: string;
}

const USERS_KEY = "vldt:users";
const SESSION_KEY = "vldt:session";
const SEED_VERSION_KEY = "vldt:seed-version";
// Bump when the demo roster changes so existing browsers re-provision.
const SEED_VERSION = "3";

// The primary demo employee whose credentials fill the login form.
const DEMO_EMPLOYEE = DEMO_USERS.find((u) => u.email === "demo@visilean.com")!;

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Ensure the built-in demo roster (two managers + four employees) exists and is
 * pre-populated with entries. Idempotent: profiles/entries are only seeded when
 * absent, so it never clobbers in-app changes. Guarded by a seed version so the
 * work runs once per browser (and again after a roster change).
 */
export function ensureDemoUser(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return;

  const users = loadUsers();
  for (const u of DEMO_USERS) {
    if (!users.some((existing) => existing.email === u.email)) {
      users.push({ id: u.id, email: u.email, full_name: u.full_name, password: u.password });
    }
    const profile: Profile = {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      manager_emails: u.manager_emails,
      role: u.role,
      created_at: new Date().toISOString(),
    };
    // force: on a version bump this resets demo profiles to the definition
    // (e.g. a changed role), while non-demo signups are untouched.
    seedMockProfile(profile, true);
    // The primary demo employee gets the rich default set; others use their own.
    seedMockUser(
      u.id,
      u.email === DEMO_EMPLOYEE.email ? buildSeedEntries(u.id) : buildEntriesFromSpecs(u.id, u.specs),
    );
  }
  saveUsers(users);
  window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
}

function toAuthUser(u: StoredUser): AuthUser {
  return { id: u.id, email: u.email, full_name: u.full_name };
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}`;
}

export const mockAuth = {
  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const id = window.localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const user = loadUsers().find((u) => u.id === id);
    return user ? toAuthUser(user) : null;
  },

  async signUp(
    fullName: string,
    email: string,
    password: string,
  ): Promise<AuthUser> {
    const users = loadUsers();
    const normEmail = email.trim().toLowerCase();
    if (users.some((u) => u.email === normEmail)) {
      throw new Error("An account with that email already exists.");
    }
    const user: StoredUser = {
      id: newId(),
      email: normEmail,
      full_name: fullName.trim(),
      password,
    };
    users.push(user);
    saveUsers(users);
    seedMockProfile({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      manager_emails: [],
      role: "user",
      created_at: new Date().toISOString(),
    });
    window.localStorage.setItem(SESSION_KEY, user.id);
    return toAuthUser(user);
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    const normEmail = email.trim().toLowerCase();
    const user = loadUsers().find((u) => u.email === normEmail);
    if (!user || user.password !== password) {
      throw new Error("Invalid email or password.");
    }
    window.localStorage.setItem(SESSION_KEY, user.id);
    return toAuthUser(user);
  },

  async signOut(): Promise<void> {
    window.localStorage.removeItem(SESSION_KEY);
  },

  async resetPassword(email: string): Promise<void> {
    // No email in mock mode; resolve so the UI can show the same success state.
    void email;
  },

  demoCredentials() {
    return { email: DEMO_EMPLOYEE.email, password: DEMO_EMPLOYEE.password };
  },

  managerDemoCredentials() {
    return DEMO_MANAGER_CREDENTIALS;
  },
};
