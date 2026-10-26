/**
 * A statewide executive's term limit is read from each state's own
 * constitution (pool item gov-office-calendar-and-term-limit-per-office, the
 * term-limit half): a governor who may not serve consecutive terms cannot
 * stand again. Checked over every state and territory the research holds,
 * never one named place.
 */
import { expect, it } from "vitest";
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import {
  executiveTermLimit,
  termLimitReachedBy,
} from "./executive-term-limits";

const places = (
  stateOfficeResearch as unknown as {
    places: Record<
      string,
      {
        executives?: {
          key: string;
          termLimit?: { kind?: string; terms?: number };
        }[];
      }
    >;
  }
).places;

it("reads every statewide executive's limit from the state's data", () => {
  let governors = 0;
  let limited = 0;
  for (const [stateKey, place] of Object.entries(places))
    for (const executive of place.executives ?? []) {
      const limit = executiveTermLimit(stateKey, executive.key);
      const source = executive.termLimit;
      if (source?.kind === "consecutive" || source?.kind === "lifetime") {
        expect(limit, `${stateKey} ${executive.key}`).toEqual({
          kind: source.kind,
          terms: source.terms,
        });
        if (executive.key === "governor") limited += 1;
      } else expect(limit.kind, `${stateKey} ${executive.key}`).toBe("none");
      if (executive.key === "governor") governors += 1;
    }
  // Most governors are limited and some are not.
  expect(governors).toBeGreaterThan(40);
  expect(limited).toBeGreaterThan(30);
  expect(limited).toBeLessThan(governors);
});

it("stops a holder who has served the limit and no one before it", () => {
  const two = { kind: "consecutive", terms: 2 } as const;
  expect(termLimitReachedBy(two, 1)).toBe(false);
  expect(termLimitReachedBy(two, 2)).toBe(true);
  // A state that bars consecutive terms stops the sitting governor.
  expect(termLimitReachedBy({ kind: "consecutive", terms: 1 }, 1)).toBe(true);
  expect(termLimitReachedBy({ kind: "lifetime", terms: 2 }, 2)).toBe(true);
  // No limit never stops anyone.
  expect(termLimitReachedBy({ kind: "none", terms: 0 }, 50)).toBe(false);
  // An office the research does not hold has no limit.
  expect(executiveTermLimit("US-ZZ", "governor").kind).toBe("none");
  expect(executiveTermLimit("US-VA", "no-such-office").kind).toBe("none");
});
