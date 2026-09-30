import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import defenseData from "../../../data/research/federal/defense-contracts-by-state-fy2024.json" with { type: "json" };
import farmData from "../../../data/research/federal/farm-payments-and-land-values-2025.json" with { type: "json" };
import outlayTerms from "../../../data/research/federal/federal-outlay-terms-fy2025.json" with { type: "json" };
import {
  defenseBuildUpShare,
  GROW_DEFENSE_SPENDING_QUESTION,
} from "../federal-defense-spending";
import {
  CUT_FARM_SUBSIDIES_QUESTION,
  FARM_PAYMENT_CUT_SHARE,
} from "../federal-farm-subsidy-law";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../federal-outlay-laws";
import { lawInForce } from "../governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type { EntityId, IsoDate, World } from "../types";
import { lawEffectStamp, type LawEffectStamp } from "../law-effect-stamp";
import {
  federalProgramCostsForMonth,
  type FederalProgramCost,
} from "../federal-cost-ledger";

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
  /**
   * A law whose reach grows with time since it took effect: the line's share
   * it moves on this month, and the law, in place of toYes and toNo.
   */
  readonly shareOn?: (
    world: World,
    month: IsoDate,
  ) => { readonly share: number; readonly measureId: EntityId } | null;
}

const DEBT_LIMIT_CUT_LINES = FEDERAL_OUTLAYS.filter(
  (key) => key !== "nationalDefense" && key !== "netInterest",
);
const DEBT_LIMIT_CUT_SHARE_OF_LINES =
  outlayTerms.debtLimitCut.yearlyDollars /
  DEBT_LIMIT_CUT_LINES.reduce(
    (sum, key) =>
      sum + (federal.outlays as Readonly<Record<string, number>>)[key]!,
    0,
  );

/** Farm program payments a cut removes, as a share of all farm outlays. */
const FARM_CUT_SHARE_OF_AGRICULTURE =
  (FARM_PAYMENT_CUT_SHARE * farmData.national.meanPaymentsYearly) /
  federal.outlays.agriculture;

