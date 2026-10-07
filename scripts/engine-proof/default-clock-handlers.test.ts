import { describe, expect, it } from "vitest";
import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { advanceWorld, createWorldId } from "../../src/simulation/world";
import { advanceWorldMinutes } from "../../src/simulation/time-work";
import { makeIsoDate } from "../../src/simulation/dates";
import { createLightweightPerson } from "../../src/simulation/people";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { openCanonicalFixture, canonicalHash } from "./parity";
import { nationalPlacePlan, watchedIdentity } from "./places";

// This cold module graph used to fail before any test could execute when the
// clocks imported the complete composer through the metric validator cycle.
const selected = nationalPlacePlan("c7-default-clock-20261001", 1).watched[0]!;
function fixture() {
  const place = lifePlaceByKey(selected.placeKey)!;
  const date = makeIsoDate("2026-01-05");
  const person = createLightweightPerson({
    worldId: createWorldId(selected.seed),
    worldSeed: selected.seed,
    index: 0,
    currentDate: date,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  return {
    person,
    world: openCanonicalFixture({
      seed: selected.seed,
      currentDate: date,
      jurisdictions: [place.context.jurisdiction],
      people: [person],
    }),
  };
}
describe("default clocks share the complete handler composer", () => {
  it("loads without a registry initialization cycle and matches explicit composition for date and minute advances", () => {
    const { world, person } = fixture();
    const handlers = composeWorldTimeHandlers();
    const day = advanceWorld(world, 1);
    const minute = advanceWorldMinutes(world, 60);
    expect(day).toEqual(advanceWorld(world, 1, handlers));
    expect(minute).toEqual(advanceWorldMinutes(world, 60, handlers));
    process.stdout.write(
      JSON.stringify({
        identity: watchedIdentity(world, person.id, selected.placeKey),
        dayHash: canonicalHash(day),
        minuteHash: canonicalHash(minute),
      }) + "\n",
    );
  });
});
