// STOPGAP RULES4-OW-008: retain the estimated seven-day waiting rule and five-workday cap.
export const PAID_LEAVE_BENEFIT_RULES = {
  provenance: "estimated-from-most-common-rule",
  /** Days of a worker's own serious health condition before benefits. */
  ownConditionWaitingDays: 7,
  researchQuestions: ["paid-leave-waiting-period"],
} as const;

export interface PaidLeaveBenefitRate {
  /** Share of lost pay replaced, in percent. */
  readonly percent: number;
  /** Weekly maximum, in cents, where it was read. */
  readonly maxWeeklyMinor: number | null;
  readonly estimatedFromAverage?: string;
}

export function paidLeaveCoveredDays(
  absence: {
    readonly seriousOwnDaysSinceOnset: readonly number[];
    readonly seriousCaringDays: number;
  },
  unpaidDays: number,
): number {
  const own = absence.seriousOwnDaysSinceOnset.filter(
    (since) => since >= PAID_LEAVE_BENEFIT_RULES.ownConditionWaitingDays,
  ).length;
  return Math.min(unpaidDays, own + absence.seriousCaringDays);
}

export function paidLeaveBenefitMinor(
  rate: PaidLeaveBenefitRate,
  periodPayMinor: number,
  workdays: number,
  coveredDays: number,
): number {
  if (coveredDays <= 0 || workdays <= 0) return 0;
  const lost = (periodPayMinor * coveredDays) / workdays;
  const replaced = Math.round((lost * rate.percent) / 100);
  if (rate.maxWeeklyMinor === null) return replaced;
  // Five workdays to a week.
  const cap = Math.round((rate.maxWeeklyMinor * coveredDays) / 5);
  return Math.min(replaced, cap);
}

