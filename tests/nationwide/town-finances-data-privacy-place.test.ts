import { describe, expect, it } from "vitest";
import {
  advanceObservedWorld,
  openObserverWorld,
  observerSetup,
} from "../../src/presentation/observer-world";
import { requireLifePlace } from "../../src/simulation/life-places";
import { addDays } from "../../src/simulation/dates";
import {
  DATA_PRIVACY_COST_RANGE,
  NATIONAL_DATA_PRIVACY_QUESTION,
  dataPrivacyCostOn,
} from "../../src/simulation/federal-data-privacy-law";
import {
  townDataPrivacyCostOn,
  stepTownFinances,
} from "../../src/simulation/living-world/town-finances";
import { townBusinesses } from "../../src/simulation/living-world/town-businesses";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation/types";
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
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

describe("GDPR-derived business cost keyed by actual town", () => {
  it("charges the town's drawn share to actual business books and removes it on repeal", () => {
    const opened = openObserverWorld(
      observerSetup("privacy-place-business-books"),
    );
    const world = advanceObservedWorld(opened.world, 92);
    const town = world.people[opened.anchorPersonId]!.homeJurisdictionId;
    const businesses = townBusinesses(world, town).map((row) => ({
      organizationId: row.organizationId,
      kind: row.workplace.key,
      newcomer: row.outlet >= row.workplace.outlets,
    }));
    const booksAfter = (from: World) =>
      stepTownFinances(
        from,
        town,
        businesses,
        new Set(),
        "privacy-place-fixture",
      ).world.townFinances!.businesses;
    const without = booksAfter(world);
    const passed = law(world, 1, "yes", world.currentDate);
    const withLaw = booksAfter(passed);
    const afterRepeal = booksAfter(law(passed, 2, "no", world.currentDate));
    const ids = businesses
      .map((row) => row.organizationId)
      .filter((id) => without[id] !== undefined);
    expect(ids.length).toBeGreaterThan(3);
    expect(ids.some((id) => withLaw[id]!.cash < without[id]!.cash)).toBe(true);
    for (const id of ids) {
      expect(withLaw[id]!.cash).toBeLessThanOrEqual(without[id]!.cash);
      expect(afterRepeal[id]!.cash).toBeCloseTo(without[id]!.cash, 6);
    }
  }, 180_000);
  it("draws separate stable place sizes within the existing research range", () => {
    const world = openObserverWorld(
      observerSetup("privacy-place-regression"),
    ).world;
    const passed = law(world, 1, "yes", world.currentDate);
    const towns = ["2146027", "1608830", "1571550"].map(
      (key) => requireLifePlace(key).context.jurisdiction.id,
    );
    expect(towns.length).toBeGreaterThan(1);
    const before = JSON.stringify(passed);
    const costs = towns
      .slice(0, 8)
      .map((town) => townDataPrivacyCostOn(passed, town));
    for (const cost of costs) {
      expect(cost.share).toBeGreaterThanOrEqual(DATA_PRIVACY_COST_RANGE[0]);
      expect(cost.share).toBeLessThanOrEqual(DATA_PRIVACY_COST_RANGE[1]);
      expect(cost.lawMeasureIds).toEqual(
        dataPrivacyCostOn(passed, world.currentDate).lawMeasureIds,
      );
    }
    expect(new Set(costs.map((row) => row.share)).size).toBeGreaterThan(1);
    const town = towns[0]!;
    expect(townDataPrivacyCostOn(passed, town)).toEqual(costs[0]);
    expect(townDataPrivacyCostOn(JSON.parse(before), town)).toEqual(costs[0]);
    expect(
      townDataPrivacyCostOn(passed, town, addDays(world.currentDate, 90)),
    ).toEqual(costs[0]);
    expect(JSON.stringify(passed)).toBe(before);
  });
  it("keeps no-law, pre-enactment and repeal costs at zero with original provenance", () => {
    const world = openObserverWorld(
      observerSetup("privacy-place-law-gate"),
    ).world;
    const town = world.people[world.personOrder[0]!]!.homeJurisdictionId;
    expect(townDataPrivacyCostOn(world, town)).toEqual({
      share: 0,
      lawMeasureIds: [],
    });
    const passed = law(world, 1, "yes", world.currentDate);
    expect(
      townDataPrivacyCostOn(passed, town, addDays(world.currentDate, -1)),
    ).toEqual({ share: 0, lawMeasureIds: [] });
    expect(townDataPrivacyCostOn(passed, town).share).toBeGreaterThan(0);
    const repealed = law(passed, 2, "no", world.currentDate);
    expect(townDataPrivacyCostOn(repealed, town)).toEqual({
      share: 0,
      lawMeasureIds: [],
    });
  });
});
