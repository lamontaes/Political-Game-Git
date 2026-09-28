import { describe, expect, it } from "vitest";

import {
  BANNED_PHRASES,
  countWording,
  readBaseline,
  wordingDifferences,
} from "../scripts/english-check/wording";

/**
 * The player-wording ratchet. `scripts/english-check/wording.ts` explains the
 * two counts; this holds them to the committed baseline, so a new banned
 * phrase or a new hand-written sentence in a player screen fails, and a fix
 * locks its improvement in with `npm run wording:baseline`.
 */
describe("the words a player reads", () => {
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
