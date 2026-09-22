import { describe, expect, it } from "vitest";

import coverageDocument from "../../art/regions/regional-scene-places.json";
import type { RegionalSceneCoverageDocument } from "../authoring/regional-scene-coverage";
import {
  REGIONAL_SCENE_COVERAGE_VERSION,
  resolveRegionalPlate,
} from "../authoring/regional-scene-coverage";
import {
  countyGeoidsForPlace,
  countyGovernmentUnitsForPlace,
} from "../simulation/government-units";
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
    // Fayette County, from the 2020 place-within-county crosswalk. A town
    // carries its counties so that a county selector can reach it; before that
    // a region declaring counties could never match anybody who lived in a
    // town, which is almost everybody.
    expect(geoidsFromJurisdiction(world, jurisdiction.id)).toEqual({
      placeGeoid: "2146027",
      countyGeoids: ["21067"],
    });
  });

  it("reaches a town through a county selector", () => {
    // The whole point of the crosswalk: a region that names Fayette County and
    // no place at all still shows to somebody whose save says Lexington.
    const document: RegionalSceneCoverageDocument = {
      documentVersion: REGIONAL_SCENE_COVERAGE_VERSION,
      generatedFrom: "test",
      regions: [
        {
          regionKey: "bluegrass",
          displayName: "Bluegrass",
          benchRequestId: "test",
          plate: null,
          context: {
            seasons: ["spring", "summer", "autumn", "winter"],
            landform: "rolling-hills",
            sceneKind: "open-landscape",
          },
          places: {
            includeStates: [],
            excludeStates: [],
            includeCounties: ["21067"],
            excludeCounties: [],
            includePlaces: [],
            excludePlaces: [],
          },
        },
      ],
    };
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-KY",
      placeGeoid: "2146027",
      countyGeoids: countyGeoidsForPlace("2146027"),
      season: "summer",
    });
    // No plate is delivered for the fixture region, but the region matched,
    // and it matched at county level rather than by state.
    expect(resolution.outcome).toBe("none");
    if (resolution.outcome !== "none") return;
    expect(resolution.reason).toBe("matched-region-has-no-plate");
    expect(resolution.regionKeys).toEqual(["bluegrass"]);
  });
});

/**
 * Where a town is, and which county governs it, are different questions.
 *
 * The obvious function to reach for was `countyGovernmentUnitsForPlace`, and
 * it would have been wrong here: it answers the second question, so it returns
 * nothing for a Connecticut town, a Virginia independent city, or a
 * consolidated city-county the 2025 listing files as a municipality. Lexington
 * is the third case, and it is the game's own scenario place — using the
 * government lookup would have left county selectors dead for exactly the town
 * most likely to be tested.
 */
describe("county geography, not county government", () => {
  it("places a town whose county has no county government", () => {
    for (const [placeGeoid, countyGeoid] of [
      ["0937000", "09003"], // Hartford, Connecticut.
      ["5109816", "51520"], // Bristol, an independent city in Virginia.
      ["2146027", "21067"], // Lexington-Fayette, consolidated.
    ] as const) {
      expect(countyGeoidsForPlace(placeGeoid)).toEqual([countyGeoid]);
      expect(countyGovernmentUnitsForPlace(placeGeoid)).toEqual([]);
    }
  });
});
