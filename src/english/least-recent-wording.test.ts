import { expect, it } from "vitest";
import { partsOf, tell } from "./outline-planner";

/**
 * A voice prefers a wording it has not used lately, and says the one used
 * longest ago once every fitting wording has been said (Words builder W-F,
 * Nov 12: one greeting in address after address). The inaugural's greeting
 * is worded by the one outline planner since Nov 24 (the Story lead), so the
 * rule is held there: `said` is the pieces earlier addresses said, oldest
 * first.
 */
const f = (text: string) => ({ text, sourceRecordIds: ["record:test"] });
const facts = {
  "took-oath": f("yes"),
  "term-left": f("four years"),
};
const greetings = partsOf("inaugural")
  .filter((part) => part.move === "greeting")
  .map((part) => part.key);
const greet = (said: string[]) =>
  tell({
    kind: "inaugural",
    facts,
    momentKey: "opening:2025-01-20:p",
    worldSeed: "seed",
    sourceRecordIds: ["record:test"],
    knower: "person:president",
    said,
  })!.sentences.find((row) => row.move === "greeting")!.piece;

it("says an unsaid greeting while one is left, then the one said longest ago", () => {
  expect(greetings.length).toBeGreaterThan(2);
  const first = greet([]);
  // Every greeting but one said: the unsaid one is chosen.
  const left = greetings.find((key) => key !== first)!;
  expect(greet(greetings.filter((key) => key !== left))).toBe(left);
  // Every greeting said: the one said longest ago comes back.
  const order = [first, ...greetings.filter((key) => key !== first)];
  expect(greet(order)).toBe(first);
  const rotated = [...order.slice(1), first];
  expect(greet(rotated)).toBe(order[1]);
});
