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
    "government-outlay-change",
    "government-program-payment",
    "health-coverage",
    "housing-permit-units",
    "inclusionary-affordable-rent",
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
    "rent-stabilization-renewal",
    "state-revenue-loss",
    "state-spending",
    "teacher-pay",
    "work-compensation-payment",
  ] as const satisfies readonly LegacyEffectKind[];
  expectTypeOf<(typeof legacy)[number]>().toEqualTypeOf<LegacyEffectKind>();
  expect(new Set(legacy).size).toBe(legacy.length);
  // @ts-expect-error A new bespoke outcome label must not enter the shared writer.
  const invented: LawEffectContext["effectKind"] = "invented-new-effect";
  void invented;
  // @ts-expect-error Retired tax stamps remain readable, but new writers use tax.
  const retiredTax: LawEffectContext["effectKind"] = "tax-assessment";
  void retiredTax;
  // @ts-expect-error New withholding writers use the same canonical tax kind.
  const retiredWithholding: LawEffectContext["effectKind"] =
    "federal-income-tax-withholding";
  void retiredWithholding;
});
