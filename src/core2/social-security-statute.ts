/**
 * Social Security's retirement ages as the statute GOV's law rows hold
 * (data/laws/social-security-ages.json), read directly where no laws engine
 * runs yet: the opening, and worlds without laws. During play the laws engine
 * answers instead (`socialSecurityAges`), so an enacted change applies.
 */
import statute from "./data/laws/social-security-ages.json" with { type: "json" };

const months = (years: number) => Math.round(years * 12);

/** The earliest claim age, in months (42 U.S.C. § 402(a)). */
export const EARLIEST_CLAIM_MONTHS = months(
  statute.series["social-security-earliest-claim-age"].valueYears,
);

/** The age delayed retirement credits stop, in months (42 U.S.C. § 402(w)). */
export const DELAYED_CREDIT_MONTHS = months(
  statute.series["social-security-delayed-credit-age"].valueYears,
);

/** The full retirement age for a birth year, in months (42 U.S.C. § 416(l)). */
export function statuteFullRetirementMonths(birthYear: number): number {
  const full = statute.series["social-security-full-retirement-age"];
  const row = full.schedule.find((r) => birthYear <= r.bornThrough);
  return row ? row.months : months(full.valueYears);
}
