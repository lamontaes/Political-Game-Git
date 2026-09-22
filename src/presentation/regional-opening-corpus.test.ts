import { describe, expect, it } from "vitest";

import coverageDocument from "../../art/regions/regional-scene-places.json";
import type { RegionalSceneCoverageDocument } from "../authoring/regional-scene-coverage";
import { lifePlaceByKey } from "../simulation/life-places";
import { geoidsFromJurisdiction } from "./regional-opening-plate";
import type { World } from "../simulation";

/**
 * The join nobody had checked: do the researched place identifiers name places
 * this game can actually start a life in?
 *
 * The research selectors are 2020 Census identifiers and the runtime corpus is
 * the 2025 Gazetteer. Matching digit counts prove nothing about vintage, so
 * this resolves every identifier against the corpus the game really uses and
 * compares the names. A silent miss here would make the whole coverage
 * document inert while validating perfectly.
 */
describe("the researched places against the runtime corpus", () => {
  const document = coverageDocument as RegionalSceneCoverageDocument;
  const declared = document.regions.flatMap(
    (entry) => entry.places.includePlaces ?? [],
  );

  it("names places a life can start in", () => {
    expect(declared.length).toBeGreaterThan(0);
    const missing = declared.filter((geoid) => !lifePlaceByKey(geoid));
    expect(missing).toEqual([]);
  });

  it("reaches them by the slug the corpus writes", () => {
    for (const geoid of declared) {
      const place = lifePlaceByKey(geoid)!;
      expect(place.context.jurisdiction.slug, geoid).toBe(`us-place-${geoid}`);
    }
  });
});

describe("an authored place that is also a corpus place", () => {
  it("resolves by its recorded GEOID rather than falling back to the state", () => {
    // Lexington is authored, and its jurisdiction slug is its own rather than
    // `us-place-2146027`. Matching on the slug alone threw away the GEOID the
    // place already carries and answered by state at best.
    const authored = lifePlaceByKey("lexington-fayette");
    expect(authored?.sourceGeoid).toBe("2146027");
    const jurisdiction = authored!.context.jurisdiction;
    expect(jurisdiction.slug).not.toMatch(/^us-place-/);

    const world = {
      jurisdictions: { [jurisdiction.id]: jurisdiction },
    } as unknown as World;
    expect(geoidsFromJurisdiction(world, jurisdiction.id)).toEqual({
      placeGeoid: "2146027",
    });
  });
});
