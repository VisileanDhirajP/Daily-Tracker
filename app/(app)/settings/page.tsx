"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { repository } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { TextField } from "@/components/ui/TextField";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const profile = await repository.getProfile(user.id);
        if (!active) return;
        setFullName(profile?.full_name || user.full_name || "");
        setManagerEmail(profile?.manager_email || "");
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
    setError(null);

    const email = managerEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid manager email, or leave it blank.");
      return;
    }

    setSaving(true);
    try {
      await repository.updateProfile(user.id, {
        full_name: fullName.trim(),
        manager_email: email || null,
      });
      toast("Settings saved.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-navy">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Your display name and the manager who receives your exported reports.
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
            <TextField
              label="Manager email"
              type="email"
              testId="settings-manager-email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="manager@visilean.com"
              hint="Reports are sent (or drafted) to this address."
              error={error}
            />
            <div>
              <button
                type="submit"
                disabled={saving}
                data-test-id="settings-save"
                className="btn-cta inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save changes
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
