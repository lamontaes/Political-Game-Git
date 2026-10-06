import { expect, expectTypeOf, it } from "vitest";
import type {
  LawConsequenceKind,
  LegacyEffectKind,
} from "./law-consequence-types";
import {
  lawTermApplicabilitiesMatch,
  lawTermApplicabilityKey,
  lawTermScopeKey,
  lawTermScopesMatch,
  type LawTermApplicability,
  type LawTermScope,
} from "./law-consequence-types";
import type { LawEffectContext } from "./law-effect-stamp";

it("closes new writer labels while listing the legacy labels to retire", () => {
  expectTypeOf<LawEffectContext["effectKind"]>().toEqualTypeOf<
    LawConsequenceKind | LegacyEffectKind
  >();
  const legacy = [
    "business-compliance-cost",
    "cannabis-selective-tax-revenue",
    "congress-voting-seat-tenure",
    "election.state-legislative-candidacy-intent",
    "eviction-counsel-representation",
    "federal-income-tax-withholding",
    "government-outlay-change",
    "government-program-payment",
    "health-coverage",
    "housing-permit-units",
    "justice.held-before-trial",
    "justice.released-before-trial",
    "law.pay-compensation",
    "local.officeholder-retired",
    "local.wards-drawn",
    "minimum-custody-months",
    "minimum-wage-compensation",
    "paid-leave-benefit",
    "paid-leave-budget-cost",
    "public-program-appropriation",
    "state-revenue-loss",
    "state-spending",
    "tax-assessment",
    "tax-collection",
    "tax-policy",
    "teacher-pay",
    "work-compensation-payment",
  ] as const satisfies readonly LegacyEffectKind[];
  expectTypeOf<(typeof legacy)[number]>().toEqualTypeOf<LegacyEffectKind>();
  expect(new Set(legacy).size).toBe(legacy.length);
  // @ts-expect-error A new bespoke outcome label must not enter the shared writer.
  const invented: LawEffectContext["effectKind"] = "invented-new-effect";
  void invented;
  // @ts-expect-error Old affordable-rent labels remain readable, not writer inputs.
  const retiredAffordable: LawEffectContext["effectKind"] =
    "inclusionary-affordable-rent";
  void retiredAffordable;
  // @ts-expect-error Old stabilization labels remain readable, not writer inputs.
  const retiredRentCap: LawEffectContext["effectKind"] =
    "rent-stabilization-renewal";
  void retiredRentCap;
});

it("requires exact typed law-term scopes and canonicalizes charge-key sets", () => {
  const first: LawTermScope = {
    kind: "consumer-credit",
    lenderClass: "licensed-finance-company",
    productClass: "small-loan",
    rateBasis: "annual-percentage-rate",
    includedChargeKeys: ["origination", "servicing"],
    exceptionSetKey: "statutory-exceptions-v1",
  };
  const reordered: LawTermScope = {
    ...first,
    includedChargeKeys: ["servicing", "origination"],
  };
  expect(lawTermScopesMatch(first, reordered)).toBe(true);
  expect(lawTermScopesMatch(first, undefined)).toBe(false);
  expect(
    lawTermScopeKey({
      ...first,
      includedChargeKeys: ["origination", "origination"],
    }),
  ).toBeNull();
  expect(
    lawTermScopeKey({
      ...first,
      extra: "not part of the closed contract",
    } as LawTermScope),
  ).toBeNull();
  expect(
    lawTermScopesMatch(first, {
      ...first,
      exceptionSetKey: "different-exceptions",
    }),
  ).toBe(false);
});

it("matches explicit regional and place applicability without widening unknowns", () => {
  const region: LawTermApplicability = {
    kind: "census-regions",
    regions: ["midwest", "west"],
  };
  expect(
    lawTermApplicabilitiesMatch(region, {
      kind: "census-regions",
      regions: ["west", "midwest"],
    }),
  ).toBe(true);
  expect(
    lawTermApplicabilitiesMatch(region, {
      kind: "census-regions",
      regions: ["midwest"],
    }),
  ).toBe(false);
  expect(lawTermApplicabilitiesMatch(region, undefined)).toBe(false);
  expect(
    lawTermApplicabilityKey({
      kind: "census-regions",
      regions: ["north"],
    } as unknown as LawTermApplicability),
  ).toBeNull();
  expect(
    lawTermApplicabilityKey({
      kind: "place-set",
      placeKeys: ["US-MI", "US-MI"],
    }),
  ).toBeNull();
  expect(
    lawTermApplicabilitiesMatch(
      { kind: "place-set", placeKeys: ["US-MI"] },
      { kind: "census-regions", regions: ["midwest"] },
    ),
  ).toBe(false);
  const bailCohort: LawTermApplicability = {
    kind: "court-charge-cohort",
    courtLevelKey: "state-trial-court",
    courtKey: null,
    offenseKey: "crime:robbery",
    offenseClassKey: "felony",
    region: "south",
  };
  expect(
    lawTermApplicabilitiesMatch(bailCohort, {
      ...bailCohort,
      offenseClassKey: "misdemeanor",
    }),
  ).toBe(false);
  expect(
    lawTermApplicabilitiesMatch(bailCohort, {
      ...bailCohort,
      region: "west",
    }),
  ).toBe(false);
  expect(
    lawTermApplicabilityKey({
      ...bailCohort,
      offenseClassKey: " ",
    }),
  ).toBeNull();
});
