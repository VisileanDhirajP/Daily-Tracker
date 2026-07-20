"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { repository } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [managerEmails, setManagerEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const profile = await repository.getProfile(user.id);
        if (!active) return;
        setFullName(profile?.full_name || user.full_name || "");
        setManagerEmails(profile?.manager_emails ?? []);
      } catch {
        if (active) setFullName(user.full_name || "");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await repository.updateProfile(user.id, {
        full_name: fullName.trim(),
      });
      toast("Settings saved.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-navy">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Your display name and the manager(s) who receive your exported reports.
      </p>

      <div className="card mt-6 p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <TextField
              label="Display name"
              testId="settings-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
            <TextField
              label="Email"
              testId="settings-email"
              value={user?.email ?? ""}
              disabled
              hint="Your account email can't be changed here."
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Your managers</span>
              {managerEmails.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label="Your managers">
                  {managerEmails.map((email) => (
                    <li
                      key={email}
                      className="inline-flex items-center rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
                    >
                      {email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No managers assigned yet.</p>
              )}
              <p className="text-xs text-muted">
                Managers are assigned by your admin. They can see your entries and
                receive your exported reports.
              </p>
            </div>
            <div>
              <Button
                type="submit"
                variant="cta"
                disabled={saving}
                data-test-id="settings-save"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
