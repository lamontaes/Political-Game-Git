import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import {
  federalIncomeTaxUnderLaw,
  RAISE_TOP_FEDERAL_RATE_QUESTION,
} from "./federal-top-income-tax-law";
import {
  FEDERAL_INCOME_TAX_2026,
  withholdingForPaycheck,
} from "./income-tax-withholding";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./types";

/**
 * A federal law on the top income tax rate, enacted in play, reaching the
 * federal withholding: a yes taxes the top bracket at 39.6% from the next
 * tax year, and a later no puts 37% back. Read over hand-written laws: the
 * rule reads nothing but the catalog and the laws.
 */

const TOP_RATE = "proposition_top_rate" as EntityId;

let sequence = 0;
function enacted(
  answer: "yes" | "no",
  effectiveAt: string,
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
      propositionIds: [TOP_RATE],
      propositionAnswers: [{ propositionId: TOP_RATE, answer }],
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
      },
    },
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

const topRate = (world: World, paidAt: string) =>
  federalIncomeTaxUnderLaw(
    world,
    "single",
    makeIsoDate(paidAt),
  ).schedule!.brackets.at(-1)!.rateBasisPoints;

/** A $1,000,000 salary paid every two weeks: one paycheck's withholding. */
const withheld = (world: World, paidAt: string) =>
  withholdingForPaycheck(
    100_000_000 / 26,
    26,
    federalIncomeTaxUnderLaw(world, "single", makeIsoDate(paidAt)).schedule!,
  ).withheldMinor;

describe("a federal law on the top income tax rate, as enacted in play", () => {
  it("leaves the 2026 schedule where no law was enacted", () => {
    const none = federalIncomeTaxUnderLaw(
      lawWorld([]),
      "married-filing-jointly",
      makeIsoDate("2027-03-15"),
    );
    expect(none).toEqual({
      schedule: FEDERAL_INCOME_TAX_2026["married-filing-jointly"],
      lawMeasureIds: [],
    });
  });

  it("taxes the top bracket at 39.6% from the next tax year, and a repeal puts 37% back", () => {
    const raise = enacted("yes", "2026-04-01");
    const repeal = enacted("no", "2028-07-01");
    const world = lawWorld([raise, repeal]);
    // The raise takes effect during 2026, so 2026 pay is taxed as begun.
    expect(topRate(world, "2026-12-15")).toBe(3700);
    expect(topRate(world, "2027-01-15")).toBe(3960);
    // The repeal takes effect during 2028, so all of 2028 keeps 39.6%.
    expect(topRate(world, "2028-12-15")).toBe(3960);
    expect(topRate(world, "2029-01-15")).toBe(3700);
    expect(
      federalIncomeTaxUnderLaw(world, "single", makeIsoDate("2027-01-15"))
        .lawMeasureIds,
    ).toEqual([raise.measure.id]);
    // Only the top bracket moves.
    const raised = federalIncomeTaxUnderLaw(
      world,
      "head-of-household",
      makeIsoDate("2027-01-15"),
    ).schedule!;
    const begun = FEDERAL_INCOME_TAX_2026["head-of-household"]!;
    expect(raised.brackets.slice(0, -1)).toEqual(begun.brackets.slice(0, -1));
    expect(raised.brackets.at(-1)!.overMinor).toBe(
      begun.brackets.at(-1)!.overMinor,
    );
  });

  it("withholds 2.6% more of a top earner's pay over the top threshold, and nothing more below it", () => {
    const world = lawWorld([enacted("yes", "2026-04-01")]);
    // $1,000,000 less the $16,100 deduction is $983,900, $343,300 over the
    // $640,600 threshold; 2.6% of that is $8,925.80 a year, $343.30 a check.
    expect(withheld(world, "2027-01-15") - withheld(world, "2026-12-15")).toBe(
      34_330,
    );
    const middle = (paidAt: string) =>
      withholdingForPaycheck(
        8_000_000 / 26,
        26,
        federalIncomeTaxUnderLaw(world, "single", makeIsoDate(paidAt))
          .schedule!,
      ).withheldMinor;
    expect(middle("2027-01-15")).toBe(middle("2026-12-15"));
  });
});
