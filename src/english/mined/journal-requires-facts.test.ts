import { describe, expect, it } from "vitest";
import { wordJournalLine } from "../journal-words";
import { JOURNAL_ROWS, journalDataFromBank } from "./journal-bank";

// A mined journal piece that names a fact it needs (`requiresFacts`) is said
// only where the moment holds that fact, as the scene bank's pieces are: the
// journal's bank used to drop the list, so "It was hard." (needs `hard-time`,
// a fact no record ever gave) was said after any death.
const part = (key: string, text: string, requiresFacts?: string[]) => ({
  key,
  text,
  uses: [
    {
      subject: "journal",
      journal: [{ kindPrefix: "memoir:", field: "hard" }],
      ...(requiresFacts ? { requiresFacts } : {}),
    },
  ],
});
const words = journalDataFromBank(
  {
    parts: [
      part("journal.test.needs-marker", "The marker line.", ["marker"]),
    ] as never,
  },
  JOURNAL_ROWS,
);
const say = (
  facts: Record<string, { text: string; sourceRecordIds: string[] }>,
) =>
  wordJournalLine({
    seed: "requires-facts",
    personId: "person_x" as never,
    move: { part: "memoir", field: "hard" },
    facts,
    momentKey: "m",
    sourceIds: ["record_x"],
    words,
  });

describe("a journal piece with requiresFacts", () => {
  it("is never chosen while its required fact is absent", () => {
    expect(say({})).toBeNull();
  });
  it("is chosen once the moment holds the fact, with support", () => {
    const told = say({
      marker: { text: "yes", sourceRecordIds: ["record_x"] },
    });
    expect(told?.text).toBe("The marker line.");
  });
});
