import { beforeAll, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createLegislativeScenario } from "./legislation-scenarios";
import { stateJurisdictionForKey } from "./life-places";
import {
  minimumHourlyMinorAt,
  startingStateMinimumHourly,
  stateMinimumSettingAt,
} from "./minimum-wage";
import { createProductionPolicyCatalog } from "./production-catalog";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createWorld } from "./world";
import type { World } from "./types";

let world: World;
beforeAll(() => {
  const identities = createLegislativeScenario("nebraska").world;
  const jurisdictions = new Map(
    identities.jurisdictionOrder.map((id) => [
      id,
      identities.jurisdictions[id]!,
    ]),
  );
  for (const key of ["US-DC", "US-FL", "US-OH"])
    jurisdictions.set(
      stateJurisdictionForKey(key)!.id,
      stateJurisdictionForKey(key)!,
    );
  world = createWorld({
    seed: identities.seed,
    currentDate: makeIsoDate("2027-01-02"),
    people: identities.personOrder.map((id) => identities.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: createProductionPolicyCatalog(),
  });
});

it.each([
  ["US-DC", "2026-01-01", 1795],
  ["US-DC", "2026-06-30", 1795],
  ["US-DC", "2026-07-01", 1840],
  ["US-FL", "2025-09-30", 1400],
  ["US-FL", "2026-09-29", 1400],
  ["US-FL", "2026-09-30", 1500],
] as const)(
  "A39 starting $0 on $1 reads its actual dated standard terms",
  (key, date, value) => {
    const onDate = makeIsoDate(date);
    expect(startingStateMinimumHourly(key, world, onDate)).toBe(value / 100);
    const setting = stateMinimumSettingAt(world, key, onDate);
    expect(setting).toMatchObject({
      hourlyMinor: value,
      beforeMinor: value,
      measureId: null,
    });
    expect(
      minimumHourlyMinorAt(world, stateJurisdictionForKey(key)!.id, onDate),
    ).toBe(value);
    expect(
      stateMinimumSettingAt(
        deserializeWorld(serializeWorld(world)),
        key,
        onDate,
      ),
    ).toEqual(setting);
  },
);

it("A39 does not backdate an unsupported Florida historical rate", () => {
  const onDate = makeIsoDate("2025-09-29");
  expect(startingStateMinimumHourly("US-FL", world, onDate)).toBeNull();
  expect(stateMinimumSettingAt(world, "US-FL", onDate)).toBeNull();
  expect(
    minimumHourlyMinorAt(world, stateJurisdictionForKey("US-FL")!.id, onDate),
  ).toBeNull();
});

it("A39 leaves Ohio's conditional tier unsupported instead of reading the later snapshot", () => {
  const onDate = makeIsoDate("2026-01-01");
  expect(startingStateMinimumHourly("US-OH", world, onDate)).toBeNull();
  expect(
    minimumHourlyMinorAt(world, stateJurisdictionForKey("US-OH")!.id, onDate),
  ).toBeNull();
});
