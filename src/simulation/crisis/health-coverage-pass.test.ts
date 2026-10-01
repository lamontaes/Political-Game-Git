import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { recordHouseholdLocation } from "../life";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import { advanceWorld } from "../world";
import { MULTIPLIER_ONE } from "./hazard";
import {
  HEALTH_COVERAGE_KEY,
  coverageHazardIntervals,
  healthCoverageRecords,
  recordHealthCoverage,
  scheduleHealthCoveragePass,
} from "./health-coverage";
import { ensureCrisisMortality, hazardMultipliersOf } from "./mortality";
import { appendCrisisRecord } from "./records";

const seed = "news-a27-no-population-hazard";
const place = new SeededRng(seed).pick(Object.keys(STATES));

describe(`coverage eligibility clock (${place}, ${seed})`, () => {
  it("records eligibility without replanning clinical deaths and preserves the result through Save/Continue", () => {
    const fixture = smallWorld({
      place,
      seed,
      date: "2025-12-31",
      household: true,
    });
    const home = fixture.world.history.households.at(-1)!;
    let world = recordHouseholdLocation(fixture.world, {
      stableKey: "fixture:coverage-home",
      householdId: home.id,
      effectiveAt: fixture.world.currentDate,
      jurisdictionId: fixture.jurisdictionId,
      label: "Fixture home",
      kind: "residence:fixture",
      provenance: { kind: "authored", note: "Eligibility clock fixture." },
      supersedesLocationId: null,
    });
    world = scheduleHealthCoveragePass(
      ensureCrisisMortality(world),
      world.currentDate,
      world.id,
    );
    const registry = createCampaignElectionTransitionRegistry();
    const before = advanceWorld(world, 14, registry);
    expect(healthCoverageRecords(before)).toEqual([]);
    const next = advanceWorld(before, 1, registry);
    const records = healthCoverageRecords(next);
    expect(records.some((record) => record.covered)).toBe(true);
    const clinicalItems = (at: typeof world) =>
      at.history.futureDueItems.filter((item) =>
        item.transitionKey.startsWith("crisis:mortality"),
      );
    expect(clinicalItems(next)).toEqual(clinicalItems(before));
    expect(next.history.personDeaths).toEqual(before.history.personDeaths);
    for (const record of records) {
      expect(record.hazardMultiplierMicros).toBe(MULTIPLIER_ONE);
      expect(record.hazardFrom).toBe(
        record.covered ? record.effectiveAt : null,
      );
      expect(record.causalParentIds).toHaveLength(1);
      expect(record.lawEffectStamps).toHaveLength(1);
      expect(hazardMultipliersOf(next, record.personId)).toEqual(
        hazardMultipliersOf(before, record.personId),
      );
    }
    expect(
      next.history.futureDueItems.some(
        (item) =>
          item.transitionKey === HEALTH_COVERAGE_KEY &&
          item.dueAt === "2026-02-15",
      ),
    ).toBe(true);
    const saved = serializeWorld(next);
    const continued = deserializeWorld(saved);
    expect(healthCoverageRecords(continued)).toEqual(records);
    expect(
      recordHealthCoverage(continued, continued.currentDate, continued.id),
    ).toBe(continued);
    expect(serializeWorld(continued)).toBe(saved);

    const row = records.find((record) => record.covered)!;
    const legacy = appendCrisisRecord(continued, {
      ...row,
      stableKey: "fixture:legacy-eligibility-hazard",
      hazardMultiplierMicros: 906_000,
      hazardFrom: continued.currentDate,
    });
    const legacySaved = serializeWorld(legacy);
    const reloaded = deserializeWorld(legacySaved);
    expect(
      coverageHazardIntervals(
        reloaded.people[row.personId]!.birthDate,
        healthCoverageRecords(reloaded),
      ),
    ).toEqual([]);
    expect(hazardMultipliersOf(reloaded, row.personId)).toEqual(
      hazardMultipliersOf(continued, row.personId),
    );
    expect(serializeWorld(reloaded)).toBe(legacySaved);
    expect(healthCoverageRecords(reloaded).at(-1)!.hazardMultiplierMicros).toBe(
      906_000,
    );
  });
});
