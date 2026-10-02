import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "../federal-top-income-tax-law";
import { GROW_DEFENSE_SPENDING_QUESTION } from "../federal-defense-spending";
import { CUT_FARM_SUBSIDIES_QUESTION } from "../federal-farm-subsidy-law";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../federal-outlay-laws";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  FEDERAL_INTEREST_RATE,
  FEDERAL_OUTLAYS,
  FEDERAL_RECEIPTS,
  federalDebtHeldByPublic,
  federalTotalDebt,
  openFederalTreasury,
  settleFederalTreasuryMonth,
  type FederalTreasury,
} from "./federal-treasury";

/**
 * The federal books: each month collects and spends a twelfth of fiscal
 * 2025, borrows the gap, and pays interest on what it owes. This retained
 * historical projection no longer prices a top-rate law; actual income tax
 * receipts are the common account's saved paycheck collections.
 * Read over hand-written laws: the treasury reads nothing but the catalog
 * and the laws.
 */

const TOP_RATE = "proposition_top_rate" as EntityId;
const AID = "proposition_foreign_aid" as EntityId;
const CUTS = "proposition_debt_limit_cuts" as EntityId;
const FARM = "proposition_farm_subsidies" as EntityId;
const DEFENSE = "proposition_defense" as EntityId;

let sequence = 0;
function enacted(
  answer: "yes" | "no",
  effectiveAt: string,
  proposition: EntityId = TOP_RATE,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_top_rate_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:top-rate:${sequence}`,
      sequence,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: "test",
      designation: `H.R. ${sequence}`,
      shortTitle: "A top rate act",
      summary: "A top rate act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-05"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [proposition],
      propositionAnswers: [{ propositionId: proposition, answer }],
    },
    enactment: {
      id: `enactment_top_rate_${sequence}` as EntityId,
      stableKey: `test:top-rate:${sequence}:enactment`,
      sequence: 5000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-03-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_top_rate_${sequence}` as EntityId,
    },
  };
}

