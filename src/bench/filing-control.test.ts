import { describe, expect, it } from "vitest";
import { FILING_VISIT_WORDS } from "../director/filing-visit";
import controls from "./data/controls.json" with { type: "json" };

// Filing is a control of its own: its name is never one of the clerk-visit
// replies that acknowledge a refusal ("I understand.").
describe("the filing control's name", () => {
  const file = (controls as unknown as { filing: { file: string } }).filing
    .file;
  it("exists and is not any acknowledgment the player can say", () => {
    expect(file).toBeTruthy();
    expect(FILING_VISIT_WORDS.accept.length).toBeGreaterThan(0);
    for (const variant of FILING_VISIT_WORDS.accept)
      expect(variant.text.toLowerCase()).not.toBe(file.toLowerCase());
  });
});
