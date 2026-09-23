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
 * as `social-security-wage-base-after-2026`. Years before 2026 are UNKNOWN.
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
    // Income tax is owed on the annual return; what an employer withholds
    // from each check comes from the withholding method, which the research
    // does not carry.
    taxKey: "us-federal:income-tax-withholding",
    label: "Federal income tax withholding",
    side: "employee",
    status: "rule-unknown",
    sourceUrl: "https://www.irs.gov/publications/p15",
    researchQuestionId: "federal-income-tax-withholding-method-2026",
  },
  {
    // 6% of the first $7,000, less a credit of up to 5.4% that depends on the
    // employer's state unemployment position. The credit is not established.
    taxKey: "us-federal:futa",
    label: "Federal unemployment tax",
    side: "employer",
    status: "rule-unknown",
    sourceUrl: "https://www.irs.gov/publications/p15",
    researchQuestionId: "futa-credit-and-state-unemployment-contributions",
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

const NOT_IMPOSED: Readonly<Record<string, string>> = {
  "US-AK":
    "https://treasury.dor.alaska.gov/docs/treasurydivisionlibraries/debt-management/meetings-minutes/packets/2025_07_18_sbc_packet.pdf?sfvrsn=362aab36_1",
  "US-FL": "https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1466",
  "US-NV":
    "https://tax.nv.gov/about-nevada-department-of-taxation/income-tax-in-nevada/",
  "US-NH":
    "https://www.revenue.nh.gov/news-and-media/repeal-nh-interest-and-dividends-tax-now-effect",
  "US-SD": "https://dor.sd.gov/individuals/taxes/",
  "US-TN":
    "https://revenue.support.tn.gov/hc/en-us/articles/360057595051-GEN-34-Income-Tax-Withholding",
  "US-TX": "https://tcss.legis.texas.gov/resources/CN/htm/CN.8.htm",
  // Washington's capital gains excise is not a tax on wages.
  "US-WA": "https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax",
  "US-WY":
    "https://sao.wyo.gov/wp-content/uploads/2026/01/2025-ACFR-12.22.25.pdf",
};

const UNKNOWN_WAGE_TAX = new Set(["US-MT"]);

const TERRITORIES = new Set(["US-PR", "US-GU", "US-VI", "US-AS", "US-MP"]);

/** Every other state, D.C. and the five territories: "Individual income: YES". */
const IMPOSED = new Set([
  "US-AL",
  "US-AZ",
  "US-AR",
  "US-CA",
  "US-CO",
  "US-CT",
  "US-DE",
  "US-GA",
  "US-HI",
  "US-ID",
  "US-IL",
  "US-IN",
  "US-IA",
  "US-KS",
  "US-KY",
  "US-LA",
  "US-ME",
  "US-MD",
  "US-MA",
  "US-MI",
  "US-MN",
  "US-MS",
  "US-MO",
  "US-NE",
  "US-NJ",
  "US-NM",
  "US-NY",
  "US-NC",
  "US-ND",
  "US-OH",
  "US-OK",
  "US-OR",
  "US-PA",
  "US-RI",
  "US-SC",
  "US-UT",
  "US-VT",
  "US-VA",
  "US-WV",
  "US-WI",
  "US-DC",
  ...TERRITORIES,
]);

export function placeWageIncomeTax(stateKey: string): PlaceWageIncomeTax {
  const source = NOT_IMPOSED[stateKey];
  if (source) return { status: "not-imposed", sourceUrl: source };
  if (IMPOSED.has(stateKey)) return { status: "imposed", sourceUrl: null };
  return { status: "unknown", sourceUrl: null };
}

export function isTerritory(stateKey: string): boolean {
  return TERRITORIES.has(stateKey);
}

/** The 56 places the research covers, for coverage checks. */
export const RESEARCHED_PLACE_KEYS: readonly string[] = [
  ...Object.keys(NOT_IMPOSED),
  ...UNKNOWN_WAGE_TAX,
  ...IMPOSED,
].sort();

/**
 * Nevada's Modified Business Tax: an employer tax of 1.17% on quarterly gross
 * wages less health benefits, the first $50,000 a quarter exempt. The
 * exemption runs over everything the employer pays everyone that quarter, and
 * a fictional employer's other payroll is not in the world, so the base of any
 * one paycheck is UNKNOWN rather than priced as if the player were the only
 * employee.
 */
export const PLACE_EMPLOYER_PAYROLL_RULES: Readonly<
  Record<string, readonly UnpricedPayrollRule[]>
> = {
  "US-NV": [
    {
      taxKey: "us-nv:modified-business-tax",
      label: "Nevada Modified Business Tax",
      side: "employer",
      status: "base-unknown",
      sourceUrl: "https://tax.nv.gov/tax-types/modified-business-tax/",
      researchQuestionId: "employer-total-quarterly-payroll",
    },
  ],
};
