import { describe, expect, it } from "vitest";
import controls from "./data/controls.json" with { type: "json" };
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };

// Filing is a control of its own: its name is never one of the clerk-visit
// replies that acknowledge a refusal ("I understand.").
describe("the filing control's name", () => {
  const file = (controls as unknown as { filing: { file: string } }).filing
    .file;
  const answers = (
    sceneTalk as unknown as {
      parts: { text: string; uses: { purpose?: string; move?: string }[] }[];
    }
  ).parts.filter((part) =>
    part.uses.some(
      (use) => use.purpose === "filing-clerk" && use.move === "accept-terms",
    ),
  );
  it("exists and is not any acknowledgment the player can say", () => {
    expect(file).toBeTruthy();
    expect(answers.length).toBeGreaterThan(0);
    for (const part of answers)
      expect(part.text.toLowerCase()).not.toBe(file.toLowerCase());
  });
});
