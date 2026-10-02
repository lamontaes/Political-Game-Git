import tuitionRevenue from "../../../data/research/money/state-tuition-revenue.json" with { type: "json" };

/** Policy identity retained while school-level recorded tuition inputs are pending. */
export const TUITION_FREEZE_QUESTION =
  "us-policy-positions:education.freeze-public-tuition";

/** Researched aggregate context; never selects a school's charge or growth. */
export const TUITION_GROWTH_PER_YEAR =
  tuitionRevenue.tuitionGrowthPerYear.central;

const SHARES = tuitionRevenue.places as Readonly<
  Record<string, { readonly tuitionShareOfCharges: number }>
>;

/** Research coverage, not a tuition-price or state-revenue consequence. */
export function tuitionShareOfCharges(stateKey: string): number | null {
  return SHARES[stateKey]?.tuitionShareOfCharges ?? null;
}
