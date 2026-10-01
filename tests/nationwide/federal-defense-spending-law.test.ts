import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  DEFENSE_BUILD_UP_MAX_YEARS,
  DEFENSE_BUILD_UP_YEARLY_RISE,
  defenseBoostPct,
  GROW_DEFENSE_SPENDING_QUESTION,
} from "../../src/simulation/federal-defense-spending";
import { stableHash } from "../../src/simulation/ids";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import {
  researchedLinkSize,
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
 * A federal law that grows defense spending faster than inflation, watched in
 * a state drawn from all 56 places: earnings there rise as the contracts it
 * draws grow, stop growing at the longest run on record, and go back when a
 * later law ends the build-up.
 */

const SEED = "federal-defense-spending";
const POLICY = createProductionPolicyCatalog();
const EARNINGS = "labor.median-earnings";
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === GROW_DEFENSE_SPENDING_QUESTION,
)!;

const ALL_PLACES = lifePlaceStateIdentities();
// The four territories with no earnings base cannot show the outcome; the
// measure itself is checked in all 56.
const PLACES = ALL_PLACES.filter(
  (place) => PLACE_OUTCOME_BASES[EARNINGS]!.places[place.jurisdictionKey],
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
    id: `measure_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}`,
    sequence: n,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${n}`,
    shortTitle: "A defense act",
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
    id: `enactment_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}:enactment`,
    sequence: 1000 + n,
    measureId: measure.id,
    resolvedAt: addDays(effectiveAt, -30),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_defense_${n}` as EntityId,
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

/** Monthly earnings records from January 2026 for `months` months. */
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
          { month, records: placeOutcomesForMonth(world, month, [EARNINGS]) },
        ],
      },
    } as World;
    const next = new Date(`${month}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    month = makeIsoDate(next.toISOString().slice(0, 10));
  }
  return world;
}

describe("a federal law that grows defense spending", () => {
  const link = OUTCOME_LINKS.find(
    (row) => row.key === "defense-contracts-to-earnings",
  )!;

  it("is a built link from the extra contracts to earnings", () => {
    expect(link.from).toBe("federal.defense-boost-pct");
    expect(outcomeLinkStatus(link)).toBe("built");
  });

  it("gives every one of the 56 places a boost that starts at zero and grows with the law", () => {
    expect(ALL_PLACES).toHaveLength(56);
    const world = worldWith([act(1, "yes", makeIsoDate("2027-01-01"))]);
    let biggest = { key: "", pct: 0 };
    for (const place of ALL_PLACES) {
      expect(
        defenseBoostPct(
          world,
          place.jurisdictionKey,
          makeIsoDate("2026-12-31"),
        ),
        place.jurisdictionKey,
      ).toBe(0);
      const later = defenseBoostPct(
        world,
        place.jurisdictionKey,
        makeIsoDate("2029-01-01"),
      );
      expect(later, place.jurisdictionKey).toBeGreaterThan(0);
      if (later! > biggest.pct)
        biggest = { key: place.jurisdictionKey, pct: later! };
    }
    // The places that draw the most contracts gain the most.
    expect(["US-DC", "US-GU", "US-VA", "US-HI"]).toContain(biggest.key);
  });

  it(`raises earnings in ${PLACE.name} (seed ${SEED}) as the contracts grow, stops at the longest run on record, and a later law brings them back`, () => {
    const start = makeIsoDate("2027-01-01");
    const end = makeIsoDate("2033-01-01");
    const world = run(
      worldWith([act(1, "yes", start), act(2, "no", end)]),
      100,
    );
    const size = researchedLinkSize(world, link, STATE);
    const records = placeOutcomeRecords(world).filter(
      (record) =>
        record.measure === EARNINGS &&
        record.placeKey === PLACE.jurisdictionKey,
    );
    const at = (date: string) =>
      records.find((record) => record.month >= makeIsoDate(date))!;
    const cause = (date: string) =>
      at(date).causes.find((entry) => entry.key === link.key);
    const boost = (date: string) =>
      defenseBoostPct(world, PLACE.jurisdictionKey, makeIsoDate(date));

    // Before the law takes effect nothing moves.
    expect(cause("2026-12-01")).toBeUndefined();

    // Two years in, earnings sit above where they would be without it, by
    // the build-up's share of the state's output times the drawn size.
    const twoYears = cause("2029-01-01")!;
    expect(twoYears.factor).toBeCloseTo(
      1 + size * boost(at("2029-01-01").month)!,
      10,
    );
    expect(twoYears.factor).toBeGreaterThan(1);
    expect(at("2029-01-01").multiplier).toBeGreaterThan(1);

    // It keeps growing, up to the longest run on record and no further.
    const later = cause("2030-06-01")!;
    expect(later.factor).toBeGreaterThan(twoYears.factor);
    const cap =
      (1 + DEFENSE_BUILD_UP_YEARLY_RISE) ** DEFENSE_BUILD_UP_MAX_YEARS - 1;
    expect(boost("2032-02-01")).toBeCloseTo(boost("2032-11-01") ?? 0, 10);
    expect(cap).toBeGreaterThan(0.3);

    // A law that ends the build-up brings earnings back the day it takes effect.
    expect(cause("2033-02-01")).toBeUndefined();
  });
});
