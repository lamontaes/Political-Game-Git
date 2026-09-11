import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  lifePlaceByKey,
  lifePlaceByJurisdictionId,
  searchLifePlaces,
  serializeWorld,
} from "../src/simulation";
import { createNewGameWorld } from "../src/presentation/new-game";
import {
  NATIONAL_COUNTIES_META,
  NATIONAL_COUNTIES_ROWS,
} from "../src/simulation/national-counties.generated";

describe("county identities reach life setup without inventing a town", () => {
  it("projects every accepted source row with its exact name and namespace", () => {
    const records = JSON.parse(
      readFileSync("data/source/counties/corpus.json", "utf8"),
    );
    const rows = JSON.parse(NATIONAL_COUNTIES_ROWS);
    expect(rows).toEqual(
      records.map(
        (r: { geoid: string; sourceName: string; stateUsps: string }) => [
          r.geoid,
          r.sourceName,
          r.stateUsps,
        ],
      ),
    );
    expect(rows).toHaveLength(NATIONAL_COUNTIES_META.recordCount);
    for (const [geoid, sourceName] of rows) {
      const place = lifePlaceByKey(`county:${geoid}`)!;
      expect(place.scope).toBe("county");
      expect(place.formalName).toBe(sourceName);
      expect(place.capabilities).toEqual({
        legislativeScenarioKey: null,
        candidacyPackId: null,
      });
    }
  });

  it("finds county scope separately from city identity", () => {
    const county = searchLifePlaces("Fairfax County").find(
      (p) => p.key === "county:51059",
    )!;
    expect(county).toBeDefined();
    expect(county.context.householdLocationLabel).toContain("town unspecified");
    const city = lifePlaceByKey("5167000")!;
    expect(city.scope).toBe("locality");
    expect(city.context.jurisdiction.id).not.toBe(
      county.context.jurisdiction.id,
    );
    expect(county.stateJurisdictionKey).toBe("US-VA");
    expect(lifePlaceByKey("county:99999")).toBeNull();
  });

  it("builds deterministic county worlds and resolves the saved jurisdiction", () => {
    const setup = {
      startKind: "custom" as const,
      placeKey: "county:21113",
      startAge: 30,
      depth: "summarize-earlier-life" as const,
      startingLife: "ordinary-life" as const,
      household: "lives-alone" as const,
      seed: "county-provider-proof",
      givenName: null,
      familyName: null,
      questionnaire: "skipped" as const,
      priors: [],
    };
    const built = createNewGameWorld(setup);
    const snapshot = JSON.parse(serializeWorld(built.world));
    expect(serializeWorld(createNewGameWorld(setup).world)).toBe(
      serializeWorld(built.world),
    );
    expect(
      lifePlaceByJurisdictionId(built.place.context.jurisdiction.id)?.key,
    ).toBe(setup.placeKey);
    // Setup prose is not serialized. The saved jurisdiction, not a fabricated
    // locality string, carries the county scope through the provider on reload.
    expect(
      snapshot.world.jurisdictions[built.place.context.jurisdiction.id].kind,
    ).toBe("census-county");
    expect(Object.keys(snapshot.world.jurisdictions)).toEqual([
      built.place.context.jurisdiction.id,
    ]);
    expect(
      lifePlaceByJurisdictionId(snapshot.world.jurisdictionOrder[0])?.context
        .householdLocationLabel,
    ).toContain("town unspecified");
    expect(built.place.context.jurisdiction.provenance.asOf).toBe("2025-01-01");
  });
});
