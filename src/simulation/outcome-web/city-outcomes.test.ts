import { describe, expect, it } from "vitest";
import { crimeRateMultiplier } from "../crime/causes";
import { makeIsoDate } from "../dates";
import {
  lifePlaceByKey,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { STATES } from "../state-reference";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  areaResidents,
  localOutcomeKey,
  localResidents,
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  placeOutcomeAt,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "./place-outcomes";

/*
 * City outcomes: a city or county that has enacted a law keeps its own place
 * outcomes, so its ordinances move them there, and its state's value is the
 * average of its places weighted by residents. One rule for every place. The
 * world is partial and unseeded, so nothing drifts and each link acts at its
 * central size.
 */

const OVERSIGHT = "proposition_civilian_oversight" as EntityId;
const OVERSIGHT_KEY =
  "us-policy-positions:justice-public-safety.civilian-oversight-of-police";
const CRIME = "crime.violent";
/** Illinois's 2024 violent crime rate, per 100,000 residents. */
const ILLINOIS_BASE = PLACE_OUTCOME_BASES[CRIME]!.places["US-IL"]!;

const chicago = lifePlaceByKey("1714000")!;
const springfield = lifePlaceByKey("1772000")!;
const illinois = stateJurisdictionForKey("US-IL")!.id;

function ordinance(
  jurisdictionId: EntityId,
  tag: string,
  answer: "yes" | "no",
  effectiveAt: string,
  sequence = 1,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${tag}_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${tag}:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `ORD ${sequence}`,
      shortTitle: "Civilian Oversight of Police Ordinance",
      summary: "A test ordinance.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [OVERSIGHT],
      propositionAnswers: [{ propositionId: OVERSIGHT, answer }],
    },
    enactment: {
      id: `enactment_${tag}_${sequence}` as EntityId,
      stableKey: `test:${tag}:${sequence}:enactment`,
      sequence: 1000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_${tag}_${sequence}` as EntityId,
    },
  };
}

function worldWith(
  laws: readonly ReturnType<typeof ordinance>[],
  months: readonly {
    month: IsoDate;
    records: readonly PlaceOutcomeRecord[];
  }[] = [],
): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        [OVERSIGHT]: { id: OVERSIGHT, stableKey: OVERSIGHT_KEY },
      },
    },
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
    placeOutcomes: { months },
  } as unknown as World;
}

/** The world after its monthly passes from `from` through `through`. */
function run(
  laws: readonly ReturnType<typeof ordinance>[],
  from: string,
  through: string,
): World {
  let world = worldWith(laws);
  let month = makeIsoDate(from);
  while (month <= through) {
    const records = placeOutcomesForMonth(world, month);
    world = worldWith(laws, [
      ...(world.placeOutcomes?.months ?? []),
      { month, records },
    ]);
    const date = new Date(`${month}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    month = makeIsoDate(date.toISOString().slice(0, 10));
  }
  return world;
}