function lawWorld(laws: readonly ReturnType<typeof enacted>[]): World {
  return {
    seed: "top-rate",
    currentDate: makeIsoDate("2029-06-01"),
    jurisdictions: {},
    policyCatalog: {
      propositions: {
        [TOP_RATE]: {
          id: TOP_RATE,
          stableKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        },
        [AID]: { id: AID, stableKey: INCREASE_FOREIGN_AID_QUESTION },
        [CUTS]: { id: CUTS, stableKey: DEBT_LIMIT_CUTS_QUESTION },
        [FARM]: { id: FARM, stableKey: CUT_FARM_SUBSIDIES_QUESTION },
        [DEFENSE]: { id: DEFENSE, stableKey: GROW_DEFENSE_SPENDING_QUESTION },
      },
    },
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

function settleThrough(world: World, months: readonly string[]) {
  let treasury: FederalTreasury = openFederalTreasury(
    makeIsoDate("2026-01-05"),
  );
  for (const month of months)
    treasury = settleFederalTreasuryMonth(
      world,
      treasury,
      makeIsoDate(month) as IsoDate,
    );
  return treasury;
}

const income = FEDERAL_RECEIPTS.indexOf("individualIncomeTax");
const interest = FEDERAL_OUTLAYS.indexOf("netInterest");

describe("the federal treasury", () => {
  it("opens from the real books and borrows each month's gap", () => {
    const opened = openFederalTreasury(makeIsoDate("2026-01-05"));
    // Debt to the Penny, December 31, 2025.
    expect(federalDebtHeldByPublic(opened)).toBe(30_846_716_536_213);
    expect(federalTotalDebt(opened)).toBe(38_514_009_184_232);
    expect(opened.debtLimit).toBe(41_100_000_000_000);
    expect(FEDERAL_INTEREST_RATE).toBeCloseTo(0.0331, 4);
    const treasury = settleThrough(lawWorld([]), ["2026-01-01", "2026-02-01"]);
    const [first, second] = treasury.months;
    const collected = first!.receipts.reduce((sum, value) => sum + value, 0);
    // A twelfth of fiscal 2025's $5,234.6 billion.
    expect(collected / 1e9).toBeCloseTo(5_234.616 / 12, 0);
    expect(first!.outlays[interest]).toBe(
      Math.round((30_846_716_536_213 * FEDERAL_INTEREST_RATE) / 12),
    );
    expect(first!.debtHeldByPublic).toBe(30_846_716_536_213 + first!.deficit);
    // The borrowing costs interest the next month.
    expect(second!.outlays[interest]).toBeGreaterThan(
      first!.outlays[interest]!,
    );
    expect(first!.laws).toEqual([]);
  });

  it("does not manufacture additional income receipts or debt savings from a top-rate law", () => {
    const raise = enacted("yes", "2026-04-01");
    const repeal = enacted("no", "2028-07-01");
    const months = ["2026-12-01", "2027-01-01", "2028-12-01", "2029-01-01"];
    const none = settleThrough(lawWorld([]), months).months;
    const withLaws = settleThrough(lawWorld([raise, repeal]), months).months;
    const ratio = (index: number) =>
      withLaws[index]!.receipts[income]! / none[index]!.receipts[income]!;
    expect(ratio(0)).toBe(1);
    expect(ratio(1)).toBe(1);
    expect(ratio(2)).toBe(1);
    expect(ratio(3)).toBe(1);
    expect(withLaws.every((row) => row.laws.length === 0)).toBe(true);
    expect(withLaws[3]!.debtHeldByPublic).toBe(none[3]!.debtHeldByPublic);
  });

  it("spends 6.72% more on international affairs under a foreign aid law, and $150 billion a year less under debt-limit cuts", () => {
    const month = ["2026-06-01"];
    const none = settleThrough(lawWorld([]), month).months[0]!;
    const withLaws = settleThrough(
      lawWorld([
        enacted("yes", "2026-04-01", AID),
        enacted("yes", "2026-04-01", CUTS),
      ]),
      month,
    ).months[0]!;
    const intl = FEDERAL_OUTLAYS.indexOf("internationalAffairs");
    const defense = FEDERAL_OUTLAYS.indexOf("nationalDefense");
    expect(withLaws.outlays[defense]).toBe(none.outlays[defense]);
    expect(withLaws.outlays[interest]).toBe(none.outlays[interest]);
    // Foreign aid then the cut: 1.0672 times 0.9707 of the line.
    expect(withLaws.outlays[intl]! / none.outlays[intl]!).toBeCloseTo(
      1.0672 * (1 - 0.02928),
      4,
    );
    const total = (row: typeof none) =>
      row.outlays.reduce((sum, value) => sum + value, 0);
    const aidDollars = (45_169_891_179.7 * 0.0672 * (1 - 0.02928)) / 12;
    expect((total(none) - total(withLaws) + aidDollars) / 1e9).toBeCloseTo(
      150 / 12,
      1,
    );
  });

  it("spends $3.9 billion a year less on farms under a subsidy cut, and more on defense each year of a build-up, up to five", () => {
    const farm = FEDERAL_OUTLAYS.indexOf("agriculture");
    const defense = FEDERAL_OUTLAYS.indexOf("nationalDefense");
    const months = ["2026-03-01", "2027-04-01", "2033-04-01"];
    const none = settleThrough(lawWorld([]), months).months;
    const build = enacted("yes", "2026-04-01", DEFENSE);
    const withLaws = settleThrough(
      lawWorld([enacted("yes", "2026-04-01", FARM), build]),
      months,
    ).months;
    // Before either law, nothing moves.
    expect(withLaws[0]!.outlays).toEqual(none[0]!.outlays);
    // 21.18% of $18.35 billion of payments: 7.88% of Agriculture.
    expect(
      ((none[1]!.outlays[farm]! - withLaws[1]!.outlays[farm]!) * 12) / 1e9,
    ).toBeCloseTo(0.2118 * 18.3524102, 1);
    // A year in, contracts ($445.8 billion, 48.6% of defense) are 6.94% up.
    const rise = (index: number) =>
      withLaws[index]!.outlays[defense]! / none[index]!.outlays[defense]! - 1;
    expect(rise(1)).toBeCloseTo((445.8e9 / 916_648_676_662.05) * 0.0694, 3);
    // Seven years in, the build-up stopped after five.
    expect(rise(2)).toBeCloseTo(
      (445.8e9 / 916_648_676_662.05) * (1.0694 ** 5 - 1),
      4,
    );
    expect(withLaws[1]!.laws.map((law) => law.line)).toEqual([
      "nationalDefense",
      "agriculture",
    ]);
    expect(withLaws[1]!.laws[0]!.measureId).toBe(build.measure.id);
  });
});
