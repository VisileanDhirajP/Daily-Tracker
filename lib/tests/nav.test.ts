import { navItems } from "../nav";

describe("navItems", () => {
  const ids = (role: Parameters<typeof navItems>[0]) => navItems(role).map((i) => i.id);

  it("shows only base items for a member", () => {
    expect(ids("user")).toEqual(["dashboard", "insights", "export", "settings"]);
  });

  it("adds Team for a manager (no Admin)", () => {
    expect(ids("manager")).toEqual(["dashboard", "insights", "export", "team", "settings"]);
  });

  it("adds Team and Admin for an admin", () => {
    expect(ids("admin")).toEqual([
      "dashboard",
      "insights",
      "export",
      "team",
      "admin",
      "settings",
    ]);
  });
});
