import table from "../../data/research/money/statutory-tax-rules.json" with { type: "json" };
import { validatePlaceTable } from "./data-tables";

/**
 * The taxes that already exist in law, as ChatGPT's 56-place research found
 * them (`docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230/`,
 * `RESEARCH-taxes-nationwide-56-jurisdictions-and-federal-2026-09-22.md`,
 * checked September 22, 2026; record `who-pays-which-taxes-56-places`).
 *
 * This is the pay-period slice only: what a paycheck owes. Each row says
 * whether the research establishes the tax, rules it out, or leaves it
 * UNKNOWN. An UNKNOWN is never zero and never borrowed from another place.
 *
 * Tax year. The federal employment rows are the 2026 rules. For later years
 * the game carries the acquired law forward until a law in the game changes
 * it (the same baseline `TaxTerms.legalBaselineAssumption` names). Annual
 * indexing that real law would apply is not invented; the question is filed
 * in `employment-tax-coverage-exceptions`. Years before 2026 are UNKNOWN.
 */

export const STATUTORY_TAX_RESEARCH_RECORD =
  "who-pays-which-taxes-56-places" as const;
export const FIRST_VERIFIED_TAX_YEAR = 2026;

/** Exact share as basis points of one: 620 is 6.2%. */
export interface FederalEmploymentRule {
  readonly taxKey: string;
  readonly label: string;
  readonly side: "employee" | "employer";
  readonly rateBasisPoints: number;
  /** Calendar-year wages from one employer above which this row stops. */
  readonly annualWageCapMinor: number | null;
  /** Calendar-year wages from one employer above which this row starts. */
  readonly annualWageFloorMinor: number | null;
  readonly sourceUrl: string;
}

const PUBLICATION_15 = "https://www.irs.gov/publications/p15";

/**
 * IRS Publication 15 (2026): Social Security 6.2% each side on covered wages
 * up to $184,500; Medicare 1.45% each side with no cap; the employer withholds
 * Additional Medicare Tax of 0.9% once wages it pays one employee pass
 * $200,000 in a calendar year. That 0.9% is withholding: the employee's final
 * liability depends on filing status and all wages, which the research leaves
 * to the annual return. No employer share of the 0.9% exists in the source.
 */
export const FEDERAL_EMPLOYMENT_RULES: readonly FederalEmploymentRule[] = [
  {
    taxKey: "us-federal:social-security-employee",
    label: "Social Security",
    side: "employee",
    rateBasisPoints: 620,
    annualWageCapMinor: 18_450_000,
    annualWageFloorMinor: null,
    sourceUrl: PUBLICATION_15,
  },
  {
    taxKey: "us-federal:medicare-employee",
    label: "Medicare",
    side: "employee",
    rateBasisPoints: 145,
    annualWageCapMinor: null,
    annualWageFloorMinor: null,
    sourceUrl: PUBLICATION_15,
  },
  {
    taxKey: "us-federal:additional-medicare-withholding",
    label: "Additional Medicare",
    side: "employee",
    rateBasisPoints: 90,
    annualWageCapMinor: null,
    annualWageFloorMinor: 20_000_000,
    sourceUrl: PUBLICATION_15,
  },
  {
    taxKey: "us-federal:social-security-employer",
    label: "Social Security (employer share)",
    side: "employer",
    rateBasisPoints: 620,
    annualWageCapMinor: 18_450_000,
    annualWageFloorMinor: null,
    sourceUrl: PUBLICATION_15,
  },
  {
    taxKey: "us-federal:medicare-employer",
    label: "Medicare (employer share)",
    side: "employer",
    rateBasisPoints: 145,
    annualWageCapMinor: null,
    annualWageFloorMinor: null,
    sourceUrl: PUBLICATION_15,
  },
];

/**
 * Pay-period rows the research establishes but cannot yet price. Each is
 * recorded on every paycheck as UNKNOWN, with the question that would price it.
 */
export interface UnpricedPayrollRule {
  readonly taxKey: string;
  readonly label: string;
  readonly side: "employee" | "employer";
  readonly status: "rule-unknown" | "base-unknown";
  readonly sourceUrl: string | null;
  readonly researchQuestionId: string;
}

export const FEDERAL_UNPRICED_PAYROLL_RULES: readonly UnpricedPayrollRule[] = [
  {
    // 6% of the first $7,000, less a credit of up to 5.4% that depends on the
    // employer's state unemployment position. The credit is not established.
    taxKey: "us-federal:futa",
    label: "Federal unemployment tax",
    side: "employer",
    status: "rule-unknown",
    sourceUrl: "https://www.irs.gov/publications/p15",
    researchQuestionId: "employer-payroll-tax-deposits-and-unemployment",
  },
];

/**
 * Whether a place taxes a resident's wages at all. `not-imposed` needs an
 * affirmative official statement in the research; `imposed` means the tax
 * exists and this game cannot price a paycheck under it yet; `unknown` means
 * the research did not settle even that.
 */
export type WageIncomeTaxStatus = "not-imposed" | "imposed" | "unknown";

export interface PlaceWageIncomeTax {
  readonly status: WageIncomeTaxStatus;
  readonly sourceUrl: string | null;
}

interface StatutoryTaxPlaceRow {
  readonly placeKey: string;
  readonly wageIncomeTax: PlaceWageIncomeTax;
  readonly territory: boolean;
  readonly employerPayrollRules: readonly UnpricedPayrollRule[];
}

const placeRows = validatePlaceTable(
  "statutory tax rules",
  table.places as StatutoryTaxPlaceRow[],
);
const byPlace = new Map(placeRows.map((row) => [row.placeKey, row]));

export function placeWageIncomeTax(stateKey: string): PlaceWageIncomeTax {
  return (
    byPlace.get(stateKey)?.wageIncomeTax ?? {
      status: "unknown",
      sourceUrl: null,
    }
  );
}

export function isTerritory(stateKey: string): boolean {
  return byPlace.get(stateKey)?.territory ?? false;
}

/** The 56 places the research covers, for coverage checks. */
export const RESEARCHED_PLACE_KEYS: readonly string[] = placeRows.map(
  (row) => row.placeKey,
);

export const PLACE_EMPLOYER_PAYROLL_RULES: Readonly<
  Record<string, readonly UnpricedPayrollRule[]>
> = Object.fromEntries(
  placeRows
    .filter((row) => row.employerPayrollRules.length > 0)
    .map((row) => [row.placeKey, row.employerPayrollRules]),
);
