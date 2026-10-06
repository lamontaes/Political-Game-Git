import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * A cap on consumer loan rates lowers high-cost borrowing. Prohibiting
 * payday loans goes with a 32% decline in their use (McKernan, Ratcliffe and
 * Kuehn 2013), and a 36% APR cap ends storefront payday lending the same
 * way. The world reads it on the count of consumer lenders per 100,000
 * residents (Census County Business Patterns 2023). A state's own cap acts in
 * that state twelve months after it takes effect; an Act of Congress acts
 * everywhere it is not already redundant, because a state that already caps
 * rates has already had the effect. The starting law says which states cap
 * rates on the first day (data/research/laws/starting-law-2026/business-commerce.json): Alabama
 * does not and Arkansas does.
 */
const STATE_QUESTION = "proposition_state_loan_cap" as EntityId;
const STATE_KEY =
  "us-policy-positions:business-commerce.cap-consumer-loan-rates";
const FEDERAL_QUESTION = "proposition_federal_loan_cap" as EntityId;
const FEDERAL_KEY =
  "us-federal-positions:monetary-financial.cap-consumer-loan-interest";
const MEASURE = "finance.high-cost-loans";

function law(
  jurisdictionId: EntityId,
  question: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_loan_cap_${jurisdictionId}_${answer}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:loan-cap:${jurisdictionId}:${answer}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Loan Rate Cap Act",
      summary: "A test law.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [question],
      propositionAnswers: [{ propositionId: question, answer }],
    },
    enactment: {
      id: `enactment_loan_cap_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:loan-cap:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_loan_cap_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        [STATE_QUESTION]: { id: STATE_QUESTION, stableKey: STATE_KEY },
        [FEDERAL_QUESTION]: { id: FEDERAL_QUESTION, stableKey: FEDERAL_KEY },
      },
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const lenders = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

const alabama = () => stateJurisdictionForKey("US-AL")!.id;
const arkansas = () => stateJurisdictionForKey("US-AR")!.id;

describe("high-cost loans", () => {
  const places = PLACE_OUTCOME_BASES[MEASURE]!.places;

  it("starts 49 places at their 2023 consumer lenders per 100,000 residents", () => {
    expect(Object.keys(places)).toHaveLength(49);
    // The Census Bureau withholds these two states' counts; the territories
    // are outside County Business Patterns. Unknown is never zero.
    for (const left of ["US-AK", "US-VT", "US-PR", "US-GU", "US-VI"])
      expect(places).not.toHaveProperty(left);
    expect(places["US-MS"]).toBeGreaterThan(10);
    expect(places["US-AR"]).toBeLessThan(1);
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("both loan cap links are built and sized from the studies", () => {
    for (const key of [
      "loan-rate-cap-to-high-cost-borrowing",
      "federal-loan-cap-to-high-cost-loans",
    ]) {
      const link = OUTCOME_LINKS.find((row) => row.key === key)!;
      expect(outcomeLinkStatus(link), key).toBe("built");
      expect(link.size, key).toBe(-0.32);
      expect(link.range, key).toEqual([-0.61, -0.2]);
      expect(link.lagMonths, key).toBe(12);
    }
  });

  it("a state cap lowers that state's lenders 32% once it has run twelve months", () => {
    const world = worldWith([
      law(alabama(), STATE_QUESTION, "yes", "2026-03-01"),
    ]);
    expect(lenders(world, alabama(), "2026-03-15").multiplier).toBe(1);
    expect(lenders(world, alabama(), "2027-02-15").multiplier).toBe(1);
    const after = lenders(world, alabama(), "2027-04-15");
    expect(after.multiplier).toBeCloseTo(0.68, 10);
    expect(after.causes.map((cause) => cause.key)).toEqual([
      "loan-rate-cap-to-high-cost-borrowing",
    ]);
    // A state with no such law is unmoved.
    const ohio = stateJurisdictionForKey("US-OH")!.id;
    expect(lenders(world, ohio, "2027-04-15").multiplier).toBe(1);
  });

  it("a state answering no leaves lenders where they were", () => {
    const world = worldWith([
      law(alabama(), STATE_QUESTION, "no", "2026-03-01"),
    ]);
    expect(lenders(world, alabama(), "2027-04-15").multiplier).toBe(1);
  });

  it("repealing a cap the state already had brings lenders back, and a state that already caps is not lowered again", () => {
    const repeal = worldWith([
      law(arkansas(), STATE_QUESTION, "no", "2026-03-01"),
    ]);
    expect(lenders(repeal, arkansas(), "2026-03-15").multiplier).toBe(1);
    expect(lenders(repeal, arkansas(), "2027-04-15").multiplier).toBeCloseTo(
      1.32,
      10,
    );
    const again = worldWith([
      law(arkansas(), STATE_QUESTION, "yes", "2026-03-01"),
    ]);
    expect(lenders(again, arkansas(), "2027-04-15").multiplier).toBe(1);
  });

  it("an Act of Congress lowers lenders in states without a cap, not in states that already cap", () => {
    const world = worldWith([
      law(
        NATIONAL_ELECTION_JURISDICTION.id,
        FEDERAL_QUESTION,
        "yes",
        "2026-03-01",
      ),
    ]);
    expect(lenders(world, alabama(), "2027-02-15").multiplier).toBe(1);
    const after = lenders(world, alabama(), "2027-04-15");
    expect(after.multiplier).toBeCloseTo(0.68, 10);
    // The state link reads the state's own statute, which the Act does not
    // change, so the effect is counted once, through the federal link.
    expect(
      Object.fromEntries(
        after.causes.map((cause) => [cause.key, cause.factor]),
      ),
    ).toEqual({
      "loan-rate-cap-to-high-cost-borrowing": 1,
      "federal-loan-cap-to-high-cost-loans": expect.closeTo(0.68, 10),
    });
    expect(lenders(world, arkansas(), "2027-04-15").multiplier).toBe(1);
  });

  it("a city ordinance does not override a state that bars local rate caps", () => {
    const kansasCity = lifePlaceByKey("2938000")!.context.jurisdiction.id;
    const world = worldWith([
      law(kansasCity, STATE_QUESTION, "yes", "2026-03-01"),
    ]);
    expect(lenders(world, kansasCity, "2027-04-15").multiplier).toBe(1);
  });
});
