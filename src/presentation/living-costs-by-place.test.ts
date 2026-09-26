import { describe, expect, it } from "vitest";

import { searchLifePlaces, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  LIVING_COSTS_PLACEHOLDER,
  livingCostsFlowFor,
  livingCostsForPlace,
  monthlyLivingCostMinor,
  stateHousingRelative,
  stateTwoBedroomRentMinor,
} from "../simulation/cost-of-living";
import { createResourcePosition, money } from "../simulation/resources";
import { letAdultTimePass } from "./adult-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Living costs that fit the place. Everyone used to be charged the same flat
 * month; the rent inside it now follows the state's housing level (as
 * calibration, with the flat figure as the national anchor), so a life in
 * California pays more than one in Mississippi, and a seed always pays the
 * same.
 */

function firstLocality(usps: string): string {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place.key;
}

function fundedLife(placeKey: string, seed: string) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 32,
    placeKey,
    questionnaire: "skipped",
    priors: [],
    seed,
  } as NewGameSetup);
  const personId = created.playerPersonId;
  const opened = openOrdinaryLife(created.world, personId);
  const world = createResourcePosition(opened, {
    stableKey: "test:opening-savings",
    owner: { kind: "person", personId },
    openedAt: opened.currentDate,
    openingBalance: money(2_000_000, "USD"),
    provenance: { kind: "authored", note: "Test savings." },
  });
  return { world, personId };
}

function charges(world: World, personId: EntityId) {
  const flow = livingCostsFlowFor(world, personId);
  if (!flow) return [];
  return world.history.resourceTransferOutcomes.filter(
    (outcome) => outcome.resourceFlowId === flow.id,
  );
}

function played(placeKey: string, seed: string) {
  const { world, personId } = fundedLife(placeKey, seed);
  const later = letAdultTimePass(letAdultTimePass(world, 1), 70);
  return { world: later, personId };
}

describe("living costs that fit the place", () => {
  it("reads a state's housing level as calibration, with 1 as the national anchor", () => {
    expect(stateHousingRelative("US-CA")).toBeGreaterThan(1.3);
    expect(stateHousingRelative("US-MS")).toBeLessThan(0.7);
    expect(stateHousingRelative(null)).toBe(1);
    expect(stateHousingRelative("US-NOWHERE")).toBe(1);
  });

  it("charges a California life more than a Mississippi life, month by month", () => {
    const california = played(firstLocality("CA"), "living-costs-place");
    const mississippi = played(firstLocality("MS"), "living-costs-place");
    const ca = charges(california.world, california.personId);
    const ms = charges(mississippi.world, mississippi.personId);
    expect(ca.length).toBeGreaterThan(0);
    expect(ms.length).toBeGreaterThan(0);
    const caMonth = ca[0]!.attemptedAmount.minorUnits;
    const msMonth = ms[0]!.attemptedAmount.minorUnits;
    expect(caMonth).toBeGreaterThan(msMonth);
    // Each is what the place costs, and the rent inside it stays near the
    // state's level: the flat figure is the national anchor, not everyone's.
    expect(caMonth).toBe(
      monthlyLivingCostMinor(california.world, california.personId),
    );
    expect(msMonth).toBe(
      monthlyLivingCostMinor(mississippi.world, mississippi.personId),
    );
    expect(caMonth).toBeGreaterThan(
      LIVING_COSTS_PLACEHOLDER.monthlyPerAdultMinor,
    );
    expect(msMonth).toBeLessThan(LIVING_COSTS_PLACEHOLDER.monthlyPerAdultMinor);
    for (const charge of [...ca, ...ms])
      expect(charge.note).toMatch(/^Rent, food and bills for /);
  });

  it("keeps a generated rent near the real relative level", () => {
    const { world, personId } = fundedLife(firstLocality("CA"), "near-level");
    const costs = livingCostsForPlace(
      world,
      world.people[personId]!.homeJurisdictionId,
    );
    const relative =
      costs.housingShareMinor / LIVING_COSTS_PLACEHOLDER.housingShareMinor;
    expect(Math.abs(relative / stateHousingRelative("US-CA") - 1)).toBeLessThan(
      0.06,
    );
  });

  it("never charges one adult more rent than the state's two-bedroom benchmark", () => {
    for (const usps of ["CA", "MS", "KY", "NY", "HI", "WV"]) {
      const { world, personId } = fundedLife(firstLocality(usps), "benchmark");
      const costs = livingCostsForPlace(
        world,
        world.people[personId]!.homeJurisdictionId,
      );
      const benchmark = stateTwoBedroomRentMinor(`US-${usps}`);
      expect(benchmark, usps).not.toBeNull();
      expect(costs.housingShareMinor, usps).toBeLessThanOrEqual(benchmark!);
      expect(costs.housingShareMinor, usps).toBeGreaterThan(0);
    }
  });

  it("charges the same total for the same seed, every time", () => {
    const placeKey = firstLocality("CA");
    const first = played(placeKey, "living-costs-deterministic");
    const second = played(placeKey, "living-costs-deterministic");
    const total = (life: ReturnType<typeof played>) =>
      charges(life.world, life.personId).reduce(
        (sum, charge) => sum + charge.transferredAmount.minorUnits,
        0,
      );
    expect(total(first)).toBeGreaterThan(0);
    expect(total(first)).toBe(total(second));
    expect(serializeWorld(first.world)).toBe(serializeWorld(second.world));
  });
});
