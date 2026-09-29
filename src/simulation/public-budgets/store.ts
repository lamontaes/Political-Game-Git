import type { LawLevel } from "../law-hierarchy";
import type { EntityId, IsoDate, World } from "../types";

/**
 * PUBLIC BUDGETS: every state, D.C., territory, county and city government in
 * the world keeps its books, month by month (Build 12, design approved by
 * Claude CTO on September 28, 2026 at 8:35 p.m. EDT).
 *
 * Each government holds an adopted budget per fiscal year and a record for
 * each month: revenue collected by source, spending by program, the
 * general-fund balance, the reserve and debt. Balanced-budget, reserve and
 * pension laws act on it (`month.ts`). Amounts are whole dollars.
 *
 * The budget is the government's books, not its cash: the public account
 * (`tax-policy.ts`) still holds only what represented people actually paid,
 * and a payment under an enacted appropriation keeps that account's cash
 * check. The budget records the payment; it does not pay it.
 *
 * A government the research does not cover records no budget and is listed
 * in `unknown` with the reason: unknown, never zero.
 */

export const PUBLIC_BUDGETS_VERSION = "public-budgets-v1" as const;

/** Revenue sources, in the order every month row's `revenue` array uses. */
export const BUDGET_SOURCES = [
  "individualIncomeTax",
  "corporateIncomeTax",
  "generalSalesTax",
  "selectiveSalesTaxes",
  "propertyTax",
  "vehicleAndOtherTaxes",
  "chargesAndFees",
  "miscellaneous",
  "federalAid",
  /** A local government's aid from its state; a state's from its localities. */
  "intergovernmental",
  /** A territory: its total is known, its split by source is not. */
  "sourceUnknown",
] as const;
export type BudgetSource = (typeof BUDGET_SOURCES)[number];

/** Spending programs, in the order every month row's `spending` array uses. */
export const BUDGET_PROGRAMS = [
  "schools",
  "higherEducation",
  "welfareAndMedicaid",
  "healthAndHospitals",
  "highways",
  /**
   * Census counts transit systems as utilities, which this budget leaves out,
   * so transit opens at nothing and records payments made under enacted
   * transit appropriations.
   */
  "transit",
  "police",
  "fire",
  "corrections",
  "parks",
  "housing",
  "naturalResources",
  "administration",
  "otherPrograms",
  /** A state's aid to its local governments. */
  "localAid",
  "pensionContribution",
  "interest",
  /** A territory: its total is known, its split by program is not. */
  "programUnknown",
] as const;
export type BudgetProgram = (typeof BUDGET_PROGRAMS)[number];

/** Programs a mid-year cut never touches. */
export const PROTECTED_PROGRAMS: ReadonlySet<BudgetProgram> = new Set([
  "interest",
  "pensionContribution",
]);

export type BudgetLevel = "state" | "county" | "city";

/** The three budget laws, by their policy question key. */
export const BUDGET_LAW_KEYS = {
  balanced: "us-policy-positions:fiscal.balanced-operating-budget",
  reserve: "us-policy-positions:fiscal.minimum-reserve-balance",
  pensions: "us-policy-positions:fiscal.fund-pensions-to-schedule",
} as const;
export type BudgetLawName = keyof typeof BUDGET_LAW_KEYS;

/**
 * What the law in force said on one budget question. "unknown": no law in
 * force answers it here, so no requirement applies; never read as "no".
 */
export interface BudgetLawReading {
  readonly answer: "yes" | "no" | "unknown";
  /** The enacted measure, or a `starting-law:` key; null when unknown. */
  readonly measureId: EntityId | null;
  readonly level: LawLevel | null;
}

export interface AdoptedBudget {
  /** Named by the calendar year it ends in (fiscal 2027 ends in 2027). */
  readonly fiscalYear: number;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly adoptedOn: IsoDate;
  /**
   * "opening": drawn from research when the world began, part way through
   * the year. "automatic": the government's own modeled adoption; a budget
   * passed as a bill comes later (Claude CTO, call 3).
   */
  readonly basis: "opening" | "automatic";
  /** Annual, aligned to BUDGET_SOURCES. */
  readonly expectedRevenue: readonly number[];
  /** Annual, aligned to BUDGET_PROGRAMS. */
  readonly appropriations: readonly number[];
  /** Planned yearly deposit into the reserve. */
  readonly reserveDeposit: number;
  /** The full actuarial pension contribution this year. */
  readonly pensionRequired: number;
  /**
   * The government's own share of it, paid when no law requires the full
   * amount (`PensionRecord.paidShare` at adoption).
   */
  readonly pensionShare: number;
  /** The nominal economy index the expected revenue was set at, or null. */
  readonly economyAtAdoption: number | null;
  readonly laws: Readonly<Record<BudgetLawName, BudgetLawReading>>;
}

