import { describe, expect, it } from "vitest";
import { renderLine } from "./bank-line";

// A slot that opens the second sentence of a line starts with a capital
// (the desk visit, Nov 14: "Nobody. the ... Ordinance").
const say = (text: string) =>
  renderLine({
    seed: "slot-capital",
    surface: "dialogue",
    holderId: "person-a",
    bankKey: "test:slot-capital",
    version: "test-v1",
    variants: [{ key: "only", text }],
    facts: {
      bill: { text: "the Parking Ordinance", sourceRecordIds: ["bill-1"] },
    },
    momentKey: "m1",
    fallbackSourceId: "bill-1",
  })?.text;

describe("a slot that opens a sentence", () => {
  it("is capitalized after a period, a question mark or an exclamation", () => {
    expect(say("Nobody. {{bill}} is mine.")).toBe(
      "Nobody. The Parking Ordinance is mine.",
    );
    expect(say("Who? {{bill}} has no sponsor.")).toBe(
      "Who? The Parking Ordinance has no sponsor.",
    );
    expect(say('"Enough!" {{bill}} passed.')).toBe(
      '"Enough!" The Parking Ordinance passed.',
    );
  });

  it("stays as it is inside a sentence and after an ellipsis", () => {
    expect(say("I read {{bill}} twice.")).toBe(
      "I read the Parking Ordinance twice.",
    );
    expect(say("Well... {{bill}} again.")).toBe(
      "Well... the Parking Ordinance again.",
    );
    expect(say("{{bill}} is mine.")).toBe("The Parking Ordinance is mine.");
  });
});
