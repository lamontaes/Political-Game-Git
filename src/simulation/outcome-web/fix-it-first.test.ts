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
 * A fix-it-first law moves highway money from new lanes to repair, so fewer
 * roads are rough: 18% fewer after the first five years, 38% fewer by the
 * middle of the second decade. Rough roads cost drivers in repairs, so the
 * roads a law smoothed lower prices a little. The world is partial and
 * unseeded, so nothing drifts and each link acts at its central size.
 */

const FIX_KEY =
  "us-policy-positions:transportation-infrastructure.fix-it-first";
const FIX = `proposition:${FIX_KEY}` as EntityId;
const ROADS = "roads.poor-condition-pct";
const PRICES = "household.prices";
const size = (key: string) =>
  OUTCOME_LINKS.find((link) => link.key === key)!.size!;

/** A world where one law answers the fix-it-first question in `place`. */
function enacted(place: EntityId, answer: "yes" | "no"): World {
  const measure: LegislativeMeasureRecord = {
    id: "measure_fix" as EntityId,
    stableKey: "test:fix",
    sequence: 1,
    jurisdictionId: place,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "A fix-it-first act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [FIX],
    propositionAnswers: [{ propositionId: FIX, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_fix" as EntityId,
    stableKey: "test:fix:enactment",
    sequence: 1001,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-06-01"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate("2027-01-01"),
    outcomeEventId: "event_fix" as EntityId,
  };
  return {
    currentDate: makeIsoDate("2040-01-01"),
    policyCatalog: {
      propositions: { [FIX]: { id: FIX, stableKey: FIX_KEY } },
    },
    history: {
      legislativeMeasures: [measure],
      legislativeEnactments: [enactment],
    },
    placeOutcomes: { months: [] },
  } as unknown as World;
}

function valueIn(
  world: World,
  measure: string,
  placeKey: string,
  month: string,
): number {
  return placeOutcomesForMonth(world, makeIsoDate(month), [measure]).find(
    (record) => record.placeKey === placeKey,
  )!.value;
}

describe("a fix-it-first law and the roads", () => {
  const places = Object.keys(PLACE_OUTCOME_BASES[ROADS]!.places);

  it("covers all 56 places from FHWA's measured roughness, the average where unmeasured", () => {
    expect(places).toHaveLength(56);
    const bases = PLACE_OUTCOME_BASES[ROADS]!.places;
    expect(bases["US-AL"]).toBe(8.4);
    expect(bases["US-PR"]).toBe(82.2);
    expect(bases["US-GU"]).toBe(18.4);
  });

  it("enacting one smooths the roads after five years and more by year twelve, and repealing one undoes it, everywhere", () => {
    const early = 1 + size("fix-it-first-to-poor-roads");
    const later = 1 + size("fix-it-first-to-poor-roads-later");
    expect(early).toBeCloseTo(0.82, 9);
    expect(early * later).toBeCloseTo(0.6232, 4);
    for (const placeKey of places) {
      const id = stateJurisdictionForKey(placeKey)!.id;
      const base = PLACE_OUTCOME_BASES[ROADS]!.places[placeKey]!;
      const began =
        lawInForceAtStart(
          enacted(id, "no"),
          id,
          FIX,
          makeIsoDate("2026-01-01"),
        ) === "yes";
      const changed = enacted(id, began ? "no" : "yes");
      const kept = enacted(id, began ? "yes" : "no");
      const at = (month: string) => valueIn(changed, ROADS, placeKey, month);
      // Nothing moves before the first repaving cycle is done.
      expect(at("2031-11-01"), placeKey).toBe(base);
      const expectedEarly = began ? base / early : base * early;
      const expectedLater = began
        ? base / (early * later)
        : base * early * later;
      expect(at("2032-02-01"), placeKey).toBeCloseTo(expectedEarly, 1);
      expect(at("2039-08-01"), placeKey).toBeCloseTo(
        Math.min(99, expectedLater),
        1,
      );
      expect(valueIn(kept, ROADS, placeKey, "2039-08-01"), placeKey).toBe(base);
    }
  });

  it("the roads a law smoothed lower prices, and the roads' own level does not", () => {
    const placeKey = "US-OH";
    const id = stateJurisdictionForKey(placeKey)!.id;
    const world = enacted(id, "yes");
    const month = makeIsoDate("2032-02-01");
    const roads = placeOutcomesForMonth(world, month, [ROADS]);
    const recorded = {
      ...world,
      placeOutcomes: { months: [{ month, records: roads }] },
    } as unknown as World;
    const pricesBase = PLACE_OUTCOME_BASES[PRICES]!.places[placeKey]!;
    const roadsBase = PLACE_OUTCOME_BASES[ROADS]!.places[placeKey]!;
    const moved = roadsBase * size("fix-it-first-to-poor-roads");
    expect(valueIn(world, PRICES, placeKey, "2032-03-01")).toBe(pricesBase);
    expect(valueIn(recorded, PRICES, placeKey, "2032-03-01")).toBeCloseTo(
      pricesBase * (1 + size("poor-roads-to-prices") * moved),
      2,
    );
    expect(valueIn(recorded, PRICES, placeKey, "2032-03-01")).toBeLessThan(
      pricesBase,
    );
  });
});
