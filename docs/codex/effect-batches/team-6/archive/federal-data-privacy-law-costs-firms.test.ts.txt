import { describe, expect, it } from "vitest";

import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { addDays } from "../../src/simulation/dates";
import {
  DATA_PRIVACY_COST_RANGE,
  NATIONAL_DATA_PRIVACY_QUESTION,
  dataPrivacyCostOn,
} from "../../src/simulation/federal-data-privacy-law";
import { townBusinesses } from "../../src/simulation/living-world/town-businesses";
import { stepTownFinances } from "../../src/simulation/living-world/town-finances";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * A national data privacy law adds a share of every business's yearly costs
 * from the day it takes effect, and a repeal takes it off. The town is the
 * observer's random draw from all 56 places.
 */
const SEED = "b13-federal-privacy-3c91";

function law(
  world: World,
  n: number,
  answer: "yes" | "no",
  resolvedAt: IsoDate,
): World {
  const question = world.policyCatalog!.propositionOrder.find(
    (id) =>
      world.policyCatalog!.propositions[id]!.stableKey ===
      NATIONAL_DATA_PRIVACY_QUESTION,
  )!;
  const measure = {
    id: `measure_privacy_${n}` as EntityId,
    stableKey: `test:privacy:${n}`,
    sequence: 90000 + n,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `HR ${n}`,
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: resolvedAt,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  } as unknown as LegislativeMeasureRecord;
  const enactment = {
    id: `enactment_privacy_${n}` as EntityId,
    stableKey: `test:privacy:${n}:enactment`,
    sequence: 91000 + n,
    measureId: measure.id,
    resolvedAt,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: resolvedAt,
    outcomeEventId: `event_privacy_${n}` as EntityId,
  } as unknown as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [...world.history.legislativeMeasures, measure],
      legislativeEnactments: [
        ...world.history.legislativeEnactments,
        enactment,
      ],
    },
  };
}

describe("Build 13: a national data privacy law costs firms", () => {
  const opened = openObserverWorld(observerSetup(SEED));
  const town = opened.world.people[opened.anchorPersonId]!.homeJurisdictionId!;
  let world: World = opened.world;
  for (let month = 0; month < 12; month += 1)
    world = advanceObservedWorld(world, 30);

  const businesses = townBusinesses(world, town).map((business) => ({
    organizationId: business.organizationId,
    kind: business.workplace.key,
    newcomer: business.outlet >= business.workplace.outlets,
  }));
  const cashAfter = (from: World) => {
    const step = stepTownFinances(from, town, businesses, new Set(), "test");
    return Object.fromEntries(
      Object.entries(step.world.townFinances!.businesses).map(([id, b]) => [
        id,
        b.cash,
      ]),
    );
  };

  it("reads no cost before a law and the drawn share after one, inside the sourced range", () => {
    expect(dataPrivacyCostOn(world, world.currentDate).share).toBe(0);
    const passed = law(world, 1, "yes", addDays(world.currentDate, -10));
    const cost = dataPrivacyCostOn(passed, world.currentDate);
    expect(cost.lawMeasureIds).toHaveLength(1);
    expect(cost.share).toBeGreaterThanOrEqual(DATA_PRIVACY_COST_RANGE[0]);
    expect(cost.share).toBeLessThanOrEqual(DATA_PRIVACY_COST_RANGE[1]);
  });

  it(`leaves every business with less cash in ${observerPlace(SEED).displayName}, and a repeal gives it back`, () => {
    const without = cashAfter(world);
    const passed = law(world, 1, "yes", addDays(world.currentDate, -10));
    const withLaw = cashAfter(passed);
    const repealed = law(passed, 2, "no", addDays(world.currentDate, -1));
    const afterRepeal = cashAfter(repealed);
    const ids = Object.keys(without);
    expect(ids.length).toBeGreaterThan(3);
    // A business already at zero cash on a credit line has no cash left to
    // lose; the rest each pay.
    expect(
      ids.filter((id) => withLaw[id]! < without[id]!).length,
    ).toBeGreaterThan(ids.length / 2);
    for (const id of ids) {
      expect(withLaw[id]!).toBeLessThanOrEqual(without[id]!);
      expect(afterRepeal[id]!).toBeCloseTo(without[id]!, 6);
    }
  });
});
