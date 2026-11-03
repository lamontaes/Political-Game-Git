import { describe, expect, it } from "vitest";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };

// Filing is the player's own reply at the clerk's counter, worded from the
// pieces that take the papers (owner, Nov 1: a choice "should be an actual
// reply"); it is never one of the replies that acknowledge a refusal
// ("I understand.").
describe("the filing reply", () => {
  const said = (move: string) =>
    (
      sceneTalk as unknown as {
        parts: { text: string; uses: { purpose?: string; move?: string }[] }[];
      }
    ).parts
      .filter((part) =>
        part.uses.some(
          (use) => use.purpose === "filing-clerk" && use.move === move,
        ),
      )
      .map((part) => part.text.toLowerCase());
  it("exists and is not any acknowledgment the player can say", () => {
    const filing = said("take-papers");
    const answers = said("accept-terms");
    expect(filing.length).toBeGreaterThan(0);
    expect(answers.length).toBeGreaterThan(0);
    for (const text of filing) expect(answers).not.toContain(text);
  });
});
