import { expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createNewGameWorld } from "../../presentation/new-game";
import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  recordedHazardFootprint,
  recordedHazardYear,
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

it("replays each complete detail year's exact county-matched reports without a count draw", () => {
  const span = STORM_CATALOG.episodeDetailPolicy!.episodeRowYears!;
  const episode = STORM_CATALOG.episodes.find((row) =>
    row.affectedAreas.some((area) => area.czType === "C"),
  )!;
  const county = episode.affectedAreas.find((area) => area.czType === "C")!;
  const jurisdictionId = createStableId(
    "jurisdiction",
    "recorded-report-count",
  );
  const areas = [
    {
      jurisdictionId,
      stateUsps: "CA",
      countyGeoids: [`${county.stateFips}${county.countyFips}`],
    },
  ];
  const simulationYear = Number(episode.startDate.slice(0, 4));
  const sourceYear = recordedHazardYear(
    makeIsoDate(`${simulationYear}-01-01`),
  )!;
  expect(sourceYear).toBe(simulationYear);
  const expected = STORM_CATALOG.episodes.filter(
    (row) =>
      row.startDate.startsWith(`${sourceYear}-`) &&
      recordedHazardFootprint(areas, row.affectedAreas).length > 0,
  );
  expect(expected.length).toBeGreaterThan(0);
  // All reports in a complete detail year remain countable, including quiet
  // months. The longer 2000–2024 aggregate is not used as episode detail.
  const replayed = Array.from({ length: 12 }, (_, month) =>
    STORM_CATALOG.episodes.filter(
      (row) =>
        Number(row.startDate.slice(0, 4)) ===
          recordedHazardYear(
            makeIsoDate(
              `${simulationYear}-${String(month + 1).padStart(2, "0")}-01`,
            ),
          ) &&
        row.month === month + 1 &&
        recordedHazardFootprint(areas, row.affectedAreas).length > 0,
    ),
  ).flat();
  expect(replayed.map((row) => row.episodeId)).toEqual(
    expected.map((row) => row.episodeId),
  );
  const width = span.lastYear - span.firstYear + 1;
  expect(
    recordedHazardYear(makeIsoDate(`${simulationYear + width}-01-01`)),
  ).toBe(sourceYear);
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
      expect(Number(episode.startDate.slice(0, 4))).toBe(
        recordedHazardYear(
          makeIsoDate(`2027-${String(month).padStart(2, "0")}-01`),
        ),
      );
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
