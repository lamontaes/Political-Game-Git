import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  EXPAND_PASSENGER_RAIL_QUESTION,
  RAIL_PLAN_RISE_PCT,
  railExpansionPct,
} from "../../src/simulation/federal-passenger-rail";
import { stableHash } from "../../src/simulation/ids";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import {
  drawnLinkSize,
  OUTCOME_LINKS,
  outcomeLinkStatus,
} from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeRecords,
  placeOutcomesForMonth,
} from "../../src/simulation/outcome-web/place-outcomes";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * A federal law that pays to expand passenger rail, watched in a place drawn
 * from every place Amtrak serves: no added riders until the first added
 * service, then riders grow with the plan, and a later law ends it.
 */

const SEED = "federal-passenger-rail";
const POLICY = createProductionPolicyCatalog();
const RIDERS = "rail.intercity-ridership";
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === EXPAND_PASSENGER_RAIL_QUESTION,
)!;

const ALL_PLACES = lifePlaceStateIdentities();
// Places with no Amtrak station have no riders to move; the plan's share is
// checked in all 56.
const PLACES = ALL_PLACES.filter(
  (place) => PLACE_OUTCOME_BASES[RIDERS]!.places[place.jurisdictionKey],
);
const PLACE =
  PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;
const STATE = stateJurisdictionForKey(PLACE.jurisdictionKey)!.id;

function act(
  n: number,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const measure: LegislativeMeasureRecord = {
    id: `measure_rail_${n}` as EntityId,
    stableKey: `test:rail:${n}`,
    sequence: n,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${n}`,
    shortTitle: "A passenger rail act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: addDays(effectiveAt, -90),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [QUESTION],
    propositionAnswers: [{ propositionId: QUESTION, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_rail_${n}` as EntityId,
    stableKey: `test:rail:${n}:enactment`,
    sequence: 1000 + n,
    measureId: measure.id,
    resolvedAt: addDays(effectiveAt, -30),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_rail_${n}` as EntityId,
  };
  return { measure, enactment };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  return {
    seed: SEED,
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
}

/** Monthly rider records from January 2026 for `months` months. */
function run(start: World, months: number): World {
  let world = start;
  let month = makeIsoDate("2026-01-01");
  for (let index = 0; index < months; index += 1) {
    world = {
      ...world,
      currentDate: month,
      placeOutcomes: {
        months: [
          ...(world.placeOutcomes?.months ?? []),
          { month, records: placeOutcomesForMonth(world, month, [RIDERS]) },
        ],
      },
    } as World;
    const next = new Date(`${month}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    month = makeIsoDate(next.toISOString().slice(0, 10));
  }
  return world;
}

describe("a federal law that pays to expand passenger rail", () => {
  const link = OUTCOME_LINKS.find(
    (row) => row.key === "federal-rail-expansion-to-riders",
  )!;

  it("is a built link from the plan's projected riders to Amtrak's riders", () => {
    expect(link.from).toBe("federal.rail-expansion-pct");
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(PLACES).toHaveLength(47);
  });

  it("gives all 56 places the same plan share: none before the first added service, the whole plan at 15 years", () => {
    expect(ALL_PLACES).toHaveLength(56);
    const world = worldWith([act(1, "yes", makeIsoDate("2027-01-01"))]);
    expect(railExpansionPct(world, makeIsoDate("2026-12-31"))).toBe(0);
    expect(railExpansionPct(world, makeIsoDate("2029-06-30"))).toBe(0);
    expect(railExpansionPct(world, makeIsoDate("2030-01-01"))).toBeGreaterThan(
      0,
    );
    expect(railExpansionPct(world, makeIsoDate("2042-01-01"))).toBeCloseTo(
      RAIL_PLAN_RISE_PCT,
      10,
    );
    expect(railExpansionPct(world, makeIsoDate("2050-01-01"))).toBeCloseTo(
      RAIL_PLAN_RISE_PCT,
      10,
    );
    // Places with no Amtrak station have no rider record to move.
    const unserved = ALL_PLACES.filter(
      (place) => !PLACE_OUTCOME_BASES[RIDERS]!.places[place.jurisdictionKey],
    ).map((place) => place.jurisdictionKey);
    expect(unserved.sort()).toEqual([
      "US-AK",
      "US-AS",
      "US-GU",
      "US-HI",
      "US-MP",
      "US-PR",
      "US-SD",
      "US-VI",
      "US-WY",
    ]);
  });

  it(`raises Amtrak riders in ${PLACE.name} (seed ${SEED}) once the first added service runs, and a later law ends it`, () => {
    const start = makeIsoDate("2026-02-01");
    const end = makeIsoDate("2031-02-01");
    const world = run(worldWith([act(1, "yes", start), act(2, "no", end)]), 64);
    const size = drawnLinkSize(world, link, STATE);
    const records = placeOutcomeRecords(world).filter(
      (record) =>
        record.measure === RIDERS && record.placeKey === PLACE.jurisdictionKey,
    );
    const at = (date: string) =>
      records.find((record) => record.month >= makeIsoDate(date))!;
    const cause = (date: string) =>
      at(date).causes.find((entry) => entry.key === link.key);

    // Nothing moves until the first added service, 30 months in.
    expect(cause("2028-08-01")).toBeUndefined();
    // Then riders grow with the plan, by the drawn share of it.
    const threeYears = cause("2029-02-01")!;
    expect(threeYears.factor).toBeCloseTo(
      1 + size * railExpansionPct(world, at("2029-02-01").month),
      10,
    );
    expect(threeYears.factor).toBeGreaterThan(1);
    const fiveYears = cause("2031-01-01")!;
    expect(fiveYears.factor).toBeGreaterThan(threeYears.factor);
    expect(size).toBeGreaterThanOrEqual(0.00205);
    expect(size).toBeLessThanOrEqual(0.00767);
    // A law that ends the expansion takes the added riders away with it.
    expect(cause("2031-03-01")).toBeUndefined();
  });
});
