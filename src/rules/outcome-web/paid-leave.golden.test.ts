import { describe, it, expect } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { censusRegionOf } from "../../simulation/world-setup/census-regions";
import { rankedPaidLeaveEstimate } from "../../simulation/paid-leave-estimates";
import premiumData from "../../../data/research/money/state-paid-leave-premiums-2026.json" with { type: "json" };
import benefitData from "../../../data/research/money/state-paid-leave-benefits-2026.json" with { type: "json" };
import incomeData from "../../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import {
  paidLeavePremiumFromFacts,
  paidLeaveBenefitRateFromFacts,
  collectsFromFacts,
  readPremiumFromFacts,
  estimatedPremiumFromFacts,
  type PremiumPlaceFacts,
  type PremiumReading,
  type PaidLeaveBenefitRate,
} from "./paid-leave";
import {
  rankedPaidLeaveEstimateFromFacts,
  type LeaveEstimateFacts,
} from "./ranked-leave-estimate";
import { legacyDeclarations } from "./legacy-source.test-support";
const sources = {
  "employee-premium": Object.entries(premiumData.places).flatMap(
    ([stateKey, row]) =>
      row.status === "read" && row.employeePercent !== null
        ? [{ stateKey, percent: row.employeePercent }]
        : [],
  ),
  "low-wage-benefit": Object.entries(benefitData.places).flatMap(
    ([stateKey, row]) =>
      row.status === "read" && row.lowWageReplacementPercent !== null
        ? [{ stateKey, percent: row.lowWageReplacementPercent }]
        : [],
  ),
};
const estimateFacts: LeaveEstimateFacts = {
  sources,
  incomes: incomeData.medianHouseholdIncomeDollarsByState,
  regionOf: censusRegionOf,
};
const question = "us-policy-positions:labor-workforce.paid-family-leave";
const places = premiumData.places as unknown as Record<
  string,
  PremiumPlaceFacts
>;
const benefitPlaces = benefitData.places as Record<
  string,
  { status: string; lowWageReplacementPercent: number | null }
>;
const maxima = Object.fromEntries(
  Object.entries(premiumData.places).map(([key, row]) => [
    key,
    ("benefit" in row ? row.benefit?.maxWeeklyDollars : null) ?? null,
  ]),
);

describe("paid leave program selection golden comparisons", () => {
  it.each(Object.keys(STATES))(
    "preserves read/estimated/adopted premium and benefit terms in US-%s",
    (usps) => {
      const stateKey = `US-${usps}`;
      const place = places[stateKey];
      for (const kind of ["employee-premium", "low-wage-benefit"] as const)
        expect(
          rankedPaidLeaveEstimateFromFacts(estimateFacts, stateKey, kind),
        ).toEqual(rankedPaidLeaveEstimate(stateKey, kind));
      const oldHelpers = legacyDeclarations<{
        collectsFrom: (
          world: unknown,
          id: string,
          prop: string,
          place: PremiumPlaceFacts | undefined,
          at: string,
        ) => boolean;
        readPremium: typeof readPremiumFromFacts;
        estimatedPremium: (
          world: unknown,
          key: string,
        ) => Extract<PremiumReading, { kind: "premium" }>;
      }>(
        "state-paid-leave-law.ts",
        [
          "COMMON_WAGE_CAP_DOLLARS",
          "collectsFrom",
          "readPremium",
          "estimatedPremium",
        ],
        { rankedPaidLeaveEstimate, lawInForceAtStart: () => "yes" },
      );
      expect(readPremiumFromFacts(place)).toEqual(
        oldHelpers.readPremium(place),
      );
      expect(collectsFromFacts("2026-01-01", place, "yes")).toBe(
        oldHelpers.collectsFrom({}, "state", "prop", place, "2026-01-01"),
      );
      expect(
        estimatedPremiumFromFacts(
          rankedPaidLeaveEstimate(stateKey, "employee-premium"),
        ),
      ).toEqual(oldHelpers.estimatedPremium({}, stateKey));
      for (const began of [false, true])
        for (const hasState of [false, true])
          for (const answer of [null, "no", "yes"] as const)
            for (const paidAt of ["2026-01-01", "2029-01-01"])
              for (const terms of [
                { rate: null, cap: null, replacement: null },
                { rate: 44, cap: 184500, replacement: 0.8 },
                { rate: 0.001, cap: -1, replacement: 2 },
                { rate: 10001, cap: 100, replacement: 0 },
                { rate: NaN, cap: Infinity, replacement: NaN },
              ]) {
                const law =
                  answer === null
                    ? null
                    : { answer, measureId: "law", ...terms };
                const collecting =
                  began &&
                  collectsFromFacts(paidAt, place, began ? "yes" : "no");
                const estimate = () =>
                  estimatedPremiumFromFacts(
                    rankedPaidLeaveEstimate(stateKey, "employee-premium"),
                  );
                const actual = paidLeavePremiumFromFacts({
                  hasStateAndProposition: hasState,
                  began,
                  collecting,
                  law,
                  place,
                  estimate,
                });
                const old = legacyDeclarations<{
                  paidLeavePremium: (
                    world: unknown,
                    key: string,
                    at: string,
                  ) => PremiumReading;
                }>(
                  "state-paid-leave-law.ts",
                  [
                    "COMMON_WAGE_CAP_DOLLARS",
                    "ANY_START",
                    "collectsFrom",
                    "readPremium",
                    "estimatedPremium",
                    "paidLeavePremium",
                  ],
                  {
                    PLACES: places,
                    PAID_LEAVE_QUESTION: question,
                    chiefExecutiveJurisdiction: () =>
                      hasState ? { id: "state" } : null,
                    lawInForce: () => law,
                    lawInForceAtStart: () => (began ? "yes" : "no"),
                    readFinalEnactedLawTerm: (
                      _w: unknown,
                      _law: unknown,
                      request: { termKey: "rate" | "cap" },
                    ) =>
                      terms[request.termKey] === null
                        ? null
                        : { value: terms[request.termKey] },
                    rankedPaidLeaveEstimate,
                  },
                ).paidLeavePremium;
                const world = {
                  policyCatalog: {
                    propositions: { p: { id: "p", stableKey: question } },
                  },
                };
                expect(actual).toEqual(old(world, stateKey, paidAt));
                const rateActual = paidLeaveBenefitRateFromFacts({
                  premiumKind: actual.kind,
                  maxWeeklyDollars: maxima[stateKey] ?? null,
                  replacement:
                    hasState && answer === "yes" ? terms.replacement : null,
                  place: benefitPlaces[stateKey],
                  estimate: () =>
                    rankedPaidLeaveEstimate(stateKey, "low-wage-benefit"),
                });
                const oldRate = legacyDeclarations<{
                  paidLeaveBenefitRate: (
                    world: unknown,
                    key: string,
                    at: string,
                  ) => PaidLeaveBenefitRate | null;
                }>("paid-leave-benefits.ts", ["paidLeaveBenefitRate"], {
                  MAX_WEEKLY: maxima,
                  PLACES: benefitPlaces,
                  PAID_LEAVE_QUESTION: question,
                  paidLeavePremium: () => actual,
                  chiefExecutiveJurisdiction: () =>
                    hasState ? { id: "state" } : null,
                  lawInForce: () => law,
                  readFinalEnactedLawTerm: () =>
                    terms.replacement === null
                      ? null
                      : { value: terms.replacement },
                  rankedPaidLeaveEstimate,
                }).paidLeaveBenefitRate;
                expect(rateActual).toEqual(oldRate(world, stateKey, paidAt));
              }
    },
  );
});
