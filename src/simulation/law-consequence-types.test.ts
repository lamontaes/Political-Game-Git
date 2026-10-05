import { expect, expectTypeOf, it } from "vitest";
import type {
  LawConsequenceKind,
  LegacyEffectKind,
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
    "inclusionary-affordable-rent",
    "justice.held-before-trial",
    "justice.released-before-trial",
    "local.officeholder-retired",
    "local.wards-drawn",
    "minimum-custody-months",
    "paid-leave-benefit",
    "paid-leave-budget-cost",
    "public-program-appropriation",
    "rent-stabilization-renewal",
    "state-revenue-loss",
    "state-spending",
    "tax-assessment",
    "tax-collection",
    "tax-policy",
  ] as const satisfies readonly LegacyEffectKind[];
  expectTypeOf<(typeof legacy)[number]>().toEqualTypeOf<LegacyEffectKind>();
  expect(new Set(legacy).size).toBe(legacy.length);
  // @ts-expect-error A new bespoke outcome label must not enter the shared writer.
  const invented: LawEffectContext["effectKind"] = "invented-new-effect";
  void invented;
  // @ts-expect-error Retired pay labels remain readable in saves, not new writers.
  const retiredPay: LawEffectContext["effectKind"] = "teacher-pay";
  void retiredPay;
});
