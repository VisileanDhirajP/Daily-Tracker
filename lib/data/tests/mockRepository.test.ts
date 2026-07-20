import { mockRepository, seedMockUser, seedMockProfile } from "../mockRepository";
import type { EntryInput, Profile } from "../../types";

const USER = "test-user";

function profile(over: Partial<Profile> & { id: string }): Profile {
  return {
    full_name: "",
    email: null,
    manager_emails: [],
    role: "user",
    created_at: "2026-07-16T09:00:00.000Z",
    ...over,
  };
}

function input(overrides: Partial<EntryInput> = {}): EntryInput {
  return {
    entry_date: "2026-07-16",
    task: "Wrote a test",
    category: "dev",
    ticket_number: "VS-1",
    ticket_url: null,
    minutes: 45,
    status: "done",
    ...overrides,
  };
}

describe("mockRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty for a fresh user", async () => {
    expect(await mockRepository.listEntries(USER)).toEqual([]);
  });

  it("creates, reads, updates and deletes an entry", async () => {
    const created = await mockRepository.createEntry(USER, input());
    expect(created.id).toBeTruthy();
    expect(created.user_id).toBe(USER);

    let all = await mockRepository.listEntries(USER);
    expect(all).toHaveLength(1);

    const updated = await mockRepository.updateEntry(USER, created.id, input({ task: "Edited" }));
    expect(updated.task).toBe("Edited");
    expect(updated.updated_at).toBeTruthy();

    await mockRepository.deleteEntry(USER, created.id);
    all = await mockRepository.listEntries(USER);
    expect(all).toHaveLength(0);
  });

  it("throws when updating a missing entry", async () => {
    await expect(
      mockRepository.updateEntry(USER, "nope", input()),
    ).rejects.toThrow();
  });

  it("persists and patches the profile name", async () => {
    expect(await mockRepository.getProfile(USER)).toBeNull();
    const saved = await mockRepository.updateProfile(USER, { full_name: "Test User" });
    expect(saved.full_name).toBe("Test User");
    expect(saved.role).toBe("user");
    expect(saved.manager_emails).toEqual([]);
  });

  it("assigns managers via setUserManagers (admin action)", async () => {
    seedMockProfile(profile({ id: "emp", full_name: "Emp" }));
    const updated = await mockRepository.setUserManagers("emp", ["boss@x.com", "boss2@x.com"]);
    expect(updated.manager_emails).toEqual(["boss@x.com", "boss2@x.com"]);
    const reloaded = await mockRepository.getProfile("emp");
    expect(reloaded?.manager_emails).toEqual(["boss@x.com", "boss2@x.com"]);
  });

  it("seedMockProfile does not clobber an existing profile", () => {
    seedMockProfile(profile({ id: USER, full_name: "Original", role: "admin" }));
    seedMockProfile(profile({ id: USER, full_name: "Overwritten", role: "user" }));
    return mockRepository.getProfile(USER).then((p) => {
      expect(p?.full_name).toBe("Original");
      expect(p?.role).toBe("admin");
    });
  });

  it("lists team entries for employees who report to a manager", async () => {
    // Two employees report to the manager; one does not.
    seedMockProfile(profile({ id: "e1", full_name: "Emp One", email: "e1@x.com", manager_emails: ["boss@x.com"] }));
    seedMockProfile(profile({ id: "e2", full_name: "Emp Two", email: "e2@x.com", manager_emails: ["BOSS@x.com"] }));
    seedMockProfile(profile({ id: "e3", full_name: "Emp Three", email: "e3@x.com", manager_emails: ["other@x.com"] }));
    await mockRepository.createEntry("e1", input({ task: "E1 work" }));
    await mockRepository.createEntry("e2", input({ task: "E2 work" }));
    await mockRepository.createEntry("e3", input({ task: "E3 work" }));

    const rows = await mockRepository.listTeamEntries({
      id: "mgr",
      email: "boss@x.com",
      full_name: "Boss",
    });
    const names = rows.map((r) => r.employee.full_name).sort();
    expect(names).toEqual(["Emp One", "Emp Two"]);
    expect(rows.every((r) => r.employee.email)).toBe(true);
  });

  it("lists all profiles and changes a role", async () => {
    seedMockProfile(profile({ id: "z", full_name: "Zoe" }));
    seedMockProfile(profile({ id: "a", full_name: "Ann" }));
    const all = await mockRepository.listAllProfiles();
    expect(all.map((p) => p.full_name)).toEqual(["Ann", "Zoe"]); // sorted

    const updated = await mockRepository.setUserRole("a", "manager");
    expect(updated.role).toBe("manager");
    expect((await mockRepository.getProfile("a"))?.role).toBe("manager");
  });

  it("seeds a user once and is idempotent", () => {
    seedMockUser(USER);
    const raw = window.localStorage.getItem(`vldt:entries:${USER}`);
    expect(raw).not.toBeNull();
    const first = JSON.parse(raw!).length;
    seedMockUser(USER); // should not double-seed
    const second = JSON.parse(window.localStorage.getItem(`vldt:entries:${USER}`)!).length;
    expect(second).toBe(first);
    expect(first).toBeGreaterThan(0);
  });
});
