import { isAdmin, isManager, canViewTeam, canAdminister, ROLE_ORDER } from "../roles";

describe("role helpers", () => {
  it("isManager is true for manager and admin only", () => {
    expect(isManager("manager")).toBe(true);
    expect(isManager("admin")).toBe(true);
    expect(isManager("user")).toBe(false);
    expect(isManager(null)).toBe(false);
    expect(isManager(undefined)).toBe(false);
  });

  it("isAdmin is true only for admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("manager")).toBe(false);
    expect(isAdmin("user")).toBe(false);
  });

  it("gates map to the right pages", () => {
    expect(canViewTeam("manager")).toBe(true);
    expect(canViewTeam("user")).toBe(false);
    expect(canAdminister("admin")).toBe(true);
    expect(canAdminister("manager")).toBe(false);
  });

  it("exposes roles in assignment order", () => {
    expect(ROLE_ORDER).toEqual(["user", "manager", "admin"]);
  });
});
