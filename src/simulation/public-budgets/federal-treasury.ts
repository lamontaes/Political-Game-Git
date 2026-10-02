import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import {
  defenseBuildUpShare,
  GROW_DEFENSE_SPENDING_QUESTION,
} from "../federal-defense-spending";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
  federalLawInForceAt,
  federalLawAmountAt,
  recordedFederalAnnualSpendingBefore,
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
 * federal withholding reaches the shared government account/monthly cash
 * settlement separately; top-rate receipts have no second treasury-share row.
 * This legacy forecast reader is not a producer of actual cash receipts.
 */

import {
  FEDERAL_RECEIPTS,
  FEDERAL_OUTLAYS,
  type FederalReceipt,
  type FederalOutlay,
} from "./federal-budget-categories";
export {
  FEDERAL_RECEIPTS,
  FEDERAL_OUTLAYS,
  type FederalReceipt,
  type FederalOutlay,
} from "./federal-budget-categories";

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
  ) => {
    readonly share: number;
    readonly measureId: EntityId;
    readonly monthlyBase?: number;
  } | null;
}

const DEBT_LIMIT_CUT_LINES = FEDERAL_OUTLAYS.filter(
  (key) => key !== "nationalDefense" && key !== "netInterest",
);

export const FEDERAL_LAW_EFFECTS: readonly FederalLawEffect[] = [
  {
    questionKey: INCREASE_FOREIGN_AID_QUESTION,
    line: { kind: "outlay", key: "internationalAffairs" },
    toYes: null,
    toNo: null,
    timing: "month",
    basis:
      "Final adopted annual foreign-aid appropriation against the complete saved preceding International Affairs spending year.",
    shareOn: (world, month) => {
      const aid = federalLawAmountAt(
        world,
        INCREASE_FOREIGN_AID_QUESTION,
        "appropriation",
        month,
      );
      const base = aid.law
        ? recordedFederalAnnualSpendingBefore(
            world,
            FEDERAL_OUTLAYS.indexOf("internationalAffairs"),
            aid.law.operativeAt,
          )
        : null;
      return !aid.law || aid.amount === null || base === null
        ? null
        : {
            share: aid.amount / base - 1,
            measureId: aid.law.measureId,
            monthlyBase: base / 12,
          };
    },
  },
  ...DEBT_LIMIT_CUT_LINES.map((key): FederalLawEffect => ({
    questionKey: DEBT_LIMIT_CUTS_QUESTION,
    line: { kind: "outlay", key },
    toYes: null,
    toNo: null,
    timing: "month",
    basis:
      "Final adopted annual offset allocated proportionally over the complete saved preceding eligible outlay categories, excluding defense and net interest.",
    shareOn: (world, month) => {
      const cut = federalLawAmountAt(
        world,
        DEBT_LIMIT_CUTS_QUESTION,
        "offset",
        month,
      );
      if (!cut.law || cut.amount === null) return null;
      const bases = DEBT_LIMIT_CUT_LINES.map((line) =>
        recordedFederalAnnualSpendingBefore(
          world,
          FEDERAL_OUTLAYS.indexOf(line),
          cut.law!.operativeAt,
          true,
        ),
      );
      if (bases.some((base) => base === null)) return null;
      const total = bases.reduce<number>((sum, base) => sum + base!, 0);
      if (total === 0) return null;
      return {
        share: -Math.min(1, cut.amount / total),
        measureId: cut.law.measureId,
        monthlyBase: bases[DEBT_LIMIT_CUT_LINES.indexOf(key)]! / 12,
      };
    },
  })),
  {
    questionKey: GROW_DEFENSE_SPENDING_QUESTION,
    line: { kind: "outlay", key: "nationalDefense" },
    toYes: null,
    toNo: null,
    timing: "month",
    basis:
      "Final adopted annual defense appropriation against the complete saved preceding defense spending year; no contracts multiplier or historical ramp.",
    shareOn: (world, month) => {
      const { share, lawMeasureId, unsupportedReason } = defenseBuildUpShare(
        world,
        month,
      );
      const law = federalLawInForceAt(
        world,
        GROW_DEFENSE_SPENDING_QUESTION,
        month,
      );
      const annualBase = law
        ? recordedFederalAnnualSpendingBefore(
            world,
            FEDERAL_OUTLAYS.indexOf("nationalDefense"),
            law.operativeAt,
          )
        : null;
      return lawMeasureId === null ||
        unsupportedReason !== null ||
        annualBase === null
        ? null
        : {
            share,
            measureId: lawMeasureId as EntityId,
            monthlyBase: annualBase / 12,
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

/** Existing sourced December 31, 2025 debt metadata, not a cash balance. */
export const FEDERAL_OPENING_DEBT_HELD_BY_PUBLIC = Math.round(OPENING_DEBT);

/** Fiscal 2025 net interest over its average debt held by the public. */
export const FEDERAL_INTEREST_RATE =
  OUTLAYS.netInterest /
  ((federal.debtHeldByPublic["2024-09-30"] +
    federal.debtHeldByPublic["2025-09-30"]) /
    2);

export function openFederalTreasury(today: IsoDate): FederalTreasury {
  return {
    openedOn: today,
    openingDebtHeldByPublic: FEDERAL_OPENING_DEBT_HELD_BY_PUBLIC,
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
): {
  readonly factor: number;
  readonly measureId: EntityId;
  readonly baseAmount?: number;
} | null {
  if (effect.shareOn) {
    const moved = effect.shareOn(world, month);
    return (
      moved && {
        factor: 1 + moved.share,
        measureId: moved.measureId,
        ...(moved.monthlyBase !== undefined
          ? { baseAmount: moved.monthlyBase }
          : {}),
      }
    );
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
  if (treasury.months.some((row) => row.month === month)) return treasury;
  const laws: FederalTreasuryMonth["laws"][number][] = [];
  const debtBefore = federalDebtHeldByPublic(treasury);
  const programCosts = federalProgramCostsForMonth(world, month);
  const line = (kind: FederalLine["kind"], key: string, base: number) => {
    let amount = base;
    let movedByLaw = false;
    for (const effect of FEDERAL_LAW_EFFECTS) {
      if (effect.line.kind !== kind || effect.line.key !== key) continue;
      const moved = lawFactor(world, effect, month);
      if (!moved) continue;
      const actualBase = moved.baseAmount ?? amount;
      // Each law contributes its own change from its recorded base. Later
      // effects must not replace an earlier law's adopted amount on this line.
      const before = movedByLaw ? amount : actualBase;
      const next = Math.max(0, before + actualBase * (moved.factor - 1));
      const changedAmount = Math.round(next - before);
      movedByLaw = true;
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
export function federalProgramLine(programKey: string): FederalOutlay {
  return programKey.split(":")[0] === "passenger-rail"
    ? "transportation"
    : "otherPrograms";
}
