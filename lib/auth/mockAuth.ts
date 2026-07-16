import type { AuthUser } from "../types";
import { seedMockUser, mockRepository } from "../data/mockRepository";

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

const DEMO = {
  id: "demo-user-0001",
  email: "demo@visilean.com",
  full_name: "Demo User",
  password: "demo1234",
};

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

/** Ensure the built-in demo account exists and is pre-populated with entries. */
export function ensureDemoUser(): void {
  if (typeof window === "undefined") return;
  const users = loadUsers();
  if (!users.some((u) => u.email === DEMO.email)) {
    users.push({ ...DEMO });
    saveUsers(users);
    void mockRepository.updateProfile(DEMO.id, {
      full_name: DEMO.full_name,
      manager_email: "manager@visilean.com",
    });
    seedMockUser(DEMO.id);
  }
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
    await mockRepository.updateProfile(user.id, { full_name: user.full_name });
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
    return { email: DEMO.email, password: DEMO.password };
  },
};
