/**
 * Social Security's retirement ages as the law gives them: the earliest
 * claim, the full retirement age for a birth year, and the age delayed
 * credits stop. The law is a row set in the laws engine
 * (`data/laws/social-security-ages.json`); play reads the row in force on
 * the date (`socialSecurityAges` in `modules/laws.ts`), and the opening's
 * history, built before any law is open, reads the same file as enacted on
 * day one.
 */
import law from "./data/laws/social-security-ages.json" with { type: "json" };

export interface SocialSecurityAges {
  readonly earliestMonths: number;
  readonly fullMonths: number;
  readonly delayedMaxMonths: number;
}

interface ScheduleRow {
  readonly bornThrough: number;
  readonly months: number;
}

/**
 * The ages for a birth date from the three law values and the full
 * retirement age's schedule. A person born on January 1 is treated as born
 * the year before (20 C.F.R. § 404.102).
 */
export function socialSecurityAgesFrom(
  birthDate: string,
  values: {
    readonly earliestYears: number;
    readonly fullYears: number;
    readonly delayedYears: number;
    readonly schedule?: readonly ScheduleRow[];
  },
): SocialSecurityAges {
  const year =
    Number(birthDate.slice(0, 4)) - (birthDate.slice(5) === "01-01" ? 1 : 0);
  const scheduled = (values.schedule ?? []).find((r) => year <= r.bornThrough);
  return {
    earliestMonths: Math.round(values.earliestYears * 12),
    fullMonths: scheduled?.months ?? Math.round(values.fullYears * 12),
    delayedMaxMonths: Math.round(values.delayedYears * 12),
  };
}

const SERIES = law.series as unknown as Record<
  string,
  { valueYears: number; schedule?: ScheduleRow[] }
>;

/** The ages under the law as enacted on day one (1983), for the opening's history. */
export function startingSocialSecurityAges(
  birthDate: string,
): SocialSecurityAges {
  const full = SERIES["social-security-full-retirement-age"]!;
  return socialSecurityAgesFrom(birthDate, {
    earliestYears: SERIES["social-security-earliest-claim-age"]!.valueYears,
    fullYears: full.valueYears,
    delayedYears: SERIES["social-security-delayed-credit-age"]!.valueYears,
    ...(full.schedule ? { schedule: full.schedule } : {}),
  });
}
