import { mockRepository, seedMockUser } from "../mockRepository";
import type { EntryInput } from "../../types";

const USER = "test-user";

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

  it("persists and patches the profile", async () => {
    expect(await mockRepository.getProfile(USER)).toBeNull();
    const saved = await mockRepository.updateProfile(USER, {
      full_name: "Test User",
      manager_email: "boss@x.com",
    });
    expect(saved.full_name).toBe("Test User");
    const patched = await mockRepository.updateProfile(USER, { manager_email: null });
    expect(patched.full_name).toBe("Test User");
    expect(patched.manager_email).toBeNull();
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
