/**
 * Every line of code that draws while a world opens is in the opening list (dev-views/opening-
 * sources.json `sites`), so dev mode's "How this world opened" can say how each was made and what
 * replaces it. Records a New Game opening (its 31 warm-up days included) the way the view's Record
 * does, through recordOpening, and fails on a site the list does not know: a new draw is classified
 * in the same pull request that adds it. Pinned: Ridgeville, Alabama (0164656), the draw
 * "8341-pin"/"p6" dev-views.test.ts names.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { recordOpening } from "./dev-views/opening";
import SOURCES from "./dev-views/opening-sources.json" with { type: "json" };
import { OPENING_WARMUP_DAYS } from "./world";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };

it("every draw a New Game opening takes is in the opening list (Ridgeville AL)", async () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const { draws } = await recordOpening({
    seed: place.seed,
    date: gameStartDate(),
    options: {
      twoLevel: true,
      warmUpDays: OPENING_WARMUP_DAYS,
      placeKey: place.key,
    },
  });
  const unknown = draws
    .filter((d) => !d.made)
    .map((d) => `${d.site} (${d.primitive}, ${d.count} draws, ${d.stages})`);
  expect(
    unknown,
    `${where}: sites missing from src/bench/dev-views/opening-sources.json`,
  ).toEqual([]);
  // The recording sees the world's offsets and the draws the audit named, by file and function.
  const sites = new Set(draws.map((d) => d.site));
  expect(
    sites.has("src/core2/gov-rules/place-population.ts#worldPopulationOf"),
  ).toBe(true);
  expect(sites.has("src/core2/modules/offices.ts#pastTerms")).toBe(true);
  // No record id is counted as a draw.
  expect(
    draws.filter((d) => d.made === SOURCES.kinds.id).length,
    `${where}: ids made by createStableId are skipped`,
  ).toBeLessThan(10);
}, 125_000);
