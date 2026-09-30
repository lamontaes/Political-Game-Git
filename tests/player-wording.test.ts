import { describe, expect, it } from "vitest";

import {
  BANNED_PHRASES,
  countWording,
  countSourceWording,
  findUnnaturalPhrasing,
  readBaseline,
  wordingDifferences,
} from "../scripts/english-check/wording";

/**
 * The player-wording ratchet. `scripts/english-check/wording.ts` explains the
 * three counts; this holds them to the committed baseline, so a new banned
 * phrase or a new hand-written sentence in a player screen fails, and a fix
 * locks its improvement in with `npm run wording:baseline`.
 */
describe("the words a player reads", () => {
  it.each([
    [
      "In the United States Senate: 58 Republican Party, 40 Democratic Party, 2 No party.",
      "party-member-count",
    ],
    ["Checking this leaves canonical\n time unchanged.", "canonical-clock"],
    ["This action waits 30 minutes until 2 p.m.", "impersonal-action"],
    ["This action attends the full 30-minute commitment.", "impersonal-action"],
    ["This activity is not yours to carry out.", "carry-out-choice"],
    ["Carry out the activity.", "carry-out-choice"],
    ["Perform an activity.", "carry-out-choice"],
    ["It travels for the full 30-minute interval.", "full-travel-interval"],
    [
      "Select a date to see its upcoming and ongoing entries.",
      "calendar-bookkeeping",
    ],
    ["2 upcoming or ongoing entries", "calendar-bookkeeping"],
  ])("flags the construction in %s", (text, rule) => {
    expect(findUnnaturalPhrasing(text)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule, suggestion: expect.any(String) }),
      ]),
    );
  });

  // Research 2's public-domain procedural formulas stay valid. The private
  // corpus cards supply patterns only; no private transcript line is copied.
  it.each([
    "There are 14 Republican Party candidates on the ballot.",
    "Mr. Speaker, I rise today to honor our veterans.",
    "I yield back the balance of my time.",
    "I ask unanimous consent to revise and extend my remarks.",
    "Thank you, Mr. Speaker.",
    "Next speaker, please. Your time begins now.",
    "All in favor? The motion carries.",
    "I don't have anything to share.",
    "Will the gentleman yield?",
    "You leave at 2 p.m. The trip takes 30 minutes.",
    "Go to the public meeting.",
    "He carried out the court's order.",
    "No job openings are listed here right now.",
  ])("accepts American speech and menu wording: %s", (text) => {
    expect(findUnnaturalPhrasing(text)).toEqual([]);
  });

  it("checks wrapped JSX prose without reading comments or identifiers", () => {
    const counts = countSourceWording(
      `// canonical time and upcoming and ongoing entries are internal names.
       const canonicalTime = 'saved:canonical-time';
       export const panel = <p>Checking this leaves canonical
         time unchanged.</p>;`,
      "src/player/Example.tsx",
    );
    expect(counts.phrasing).toEqual({
      "src/player/Example.tsx :: canonical-clock": 1,
    });
  });

  it("ratchets phrase structures and gives a concrete repair suggestion", () => {
    const key = "src/player/Example.tsx :: canonical-clock";
    const empty = { banned: {}, handWritten: {} };
    expect(
      wordingDifferences(empty, { ...empty, phrasing: { [key]: 1 } }),
    ).toEqual([
      `new unnatural phrasing: ${key} (0 -> 1); Say "time" or describe whether the clock moves.`,
    ]);
    expect(
      wordingDifferences({ ...empty, phrasing: { [key]: 1 } }, empty),
    ).toEqual([
      `fewer than the baseline records: ${key} (1 -> 0); run npm run wording:baseline to lock the improvement in`,
    ]);
  });

  // Reading every player-facing source file takes a few seconds.
  it(
    "adds no banned phrase and no hand-written sentence to a player screen",
    { timeout: 60_000 },
    () => {
      expect(wordingDifferences(readBaseline(), countWording())).toEqual([]);
    },
  );

  it("carries the owner's banned list", () => {
    expect(BANNED_PHRASES).toEqual(
      expect.arrayContaining(["on the record", "not modeled", "GEOID", "FMR"]),
    );
  });

  it("reports a new phrase, a new sentence and an unrecorded improvement", () => {
    const baseline = {
      banned: { "src/player/A.tsx :: reported": 1 },
      handWritten: { "src/player/A.tsx": 2 },
    };
    expect(
      wordingDifferences(baseline, {
        banned: {
          "src/player/A.tsx :: reported": 1,
          "src/player/B.tsx :: GEOID": 1,
        },
        handWritten: { "src/player/A.tsx": 3 },
      }),
    ).toEqual([
      "new banned phrase: src/player/B.tsx :: GEOID (0 -> 1)",
      "new hand-written sentence in a player screen: src/player/A.tsx (2 -> 3); word it through the English engine",
    ]);
    expect(
      wordingDifferences(baseline, {
        banned: {},
        handWritten: { "src/player/A.tsx": 2 },
      }),
    ).toEqual([
      "fewer than the baseline records: src/player/A.tsx :: reported (1 -> 0); run npm run wording:baseline to lock the improvement in",
    ]);
  });
});
