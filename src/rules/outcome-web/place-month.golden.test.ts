import { describe, it, expect } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { legacyDeclarations } from "./legacy-source.test-support";
import {
  placeOutcomesForMonthFromFacts,
  type PlaceOutcomeRecord,
  type PlaceMonthFacts,
} from "./place-month";
import type { placeOutcomeValue as liftedValue } from "./place-values";

// STOPGAP RULES4-OW-011: RULES-4, 2026-10-10. The legacy store import cycles
// through disaster/crisis initialization with undefined PLACE_OUTCOME_BASES.
// Preserve its arithmetic via unchanged source; replace when the owning legacy
// loader has a separately reviewed initialization contract.
const { placeOutcomeValue } = legacyDeclarations<{
  placeOutcomeValue: typeof liftedValue;
}>("outcome-web/place-outcome-store.ts", ["placeOutcomeValue"]);

describe("golden monthly state and local aggregation", () => {
  it.each(Object.keys(STATES))(
    "carries, adds, weights and rounds monthly outcomes in US-%s",
    (usps) => {
      const stateKey = `US-${usps}`;
      for (const scale of ["share", "index", "rate", "level"] as const)
        for (const scenario of [
          "opening",
          "prior",
          "replaced",
          "unrelated-latest-month",
        ])
          for (const weight of [null, 0, 0.25, 1]) {
            const bases = {
              measure: {
                name: "measure",
                unit: "unit",
                source: "source",
                scale,
                places: { [stateKey]: 10 },
                replaces: "old",
              },
            };
            const record: PlaceOutcomeRecord = {
              measure: scenario === "replaced" ? "old" : "measure",
              placeKey: stateKey,
              jurisdictionId: "state",
              month: "2026-01-01",
              base: 100,
              structural: 120,
              multiplier: 1,
              value: 120,
              causes: [],
            };
            const months =
              scenario === "opening"
                ? []
                : [
                    { month: "2026-01-01", records: [record] },
                    ...(scenario === "unrelated-latest-month"
                      ? [{ month: "2026-02-01", records: [] }]
                      : []),
                  ];
            const previousRecords = months.at(-1)?.records ?? [];
            const locals = new Map([
              [
                stateKey,
                [{ localKey: "local-place", jurisdictionId: "local", weight }],
              ],
            ]);
            const outcomeFactor = (id: string, measure: string) => {
              const factor = id === "local" ? 1.4 : 1.2;
              return {
                outcome: measure,
                multiplier: factor,
                causes: [
                  {
                    key: "cause",
                    from: "law:question",
                    factor,
                    causeValue: 1,
                    causeBaseline: 0,
                    readAt: "2026-03-01",
                    evidence: "researched",
                  },
                ],
              };
            };
            const facts: PlaceMonthFacts = {
              bases,
              defaultDrift: { minPct: 0, maxPct: 100 },
              previousRecords,
              locals,
              jurisdictionId: () => "state",
              outcomeFactor,
              rangeViolations: () => [],
            };
            const old = legacyDeclarations<{
              placeOutcomesForMonth: (
                world: unknown,
                month: string,
                measures: string[],
              ) => readonly PlaceOutcomeRecord[];
            }>(
              "outcome-web/place-outcomes.ts",
              ["placeOutcomesForMonth", "movedBy"],
              {
                PLACE_OUTCOME_BASES: bases,
                PLACE_OUTCOME_MEASURES: ["measure"],
                DEFAULT_PLACE_OUTCOME_DRIFT: facts.defaultDrift,
                localOutcomePlaces: () => locals,
                stateJurisdictionForKey: () => ({ id: "state" }),
                outcomeFactor: (_w: unknown, id: string, measure: string) =>
                  outcomeFactor(id, measure),
                placeOutcomeValue,
                outcomeRangeViolations: () => [],
              },
            ).placeOutcomesForMonth;
            expect(
              placeOutcomesForMonthFromFacts(facts, "2026-03-01", ["measure"]),
            ).toEqual(
              old({ placeOutcomes: { months } }, "2026-03-01", ["measure"]),
            );
          }
    },
  );
});
