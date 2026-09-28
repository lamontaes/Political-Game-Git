import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { outcomeMeasure } from "../outcome-web";
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
