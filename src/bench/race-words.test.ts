// The Campaigns race line reads as sentences at every count: one voter is
// "one voter", no sentence opens with a numeral, and a side that moved no one
// is never printed as a zero.
import { expect, it } from "vitest";
import { raceStanding } from "./campaign";
import type { CoreState } from "../core2/types";

type Causes = Parameters<typeof raceStanding>[3];

const who = (
  name: string,
  you: boolean,
  reached: number,
  warmer = 0,
  cooler = 0,
) => ({ candidateId: `c-${name}`, name, you, reached, warmer, cooler });

const lineFor = (
  seed: string,
  mine: number,
  warmer: number,
  cooler: number,
  theirs: number,
  contacted: number,
): string[] => {
  const causes = [
    who("You", true, mine, warmer, cooler),
    who("Pat Doe", false, theirs),
  ] as unknown as Causes;
  return raceStanding(
    { seed } as unknown as CoreState,
    { id: "f1", personId: "p1" } as never,
    contacted > 0
      ? {
          date: "2026-10-01",
          contacted,
          answers: { "c-You": 1, "c-Pat Doe": 1 },
        }
      : undefined,
    causes,
  );
};

const sentences = (lines: string[]) =>
  lines.flatMap((line) => line.split(/(?<=[.!?])\s+/));

it("says one voter in the singular, never opens with a numeral, never prints a zero count", () => {
  for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    for (const count of [0, 1, 7]) {
      for (const [warmer, cooler] of [
        [0, 0],
        [3, 0],
        [0, 2],
        [4, 1],
        [1, 1],
      ]) {
        const lines = lineFor(
          seed,
          count,
          count > 0 ? warmer : 0,
          count > 0 ? cooler : 0,
          count,
          count,
        );
        const text = lines.join(" ");
        expect(text, text).not.toMatch(/\b1 voters\b/);
        for (const sentence of sentences(lines))
          expect(sentence, sentence).not.toMatch(/^\d/);
        if (count === 1) expect(text).toMatch(/\bone voter\b/);
        if (count > 1) expect(text).toMatch(/\b7 voters\b/);
        if (count > 0) {
          const moved = lines[1];
          expect(moved, moved).not.toMatch(/\b0 /);
          if (warmer === 0 && cooler === 0)
            expect(moved).toMatch(
              /(Nobody|No one) you reached has changed their mind yet\./,
            );
          if (warmer > 0 && cooler === 0) expect(moved).toMatch(/warm/);
          if (cooler > 0 && warmer === 0) expect(moved).toMatch(/cool/);
          if (cooler > 0 && warmer > 0) expect(moved).toMatch(/warm.*cool/);
        }
      }
    }
  }
});
