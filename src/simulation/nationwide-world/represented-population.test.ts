import { describe, expect, it } from "vitest";
import { placeReferencePopulation } from "./place-population";
import {
  censusDemographics,
  decennialPopulation,
  populationReference,
  referencePopulationIsEmpty,
  ensurePopulationLayer,
  representedPopulation,
} from "./represented-population";
import {
  TERRITORY_POPULATION_ROWS,
  STATE_POPULATION_KEYS,
} from "./place-demographics.generated";

import { createWorld } from "../world";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey } from "../life-places";
import { serializeWorld, deserializeWorld } from "../serialization";

describe("census counts distinguish represented residents from written samples", () => {
  it("does not mistake a zero ACS survey for Concho's enumeration", () => {
    expect(censusDemographics("0415150")!.counts.population).toBe(0);
    expect(decennialPopulation("0415150")![0]).toBe(54);
    const reference = populationReference("0415150");
    expect(reference.population).toBe(54);
    expect(reference.source).toBe("decennial-census-2020");
    expect(reference.unknownFields).toContain("households");
    expect(reference.households).toBeNull();
    expect(reference.estimatedFields).toEqual([]);
    expect(placeReferencePopulation("0415150")).toEqual({
      value: 54,
      source: "decennial-census-2020",
    });
  });
  it("distinguishes an empty town from a survey zero", () => {
    expect(referencePopulationIsEmpty("0812030")).toBe(true);
    expect(placeReferencePopulation("0812030")?.value).toBe(0);
    expect(referencePopulationIsEmpty("0415150")).toBe(false);
  });
  it("uses decoded Island Areas household and civilian labor counts", () => {
    const dededo = populationReference("territory:GU:dededo");
    expect(dededo.population).toBe(44908);
    expect(dededo.households).toBe(11576);
    expect(dededo.laborForce).toBe(19452);
    expect(dededo.employed).toBe(17510);
    expect(dededo.adults).toBe(32543);
    expect(dededo.estimatedFields).not.toContain("laborForce");
  });
  it("uses a county geography rather than a thousand-person stand-in", () => {
    const reference = populationReference("37035");
    expect(reference.population).toBeGreaterThan(100_000);
    expect(reference.households).toBeGreaterThan(40_000);
    expect(reference.laborForce).toBeGreaterThan(50_000);
  });
  it("preserves sourced jurisdiction counts and unknown territory fields", () => {
    expect(Object.keys(STATE_POPULATION_KEYS)).toHaveLength(56);
    for (const key of Object.values(STATE_POPULATION_KEYS)) {
      const reference = populationReference(key);
      expect(reference.population, key).toBeGreaterThan(0);
      expect(
        reference.laborForce === null || Number.isFinite(reference.laborForce),
        key,
      ).toBe(true);
    }
    expect(TERRITORY_POPULATION_ROWS).toHaveLength(44);
    for (const row of TERRITORY_POPULATION_ROWS) {
      const reference = populationReference(row.key);
      if (row.status === "supported") {
        expect(reference.population, row.key).toBeGreaterThan(0);
        expect(reference.households, row.key).toBeGreaterThan(0);
      } else {
        expect(reference.source).toBe("unknown");
        expect(reference.population).toBeNull();
        expect(reference.households).toBeNull();
      }
      expect(reference.estimatedFields).toEqual([]);
    }
  });
  it("uses observed annual changes rather than a fixed population spread", () => {
    const city = populationReference("3651000");
    const town = populationReference("0100124");
    expect(city.annualChanges.length).toBeGreaterThan(0);
    expect(town.annualChanges).not.toEqual(city.annualChanges);
  });
});

describe("population layer save continuity", () => {
  it("writes through history once and survives Save/Continue without read-side writes", () => {
    const place = lifePlaceByKey("0415150")!;
    const world = createWorld({
      seed: "saved-concho-population",
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [place.context.jurisdiction],
      people: [],
    });
    const before = serializeWorld(world);
    representedPopulation(world, place.context.jurisdiction.id);
    expect(serializeWorld(world)).toBe(before);
    const established = ensurePopulationLayer(
      world,
      place.context.jurisdiction.id,
    );
    expect(established.history.events.length).toBe(
      world.history.events.length + 1,
    );
    expect(
      ensurePopulationLayer(established, place.context.jurisdiction.id),
    ).toBe(established);
    const snapshot = representedPopulation(
      established,
      place.context.jurisdiction.id,
    );
    const saved = serializeWorld(established);
    const restored = deserializeWorld(saved);
    expect(
      representedPopulation(restored, place.context.jurisdiction.id),
    ).toEqual(snapshot);
    expect(serializeWorld(restored)).toBe(saved);
  });
});
