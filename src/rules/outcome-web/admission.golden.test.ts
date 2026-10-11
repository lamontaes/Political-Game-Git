import { describe, it, expect } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { legacyDeclarations, resultOf } from "./legacy-source.test-support";
import { operativeAwardTermsFromFacts } from "./award-terms";
import { stateMinimumHourlyFromFacts } from "./measure-values";
import { rankRemoval } from "./snap-order";
import {
  matchesOutcomeRecipientRule,
  outcomeLandingDirection,
  type OutcomeRecipientRule,
} from "../../simulation/outcome-web/person-outcome-landings";
import {
  matchesOutcomeRecipientFromFacts,
  type OutcomeRecipientFacts,
} from "./recipient";
import { outcomeLandingDirectionFromFacts } from "./landing-direction";
import { shapedLinkFactor } from "../../simulation/outcome-web";
import {
  shapedLinkFactorFromFacts,
  type OutcomeLinkShapeFacts,
} from "./link-factor";
import ageData from "../../../data/research/outcome-web/person-recipient-age-cohorts.json" with { type: "json" };
import landingData from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
const oldRank = legacyDeclarations<{ rankRemoval: typeof rankRemoval }>(
  "law-consequences/modules/snap-participation/index.ts",
  ["rankRemoval"],
).rankRemoval;
const oldAward = legacyDeclarations<{
  operativeAwardTerms: (
    world: unknown,
    id: string,
    at: string,
  ) => ReturnType<typeof operativeAwardTermsFromFacts>;
}>(
  "law-consequences/modules/lw08-development-incentive-cap/index.ts",
  ["operativeAwardTerms"],
  {
    propositionId: () => "prop",
    lawInForce: (world: { law: unknown }) => world.law,
    readFinalEnactedLawTerm: (world: { cap: unknown }) => world.cap,
    readFinalEnactedLawCategories: (world: { disclosures: unknown }) =>
      world.disclosures,
    DEVELOPMENT_INCENTIVE_QUESTION: "q",
    CAP_TERM_KEY: "cap",
    CAP_UNIT: "usd-per-award",
    DISCLOSURE_TERM_KEY: "disclosure",
  },
).operativeAwardTerms;
const cohorts = ageData.cohortsByRule as Record<
  string,
  { minimumAge: number; maximumAge: number | null }
>;
const landingRules = new Set(
  (
    landingData.links as { recipientRule: OutcomeRecipientRule | null }[]
  ).flatMap((row) => (row.recipientRule ? [row.recipientRule] : [])),
);
const base: OutcomeRecipientFacts &
  Parameters<typeof matchesOutcomeRecipientRule>[1] = {
  age: 18,
  activeEducationEnrollment: false,
  hasRecordedEducationEnrollment: false,
  compulsorySchoolAge: {
    minimumAge: 5,
    maximumAge: 18,
    estimatedFrom: "test fixture",
  },
  activeSubstanceUseCondition: false,
  hasCurrentHouseholdResidence: false,
  hasSnapEnrolledHousehold: false,
  hasRecordedWageHousehold: false,
  completedSchooling: false,
  hasActiveRenterHousehold: false,
  hasSnapEnrolledRenterHousehold: false,
  hasEvictedHouseholdWithoutHome: false,
  hasActiveLegalMarriage: false,
  hasRecordedFemaleIdentity: false,
  hasActiveParentOfYoungChild: false,
  hasActiveParentOfInfant: false,
  hasPolicyRestoredVotingRight: false,
  hasRecordedMedicaidExpansionCoverage: false,
  hasActivePaydayLoan: false,
  hasRecordedFarmOperator: false,
};

