import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  OUTCOME_LINKS,
  outcomeFactor,
  outcomeLinkStatus,
  outcomeMeasure,
} from "../outcome-web";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawInForce } from "./law-in-force";

/**
 * An Act of Congress on a federal question is the law in force everywhere:
 * in every state, D.C., every territory and every town, and the outcome web
 * reads it there as the law's answer. One Act per federal question, each
 * read in all 56 state-level places and a town in each.
 */

const POLICY = createProductionPolicyCatalog();
const FEDERAL = NATIONAL_ELECTION_JURISDICTION.id;
const FEDERAL_QUESTIONS = POLICY.propositionOrder.filter((id) =>
  POLICY.propositions[id]!.stableKey.startsWith("us-federal-positions:"),
);

const PLACES: readonly { name: string; id: EntityId }[] =
  lifePlaceStateIdentities().flatMap((state) => {
    const town = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
    }).find((place) => place.scope !== "state");
    return [
      {
        name: state.jurisdictionKey,
        id: stateJurisdictionForKey(state.jurisdictionKey)!.id,
      },
      ...(town
        ? [
            {
              name: `${state.jurisdictionKey} ${town.key}`,
              id: town.context.jurisdiction.id,
            },
          ]
        : []),
    ];
  });

function act(
  propositionId: EntityId,
  index: number,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${index}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${index}`,
      sequence: index,
      jurisdictionId: FEDERAL,
      rulePackId: "us-congress-v1",
      designation: `H.R. ${index}`,
      shortTitle: "A test Act",
      summary: "A test Act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    },
    enactment: {
      id: `enactment_${index}` as EntityId,
      stableKey: `test:${index}:enactment`,
      sequence: 1000 + index,
      measureId: id,
      resolvedAt: makeIsoDate("2026-03-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-03-01"),
      outcomeEventId: `event_${index}` as EntityId,
    },
  };
}

describe("an Act of Congress reaches every place", () => {
  const acts = FEDERAL_QUESTIONS.map((id, index) => act(id, index + 1));
  const world = {
    currentDate: makeIsoDate("2027-01-01"),
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: acts.map((entry) => entry.measure),
      legislativeEnactments: acts.map((entry) => entry.enactment),
    },
  } as unknown as World;

  it("covers all 20 federal questions and 112 places", () => {
    expect(FEDERAL_QUESTIONS).toHaveLength(20);
    expect(PLACES).toHaveLength(112);
  });

  it("is the law in force on its federal question in every state, territory and town", () => {
    for (const [index, propositionId] of FEDERAL_QUESTIONS.entries())
      for (const place of PLACES)
        expect(
          lawInForce(world, place.id, propositionId),
          `${place.name}: ${POLICY.propositions[propositionId]!.stableKey}`,
        ).toMatchObject({
          answer: "yes",
          level: "federal-statute",
          measureId: acts[index]!.measure.id,
        });
  });

  it("is what the outcome web reads for that question, everywhere", () => {
    for (const propositionId of FEDERAL_QUESTIONS) {
      const key = `law:${POLICY.propositions[propositionId]!.stableKey}`;
      const measure = outcomeMeasure(key);
      expect(measure, key).not.toBeNull();
      for (const place of PLACES)
        expect(
          measure!.read(world, place.id, makeIsoDate("2026-06-01")),
          `${place.name}: ${key}`,
        ).toBe(1);
      // Before the Act took effect, nothing had answered it: unknown, not no.
      expect(
        measure!.read(world, PLACES[0]!.id, makeIsoDate("2026-02-01")),
        key,
      ).toBeNull();
    }
  });
});

/**
 * The federal rows Claude CTO approved on Sept. 28, 2026 (CLOUD C's research
 * checkpoint 2): what each federal law now changes, or on purpose does not.
 */
describe("what federal laws change in the outcome web", () => {
  const STATES = PLACES.filter((place) => /^US-[A-Z]{2}$/.test(place.name));
  const acts = FEDERAL_QUESTIONS.map((id, index) => act(id, index + 1));
  const world = {
    currentDate: makeIsoDate("2032-01-01"),
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: acts.map((entry) => entry.measure),
      legislativeEnactments: acts.map((entry) => entry.enactment),
    },
  } as unknown as World;
  const link = (key: string) => OUTCOME_LINKS.find((row) => row.key === key)!;

  it("raises poverty about 2% everywhere once a higher retirement age has phased in", () => {
    const row = link("retirement-age-to-poverty");
    expect(row).toMatchObject({ size: 0.02, lagMonths: 60, owner: "C" });
    expect(outcomeLinkStatus(row)).toBe("built");
    for (const place of STATES) {
      // In force from March 1, 2026: five years later it has phased in.
      const after = outcomeFactor(
        world,
        place.id,
        "household.poverty-pct",
        makeIsoDate("2031-03-02"),
      ).causes.find((cause) => cause.key === row.key);
      expect(after?.factor, place.name).toBeCloseTo(1.02, 10);
      const before = outcomeFactor(
        world,
        place.id,
        "household.poverty-pct",
        makeIsoDate("2031-02-01"),
      ).causes.find((cause) => cause.key === row.key);
      expect(before, place.name).toBeUndefined();
    }
  });

  it("changes nothing where the research finds nothing, in every state", () => {
    const zeros = [
      "immigration-to-crime",
      "federal-mandatory-minimums-to-crime",
      "housing-vouchers-to-graduation",
      "housing-vouchers-to-crime",
      "top-income-tax-rate-to-poverty",
      "student-loan-forgiveness-to-poverty",
    ].map(link);
    for (const row of zeros) {
      expect(row, row?.key).toMatchObject({
        size: 0,
        strength: "about-zero",
        evidence: "about-zero",
      });
      expect(outcomeLinkStatus(row)).toBe("about-zero");
      for (const place of STATES)
        expect(
          outcomeFactor(world, place.id, row.to, world.currentDate).causes.map(
            (cause) => cause.key,
          ),
          `${place.name}: ${row.key}`,
        ).not.toContain(row.key);
    }
  });

  it("sizes the federal rows that wait on an outcome the game does not measure yet", () => {
    expect(
      Object.fromEntries(
        [
          "drug-negotiation-to-out-of-pocket",
          "federal-loan-cap-to-high-cost-loans",
          "retirement-age-to-older-work",
          "housing-vouchers-to-homelessness",
          "tariffs-to-prices",
        ].map((key) => [key, [link(key).size, outcomeLinkStatus(link(key))]]),
      ),
    ).toEqual({
      "drug-negotiation-to-out-of-pocket": [-0.08, "outcome-not-produced"],
      "federal-loan-cap-to-high-cost-loans": [-0.32, "outcome-not-produced"],
      "retirement-age-to-older-work": [0.1, "outcome-not-produced"],
      "housing-vouchers-to-homelessness": [-0.3, "outcome-not-produced"],
      "tariffs-to-prices": [0.008, "outcome-not-produced"],
    });
  });
});
