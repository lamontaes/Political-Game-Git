import { describe, expect, it } from "vitest";
import { lifePlaceSearch, stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import { placeLocalGovernmentUnits } from "./local-governments";

const SEED = "session-8-alaska-state-service-2026-10-05";
const alaskanUnincorporatedPlaces = lifePlaceSearch("", 100_000, {
  stateJurisdictionKey: "US-AK",
}).filter((place) => {
  if (place.scope !== "locality") return false;
  const units = placeLocalGovernmentUnits(place);
  return (
    units.municipal.length === 0 &&
    units.townships.length === 0 &&
    units.counties.length === 0
  );
});
const place =
  alaskanUnincorporatedPlaces[
    new SeededRng(SEED).nextUint32() % alaskanUnincorporatedPlaces.length
  ];
if (!place?.stateJurisdictionKey)
  throw new Error(
    `seed ${SEED} must select an Alaska locality with state identity`,
  );

describe("direct state service for an unincorporated place", () => {
  it(`resolves ${place?.displayName ?? "an Alaska locality"} (seed ${SEED})`, () => {
    expect(
      place,
      `seed ${SEED} must select a recorded Alaska locality`,
    ).toBeDefined();
    const units = placeLocalGovernmentUnits(place!);
    const state = stateJurisdictionForKey(place!.stateJurisdictionKey!);

    expect(units.stateServed, `${place!.displayName}; seed ${SEED}`).toEqual({
      id: "state-service:US-AK",
      jurisdictionId: state!.id,
      name: state!.name,
      stateUsps: "AK",
    });
    expect(units.countyReason).toBeNull();
  });
});