describe("golden admission and landing boundaries in all places", () => {
  it.each(Object.keys(STATES))(
    "preserves term, shape and recipient boundaries in US-%s",
    () => {
      for (const incomeToThreshold of [null, 0, 1, 1.3, 2])
        for (const size of [1, 4])
          for (const monthlyWorkHours of [null, 0, 80]) {
            const a = {
              householdId: "a",
              size,
              incomeToThreshold,
              monthlyWorkHours,
            };
            const b = {
              householdId: "b",
              size: 2,
              incomeToThreshold: 1,
              monthlyWorkHours: 40,
            };
            expect(rankRemoval(a, b)).toEqual(oldRank(a, b));
          }
      for (const answer of ["yes", "no"])
        for (const capValue of [-1, 0, 100, 0.1, Number.MAX_SAFE_INTEGER, NaN])
          for (const values of [[], ["amount"], ["amount", "amount"]]) {
            const facts = {
              law: { answer },
              cap: { value: capValue, sourceRecordIds: ["cap"] },
              disclosures: { values, sourceRecordIds: ["disclosure"] },
            };
            expect(operativeAwardTermsFromFacts(facts)).toEqual(
              oldAward(facts, "j", "2026-01-01"),
            );
          }
      const oldMinimum = legacyDeclarations<{
        stateMinimumHourlyAt: (
          world: unknown,
          id: string,
          at: string,
        ) => ReturnType<typeof stateMinimumHourlyFromFacts>;
      }>("outcome-web/index.ts", ["stateMinimumHourlyAt"], {
        placeOutcomeKey: () => "US-XX",
        stateMinimumSettingAt: (world: unknown) => world,
        FEDERAL_MINIMUM_HOURLY: 7.25,
      }).stateMinimumHourlyAt;
      for (const hourlyMinor of [0, 725, 1500])
        for (const beforeMinor of [null, 0, 1000]) {
          const setting = { hourlyMinor, beforeMinor };
          expect(stateMinimumHourlyFromFacts(true, setting, 7.25)).toEqual(
            oldMinimum(setting, "j", "2026-01-01"),
          );
        }
      expect(stateMinimumHourlyFromFacts(false, null, 7.25)).toBeNull();
      for (const rule of landingRules) {
        const cohort = cohorts[rule] ?? null;
        const ages = [
          -1,
          0,
          5,
          18,
          19,
          65,
          90,
          ...(cohort
            ? [
                cohort.minimumAge - 1,
                cohort.minimumAge,
                ...(cohort.maximumAge === null
                  ? []
                  : [cohort.maximumAge, cohort.maximumAge + 1]),
              ]
            : []),
        ];
        for (const age of ages)
          for (const active of [false, true]) {
            const person = { ...base, age };
            for (const key of Object.keys(base) as (keyof typeof base)[])
              if (typeof base[key] === "boolean")
                Object.assign(person, { [key]: active });
            expect(
              resultOf(() =>
                matchesOutcomeRecipientFromFacts(rule, person, cohort),
              ),
            ).toEqual(
              resultOf(() => matchesOutcomeRecipientRule(rule, person)),
            );
          }
      }
      for (const previous of [0, 1, 1.5])
        for (const current of [0, 1, 1.5])
          for (const direction of [
            "higher-is-better",
            "higher-is-worse",
          ] as const)
            expect(
              outcomeLandingDirectionFromFacts(previous, current, direction),
            ).toBe(outcomeLandingDirection(previous, current, direction));
      const shapes: OutcomeLinkShapeFacts[] = [
        { kind: "linear" },
        { kind: "elasticity" },
        { kind: "threshold", at: 8 },
        { kind: "threshold", at: 8, steeperAt: 16, steeperExtraSize: 0.2 },
        { kind: "diminishing", scale: 4 },
        { kind: "exposure-years" },
        { kind: "acute-decay", halfLifeDays: 90 },
      ];
      for (const shape of shapes)
        for (const size of [null, -1, 0, 0.1])
          for (const value of [NaN, Infinity, -1, 0, 8, 16, 20])
            for (const baseline of [NaN, 0, 1, 10])
              expect(
                shapedLinkFactorFromFacts({ shape, size }, value, baseline),
              ).toEqual(shapedLinkFactor({ shape, size }, value, baseline));
    },
  );
});
