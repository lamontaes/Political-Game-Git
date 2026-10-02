import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  EXPAND_PASSENGER_RAIL_QUESTION,
  railExpansionPct,
  passengerRailAppropriationAt,
} from "../../src/simulation/federal-passenger-rail";
import { createHistoryStore } from "../../src/simulation/history";
import { stableHash } from "../../src/simulation/ids";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import {
  OUTCOME_LINKS,
  outcomeLinkStatus,
} from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
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

/** Rail funding alone is not a saved service or a delivered ride. */

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

function act(
  n: number,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
  amount = 4500,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
  amount: number;
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
  return { measure, enactment, amount };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  return {
    seed: SEED,
    currentDate: makeIsoDate("2028-06-01"),
    jurisdictions: {
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    policyCatalog: POLICY,
    history: {
      ...createHistoryStore(),
      nextSequence: 2000,
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
      legislativeProvisions: laws.map(({ measure, enactment, amount }) => ({
        id: `provision_${measure.id}`,
        sequence: 500 + measure.sequence,
        measureId: measure.id,
        recordedAt: enactment.resolvedAt,
        supersedesProvisionId: null,
        applicationScope: {
          jurisdictionId: measure.jurisdictionId,
          segmentKey: null,
        },
        lawTerms: [
          {
            questionKey: EXPAND_PASSENGER_RAIL_QUESTION,
            key: "appropriation",
            unit: "dollars/year",
            value: amount,
          },
        ],
      })),
    },
  } as unknown as World;
}

describe("federal passenger rail reads adopted funding, not projected riders", () => {
  const link = OUTCOME_LINKS.find(
    (row) => row.key === "federal-rail-expansion-to-riders",
  )!;
  it("retains the sourced rider link and its recorded served-place bases", () => {
    expect(link.from).toBe("federal.rail-expansion-pct");
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(PLACES).toHaveLength(47);
    expect(ALL_PLACES).toHaveLength(56);
  });
  it("reads the bill's own annual appropriation at its operative date and ends it on repeal", () => {
    const funding = act(1, "yes", makeIsoDate("2027-01-01"), 4500);
    const repeal = act(2, "no", makeIsoDate("2029-01-01"));
    const world = worldWith([funding, repeal]);
    expect(
      passengerRailAppropriationAt(world, makeIsoDate("2026-12-31")).amount,
    ).toBe(0);
    expect(
      passengerRailAppropriationAt(world, makeIsoDate("2027-01-01")),
    ).toMatchObject({ amount: 4500, law: { measureId: funding.measure.id } });
    expect(
      passengerRailAppropriationAt(world, makeIsoDate("2029-01-01")).amount,
    ).toBe(0);
    expect(railExpansionPct(world, makeIsoDate("2029-01-01"))).toBe(0);
  });
  it(`does not report delivered riders in ${PLACE.name} from appropriation alone (seed ${SEED})`, () => {
    const world = worldWith([act(1, "yes", makeIsoDate("2027-01-01"))]);
    expect(railExpansionPct(world, makeIsoDate("2026-12-31"))).toBe(0);
    expect(railExpansionPct(world, world.currentDate)).toBeNull();
    expect(railExpansionPct(world, makeIsoDate("2042-01-01"))).toBeNull();
    const records = placeOutcomesForMonth(world, world.currentDate, [RIDERS]);
    expect(
      records.find((row) => row.placeKey === PLACE.jurisdictionKey),
    ).toBeDefined();
    expect(
      records
        .find((row) => row.placeKey === PLACE.jurisdictionKey)!
        .causes.some((cause) => cause.key === link.key),
    ).toBe(false);
  });
});
