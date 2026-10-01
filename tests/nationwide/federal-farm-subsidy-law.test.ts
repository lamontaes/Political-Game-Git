import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  CUT_FARM_SUBSIDIES_QUESTION,
  farmPaymentsCutPctOfLandValue,
} from "../../src/simulation/federal-farm-subsidy-law";
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
 * A federal law that cuts farm subsidies, watched in a place drawn from all
 * 56: farmland values there fall by the multiple of the payments cut that the
 * research gives, a year after the law takes effect, and come back when a
 * later law restores the payments.
 */

const SEED = "federal-farm-subsidies";
const POLICY = createProductionPolicyCatalog();
const LAND = "farmland.value-per-acre";
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === CUT_FARM_SUBSIDIES_QUESTION,
)!;

const ALL_PLACES = lifePlaceStateIdentities();
const PLACES = ALL_PLACES.filter(
  (place) => PLACE_OUTCOME_BASES[LAND]!.places[place.jurisdictionKey],
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
    id: `measure_farm_${n}` as EntityId,
    stableKey: `test:farm:${n}`,
    sequence: n,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${n}`,
    shortTitle: "A farm act",
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
    id: `enactment_farm_${n}` as EntityId,
    stableKey: `test:farm:${n}:enactment`,
    sequence: 1000 + n,
    measureId: measure.id,
    resolvedAt: addDays(effectiveAt, -30),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_farm_${n}` as EntityId,
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
          { month, records: placeOutcomesForMonth(world, month, [LAND]) },
        ],
      },
    } as World;
    const next = new Date(`${month}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    month = makeIsoDate(next.toISOString().slice(0, 10));
  }
  return world;
}

describe("a federal law that cuts farm subsidies", () => {
  const link = OUTCOME_LINKS.find(
    (row) => row.key === "farm-payments-cut-to-land-values",
  )!;

  it("is a built link from the payments cut to farmland values, with a base in all 56 places", () => {
    expect(link.from).toBe("federal.farm-payments-cut-pct-of-land-value");
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(PLACES).toHaveLength(56);
  });

  it("gives every one of the 56 places a payments cut that starts at zero", () => {
    const world = worldWith([act(1, "yes", makeIsoDate("2027-01-01"))]);
    for (const place of ALL_PLACES) {
      expect(
        farmPaymentsCutPctOfLandValue(
          world,
          place.jurisdictionKey,
          makeIsoDate("2026-12-31"),
        ),
        place.jurisdictionKey,
      ).toBe(0);
      const later = farmPaymentsCutPctOfLandValue(
        world,
        place.jurisdictionKey,
        makeIsoDate("2027-01-02"),
      );
      expect(later, place.jurisdictionKey).toBeGreaterThan(0);
      expect(later, place.jurisdictionKey).toBeLessThan(5);
    }
  });

  it(`lowers farmland values in ${PLACE.name} (seed ${SEED}) a year after the law, and a later law brings them back a year after that`, () => {
    const start = makeIsoDate("2027-01-01");
    const end = makeIsoDate("2031-01-01");
    const world = run(worldWith([act(1, "yes", start), act(2, "no", end)]), 80);
    const size = drawnLinkSize(world, link, STATE);
    expect(size).toBeGreaterThanOrEqual(-0.3);
    expect(size).toBeLessThanOrEqual(-0.13);
    const records = placeOutcomeRecords(world).filter(
      (record) =>
        record.measure === LAND && record.placeKey === PLACE.jurisdictionKey,
    );
    const at = (date: string) =>
      records.find((record) => record.month >= makeIsoDate(date))!;
    const cause = (date: string) =>
      at(date).causes.find((entry) => entry.key === link.key);
    const cut = (date: string) =>
      farmPaymentsCutPctOfLandValue(
        world,
        PLACE.jurisdictionKey,
        makeIsoDate(date),
      )!;

    // Before the law, and in its first year while land trades, nothing moves.
    expect(cause("2026-12-01")).toBeUndefined();
    expect(cause("2027-06-01")).toBeUndefined();

    // A year after it takes effect: land is worth less by the drawn multiple
    // of the payments cut.
    const after = cause("2028-03-01")!;
    expect(after.factor).toBeCloseTo(1 + size * cut("2028-03-01"), 10);
    expect(after.factor).toBeLessThan(1);
    expect(at("2028-03-01").multiplier).toBeLessThan(1);

    // The later law restores the payments the day it takes effect; land
    // values recover as land trades, a year later, mirroring the year they
    // took to fall.
    expect(cut("2031-02-01")).toBe(0);
    expect(cause("2031-02-01")!.factor).toBeLessThan(1);
    expect(cause("2032-03-01")).toBeUndefined();
  });
});
