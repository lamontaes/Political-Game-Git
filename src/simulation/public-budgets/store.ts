import type {
  LawEffectStamp,
  LawEffectStampedRecord,
} from "../law-effect-stamp";
import type { LawLevel } from "../law-hierarchy";
import type { EntityId, IsoDate, World } from "../types";
import {
  FEDERAL_RECEIPTS,
  FEDERAL_OUTLAYS,
  type FederalTreasury,
} from "./federal-treasury";
import type { StatehoodCertification } from "./statehood-funds";

/** Historical attribution bytes remain readable; they are never new invoices. */
export interface GovernmentLawCostAttribution {
  readonly program: BudgetProgram;
  readonly amountUsd: number;
  readonly basis: string;
  readonly lawEffectStamps: readonly LawEffectStamp[];
}

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

/** Category sets share the payment taxonomy without reshuffling old save arrays. */
export const GOVERNMENT_BUDGET_CATEGORIES = {
  stateLocal: { receipts: BUDGET_SOURCES, outlays: BUDGET_PROGRAMS },
  federal: { receipts: FEDERAL_RECEIPTS, outlays: FEDERAL_OUTLAYS },
} as const;

/** Federal cash books; state/local pension and reserve rules do not apply. */
export interface FederalBudgetGovernment {
  readonly key: string;
  readonly jurisdictionId: EntityId;
  readonly lawJurisdictionId: EntityId;
  readonly level: "federal";
  readonly categorySet: "federal";
  readonly openedOn: IsoDate;
  /** Null until a recorded USD account supplies this stock. */
  readonly balance: number | null;
  readonly reserve: null;
  readonly pension: null;
  readonly debt: number;
  readonly interestRate: number;
  readonly publicAccountMigration?: {
    readonly onDate: IsoDate;
    readonly organizationId: EntityId;
    readonly positionId: EntityId;
    readonly previousBudgetBalance: number | null;
    readonly previousBudgetReserve: null;
    readonly accountBalanceMinorUnits: number;
  };
  readonly months: readonly FederalBudgetMonthRow[];
}

export interface FederalBudgetMonthRow extends LawEffectStampedRecord {
  readonly month: IsoDate;
  /** Aligned to the existing seven federal receipts and thirteen outlays. */
  readonly revenue: readonly number[];
  readonly spending: readonly number[];
  readonly balance: number;
  readonly reserve: null;
  /** Existing recorded debt; cash shortfalls do not fabricate a loan. */
  readonly debt: number;
  readonly cashSettlement: NonNullable<BudgetMonthRow["cashSettlement"]>;
}

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
  /**
   * Where no law answers and the most common real rule stands in: that
   * rule's basis, marked ESTIMATED FROM AVERAGE. Absent where a law answers.
   */
  readonly estimated?: string;
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
  /** Planned yearly deposit into the reserve; negative, a planned draw. */
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
  /**
   * The balance above the reserve target, carried into this year and spent
   * across it (Claude CTO, 11:54 p.m. ruling of September 28, 2026). It is
   * one-time: the next budget does not build it into its base. Absent: none.
   */
  readonly carriedBalance?: number;
  /**
   * A county's or city's: its state's yearly spending on aid to local
   * governments when this budget was adopted. Aid from the state follows the
   * state's actual spending against it. Absent or null: a state, or a state
   * that keeps no budget, and aid stays as adopted.
   */
  readonly stateLocalAidAtAdoption?: number | null;
  /**
   * A city's: the index of its town businesses' taxable sales, in the
   * dollars of the day, that its general sales tax was set at
   * (`living-world/town-finances.ts`, `townTaxableSales`). Absent or null:
   * the town keeps no books, and the economy moves the tax.
   */
  readonly townSalesAtAdoption?: number | null;
  /**
   * A place admitted as a state: what its government decided about
   * certifying to the President when it adopted this budget, and why
   * (`statehood-funds.ts`). Absent: nothing to decide.
   */
  readonly statehoodCertification?: StatehoodCertification;
}

