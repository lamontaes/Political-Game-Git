import { expect, it } from "vitest";
import { composeAddress } from "./english-composition";
import { openingMove } from "./english-opening-speech";
import { packet } from "../director/speech-outline";

/**
 * The one composer prefers a wording the voice has not used lately, and says
 * the one used longest ago once every fitting wording has been said (Words
 * builder W-F, Nov 12: one greeting in address after address). Bare piece
 * keys count under any bank, so a State of the Union reads the inaugural's.
 */
const f = (text: string) => ({ text, sourceRecordIds: ["record:test"] });
// Each case of the Speaker's slot, as the address composer fills them from
// the one fact (withCases, src/director/opening-story.ts): a greeting that
// addresses the Speaker requires its case by name.
const facts = {
  speaker: f("Ann Lee"),
  "speaker-object": f("Ann Lee"),
  "speaker-addressed": f("Speaker Ann Lee"),
  "kind-policy": f("yes"),
};
const move = openingMove("inaugural", "polished", "salutation", {
  required: true,
  addressKind: "policy",
})!;
const openers = move.bank.parts.opener!.variants.map((row) => row.key);
const greet = (said: string[]) => {
  const result = composeAddress(
    packet(
      "opening:2025-01-20:p/salutation",
      "seed",
      "p",
      "chair-male",
      facts as never,
      ["p"],
    ),
    "election-night",
    [move],
    { recentPartKeys: said },
  );
  if (result.kind !== "rendered") throw new Error("no greeting");
  return result.moves[0]!.parts.find((part) => part.part === "opener")!
    .variantKey;
};

it("says an unsaid greeting while one is left, then the one said longest ago", () => {
  expect(openers.length).toBeGreaterThan(2);
  const first = greet([]);
  // Every greeting but one said: the unsaid one is chosen.
  const left = openers.find((key) => key !== first)!;
  expect(greet(openers.filter((key) => key !== left))).toBe(left);
  // Every greeting said: the one said longest ago comes back.
  const order = [first, ...openers.filter((key) => key !== first)];
  expect(greet(order)).toBe(first);
  const rotated = [...order.slice(1), first];
  expect(greet(rotated)).toBe(order[1]);
});
