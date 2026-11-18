import { describe, expect, it } from "vitest";
import OUTLINES from "./data/speech-outlines.json" with { type: "json" };
import { setBookkeeping } from "../core2/bookkeeping";
import { outlineOf, type PlannedPoint } from "./speech-outline";
setBookkeeping(false);

/** Two full clauses joined by a comma alone (a simple reader; the shared composed check replaces it once it lands on main). */
const CLAUSE_START =
  /^(?:I|I'm|I'll|I've|I'd|we|we're|we'll|we've|you're|you'll|it's|they're|they'll|that's|this is)\b/i;
const SUBORDINATE =
  /^(?:if|when|whether|because|while|as|since|after|before|until|though|although|once|unless|where|whoever|whatever|wherever|and|but|so|or|nor|for|yet|with|without|from|to|in|on|at|over|under|across|all|every|whichever|however|first|second|third|next|then|now)\b/i;
const FINITE =
  /\b(?:I'm|I'll|I've|I'd|we're|we'll|we've|it's|that's|is|are|was|were|am|will|has|have|had|can|did|does)\b/i;
export function commaSplices(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => {
    const parts = sentence.split(/,\s+/);
    if (parts.length > 3) return false;
    // The clause before the comma is read from where it starts: a list
    // inside a "Because ..." clause ("affordable, reliable energy") keeps
    // the clause subordinate (W-F, Nov 12).
    const clauseBefore = (at: number) => {
      let from = at - 1;
      while (
        from > 0 &&
        !CLAUSE_START.test(parts[from]!) &&
        !SUBORDINATE.test(parts[from]!)
      )
        from -= 1;
      return parts.slice(from, at).join(", ");
    };
    return parts.some(
      (part, at) =>
        at > 0 &&
        CLAUSE_START.test(part) &&
        !SUBORDINATE.test(clauseBefore(at)) &&
        FINITE.test(parts[at - 1]!),
    );
  });
}

describe("every speech through the one outline planner", () => {
  it("puts how a question stands before the ask in every point shape (rule 44)", () => {
    for (const [name, shape] of Object.entries(OUTLINES.pointShapes.shapes)) {
      const moves = shape.moves as readonly string[];
      const asked = moves.indexOf("ask");
      expect(asked, name).toBeGreaterThan(-1);
      for (const before of ["today", "figure", "question"])
        if (moves.includes(before))
          expect(moves.indexOf(before), `${name}: ${before}`).toBeLessThan(
            asked,
          );
    }
  });

  it("has an outline row for every kind of speech, with a salutation first and a close last", () => {
    for (const kind of [
      "inaugural",
      "state-of-the-union",
      "state-of-the-state",
      "town-address",
      "campaign",
      "floor",
      "victory",
      "concession",
      "swearing-in",
    ]) {
      const row = outlineOf(kind);
      expect(row.sections[0], kind).toBe("salutation");
      expect(row.sections.at(-1), kind).toBe("close");
      for (const section of row.required)
        expect(row.sections, kind).toContain(section);
    }
    expect(outlineOf("inaugural").numberedAsks).toBe(false);
    expect(outlineOf("inaugural").ownRecord).toBe(false);
  });
});
