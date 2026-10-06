/** Federal spending amounts come from adopted bill text, including starting law. */
import outlayTerms from "../../data/research/federal/federal-outlay-terms-fy2025.json" with { type: "json" };
import { FEDERAL_OUTLAYS } from "./public-budgets/federal-budget-categories";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, IsoDate, World } from "./types";

export const DEBT_LIMIT_CUTS_QUESTION =
  "us-federal-positions:budget.pay-for-a-higher-debt-limit";
export const INCREASE_FOREIGN_AID_QUESTION =
  "us-federal-positions:foreign-affairs.increase-foreign-aid";

/** The canonical governing law, including dated starting law. */
export function federalLawInForceAt(
  world: World,
  questionKey: string,
  onDate: IsoDate,
) {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((row) => row.stableKey === questionKey);
  const law = proposition
    ? lawInForce(
        world,
        NATIONAL_ELECTION_JURISDICTION.id,
        proposition.id,
        onDate,
      )
    : null;
  return law?.answer === "yes" ? law : null;
}

/** Catalog parameter in annual dollars; null means adopted numeric text is absent. */
export function federalLawAmountAt(
  world: World,
  questionKey: string,
  termKey: string,
  onDate: IsoDate,
) {
  const law = federalLawInForceAt(world, questionKey, onDate);
  if (!law || law.answer !== "yes")
    return { law: null, amount: 0, unsupportedReason: null };
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey,
    unit: "dollars/year",
    onDate,
  });
  const valid = term && Number.isFinite(term.value) && term.value >= 0;
  return {
    law,
    amount: valid ? term.value : null,
    unsupportedReason: valid ? null : "final-annual-amount-unrecorded",
  };
}

/** A complete recorded year before the law, never a historical deal's size. */
export function recordedFederalAnnualSpendingBefore(
  world: World,
  lineIndex: number | null,
  before: IsoDate,
  allowZero = false,
): number | null {
  const rows = (world.publicBudgets?.federalGovernment?.months ?? [])
    .filter((row) => row.month < before && row.month <= world.currentDate)
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
  world: World,
  onDate: IsoDate,
): {
  readonly cutDollars: number | null;
  readonly aidDollars: number | null;
  readonly lawMeasureIds: readonly string[];
} {
  const cut = federalLawAmountAt(
    world,
    DEBT_LIMIT_CUTS_QUESTION,
    "offset",
    onDate,
  );
  const aid = federalLawAmountAt(
    world,
    INCREASE_FOREIGN_AID_QUESTION,
    "appropriation",
    onDate,
  );
  const base = aid.law
    ? recordedFederalAnnualSpendingBefore(
        world,
        FEDERAL_OUTLAYS.indexOf("internationalAffairs"),
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
  /** Exact monthly-dollar change produced by the adopted annual bill term. */
  readonly amount: number;
  /** Recorded monthly line amount to which the adopted change applies. */
  readonly monthlyBase: number;
}

/**
 * Monthly treasury line changes read from each bill's adopted annual-dollar
 * term. This is the one sizing path for the foreign-aid appropriation and the
 * debt-limit offset; treasury settlement records these amounts without
 * converting either law into a second table of forecast shares.
 */
export function federalOutlayLawLineChangesAt(
  world: World,
  onDate: IsoDate,
): readonly FederalOutlayLawLineChange[] {
  const changes: FederalOutlayLawLineChange[] = [];
  const aid = federalLawAmountAt(
    world,
    INCREASE_FOREIGN_AID_QUESTION,
    "appropriation",
    onDate,
  );
  const aidLineIndex = FEDERAL_OUTLAYS.indexOf("internationalAffairs");
  const aidBase = aid.law
    ? recordedFederalAnnualSpendingBefore(
        world,
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
    world,
    DEBT_LIMIT_CUTS_QUESTION,
    "offset",
    onDate,
  );
  if (!cut.law || cut.amount === null) return changes;
  const eligible = FEDERAL_OUTLAYS.map((_, lineIndex) => lineIndex).filter(
    (lineIndex) =>
      FEDERAL_OUTLAYS[lineIndex] !== "nationalDefense" &&
      FEDERAL_OUTLAYS[lineIndex] !== "netInterest",
  );
  const bases = eligible.map((lineIndex) =>
    recordedFederalAnnualSpendingBefore(
      world,
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

/** Adopted annual spending change over the existing sourced annual-dollar GDP. */
export function federalDeficitChangePctOfGdp(
  world: World,
  onDate: IsoDate,
): number | null {
  const { cutDollars, aidDollars } = federalOutlayChangeAt(world, onDate);
  return cutDollars === null || aidDollars === null
    ? null
    : (100 * (aidDollars - cutDollars)) / outlayTerms.nationalGdp2025;
}

/** Apply the adopted offset as a share of the complete recorded federal spending base. */
export function federalAidFactor(world: World, onDate: IsoDate): number {
  const cut = federalLawAmountAt(
    world,
    DEBT_LIMIT_CUTS_QUESTION,
    "offset",
    onDate,
  );
  const base = cut.law
    ? recordedFederalAnnualSpendingBefore(world, null, cut.law.operativeAt)
    : null;
  return cut.amount === null || base === null
    ? 1
    : Math.max(0, 1 - cut.amount / base);
}
