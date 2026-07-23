import { parseQuickEntry } from "../quickAdd";

describe("parseQuickEntry", () => {
  it("parses duration, category, ticket, and task", () => {
    const p = parseQuickEntry("2h dev VS-8301 fixed the viewer leak");
    expect(p).toEqual({
      task: "fixed the viewer leak",
      category: "dev",
      minutes: 120,
      ticket_number: "VS-8301",
      status: "progress",
    });
  });

  it("handles compound and fractional durations", () => {
    expect(parseQuickEntry("1h30m standup")?.minutes).toBe(90);
    expect(parseQuickEntry("1.5h planning roadmap")?.minutes).toBe(90);
    expect(parseQuickEntry("45m docs release notes")?.minutes).toBe(45);
  });

  it("maps category synonyms and uppercases the ticket", () => {
    expect(parseQuickEntry("mtg weekly sync")?.category).toBe("meeting");
    expect(parseQuickEntry("qa regression pass")?.category).toBe("review");
    expect(parseQuickEntry("vs-42 triage")?.ticket_number).toBe("VS-42");
  });

  it("defaults category to other and minutes to 0 when unspecified", () => {
    const p = parseQuickEntry("emailed the client");
    expect(p).toMatchObject({ task: "emailed the client", category: "other", minutes: 0, ticket_number: null });
  });

  it("returns null only when there is no task text at all", () => {
    expect(parseQuickEntry("   ")).toBeNull();
    expect(parseQuickEntry("2h VS-1")).toBeNull(); // duration + ticket only, no words
  });

  it("keeps a lone category word as the task (still sets the category)", () => {
    const p = parseQuickEntry("1h30m standup");
    expect(p).toMatchObject({ task: "standup", category: "meeting", minutes: 90 });
    const dev = parseQuickEntry("2h dev VS-1");
    expect(dev).toMatchObject({ task: "dev", category: "dev", minutes: 120, ticket_number: "VS-1" });
  });

  it("does not eat alphanumeric tokens that digit-strip to a keyword", () => {
    // "pr3" must stay in the task — it is an identifier, not the "pr" keyword.
    const p = parseQuickEntry("Left comments on pr3 45m");
    expect(p).toMatchObject({ task: "Left comments on pr3", minutes: 45, category: "other" });
    // Punctuation-only stripping still works: "dev," is the dev keyword.
    const q = parseQuickEntry("2h dev, fixed the parser");
    expect(q).toMatchObject({ task: "fixed the parser", category: "dev", minutes: 120 });
  });

  it("only consumes the first category keyword and first ticket", () => {
    const p = parseQuickEntry("dev fix the meeting scheduler VS-1 VS-2");
    // "dev" -> category; "meeting" stays in the task (only first keyword eaten);
    // "VS-1" -> ticket; "VS-2" stays in the task.
    expect(p?.category).toBe("dev");
    expect(p?.ticket_number).toBe("VS-1");
    expect(p?.task).toBe("fix the meeting scheduler VS-2");
  });
});
