/** Frozen federal law/outlay arithmetic. Dated law and final-term reads are supplied receipts; monthly summation, eligibility, shares and cut caps are owned here. */
import type { EntityId, IsoDate } from "../../simulation/types";
import type { LawInForce } from "../../simulation/governing/law-in-force";
export interface OutlayFacts {
  readonly onDate: IsoDate;
  readonly months: readonly {
    readonly month: IsoDate;
    readonly spending: readonly number[];
  }[];
  readonly lines: readonly string[];
  readonly nationalGdp: number;
  readonly laws: ReadonlyMap<string, LawInForce | null>;
  readonly terms: ReadonlyMap<string, { readonly value: number } | null>;
}
export const DEBT_LIMIT_CUTS_QUESTION =
  "us-federal-positions:budget.pay-for-a-higher-debt-limit";

export const INCREASE_FOREIGN_AID_QUESTION =
  "us-federal-positions:foreign-affairs.increase-foreign-aid";

export function federalLawAmountAt(
  facts: OutlayFacts,
  questionKey: string,
  termKey: string,
  onDate: IsoDate,
) {
  const law = facts.laws.get(`${questionKey}:${onDate}`) ?? null;
  if (!law || law.answer !== "yes")
    return { law: null, amount: 0, unsupportedReason: null };
  const term =
    facts.terms.get(`${law.measureId}:${questionKey}:${termKey}:${onDate}`) ??
    null;
  const valid = term && Number.isFinite(term.value) && term.value >= 0;
  return {
    law,
    amount: valid ? term.value : null,
    unsupportedReason: valid ? null : "final-annual-amount-unrecorded",
  };
}

export function recordedFederalAnnualSpendingBefore(
  facts: OutlayFacts,
  lineIndex: number | null,
  before: IsoDate,
  allowZero = false,
): number | null {
  const rows = (facts.months ?? [])
    .filter((row) => row.month < before && row.month <= facts.onDate)
    .slice(-12);
  if (rows.length !== 12) return null;
  const ordinal = (date: IsoDate) =>
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
  if (
    rows.some(
      (row, index) =>
        index > 0 && ordinal(row.month) !== ordinal(rows[index - 1]!.month) + 1,
    )
  )
    return null;
  const amounts = rows.map((row) =>
    lineIndex === null
      ? row.spending.reduce((sum, value) => sum + value, 0)
      : row.spending[lineIndex],
  );
  if (
    amounts.some(
      (value) => value === undefined || !Number.isFinite(value) || value < 0,
    )
  )
    return null;
  const total = amounts.reduce<number>((sum, value) => sum + value!, 0);
  return total > 0 || allowZero ? total : null;
}

export function federalOutlayChangeAt(
  facts: OutlayFacts,
  onDate: IsoDate,
): {
  readonly cutDollars: number | null;
  readonly aidDollars: number | null;
  readonly lawMeasureIds: readonly string[];
} {
  const cut = federalLawAmountAt(
    facts,
    DEBT_LIMIT_CUTS_QUESTION,
    "offset",
    onDate,
  );
  const aid = federalLawAmountAt(
    facts,
    INCREASE_FOREIGN_AID_QUESTION,
    "appropriation",
    onDate,
  );
  const base = aid.law
    ? recordedFederalAnnualSpendingBefore(
        facts,
        facts.lines.indexOf("internationalAffairs"),
        aid.law.operativeAt,
      )
    : null;
  return {
    cutDollars: cut.amount,
    aidDollars: !aid.law
      ? 0
      : aid.amount === null || base === null
        ? null
        : aid.amount - base,
    lawMeasureIds: [cut.law, aid.law].flatMap((law) =>
      law ? [law.measureId] : [],
    ),
  };
}

export interface FederalOutlayLawLineChange {
  readonly questionKey: string;
  readonly measureId: EntityId;
  readonly lineIndex: number;
  readonly amount: number;
  readonly monthlyBase: number;
}

