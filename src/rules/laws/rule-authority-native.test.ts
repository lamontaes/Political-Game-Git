import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import * as native from "../../simulation/enacted-rule-changes";
import * as programs from "../../simulation/legislation-program-families";
import { assertAmendableRuleValue } from "./rule-value";
import { governmentMayEnactVariant } from "./variant-authority";
const configs = programs.programConfigurations();
const facts = {
  variants: new Map(
    configs.map((c) => [
      c.familyKey + ":" + c.variantKey,
      programs.programVariant(c.familyKey, c.variantKey).variant,
    ]),
  ),
};
function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
describe("laws: rule-value helper through public validation and program authority", () => {
  it.each(Object.keys(STATES))(
    "matches field bounds and all compiled variant authority in %s",
    (usps) => {
      for (const value of [
        null,
        { maxConsecutiveTerms: 2, maxLifetimeTerms: null, lookbackYears: null },
        { maxConsecutiveTerms: 0, maxLifetimeTerms: null, lookbackYears: null },
        { maxConsecutiveTerms: null, maxLifetimeTerms: null, lookbackYears: 1 },
        { maxConsecutiveTerms: 2.5, maxLifetimeTerms: 3, lookbackYears: 1 },
        { maxConsecutiveTerms: 1, maxLifetimeTerms: 3, lookbackYears: -1 },
      ])
        expect(
          result(() =>
            assertAmendableRuleValue(
              "executive.term.limit",
              value,
              `us-${usps.toLowerCase()}-governor`,
            ),
          ),
        ).toEqual(
          result(() =>
            native.assertAmendableRuleValue(
              "executive.term.limit",
              value,
              `us-${usps.toLowerCase()}-governor`,
            ),
          ),
        );
      for (const c of configs)
        for (const government of [
          "federal",
          "state",
          "territory",
          "district-of-columbia",
          "county",
          "municipality",
        ] as const) {
          for (const narrowing of [
            [],
            [
              {
                withheld: [
                  programs.programVariant(c.familyKey, c.variantKey).variant
                    .instrument,
                ],
                reason: "Authored exact recorded narrowing",
              },
            ],
          ])
            expect(
              governmentMayEnactVariant(
                facts,
                government,
                c.familyKey,
                c.variantKey,
                narrowing,
              ),
            ).toEqual(
              programs.governmentMayEnactVariant(
                government,
                c.familyKey,
                c.variantKey,
                narrowing,
              ),
            );
        }
    },
  );
});
