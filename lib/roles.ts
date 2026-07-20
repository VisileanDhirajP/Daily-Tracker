import type { UserRole } from "./types";

/** Human-facing role labels. "Member" reads better than "user" in the UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Member",
  manager: "Manager",
  admin: "Admin",
};

/** Assignment order for the admin role selector. */
export const ROLE_ORDER: UserRole[] = ["user", "manager", "admin"];

/** Managers and admins can see the team feed. */
export function isManager(role: UserRole | null | undefined): boolean {
  return role === "manager" || role === "admin";
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

/** Whether a role may open the read-only /team page. */
export function canViewTeam(role: UserRole | null | undefined): boolean {
  return isManager(role);
}

/** Whether a role may open the /admin role-assignment page. */
export function canAdminister(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}
