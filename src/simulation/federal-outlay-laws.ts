/** Federal spending amounts come from adopted bill text, including starting law. */
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { IsoDate, World } from "./types";

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
  return total > 0 ? total : null;
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
  // Existing federal category order: international affairs is index 7.
  const base = aid.law
    ? recordedFederalAnnualSpendingBefore(world, 7, aid.law.operativeAt)
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

/** A dollar GDP denominator is not supplied by the world's macro indexes. */
export function federalDeficitChangePctOfGdp(
  world: World,
  onDate: IsoDate,
): number | null {
  const { cutDollars, aidDollars } = federalOutlayChangeAt(world, onDate);
  return cutDollars === 0 && aidDollars === 0 ? 0 : null;
}

/** A federal aggregate offset alone does not specify a cut to every government's aid. */
export function federalAidFactor(_world: World, _onDate: IsoDate): number {
  void _world;
  void _onDate;
  return 1;
}
