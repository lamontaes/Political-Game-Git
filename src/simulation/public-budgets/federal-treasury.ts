import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import { lawInForce } from "../governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type { EntityId, IsoDate, World } from "../types";

/**
 * THE FEDERAL TREASURY: the United States government's own books, month by
 * month, beside the state and local budgets (Claude CTO, 9:45 a.m. ruling of
 * September 29, 2026: "federal tax laws, spending laws and the debt limit
 * must reach it").
 *
 * It opens from the government's real books: each month collects a twelfth
 * of fiscal year 2025's receipts by source and pays a twelfth of its outlays
 * by function (Monthly Treasury Statement, Table 9), and it starts from the
 * debt held by the public on December 31, 2025 (Debt to the Penny). The gap
 * between them is borrowed. Net interest is what the debt costs at the
 * average rate the Treasury paid in fiscal 2025: $970.4 billion over an
 * average debt held by the public of $29.29 trillion, 3.31% a year. So a
 * deficit raises the next month's interest, and a law that saves money
 * lowers it.
 *
 * A federal law moves a line through `FEDERAL_LAW_EFFECTS`, read from the
 * law in force on the first of each month. The represented people's own
 * federal withholding is left out: they are a few hundred of 340 million
 * taxpayers, so the national line already carries them.
 */

export const FEDERAL_RECEIPTS = [
  "individualIncomeTax",
  "payrollTaxes",
  "corporateIncomeTax",
  "customsDuties",
  "exciseTaxes",
  "estateAndGiftTaxes",
  "miscellaneousReceipts",
] as const;
export type FederalReceipt = (typeof FEDERAL_RECEIPTS)[number];

export const FEDERAL_OUTLAYS = [
  "socialSecurity",
  "medicare",
  /** Medicaid and other health programs. */
  "health",
  "incomeSecurity",
  "nationalDefense",
  "veterans",
  "netInterest",
  /** Foreign aid and the State Department. */
  "internationalAffairs",
  /** Farm programs. */
  "agriculture",
  /** Includes FEMA disaster relief. */
  "communityAndRegionalDevelopment",
  "transportation",
  "education",
  "otherPrograms",
] as const;
export type FederalOutlay = (typeof FEDERAL_OUTLAYS)[number];

type FederalLine =
  | { readonly kind: "receipt"; readonly key: FederalReceipt }
  | { readonly kind: "outlay"; readonly key: FederalOutlay };

/**
 * How a federal law moves one line of the treasury: the line's share it
 * adds or removes when the law in force answers yes, and when a later law
 * answers no. Null: that direction changes nothing.
 */
export interface FederalLawEffect {
  readonly questionKey: string;
  readonly line: FederalLine;
  readonly toYes: number | null;
  readonly toNo: number | null;
  /** "tax-year": read on January 1, as a rate change applies. */
  readonly timing: "tax-year" | "month";
  readonly basis: string;
}

export const FEDERAL_LAW_EFFECTS: readonly FederalLawEffect[] = [
  {
    questionKey: "us-federal-positions:tax.raise-top-income-tax-rate",
    line: { kind: "receipt", key: "individualIncomeTax" },
    // 2.6 points on the $1.216 trillion taxed at 37% in tax year 2022,
    // against the $2.099 trillion of income tax after credits that year.
    toYes: (0.026 * 1_216_136_265) / 2_098_923_017,
    toNo: null,
    timing: "tax-year",
    basis:
      "A top rate of 39.6% instead of 37% collects 2.6 cents more on each dollar taxed in the top bracket: $31.6 billion on the $1.216 trillion taxed at 37% in tax year 2022, 1.51% of that year's individual income tax after credits (IRS Statistics of Income, Publication 1304, Table 3.4). The estimate is static: it leaves out any change in what top earners report.",
  },
];

export interface FederalTreasuryMonth {
  /** The first of the month settled. */
  readonly month: IsoDate;
  /** Whole dollars, aligned to FEDERAL_RECEIPTS. */
  readonly receipts: readonly number[];
  /** Whole dollars, aligned to FEDERAL_OUTLAYS. */
  readonly outlays: readonly number[];
  /** Outlays less receipts; negative, a surplus. */
  readonly deficit: number;
  /** Debt held by the public at the end of the month. */
  readonly debtHeldByPublic: number;
  /** The laws that moved a line this month, and by how much. */
  readonly laws: readonly {
    readonly questionKey: string;
    readonly measureId: EntityId;
    readonly line: FederalReceipt | FederalOutlay;
    readonly amount: number;
  }[];
}

