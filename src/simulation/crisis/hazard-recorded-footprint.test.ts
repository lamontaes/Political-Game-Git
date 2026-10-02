import { expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createNewGameWorld } from "../../presentation/new-game";
import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  recordedHazardFootprint,
  representedHazardAreas,
  sampleMonthlyHazards,
  STORM_CATALOG,
} from "./hazard-producer";

it("uses recorded counties regardless of jurisdiction order and excludes forecast zones", () => {
  const episode = STORM_CATALOG.episodes.find((row) =>
    row.affectedAreas.some((area) => area.czType === "C"),
  )!;
  const county = episode.affectedAreas.find((area) => area.czType === "C")!;
  const affected = createStableId(
    "jurisdiction",
    `test:${county.stateFips}${county.countyFips}`,
  );
  const outside = createStableId("jurisdiction", "test:unmatched-geography");
  const areas = [
    { jurisdictionId: outside, stateUsps: "", countyGeoids: [] },
    {
      jurisdictionId: affected,
      stateUsps: "",
      countyGeoids: [`${county.stateFips}${county.countyFips}`],
    },
  ];
  expect(recordedHazardFootprint(areas, episode.affectedAreas)).toEqual([
    affected,
  ]);
  expect(
    recordedHazardFootprint([...areas].reverse(), episode.affectedAreas),
  ).toEqual([affected]);
  expect(recordedHazardFootprint(areas, [{ ...county, czType: "Z" }])).toEqual(
    [],
  );
  expect(recordedHazardFootprint(areas, [])).toEqual([]);
});

it("opens a random-place ordinary game and samples only its recorded county matches", () => {
  const seed = "a132-recorded-county-footprint";
  const place = drawRandomPlace(seed);
  console.info(
    JSON.stringify({ seed, place: place.displayName, placeKey: place.key }),
  );
  const game = createNewGameWorld(
    explicitNewGameSetup({
      seed,
      placeKey: place.key,
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
    }),
  );
  const areas = representedHazardAreas(game.world);
  for (let month = 1; month <= 12; month++) {
    for (const sample of sampleMonthlyHazards(
      game.world,
      makeIsoDate(`2027-${String(month).padStart(2, "0")}-01`),
    )) {
      const episode = STORM_CATALOG.episodes.find(
        (row) => row.episodeId === sample.recordedEpisodeId,
      )!;
      expect(sample.jurisdictionIds).toEqual(
        recordedHazardFootprint(
          areas.filter((area) => area.stateUsps === sample.stateUsps),
          episode.affectedAreas,
        ),
      );
      expect(sample.jurisdictionIds.length).toBeGreaterThan(0);
    }
  }
  const saved = serializeWorld(game.world);
  expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
