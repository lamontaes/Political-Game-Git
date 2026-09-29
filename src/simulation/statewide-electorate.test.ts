import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { stateJurisdictionForKey } from "./life-places";
import { chiefExecutiveJurisdictionId } from "./nationwide-world/government-jurisdiction";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { isTerritoryUsps } from "./state-reference";
import { statewideElectorate } from "./statewide-electorate";
import { createWorld } from "./world";

describe("a statewide race's electorate", () => {
  const world = createWorld({
    seed: "statewide-electorate",
    currentDate: makeIsoDate("2026-11-03"),
    jurisdictions: [stateJurisdictionForKey("US-OR")!],
    people: [],
  });

  it("is the state's own voters in every state and D.C., not a handful drawn", () => {
    const states = CHIEF_EXECUTIVE_JURISDICTIONS.filter(
      (usps) => !isTerritoryUsps(usps),
    );
    expect(states.length).toBe(51);
    for (const usps of states) {
      const electorate = statewideElectorate(
        world,
        chiefExecutiveJurisdictionId(usps)!,
      );
      expect(electorate, usps).not.toBeNull();
      expect(electorate!.stateUsps).toBe(usps);
      // Every state cast well over a hundred thousand ballots in 2024; the
      // old draw gave a whole state's race 2,000 to 20,000.
      expect(electorate!.ballots, usps).toBeGreaterThan(100_000);
      expect(electorate!.democraticShare, usps).toBeGreaterThan(0);
      expect(electorate!.democraticShare, usps).toBeLessThan(1);
    }
  });

  it("leans the way the state voted", () => {
    const lean = (usps: string) =>
      statewideElectorate(world, chiefExecutiveJurisdictionId(usps)!)!
        .democraticShare;
    // A world with no starting conditions carries no swing, so these are the
    // certified 2024 two-party shares themselves.
    const states = CHIEF_EXECUTIVE_JURISDICTIONS.filter(
      (usps) => !isTerritoryUsps(usps),
    );
    const shares = states.map(lean).sort((a, b) => a - b);
    expect(shares[0]).toBeLessThan(0.35);
    expect(shares.at(-1)).toBeGreaterThan(0.65);
  });

  it("is absent for a place that is not a state", () => {
    const territory = CHIEF_EXECUTIVE_JURISDICTIONS.find((usps) =>
      isTerritoryUsps(usps),
    )!;
    expect(
      statewideElectorate(world, chiefExecutiveJurisdictionId(territory)!),
    ).toBeNull();
  });
});