/** One settled month. Arrays align to BUDGET_SOURCES and BUDGET_PROGRAMS. */
export interface BudgetMonthRow {
  /** The first day of the month settled. */
  readonly month: IsoDate;
  readonly revenue: readonly number[];
  readonly spending: readonly number[];
  /** Balance, reserve and debt at the end of the month, after adjustments. */
  readonly balance: number;
  readonly reserve: number;
  readonly debt: number;
  /** How the economy scaled modeled revenue this month (1: as adopted). */
  readonly economy: number;
  /** People whose own withholding was recorded this month. */
  readonly represented: number;
}

export type BudgetAdjustmentKind =
  | "mid-year-cut"
  | "reserve-draw"
  | "deficit-borrowed"
  | "surplus-to-reserve"
  | "reserve-deposit"
  | "pension-underpaid"
  | "balanced-at-adoption";

/** Each change a law, the economy or a year-end forced, and its size. */
export interface BudgetAdjustment {
  readonly governmentKey: string;
  readonly on: IsoDate;
  readonly fiscalYear: number;
  readonly kind: BudgetAdjustmentKind;
  /** Whole dollars moved, cut or borrowed. */
  readonly amount: number;
  /** The law that forced it, or null when no law did. */
  readonly law: {
    readonly name: BudgetLawName;
    readonly reading: BudgetLawReading;
  } | null;
  readonly note: string;
}

export interface PensionRecord {
  readonly liability: number;
  readonly assets: number;
  /**
   * The share of the required contribution this government pays when no law
   * requires the full amount: ESTIMATED FROM AVERAGE, measured spread and
   * drift (`pension-share.ts`).
   */
  readonly paidShare: number;
}

export interface PublicBudgetGovernment {
  /** `US-IL`, `county:17031` or `place:1714000`. */
  readonly key: string;
  readonly jurisdictionId: EntityId;
  /** Where its laws are read (D.C.'s are the District's own). */
  readonly lawJurisdictionId: EntityId;
  readonly level: BudgetLevel;
  readonly name: string;
  readonly stateKey: string;
  readonly population: number;
  /** "07-01". */
  readonly fiscalYearStart: string;
  readonly fiscalYearStartBasis:
    "nasbo" | "city-rule-pack" | "state-start-placeholder";
  readonly budgetCycle: "annual" | "biennial" | null;
  /** How each opening amount was reached, placeholders named. */
  readonly openingNotes: readonly string[];
  readonly balance: number;
  readonly reserve: number;
  readonly debt: number;
  /** Blended interest rate on the debt outstanding. */
  readonly interestRate: number;
  /** Share of the rest of this year's cuttable spending cut mid-year. */
  readonly cut: number;
  readonly pension: PensionRecord;
  readonly years: readonly AdoptedBudget[];
  readonly months: readonly BudgetMonthRow[];
}

export interface PublicBudgetStore {
  readonly version: typeof PUBLIC_BUDGETS_VERSION;
  /** How far the history's resource flows and outcomes have been read. */
  readonly cursor: { readonly flows: number; readonly outcomes: number };
  readonly governments: readonly PublicBudgetGovernment[];
  readonly adjustments: readonly BudgetAdjustment[];
  /** Governments in the world that keep no budget, and why. */
  readonly unknown: readonly {
    readonly key: string;
    readonly jurisdictionId: EntityId;
    readonly reason: string;
  }[];
}

export function publicBudgetGovernments(
  world: World,
): readonly PublicBudgetGovernment[] {
  return world.publicBudgets?.governments ?? [];
}

/** The government keeping a budget for a jurisdiction, or null. */
export function publicBudgetFor(
  world: World,
  jurisdictionId: EntityId,
): PublicBudgetGovernment | null {
  return (
    publicBudgetGovernments(world).find(
      (entry) =>
        entry.jurisdictionId === jurisdictionId ||
        entry.lawJurisdictionId === jurisdictionId,
    ) ?? null
  );
}

/** A month row's amount for one source or program. */
export function sourceAmount(row: BudgetMonthRow, source: BudgetSource) {
  return row.revenue[BUDGET_SOURCES.indexOf(source)] ?? 0;
}

export function programAmount(row: BudgetMonthRow, program: BudgetProgram) {
  return row.spending[BUDGET_PROGRAMS.indexOf(program)] ?? 0;
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
