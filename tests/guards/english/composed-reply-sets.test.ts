import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { currentPairs } from "../../../scripts/words/reply-pairs";
import { onlyAcknowledges } from "../../../src/english/composed-checks";
import { lineByKey } from "../../../src/english/line-register";

/**
 * The rule `no-non-replies` (owner, Nov 12: "the same bullshit I talked about
 * yesterday with the just non-replies"), enforced over the composed reply sets:
 * every reply play can offer after any line (`currentPairs`), read with the
 * rule's own check (`onlyAcknowledges`, src/english/composed-checks.ts). A
 * reply of a few words that only acknowledges ("Okay.", "Sure.") is never
 * offered as an answer. The offered replies that still do are the known list
 * in composed-reply-sets-baseline.json, which only shrinks: a new one fails
 * here, and a fixed or cut one must leave the list. The played-world counts
 * of the rule's other checks (a talk ending on the player's line, a close on a
 * promise to talk again) stay `npm run words:composed`.
 */
const KNOWN = (
  JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, "composed-reply-sets-baseline.json"),
      "utf8",
    ),
  ) as { onlyAcknowledges: string[] }
).onlyAcknowledges;

describe("the composed reply sets", () => {
  const now = new Map<string, string>();
  for (const pair of currentPairs()) {
    const text = lineByKey(pair.reply)?.text ?? "";
    if (onlyAcknowledges(text)) now.set(pair.reply, text);
  }

  it("offers no reply that only acknowledges what was said", () => {
    expect(
      [...now]
        .filter(([key]) => !KNOWN.includes(key))
        .map(([key, text]) => `${key}: "${text}" only acknowledges`),
    ).toEqual([]);
  });
  it("lowers the known list as soon as a reply is fixed or cut", () => {
    expect(
      KNOWN.filter((key) => !now.has(key)).map(
        (key) =>
          `${key} no longer only acknowledges: remove it from the baseline`,
      ),
    ).toEqual([]);
  });
  it("tells a bare acknowledgment from an answer that says something", () => {
    // Fixtures in our own words: the check fails the first kind, never the second.
    for (const bare of ["Okay.", "Sure.", "Alright, yes.", "Good to know."])
      expect(onlyAcknowledges(bare), bare).toBe(true);
    for (const answer of [
      "I will bring the sign-up sheets Thursday.",
      "Not before the budget vote.",
      "Sure, if the clerk signs off first.",
    ])
      expect(onlyAcknowledges(answer), answer).toBe(false);
  });
});
