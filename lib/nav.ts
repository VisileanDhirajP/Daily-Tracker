import {
  LayoutDashboard,
  BarChart3,
  Download,
  Settings,
  Users,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";
import { canAdminister, canViewTeam } from "./roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  id: string;
}

/**
 * Primary nav, role-aware. "Team" appears for managers/admins, "Admin" only for
 * admins. Shared by the desktop sidebar and the mobile menu so they never drift.
 * This governs visibility only — access is enforced by RequireRole + RLS.
 */
export function navItems(role: UserRole): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
    { href: "/insights", label: "Insights", icon: BarChart3, id: "insights" },
    { href: "/export", label: "Export", icon: Download, id: "export" },
  ];
  if (canViewTeam(role)) {
    items.push({ href: "/team", label: "Team", icon: Users, id: "team" });
  }
  if (canAdminister(role)) {
    items.push({ href: "/admin", label: "Admin", icon: ShieldCheck, id: "admin" });
  }
  items.push({ href: "/settings", label: "Settings", icon: Settings, id: "settings" });
  return items;
}
