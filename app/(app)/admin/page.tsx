"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, ShieldCheck } from "lucide-react";
import type { Profile, UserRole } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { repository } from "@/lib/data";
import { canAdminister, ROLE_LABELS, ROLE_ORDER } from "@/lib/roles";
import { useToast } from "@/components/ui/ToastProvider";
import { RequireRole } from "@/components/RequireRole";
import { ManagerEmailsEditor } from "@/components/settings/ManagerEmailsEditor";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Manager-assignment dialog state.
  const [editing, setEditing] = useState<Profile | null>(null);
  const [draftManagers, setDraftManagers] = useState<string[]>([]);
  const [savingManagers, setSavingManagers] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    repository
      .listAllProfiles()
      .then((p) => {
        if (active) setProfiles(p);
      })
      .catch(() => {
        if (active) setProfiles([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(
    () => [...profiles].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [profiles],
  );

  const openManagerEditor = (target: Profile) => {
    setEditing(target);
    setDraftManagers(target.manager_emails);
  };

  const saveManagers = async () => {
    if (!editing) return;
    const target = editing;
    setSavingManagers(true);
    try {
      const updated = await repository.setUserManagers(target.id, draftManagers);
      setProfiles((list) =>
        list.map((p) => (p.id === target.id ? { ...p, manager_emails: updated.manager_emails } : p)),
      );
      toast(`Updated ${target.full_name || target.email}'s managers.`, "success");
      setEditing(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't update managers.", "error");
    } finally {
      setSavingManagers(false);
    }
  };

  const changeRole = async (target: Profile, role: UserRole) => {
    if (role === target.role) return;
    const prev = target.role;
    setSavingId(target.id);
    // Optimistic
    setProfiles((list) => list.map((p) => (p.id === target.id ? { ...p, role } : p)));
    try {
      await repository.setUserRole(target.id, role);
      toast(`${target.full_name || target.email} is now ${ROLE_LABELS[role]}.`, "success");
    } catch (err) {
      // Roll back
      setProfiles((list) => list.map((p) => (p.id === target.id ? { ...p, role: prev } : p)));
      toast(err instanceof Error ? err.message : "Couldn't change role.", "error");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-blue-brand" />
        <h1 className="text-xl font-bold text-navy">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Assign roles. Managers can view the read-only team feed of everyone who
        lists them (under Settings → Managers); admins can see everyone and manage
        roles here.
      </p>

      <div className="card mt-6 overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 size={18} className="animate-spin" /> Loading users…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" data-test-id="admin-user-table">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Managers</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const isSelf = p.id === user?.id;
                  return (
                    <tr
                      key={p.id}
                      data-test-id={`admin-user-row`}
                      className="border-b border-hairline last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        {p.full_name || "—"}
                        {isSelf && (
                          <span className="ml-1.5 rounded-full bg-blue-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-brand">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{p.email || "—"}</td>
                      <td className="px-4 py-3 text-muted">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0">
                            {p.manager_emails.length > 0
                              ? p.manager_emails.join(", ")
                              : "—"}
                          </span>
                          <Tooltip label="Assign managers">
                            <button
                              type="button"
                              onClick={() => openManagerEditor(p)}
                              data-test-id="admin-edit-managers"
                              aria-label={`Assign managers for ${p.full_name || p.email}`}
                              className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
                            >
                              <Pencil size={14} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={p.role}
                            onValueChange={(v) => changeRole(p, v as UserRole)}
                            disabled={isSelf || savingId === p.id}
                          >
                            <SelectTrigger
                              data-test-id="admin-role-select"
                              aria-label={`Role for ${p.full_name || p.email}`}
                              className="h-9 w-40"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_ORDER.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {savingId === p.id && (
                            <Loader2 size={14} className="animate-spin text-muted" />
                          )}
                        </div>
                        {isSelf && (
                          <p className="mt-1 text-[11px] text-muted">
                            You can&apos;t change your own role.
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign managers</DialogTitle>
            <DialogDescription>
              {editing?.full_name || editing?.email} reports to the managers below.
            </DialogDescription>
          </DialogHeader>
          <ManagerEmailsEditor
            value={draftManagers}
            onChange={setDraftManagers}
            description="Each manager can see this person's entries on their team page. Use the manager's account email."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} data-test-id="cancel-managers">
              Cancel
            </Button>
            <Button
              variant="cta"
              onClick={saveManagers}
              disabled={savingManagers}
              data-test-id="save-managers"
            >
              {savingManagers && <Loader2 size={16} className="animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function AdminPage() {
  return (
    <RequireRole allow={canAdminister}>
      <AdminPanel />
    </RequireRole>
  );
}