export interface PremiumFacts {
  readonly annualWageCapMinor: number | null;
  readonly employeeRatePerMillion: number;
}
export function premiumOn(
  wagesMinor: number,
  paidEarlierThisYearMinor: number,
  premium: PremiumFacts,
): { readonly taxableMinor: number; readonly premiumMinor: number } {
  const taxableMinor =
    premium.annualWageCapMinor === null
      ? wagesMinor
      : Math.min(
          wagesMinor,
          Math.max(0, premium.annualWageCapMinor - paidEarlierThisYearMinor),
        );
  const numerator =
    BigInt(taxableMinor) * BigInt(premium.employeeRatePerMillion);
  return {
    taxableMinor,
    premiumMinor: Number((numerator * 2n + 1_000_000n) / 2_000_000n),
  };
}
export function periodsPerYear(cadenceKind: string): number | null {
  const match = /(semimonthly|biweekly|weekly|monthly)/.exec(cadenceKind);
  if (!match) return null;
  return { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[
    match[1] as "weekly" | "biweekly" | "semimonthly" | "monthly"
  ];
}

import type { Estimate } from "./ranked-leave-estimate";
export interface PaidLeaveRateFacts {
  readonly premiumKind: "none" | "ended" | "premium";
  readonly maxWeeklyDollars: number | null;
  readonly replacement: number | null;
  readonly place:
    | {
        readonly status: string;
        readonly lowWageReplacementPercent: number | null;
      }
    | undefined;
  readonly estimate: () => Estimate;
}
export function paidLeaveBenefitRateFromFacts(
  facts: PaidLeaveRateFacts,
): PaidLeaveBenefitRate | null {
  if (facts.premiumKind !== "premium") return null;
  const maxWeeklyMinor =
    facts.maxWeeklyDollars === null
      ? null
      : Math.round(facts.maxWeeklyDollars * 100);
  if (
    facts.replacement !== null &&
    facts.replacement >= 0 &&
    facts.replacement <= 1
  )
    return { percent: facts.replacement * 100, maxWeeklyMinor };
  const read = facts.place;
  if (read?.status === "read" && read.lowWageReplacementPercent !== null)
    return { percent: read.lowWageReplacementPercent, maxWeeklyMinor };
  const { percent, references, method } = facts.estimate();
  return {
    percent,
    maxWeeklyMinor,
    estimatedFromAverage:
      `ESTIMATED FROM AVERAGE: the average lower-wage replacement rate of the ${references.length} state paid leave programs read, ` +
      `${percent.toFixed(1)}% using ${method}. ` +
      "Source: each program's benefit page (state-paid-leave-benefits-2026.json).",
  };
}
export type PremiumReading =
  | { readonly kind: "none" }
  | { readonly kind: "ended"; readonly lawMeasureIds: readonly string[] }
  | ({
      readonly kind: "premium";
      readonly sourceUrl: string | null;
      readonly lawMeasureIds?: readonly string[];
      readonly estimatedFromAverage?: string;
    } & PremiumFacts);
export interface PremiumPlaceFacts {
  readonly status: string;
  readonly employeePercent: number | null;
  readonly wageCapDollars: number | null;
  readonly contributionsBeginAt: string | null;
  readonly sourceUrl: string | null;
}
export function readPremiumFromFacts(
  place: PremiumPlaceFacts | undefined,
): Extract<PremiumReading, { kind: "premium" }> | null {
  if (place?.status !== "read" || place.employeePercent === null) return null;
  return {
    kind: "premium",
    employeeRatePerMillion: Math.round(place.employeePercent * 10_000),
    annualWageCapMinor:
      place.wageCapDollars === null ? null : place.wageCapDollars * 100,
    sourceUrl: place.sourceUrl,
  };
}
export function collectsFromFacts(
  paidAt: string,
  place: PremiumPlaceFacts | undefined,
  startingAnswer: "yes" | "no" | null,
): boolean {
  if (place?.contributionsBeginAt) return place.contributionsBeginAt <= paidAt;
  return startingAnswer === "yes";
}
export interface PaidLeavePremiumFacts {
  readonly hasStateAndProposition: boolean;
  readonly began: boolean;
  readonly collecting: boolean;
  readonly law: {
    readonly answer: "yes" | "no";
    readonly measureId: string;
    readonly rate: number | null;
    readonly cap: number | null;
  } | null;
  readonly place: PremiumPlaceFacts | undefined;
  readonly estimate: () => Extract<PremiumReading, { kind: "premium" }>;
}
export function paidLeavePremiumFromFacts(
  facts: PaidLeavePremiumFacts,
): PremiumReading {
  if (!facts.hasStateAndProposition) return { kind: "none" };
  const { law, began, collecting } = facts;
  if (law) {
    if (law.answer === "no")
      return collecting
        ? { kind: "ended", lawMeasureIds: [law.measureId] }
        : { kind: "none" };
    if (began && !collecting) return { kind: "none" };
    const fallback =
      (began ? readPremiumFromFacts(facts.place) : null) ?? facts.estimate();
    const ratePerMillion =
      law.rate === null ? null : Math.round(law.rate * 100);
    const capMinor = law.cap === null ? null : Math.round(law.cap * 100);
    const validRate =
      law.rate !== null &&
      ratePerMillion !== null &&
      Number.isSafeInteger(ratePerMillion) &&
      law.rate >= 0 &&
      law.rate <= 10_000 &&
      Math.abs(ratePerMillion / 100 - law.rate) < 1e-9;
    const validCap =
      law.cap !== null &&
      capMinor !== null &&
      Number.isSafeInteger(capMinor) &&
      law.cap >= 0 &&
      Math.abs(capMinor / 100 - law.cap) < 1e-9;
    const { estimatedFromAverage, ...read } = fallback;
    return {
      ...read,
      sourceUrl: validRate ? null : fallback.sourceUrl,
      employeeRatePerMillion: validRate
        ? ratePerMillion
        : fallback.employeeRatePerMillion,
      annualWageCapMinor: validCap ? capMinor : fallback.annualWageCapMinor,
      ...(estimatedFromAverage && (!validRate || !validCap)
        ? {
            estimatedFromAverage: `ESTIMATED FROM AVERAGE: ${!validRate ? "employee premium rate" : "annual covered-wage cap"} retained from the existing ranked program fallback; ${!validRate && validCap ? "the annual cap is the bill’s own value." : validRate ? "the employee rate is the bill’s own value." : "neither term is an adopted numeric value."}`,
          }
        : {}),
      lawMeasureIds: [law.measureId],
    };
  }
  if (!collecting) return { kind: "none" };
  return readPremiumFromFacts(facts.place) ?? facts.estimate();
}

/** Existing sourced common cap and estimate wording, supplied with ranked facts. */
export function estimatedPremiumFromFacts(
  estimate: Estimate,
  commonWageCapDollars = 184_500,
): Extract<PremiumReading, { kind: "premium" }> {
  const { percent, references, method } = estimate;
  return {
    kind: "premium",
    employeeRatePerMillion: Math.round(percent * 10_000),
    annualWageCapMinor: commonWageCapDollars * 100,
    sourceUrl: null,
    estimatedFromAverage:
      `ESTIMATED FROM AVERAGE: the average employee premium of the ${references.length} state paid leave programs read, ` +
      `${percent.toFixed(3)}% of wages using ${method}, ` +
      `on wages up to $${commonWageCapDollars.toLocaleString("en-US")} a year, the cap most of them use. ` +
      "Source: each program's 2026 premium page (state-paid-leave-premiums-2026.json).",
  };
}