export function federalOutlayLawLineChangesAt(
  facts: OutlayFacts,
  onDate: IsoDate,
): readonly FederalOutlayLawLineChange[] {
  const changes: FederalOutlayLawLineChange[] = [];
  const aid = federalLawAmountAt(
    facts,
    INCREASE_FOREIGN_AID_QUESTION,
    "appropriation",
    onDate,
  );
  const aidLineIndex = facts.lines.indexOf("internationalAffairs");
  const aidBase = aid.law
    ? recordedFederalAnnualSpendingBefore(
        facts,
        aidLineIndex,
        aid.law.operativeAt,
      )
    : null;
  if (aid.law && aid.amount !== null && aidBase !== null) {
    changes.push({
      questionKey: INCREASE_FOREIGN_AID_QUESTION,
      measureId: aid.law.measureId,
      lineIndex: aidLineIndex,
      amount: (aid.amount - aidBase) / 12,
      monthlyBase: aidBase / 12,
    });
  }
  const cut = federalLawAmountAt(
    facts,
    DEBT_LIMIT_CUTS_QUESTION,
    "offset",
    onDate,
  );
  if (!cut.law || cut.amount === null) return changes;
  const eligible = facts.lines
    .map((_, lineIndex) => lineIndex)
    .filter(
      (lineIndex) =>
        facts.lines[lineIndex] !== "nationalDefense" &&
        facts.lines[lineIndex] !== "netInterest",
    );
  const bases = eligible.map((lineIndex) =>
    recordedFederalAnnualSpendingBefore(
      facts,
      lineIndex,
      cut.law!.operativeAt,
      true,
    ),
  );
  if (bases.some((base) => base === null)) return changes;
  const total = bases.reduce<number>((sum, base) => sum + base!, 0);
  if (total === 0) return changes;
  const monthlyCut = Math.min(cut.amount, total) / 12;
  for (const [index, lineIndex] of eligible.entries()) {
    changes.push({
      questionKey: DEBT_LIMIT_CUTS_QUESTION,
      measureId: cut.law.measureId,
      lineIndex,
      amount: -monthlyCut * (bases[index]! / total),
      monthlyBase: bases[index]! / 12,
    });
  }
  return changes;
}

export function federalDeficitChangePctOfGdp(
  facts: OutlayFacts,
  onDate: IsoDate,
): number | null {
  const { cutDollars, aidDollars } = federalOutlayChangeAt(facts, onDate);
  return cutDollars === null || aidDollars === null
    ? null
    : (100 * (aidDollars - cutDollars)) / facts.nationalGdp;
}

export function federalAidFactor(facts: OutlayFacts, onDate: IsoDate): number {
  const cut = federalLawAmountAt(
    facts,
    DEBT_LIMIT_CUTS_QUESTION,
    "offset",
    onDate,
  );
  const base = cut.law
    ? recordedFederalAnnualSpendingBefore(facts, null, cut.law.operativeAt)
    : null;
  return cut.amount === null || base === null
    ? 1
    : Math.max(0, 1 - cut.amount / base);
}
export const GROW_DEFENSE_SPENDING_QUESTION =
  "us-federal-positions:defense.grow-defense-spending";

export function defenseBuildUpShare(
  facts: OutlayFacts,
  onDate: IsoDate,
): {
  readonly share: number;
  readonly lawMeasureId: string | null;
  readonly unsupportedReason: string | null;
} {
  const law =
    facts.laws.get(`${GROW_DEFENSE_SPENDING_QUESTION}:${onDate}`) ?? null;
  if (!law) return { share: 0, lawMeasureId: null, unsupportedReason: null };
  const term =
    facts.terms.get(
      `${law.measureId}:${GROW_DEFENSE_SPENDING_QUESTION}:appropriation:${onDate}`,
    ) ?? null;
  const base = recordedFederalAnnualSpendingBefore(
    facts,
    facts.lines.indexOf("nationalDefense"),
    law.operativeAt,
  );
  if (!term || !Number.isFinite(term.value) || term.value < 0 || base === null)
    return {
      share: 0,
      lawMeasureId: law.measureId,
      unsupportedReason:
        "annual-appropriation-or-recorded-defense-base-unavailable",
    };
  return {
    share: (term.value - base) / base,
    lawMeasureId: law.measureId,
    unsupportedReason: null,
  };
}
