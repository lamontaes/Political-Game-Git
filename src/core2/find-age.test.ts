import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { findAgeFactor, findPerQuarter } from "./past-work";

// Finding work slows with age past the reference age, never speeds up for the young,
// and the rate everyone shares carries it (one rule for the pre-start run and play).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "find-age");

it(`finding work slows with age and never speeds up for the young in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const reference = api.parameter("pastWorkFindAgeReferenceYears");
  expect(findAgeFactor(api, 20)).toBe(1);
  expect(findAgeFactor(api, reference)).toBe(1);
  expect(findAgeFactor(api, 60)).toBeLessThan(1);
  expect(findAgeFactor(api, 70)).toBeLessThan(findAgeFactor(api, 60));
  expect(findPerQuarter(api, 1, 0, 70)).toBeCloseTo(
    findPerQuarter(api, 1, 0) * findAgeFactor(api, 70),
  );
});
