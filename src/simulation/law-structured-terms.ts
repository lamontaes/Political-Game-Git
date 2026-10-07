import type { IncomeTaxSchedule } from "./income-tax-withholding";
import { LAW_AMOUNT_UNITS, type LawAmountUnit } from "./law-consequence-types";
import type { LegislativeProvisionRecord, World } from "./types";

/** A tier starts at its inclusive threshold; the last tier has no upper bound.
 * The threshold's quantity and the payment's denominator remain explicit.
 * Coverage is separate closed lawCategories, never inferred from a tier.
 */
export const LAW_TIER_QUANTITY_UNITS = [
  "count",
  "containers",
  "tonnes-co2-equivalent",
  "fluid-ounces",
  "litres",
  "hours",
] as const;
export type LawTierQuantityUnit = (typeof LAW_TIER_QUANTITY_UNITS)[number];

export interface LawTier {
  readonly threshold: number;
  readonly unit: LawTierQuantityUnit;
  readonly amount: { readonly value: number; readonly unit: LawAmountUnit };
}

export type LawScheduleTerm = {
  readonly questionKey: string;
  readonly key: string;
} & (
  | { readonly kind: "income-tax"; readonly schedule: IncomeTaxSchedule }
  | { readonly kind: "tiers"; readonly tiers: readonly LawTier[] }
);

/** The existing category contract, shared by adopted and starting text. */
export function assertLawCategories(
  world: World,
  categories: LegislativeProvisionRecord["lawCategories"],
): void {
  if (categories === undefined) return;
  if (!Array.isArray(categories))
    throw new Error("Provision law categories must be an array.");
  const questions = new Map(
    world.policyCatalog.propositionOrder.map((id) => [
      world.policyCatalog.propositions[id]!.stableKey,
      world.policyCatalog.propositions[id]!,
    ]),
  );
  const seen = new Set<string>();
  for (const category of categories) {
    if (!category || typeof category.key !== "string" || !category.key.trim())
      throw new Error(
        "A provision law category needs a catalog question and parameter key.",
      );
    const parameter = questions
      .get(category.questionKey)
      ?.parameters.find((row) => row.key === category.key);
    if (!parameter?.allowedValues?.length)
      throw new Error(
        "A provision law category needs declared catalog allowed values.",
      );
    if (
      !Array.isArray(category.values) ||
      category.values.some(
        (value: unknown) =>
          typeof value !== "string" ||
          !parameter.allowedValues!.includes(value),
      )
    )
      throw new Error("A provision law category contains an undeclared value.");
    if (new Set(category.values).size !== category.values.length)
      throw new Error("A provision law category cannot repeat a value.");
    const key = `${category.questionKey}:${category.key}`;
    if (seen.has(key))
      throw new Error("A provision cannot repeat a law category.");
    seen.add(key);
  }
}

/** Structural validation only; the existing domain calculators apply schedules. */
export function assertLawSchedules(
  world: World,
  terms: readonly LawScheduleTerm[] | undefined,
): void {
  if (terms === undefined) return;
  if (!Array.isArray(terms)) throw new Error("Law schedules must be an array.");
  const seen = new Set<string>();
  for (const term of terms as readonly LawScheduleTerm[]) {
    if (!term)
      throw new Error(
        "A law schedule needs a catalog question and parameter key.",
      );
    const question = world.policyCatalog.propositionOrder
      .map((id) => world.policyCatalog.propositions[id]!)
      .find((row) => row.stableKey === term.questionKey);
    if (!question?.parameters.some((row) => row.key === term.key))
      throw new Error(
        "A law schedule needs a catalog question and parameter key.",
      );
    const key = `${term.questionKey}:${term.key}`;
    if (seen.has(key)) throw new Error("A law schedule cannot repeat a term.");
    seen.add(key);
    if (term.kind === "income-tax") {
      const schedule = term.schedule;
      if (
        !schedule ||
        !Number.isSafeInteger(schedule.standardDeductionMinor) ||
        schedule.standardDeductionMinor < 0 ||
        typeof schedule.sourceUrl !== "string" ||
        !schedule.sourceUrl.trim() ||
        !Array.isArray(schedule.brackets) ||
        !schedule.brackets.length
      )
        throw new Error(
          "An income tax schedule needs its deduction, brackets and source.",
        );
      let previous = -1;
      for (const bracket of schedule.brackets) {
        if (
          !bracket ||
          !Number.isSafeInteger(bracket.overMinor) ||
          bracket.overMinor <= previous ||
          !Number.isSafeInteger(bracket.rateBasisPoints) ||
          bracket.rateBasisPoints < 0
        )
          throw new Error(
            "Tax brackets need increasing minor thresholds and nonnegative integer basis points.",
          );
        previous = bracket.overMinor;
      }
      if (schedule.brackets[0]!.overMinor !== 0)
        throw new Error(
          "An income tax schedule must explicitly begin at zero taxable income.",
        );
    } else if (term.kind === "tiers") {
      if (!Array.isArray(term.tiers) || !term.tiers.length)
        throw new Error("A tier schedule needs an explicit tier list.");
      let previous = -Infinity;
      const first = term.tiers[0]!;
      for (const tier of term.tiers) {
        if (
          !tier ||
          !Number.isFinite(tier.threshold) ||
          tier.threshold < 0 ||
          tier.threshold <= previous ||
          !LAW_TIER_QUANTITY_UNITS.includes(tier.unit) ||
          tier.unit !== first.unit ||
          !tier.amount ||
          !Number.isFinite(tier.amount.value) ||
          tier.amount.value < 0 ||
          !LAW_AMOUNT_UNITS.includes(tier.amount.unit) ||
          tier.amount.unit !== first.amount?.unit ||
          (tier.amount.unit.startsWith("minor") &&
            !Number.isSafeInteger(tier.amount.value))
        )
          throw new Error(
            "Tiers need increasing thresholds and explicit consistent quantity/payment units.",
          );
        previous = tier.threshold;
      }
    } else throw new Error("Unsupported law schedule kind.");
  }
}
