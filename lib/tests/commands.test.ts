import {
  dispatchAppCommand,
  subscribeAppCommand,
  __resetAppCommands,
} from "../commands";

describe("app command bus", () => {
  beforeEach(() => __resetAppCommands());

  it("delivers a command to a live subscriber", () => {
    const seen: string[] = [];
    subscribeAppCommand((c) => seen.push(c.type));
    dispatchAppCommand({ type: "new-entry" });
    expect(seen).toEqual(["new-entry"]);
  });

  it("buffers a command dispatched with no subscriber, then drains it on subscribe", () => {
    dispatchAppCommand({ type: "quick-log", text: "2h dev VS-1 fix" });
    const seen: AppCommandLike[] = [];
    subscribeAppCommand((c) => seen.push(c));
    expect(seen).toEqual([{ type: "quick-log", text: "2h dev VS-1 fix" }]);
  });

  it("only buffers the most recent command and drains it once", () => {
    dispatchAppCommand({ type: "new-entry" });
    dispatchAppCommand({ type: "quick-log", text: "later" });
    const first: string[] = [];
    subscribeAppCommand((c) => first.push(c.type));
    expect(first).toEqual(["quick-log"]); // most recent wins

    const second: string[] = [];
    subscribeAppCommand((c) => second.push(c.type));
    expect(second).toEqual([]); // already drained
  });

  it("stops delivering after unsubscribe", () => {
    const seen: string[] = [];
    const off = subscribeAppCommand((c) => seen.push(c.type));
    off();
    dispatchAppCommand({ type: "new-entry" });
    expect(seen).toEqual([]);
  });
});

type AppCommandLike = { type: string } & Record<string, unknown>;