/** Defense contracts, fiscal 2024, as a share of fiscal 2025 defense outlays. */
const CONTRACTS_SHARE_OF_DEFENSE =
  (defenseData.buildUp.contractsByFiscalYearBillions["2024"] * 1e9) /
  federal.outlays.nationalDefense;

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
  {
    questionKey: INCREASE_FOREIGN_AID_QUESTION,
    line: { kind: "outlay", key: "internationalAffairs" },
    toYes: outlayTerms.foreignAid.medianRise,
    toNo: null,
    timing: "month",
    basis: `More foreign aid raises International Affairs outlays by ${(outlayTerms.foreignAid.medianRise * 100).toFixed(2)}%, the median yearly rise in the years they rose, fiscal 2016 to 2025 (Monthly Treasury Statement, Table 9; Build 11's federal-outlay-laws.ts).`,
  },
  // Cuts that pay for a higher debt limit: the Fiscal Responsibility Act's
  // $150 billion a year, taken evenly from every line but defense and net
  // interest, as that deal capped nondefense spending.
  ...DEBT_LIMIT_CUT_LINES.map((key): FederalLawEffect => ({
    questionKey: DEBT_LIMIT_CUTS_QUESTION,
    line: { kind: "outlay", key },
    toYes: -DEBT_LIMIT_CUT_SHARE_OF_LINES,
    toNo: null,
    timing: "month",
    basis: `Paying for a higher debt limit cuts $${outlayTerms.debtLimitCut.yearlyDollars / 1e9} billion a year, the Fiscal Responsibility Act of 2023's $1.5 trillion over ten years (Congressional Budget Office), taken evenly from every outlay but national defense and net interest: ${(DEBT_LIMIT_CUT_SHARE_OF_LINES * 100).toFixed(2)}% of each.`,
  })),
  {
    questionKey: CUT_FARM_SUBSIDIES_QUESTION,
    line: { kind: "outlay", key: "agriculture" },
    toYes: -FARM_CUT_SHARE_OF_AGRICULTURE,
    toNo: null,
    timing: "month",
    basis: `Cutting farm subsidies removes ${(FARM_PAYMENT_CUT_SHARE * 100).toFixed(2)}% of the $${(farmData.national.meanPaymentsYearly / 1e9).toFixed(1)} billion a year of government payments to farms (2021 to 2025 average, USDA ERS), the median fall in the years payments fell since 1996: ${(FARM_CUT_SHARE_OF_AGRICULTURE * 100).toFixed(2)}% of Agriculture outlays (Build 11's federal-farm-subsidy-law.ts).`,
  },
  {
    questionKey: GROW_DEFENSE_SPENDING_QUESTION,
    line: { kind: "outlay", key: "nationalDefense" },
    toYes: null,
    toNo: null,
    timing: "month",
    basis: `Growing defense faster than inflation raises defense contracts, $${defenseData.buildUp.contractsByFiscalYearBillions["2024"]} billion in fiscal 2024 (USAspending.gov), ${(defenseData.buildUp.meanYearlyRealRise * 100).toFixed(2)}% a year for at most ${defenseData.buildUp.longestRunYears} years, the pace of the years they beat inflation (Build 11's federal-defense-spending.ts). Contracts are ${(CONTRACTS_SHARE_OF_DEFENSE * 100).toFixed(1)}% of defense outlays, so the line grows by that share of the contracts' rise.`,
    shareOn: (world, month) => {
      const { share, lawMeasureId } = defenseBuildUpShare(world, month);
      return lawMeasureId === null
        ? null
        : {
            share: CONTRACTS_SHARE_OF_DEFENSE * share,
            measureId: lawMeasureId as EntityId,
          };
    },
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
  /** Actual paid new-program costs, with exact transfer and authority IDs. */
  readonly programCosts?: readonly FederalProgramCost[];
  /** The laws that moved a line this month, and by how much. */
  readonly laws: readonly {
    readonly questionKey: string;
    readonly measureId: EntityId;
    readonly line: FederalReceipt | FederalOutlay;
    readonly amount: number;
    readonly lawEffectStamps?: readonly LawEffectStamp[];
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
  if (effect.shareOn) {
    const moved = effect.shareOn(world, month);
    return moved && { factor: 1 + moved.share, measureId: moved.measureId };
  }
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
  const programCosts = federalProgramCostsForMonth(world, month);
  const line = (kind: FederalLine["kind"], key: string, base: number) => {
    let amount = base;
    for (const effect of FEDERAL_LAW_EFFECTS) {
      if (effect.line.kind !== kind || effect.line.key !== key) continue;
      const moved = lawFactor(world, effect, month);
      if (!moved) continue;
      const next = amount * moved.factor;
      const changedAmount = Math.round(next - amount);
      const proposition =
        kind === "outlay" && changedAmount !== 0
          ? Object.values(world.policyCatalog?.propositions ?? {}).find(
              (p) => p.stableKey === effect.questionKey,
            )
          : undefined;
      const governingLaw = proposition
        ? lawInForce(
            world,
            NATIONAL_ELECTION_JURISDICTION.id,
            proposition.id,
            month,
            "enacted-only",
          )
        : null;
      const stamp =
        governingLaw?.measureId === moved.measureId
          ? lawEffectStamp(governingLaw, {
              effectKind: "government-outlay-change",
              questionKey: effect.questionKey,
              jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
              appliedAt: month,
              sourceRecordIds: [moved.measureId],
            })
          : null;
      laws.push({
        questionKey: effect.questionKey,
        measureId: moved.measureId,
        line: effect.line.key,
        amount: changedAmount,
        ...(stamp ? { lawEffectStamps: [stamp] } : {}),
      });
      amount = next;
    }
    return Math.round(amount);
  };
  const receipts = FEDERAL_RECEIPTS.map((key) =>
    line("receipt", key, RECEIPTS[key] / 12),
  );
  const outlays = FEDERAL_OUTLAYS.map((key) => {
    const paidMinorUnits = programCosts
      .filter((cost) => federalProgramLine(cost.programKey) === key)
      .reduce((sum, cost) => sum + cost.amountMinorUnits, 0);
    return Math.round(
      line(
        "outlay",
        key,
        key === "netInterest"
          ? (debtBefore * treasury.interestRate) / 12
          : OUTLAYS[key] / 12,
      ) +
        paidMinorUnits / 100,
    );
  });
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
        programCosts,
        laws,
      },
    ],
  };
}

/** Existing intercity rail payments use transportation; unclassified ones remain explicit. */
function federalProgramLine(programKey: string): FederalOutlay {
  return programKey.split(":")[0] === "passenger-rail"
    ? "transportation"
    : "otherPrograms";
}