export interface FederalTreasury {
  readonly openedOn: IsoDate;
  /** Debt held by the public on the day it opened. */
  readonly openingDebtHeldByPublic: number;
  /** Debt the government owes its own trust funds; held as it opened. */
  readonly intragovernmentalDebt: number;
  /** The statutory limit on total public debt. */
  readonly debtLimit: number;
  /** The yearly rate the debt held by the public costs. */
  readonly interestRate: number;
  readonly months: readonly FederalTreasuryMonth[];
}

const RECEIPTS = federal.receipts as Readonly<Record<FederalReceipt, number>>;
const OUTLAYS = federal.outlays as Readonly<Record<FederalOutlay, number>>;
const OPENING_DEBT = federal.debtHeldByPublic["2025-12-31"];
const OPENING_TOTAL_DEBT = federal.totalPublicDebt["2025-12-31"];

/** Fiscal 2025 net interest over its average debt held by the public. */
export const FEDERAL_INTEREST_RATE =
  OUTLAYS.netInterest /
  ((federal.debtHeldByPublic["2024-09-30"] +
    federal.debtHeldByPublic["2025-09-30"]) /
    2);

export function openFederalTreasury(today: IsoDate): FederalTreasury {
  return {
    openedOn: today,
    openingDebtHeldByPublic: Math.round(OPENING_DEBT),
    intragovernmentalDebt: Math.round(OPENING_TOTAL_DEBT - OPENING_DEBT),
    debtLimit: federal.debtLimit,
    interestRate: FEDERAL_INTEREST_RATE,
    months: [],
  };
}

/** Debt held by the public now: the last settled month's, or the opening. */
export function federalDebtHeldByPublic(treasury: FederalTreasury): number {
  return (
    treasury.months.at(-1)?.debtHeldByPublic ?? treasury.openingDebtHeldByPublic
  );
}

/** Total public debt, which the debt limit caps. */
export function federalTotalDebt(treasury: FederalTreasury): number {
  return federalDebtHeldByPublic(treasury) + treasury.intragovernmentalDebt;
}

function lawFactor(
  world: World,
  effect: FederalLawEffect,
  month: IsoDate,
): { readonly factor: number; readonly measureId: EntityId } | null {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === effect.questionKey);
  if (!proposition) return null;
  const onDate =
    effect.timing === "tax-year"
      ? (`${month.slice(0, 4)}-01-01` as IsoDate)
      : month;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    onDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted") return null;
  const share = law.answer === "yes" ? effect.toYes : effect.toNo;
  return share === null
    ? null
    : { factor: 1 + share, measureId: law.measureId };
}

/** Settles one month of the federal books. */
export function settleFederalTreasuryMonth(
  world: World,
  treasury: FederalTreasury,
  month: IsoDate,
): FederalTreasury {
  const laws: FederalTreasuryMonth["laws"][number][] = [];
  const debtBefore = federalDebtHeldByPublic(treasury);
  const line = (kind: FederalLine["kind"], key: string, base: number) => {
    let amount = base;
    for (const effect of FEDERAL_LAW_EFFECTS) {
      if (effect.line.kind !== kind || effect.line.key !== key) continue;
      const moved = lawFactor(world, effect, month);
      if (!moved) continue;
      const next = amount * moved.factor;
      laws.push({
        questionKey: effect.questionKey,
        measureId: moved.measureId,
        line: effect.line.key,
        amount: Math.round(next - amount),
      });
      amount = next;
    }
    return Math.round(amount);
  };
  const receipts = FEDERAL_RECEIPTS.map((key) =>
    line("receipt", key, RECEIPTS[key] / 12),
  );
  const outlays = FEDERAL_OUTLAYS.map((key) =>
    line(
      "outlay",
      key,
      key === "netInterest"
        ? (debtBefore * treasury.interestRate) / 12
        : OUTLAYS[key] / 12,
    ),
  );
  const deficit =
    outlays.reduce((sum, amount) => sum + amount, 0) -
    receipts.reduce((sum, amount) => sum + amount, 0);
  return {
    ...treasury,
    months: [
      ...treasury.months,
      {
        month,
        receipts,
        outlays,
        deficit,
        debtHeldByPublic: debtBefore + deficit,
        laws,
      },
    ],
  };
}