describe("city outcomes", () => {
  it("a city ordinance moves its city's outcome and, by the city's share of residents, its state's", () => {
    const chicagoId = chicago.context.jurisdiction.id;
    const world = run(
      [ordinance(chicagoId, "chi", "yes", "2026-03-01")],
      "2026-01-01",
      "2027-06-01",
    );
    const share = localResidents("1714000")! / areaResidents("US-IL")!;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.23);

    // Before the ordinance passed, Chicago kept nothing of its own.
    const january = placeOutcomeAt(
      world,
      CRIME,
      chicagoId,
      makeIsoDate("2026-01-31"),
    )!;
    expect(january.placeKey).toBe("US-IL");

    // Civilian oversight acts after 12 months: 2% less crime, in Chicago.
    const own = placeOutcomeAt(
      world,
      CRIME,
      chicagoId,
      makeIsoDate("2027-06-01"),
    )!;
    expect(own.placeKey).toBe("1714000");
    expect(own.stateKey).toBe("US-IL");
    expect(own.weight).toBeCloseTo(share, 10);
    expect(own.multiplier).toBeCloseTo(0.98, 10);
    expect(own.value).toBeCloseTo(ILLINOIS_BASE * 0.98, 2);
    expect(own.causes.map((cause) => cause.key)).toEqual([
      "civilian-oversight-to-crime",
    ]);

    // Illinois is the average of Chicago and the rest of the state.
    const state = placeOutcomeAt(
      world,
      CRIME,
      illinois,
      makeIsoDate("2027-06-01"),
    )!;
    expect(state.placeKey).toBe("US-IL");
    expect(state.causes).toEqual([]);
    expect(state.places).toEqual([
      { placeKey: "1714000", weight: own.weight, multiplier: own.multiplier },
    ]);
    expect(state.multiplier).toBeCloseTo(1 - 0.02 * share, 10);
    expect(state.value).toBeCloseTo(ILLINOIS_BASE * (1 - 0.02 * share), 2);
    expect(state.restMultiplier).toBe(1);

    // Springfield, which passed nothing, reads Illinois.
    const elsewhere = placeOutcomeAt(
      world,
      CRIME,
      springfield.context.jurisdiction.id,
      makeIsoDate("2027-06-01"),
    )!;
    expect(elsewhere.placeKey).toBe("US-IL");
    expect(elsewhere.multiplier).toBe(1);
    expect(elsewhere.value).toBe(ILLINOIS_BASE);
    expect(elsewhere.places).toBeUndefined();

    // And Chicago's own crimes follow its own level, not Springfield's.
    const inChicago = crimeRateMultiplier(
      world,
      chicagoId,
      "assault",
      makeIsoDate("2027-06-15"),
    );
    const inSpringfield = crimeRateMultiplier(
      world,
      springfield.context.jurisdiction.id,
      "assault",
      makeIsoDate("2027-06-15"),
    );
    expect(inChicago.multiplier).toBeLessThan(inSpringfield.multiplier);
  });

  it("a repeal ends the effect in the city once the law in force changes", () => {
    const chicagoId = chicago.context.jurisdiction.id;
    const world = run(
      [
        ordinance(chicagoId, "chi", "yes", "2026-03-01", 1),
        ordinance(chicagoId, "chi", "no", "2027-09-01", 2),
      ],
      "2026-01-01",
      "2028-10-01",
    );
    const at = (date: string) =>
      placeOutcomeAt(world, CRIME, chicagoId, makeIsoDate(date))!.multiplier;
    expect(at("2027-06-01")).toBeCloseTo(0.98, 10);
    expect(at("2028-10-01")).toBe(1);
  });

  it("one rule for all 56 places: a local law keeps its own record wherever the state has a base", () => {
    const keys = Object.keys(STATES).map((usps) => `US-${usps}`);
    expect(keys).toHaveLength(56);
    const laws = keys.flatMap((key, index) => {
      const town = searchLifePlaces("", 5, {
        stateJurisdictionKey: key,
        scope: "locality",
      })[0];
      return town
        ? [
            ordinance(
              town.context.jurisdiction.id,
              key,
              "yes",
              "2026-03-01",
              index + 1,
            ),
          ]
        : [];
    });
    // Every state, D.C. and territory has a town to pass one.
    expect(laws).toHaveLength(56);
    const records = placeOutcomesForMonth(
      worldWith(laws),
      makeIsoDate("2026-04-01"),
    );
    const ownRecords = records.filter((record) => record.stateKey);
    // Every place with a base for some outcome, but D.C., which has no city
    // under it.
    const withBase = keys.filter(
      (key) =>
        key !== "US-DC" &&
        PLACE_OUTCOME_MEASURES.some(
          (measure) => PLACE_OUTCOME_BASES[measure]!.places[key] !== undefined,
        ),
    );
    expect(new Set(ownRecords.map((record) => record.stateKey)).size).toBe(
      withBase.length,
    );
    for (const key of keys) {
      const law = laws.find((entry) =>
        entry.measure.stableKey.startsWith(`test:${key}:`),
      );
      const localKey = law ? localOutcomeKey(law.measure.jurisdictionId) : null;
      for (const measure of PLACE_OUTCOME_MEASURES) {
        const hasBase = PLACE_OUTCOME_BASES[measure]!.places[key] !== undefined;
        const state = records.find(
          (record) => record.measure === measure && record.placeKey === key,
        );
        const own = localKey
          ? records.find(
              (record) =>
                record.measure === measure && record.placeKey === localKey,
            )
          : undefined;
        // No base: nothing recorded for the state or its towns (unknown, never 0).
        expect(state !== undefined, `${key} ${measure}`).toBe(hasBase);
        if (!hasBase || !localKey) {
          expect(own, `${key} ${measure}`).toBeUndefined();
          continue;
        }
        expect(own, `${key} ${measure}`).toBeDefined();
        expect(own!.stateKey).toBe(key);
        expect(own!.structural).toBe(state!.structural);
        // A known share is weighed into the state; an unknown one is left out.
        const weighed = (state!.places ?? []).map((share) => share.placeKey);
        expect(weighed, `${key} ${measure}`).toEqual(
          own!.weight === null ? [] : [localKey],
        );
      }
    }
    // D.C. is one place: the Council's law is the District's, with no city under it.
    const dc = laws.find((entry) =>
      entry.measure.stableKey.startsWith("test:US-DC:"),
    );
    if (dc) expect(localOutcomeKey(dc.measure.jurisdictionId)).toBeNull();
    // Every state and D.C. has a resident count.
    for (const usps of Object.keys(STATES))
      if (!["PR", "GU", "VI", "AS", "MP"].includes(usps))
        expect(areaResidents(`US-${usps}`), usps).toBeGreaterThan(0);
  });

  it("a county and a city inside it are not counted twice in their state", () => {
    const cook = lifePlaceByKey("county:17031")!;
    expect(cook.scope).toBe("county");
    const world = worldWith([
      ordinance(chicago.context.jurisdiction.id, "chi", "yes", "2026-03-01", 1),
      ordinance(cook.context.jurisdiction.id, "cook", "yes", "2026-03-01", 2),
    ]);
    const records = placeOutcomesForMonth(world, makeIsoDate("2026-04-01"));
    const state = records.find(
      (record) => record.measure === CRIME && record.placeKey === "US-IL",
    )!;
    const weights = Object.fromEntries(
      state.places!.map((share) => [share.placeKey, share.weight]),
    );
    const total = areaResidents("US-IL")!;
    expect(weights["1714000"]).toBeCloseTo(
      localResidents("1714000")! / total,
      10,
    );
    expect(weights["county:17031"]).toBeCloseTo(
      (areaResidents("17031")! - localResidents("1714000")!) / total,
      10,
    );
  });
});
