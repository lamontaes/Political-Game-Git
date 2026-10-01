import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { makeIsoDate } from "./dates";
import { buildHouseholdLocationRecord, createHousehold } from "./life";
import { canonicalJson } from "./canonical-json";
import type { EntityId, Household, World } from "./types";

const provenance = {
  kind: "authored" as const,
  note: "Synthetic helper compatibility fixture; not legal or place proof.",
};

function fixture() {
  const initial = createDemoWorld("life-helper-index-compatibility");
  const input = {
    stableKey: "helper:household",
    formedAt: initial.currentDate,
    label: "Compatibility household",
    provenance,
  };
  const world = createHousehold(initial, input);
  const household = world.history.households.at(-1)!;
  const location = {
    stableKey: "helper:location",
    householdId: household.id,
    effectiveAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    label: "Compatibility home",
    kind: "residence:community-base" as const,
    provenance,
    supersedesLocationId: null,
  };
  return { world, input, household, location };
}

describe("life helper indexed lookup compatibility", () => {
  it("keeps an earlier ID match when a malformed later row is present", () => {
    const { world, household, location } = fixture();
    const malformed: World = {
      ...world,
      history: {
        ...world.history,
        households: [household, null] as unknown as readonly Household[],
      },
    };
    expect(buildHouseholdLocationRecord(malformed, location)).toEqual(
      buildHouseholdLocationRecord(world, location),
    );
  });

  it("keeps the duplicate-key error before a malformed later row", () => {
    const { world, input, household } = fixture();
    const malformed: World = {
      ...world,
      history: {
        ...world.history,
        households: [household, null] as unknown as readonly Household[],
      },
    };
    expect(() => createHousehold(malformed, input)).toThrow(
      "households stable key already exists: helper:household",
    );
  });

  it("keeps first-match and missing-record behavior", () => {
    const { world, household, location } = fixture();
    const duplicated: World = {
      ...world,
      history: {
        ...world.history,
        households: [
          household,
          { ...household, formedAt: makeIsoDate("2099-01-01") },
        ],
      },
    };
    expect(buildHouseholdLocationRecord(duplicated, location)).toEqual(
      buildHouseholdLocationRecord(world, location),
    );
    expect(() =>
      buildHouseholdLocationRecord(world, {
        ...location,
        householdId: "household_missing" as EntityId,
      }),
    ).toThrow("Missing household: household_missing");
  });

  it("keeps independent appends and the earlier world immutable", () => {
    const { world, input } = fixture();
    const before = canonicalJson(world);
    const left = createHousehold(world, { ...input, stableKey: "helper:left" });
    const right = createHousehold(world, {
      ...input,
      stableKey: "helper:right",
    });
    expect(left.history.households.at(-1)?.stableKey).toBe("helper:left");
    expect(right.history.households.at(-1)?.stableKey).toBe("helper:right");
    expect(left.history.households.slice(0, -1)).toEqual(
      world.history.households,
    );
    expect(right.history.households.slice(0, -1)).toEqual(
      world.history.households,
    );
    expect(canonicalJson(world)).toBe(before);
    expect(() =>
      createHousehold(left, { ...input, stableKey: "helper:left" }),
    ).toThrow("households stable key already exists: helper:left");
  });
});
