import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { OUTCOME_LINKS } from ".";
import { PLACE_OUTCOME_BASES, placeOutcomesForMonth } from "./place-outcomes";

/*
 * A container deposit law raises the share of beverage containers recycled,
 * and repealing one lowers it, in every place the same way. The world is
 * partial and unseeded, so nothing drifts and the link acts at its central
 * size.
 */

const DEPOSIT_KEY = "us-policy-positions:environment-energy.bottle-deposit";
const DEPOSIT = `proposition:${DEPOSIT_KEY}` as EntityId;
const MEASURE = "env.container-recycling-pct";
const LINK = OUTCOME_LINKS.find(
  (link) => link.key === "container-deposit-to-recycling",
)!;

/** A world where one state law answers the deposit question in `place`. */
function enacted(
  place: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): World {
  const measure: LegislativeMeasureRecord = {
    id: "measure_deposit" as EntityId,
    stableKey: "test:deposit",
    sequence: 1,
    jurisdictionId: place,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "A container deposit act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [DEPOSIT],
    propositionAnswers: [{ propositionId: DEPOSIT, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_deposit" as EntityId,
    stableKey: "test:deposit:enactment",
    sequence: 1001,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-06-01"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effectiveAt),
    outcomeEventId: "event_deposit" as EntityId,
  };
  return {
    currentDate: makeIsoDate("2030-01-01"),
    policyCatalog: {
      propositions: { [DEPOSIT]: { id: DEPOSIT, stableKey: DEPOSIT_KEY } },
    },
    history: {
      legislativeMeasures: [measure],
      legislativeEnactments: [enactment],
    },
    placeOutcomes: { months: [] },
  } as unknown as World;
}

function recyclingIn(world: World, placeKey: string, month: string): number {
  return placeOutcomesForMonth(world, makeIsoDate(month), [MEASURE]).find(
    (record) => record.placeKey === placeKey,
  )!.value;
}

describe("a container deposit law and recycling", () => {
  const places = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places);

  it("covers all 56 places, each starting from its group's measured average", () => {
    expect(places).toHaveLength(56);
    for (const placeKey of places) {
      const id = stateJurisdictionForKey(placeKey)!.id;
      const began = lawInForceAtStart(
        enacted(id, "no", "2027-01-01"),
        id,
        DEPOSIT,
        makeIsoDate("2026-01-01"),
      );
      expect(PLACE_OUTCOME_BASES[MEASURE]!.places[placeKey], placeKey).toBe(
        began === "yes" ? 74 : 26,
      );
    }
  });

  it("enacting one raises the share recycled a year after it takes effect, and repealing one lowers it, everywhere", () => {
    expect(LINK.size).toBe(43);
    for (const placeKey of places) {
      const id = stateJurisdictionForKey(placeKey)!.id;
      const base = PLACE_OUTCOME_BASES[MEASURE]!.places[placeKey]!;
      const hadOne = base === 74;
      // The law the place did not begin with, taking effect January 1, 2027.
      const changed = enacted(id, hadOne ? "no" : "yes", "2027-01-01");
      // Before the law and within its first year, nothing moves.
      expect(recyclingIn(changed, placeKey, "2027-06-01"), placeKey).toBe(base);
      // A year on, the return points are open (or closed).
      expect(recyclingIn(changed, placeKey, "2028-02-01"), placeKey).toBe(
        hadOne ? base - 43 : base + 43,
      );
      // Keeping the law it began with changes nothing.
      const kept = enacted(id, hadOne ? "yes" : "no", "2027-01-01");
      expect(recyclingIn(kept, placeKey, "2028-02-01"), placeKey).toBe(base);
    }
  });
});