/** One settled month. Arrays align to BUDGET_SOURCES and BUDGET_PROGRAMS. */
export interface BudgetMonthRow extends LawEffectStampedRecord {
  /** Law-attributed components already included in modeled spending; old saves omit it. */
  readonly lawCostAttributions?: readonly GovernmentLawCostAttribution[];
  /** Cash settlement reads only these saved transfers, retaining exact cents. */
  readonly cashSettlement?: {
    readonly organizationId: EntityId;
    readonly positionId: EntityId;
    readonly sourceRecordIds: readonly EntityId[];
    /** Physical account stock, including refundable custody funds. Old saves omit it. */
    readonly accountBalanceMinorUnits?: number;
    /** Custody liability excluded before budget balance/reserve allocation. */
    readonly heldCashBailMinorUnits?: number;
  };
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
  /**
   * A city whose town keeps business books: how its taxable sales scaled
   * its general sales tax this month (1: as adopted). Absent: the economy
   * scaled it.
   */
  readonly townSales?: number;
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
  | "balanced-at-adoption"
  | "balance-carried"
  | "law-gain-saved"
  | "law-gain-spent"
  | "law-loss-cut"
  | "law-loss-drawn"
  | "law-loss-kept";

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
  /**
   * The official who decided it and the principle records the decision read;
   * absent where a rule, not a person, decided.
   */
  readonly decidedBy?: {
    readonly personId: EntityId;
    readonly principleRecordIds: readonly EntityId[];
  };
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
  /** One recorded correction from the old cash forecast to a saved account. */
  readonly publicAccountMigration?: {
    readonly onDate: IsoDate;
    readonly organizationId: EntityId;
    readonly positionId: EntityId;
    readonly previousBudgetBalance: number;
    readonly previousBudgetReserve: number;
    readonly accountBalanceMinorUnits: number;
  };
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

export interface StaffingBaseline {
  readonly town: EntityId;
  /** The staffed program, such as "police" or "schools". */
  readonly program: BudgetProgram;
  /** The budget that funds it. */
  readonly governmentKey: string;
  /**
   * The town workplace and role the budget staffs. From this day on the
   * budget alone fills that role; the town's job market no longer draws it.
   */
  readonly workplace: string;
  readonly role: string;
  /** The staff holding the funded role on the first day. */
  readonly headcount: number;
  /** That program's funding then, after cuts, in the economy of its year. */
  readonly realFunding: number;
  /** The budget year it was read from, and the economy index it used. */
  readonly yearStartsOn: IsoDate;
  readonly economyIndex: number;
  readonly since: IsoDate;
}

export interface PublicBudgetStore {
  readonly version: typeof PUBLIC_BUDGETS_VERSION;
  /** How far the history's resource flows and outcomes have been read. */
  readonly cursor: { readonly flows: number; readonly outcomes: number };
  readonly governments: readonly PublicBudgetGovernment[];
  readonly adjustments: readonly BudgetAdjustment[];
  /**
   * The public jobs a budget funds in the watched town: the staff and the
   * real funding when the town was first staffed from its budget
   * (`staffing.ts`). Absent in a world whose town was never staffed.
   */
  readonly staffing?: readonly StaffingBaseline[];
  /**
   * Archived federal forecast bytes from older saves. New worlds never open
   * these books, and monthly passes preserve them without advancing them.
   */
  readonly federal?: FederalTreasury;
  /** The sole live federal budget, settled from the saved government account. */
  readonly federalGovernment?: FederalBudgetGovernment;
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

/**
 * A state's yearly spending on aid to local governments at its current
 * adopted budget, less any mid-year cut.
 */
export function stateLocalAidRate(state: PublicBudgetGovernment): number {
  const year = state.years.at(-1);
  if (!year) return 0;
  const planned = year.appropriations[BUDGET_PROGRAMS.indexOf("localAid")] ?? 0;
  return Math.round(planned * (1 - state.cut));
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
