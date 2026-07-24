import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useBlockers } from "../useBlockers";

// Mock auth so the hook has a stable user id.
jest.mock("@/lib/auth/AuthProvider", () => {
  const actual = jest.requireActual("@/lib/auth/AuthProvider");
  return {
    ...actual,
    useAuth: () => ({ user: { id: "u1", email: "u1@x.com", full_name: "U" }, role: "user" }),
  };
});

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

describe("useBlockers", () => {
  beforeEach(() => window.localStorage.clear());

  it("loads, adds, resolves and removes optimistically", async () => {
    const { result } = renderHook(() => useBlockers(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.open).toHaveLength(0);

    await act(async () => {
      await result.current.addBlocker({
        reason: "Waiting on review",
        waiting_on: null,
        ticket_number: "VS-1",
        ticket_url: null,
      });
    });
    expect(result.current.open).toHaveLength(1);

    const id = result.current.blockers[0].id;
    await act(async () => {
      await result.current.resolveBlocker(id);
    });
    expect(result.current.open).toHaveLength(0);
    expect(result.current.blockers[0].status).toBe("resolved");

    await act(async () => {
      await result.current.removeBlocker(id);
    });
    expect(result.current.blockers).toHaveLength(0);
  });
});
