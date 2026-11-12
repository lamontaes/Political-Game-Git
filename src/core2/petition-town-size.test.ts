import { describe, expect, it } from "vitest";
import placeCitizenship from "./data/place-citizenship-2024.json" with { type: "json" };
import { filingRequirements } from "./modules/elections";
import { petitionWithinElectorate } from "./modules/voting";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";

// A council petition is never larger than the town (elections-petition-
// larger-than-the-town): Johnson, Minnesota once asked 30 signatures of a
// town of a few dozen adults, and the player never made the ballot.
const byPlace = (
  placeCitizenship as unknown as {
    byPlace: Record<string, readonly [number, number]>;
  }
).byPlace;

describe("a local petition fits the town", () => {
  it("no locality in any place asks more council signatures than its citizen adults", () => {
    const places = [...corePlaceStateIdentities()].flatMap((state) => [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      }),
    ]);
    let checked = 0;
    let largerThanTownBefore = 0;
    const states = new Set<string>();
    for (const place of places) {
      const geoid = place.sourceGeoid ?? place.key;
      const adults = byPlace[geoid]?.[0];
      if (!place.stateJurisdictionKey || !adults) continue;
      const count = filingRequirements(
        place.stateJurisdictionKey,
        "municipalOffice",
        "party",
      ).petition.count;
      if (count > adults) largerThanTownBefore += 1;
      const needed = petitionWithinElectorate(count, adults);
      expect(
        needed,
        `${place.displayName} (${geoid}): ${needed} of ${adults} citizen adults`,
      ).toBeLessThanOrEqual(adults);
      if (count > 0) expect(needed, place.displayName).toBeGreaterThan(0);
      checked += 1;
      states.add(place.stateJurisdictionKey);
    }
    process.stdout.write(
      `PETITION TOWN SIZE: ${checked} localities in ${states.size} places checked; ${largerThanTownBefore} asked more than their citizen adults before the cap\n`,
    );
    expect(checked).toBeGreaterThan(10_000);
    expect(states.size).toBeGreaterThanOrEqual(52);
  });

  it("where the petition is only a way around the fee, none is required (Minnesota's towns)", () => {
    const rule = filingRequirements("US-MN", "municipalOffice", "party");
    expect(rule.petition.count).toBe(0);
    expect(rule.petition.basis).toBe("none-in-law");
    // A place whose law asks signatures and a fee both keeps its petition.
    expect(
      filingRequirements("US-OH", "municipalOffice", "party").petition.count,
    ).toBeGreaterThan(0);
  });

  it("the cap is a share of the town's voters, at least one", () => {
    expect(petitionWithinElectorate(30, 40)).toBe(4);
    expect(petitionWithinElectorate(30, 5)).toBe(1);
    expect(petitionWithinElectorate(30, 10_000)).toBe(30);
    expect(petitionWithinElectorate(0, 40)).toBe(0);
  });
});
