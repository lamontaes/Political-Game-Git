import { describe, expect, it } from "vitest";
import placeCitizenship from "./data/place-citizenship-2024.json" with { type: "json" };
import { filingRequirements, petitionSignatures } from "./modules/elections";
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
      const rule = filingRequirements(
        place.stateJurisdictionKey,
        "municipalOffice",
        "party",
      ).petition;
      const needed = rule.scale
        ? petitionSignatures(rule.scale, {
            eligible: adults,
            population: adults,
          })
        : Math.min(count, adults);
      expect(
        needed,
        `${place.displayName} (${geoid}): ${needed} of ${adults} citizen adults`,
      ).toBeLessThanOrEqual(adults);
      if (count > 0) expect(needed, place.displayName).toBeGreaterThan(0);
      checked += 1;
      states.add(place.stateJurisdictionKey);
    }
    process.stdout.write(
      `PETITION TOWN SIZE: ${checked} localities in ${states.size} places checked; ${largerThanTownBefore} had a fixed count above their citizen adults\n`,
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

  const asked = (
    usps: string,
    side: "party" | "independent",
    eligible: number,
    population = eligible,
  ) => {
    const rule = filingRequirements(
      `US-${usps}`,
      "municipalOffice",
      side,
    ).petition;
    expect(rule.basis, `${usps} ${side}`).toBe("scaled");
    return petitionSignatures(rule.scale!, { eligible, population });
  };

  it("a floor binds in a small town and a ceiling in a large one (Iowa 2% minimum 10; North Dakota 10% maximum 300; Massachusetts 1% between 20 and 50)", () => {
    expect(asked("IA", "party", 100)).toBe(10);
    expect(asked("ND", "party", 1_000_000)).toBe(300);
    expect(asked("MA", "party", 100)).toBe(20);
    expect(asked("MA", "party", 100_000)).toBe(50);
  });

  it("Vermont asks 30 or 1% of the town's voters, whichever is less", () => {
    expect(asked("VT", "party", 100)).toBe(1);
    expect(asked("VT", "party", 10_000)).toBe(30);
  });

  it("each place's own share scales the count, not one share for every place", () => {
    // Iowa 2% and North Dakota 10% of the same 10,000 voters differ: a flat
    // share would ask both the same.
    const iowa = asked("IA", "party", 10_000);
    const dakota = asked("ND", "party", 10_000);
    expect(dakota).toBe(300);
    expect(iowa).toBeGreaterThan(100);
    expect(iowa).toBeLessThan(dakota);
    expect(asked("IA", "party", 20_000)).toBeGreaterThan(iowa);
  });

  it("a votes base reads the office's recorded votes when the world has them", () => {
    const rule = filingRequirements(
      "US-IA",
      "municipalOffice",
      "party",
    ).petition;
    const town = { eligible: 10_000, population: 15_000 };
    expect(petitionSignatures(rule.scale!, { ...town, votesCast: 1_000 })).toBe(
      20,
    );
    // Without a recorded election the registered-voter sizing stands in.
    expect(petitionSignatures(rule.scale!, town)).toBeGreaterThan(100);
  });

  it("a count by town size follows the town's people (Ohio 10 in a village, 50 in a city)", () => {
    expect(asked("OH", "party", 300, 900)).toBe(10);
    expect(asked("OH", "party", 8_000, 12_000)).toBe(50);
  });

  it("every scaled rule asks between one and the town's voters, in towns of every size", () => {
    for (const usps of [
      "AZ",
      "CO",
      "CT",
      "GA",
      "IA",
      "IN",
      "MA",
      "MP",
      "MS",
      "ND",
      "NJ",
      "NY",
      "OH",
      "PA",
      "SD",
      "VT",
    ])
      for (const side of ["party", "independent"] as const) {
        const rule = filingRequirements(
          `US-${usps}`,
          "municipalOffice",
          side,
        ).petition;
        if (!rule.scale) continue;
        for (const eligible of [1, 5, 40, 400, 4_000, 400_000]) {
          const n = petitionSignatures(rule.scale, {
            eligible,
            population: eligible * 2,
          });
          expect(n, `${usps} ${side} ${eligible}`).toBeGreaterThanOrEqual(1);
          expect(n, `${usps} ${side} ${eligible}`).toBeLessThanOrEqual(
            eligible,
          );
        }
      }
  });
});
