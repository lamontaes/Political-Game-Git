import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

// An unincorporated place (Bayou Blue, Louisiana) has an office of its parish
// (the Bayou Blue Public Works Department, government gus2025:166006) beside
// the parish's own county-buyer account. The office counted the place's
// residents (10,003) and the parish's record counted the people it serves
// there (6,472), so the opening stopped with "Conflicting represented public
// owner coverage". The government's recorded coverage now stands for every
// office it runs in the place.
const REGRESSION = {
  seed: "e955294c587729831a6cee88a3d0927ecf6a630617722d4bd7ad78cc74505e07",
  key: "2205175",
  name: "Bayou Blue, Louisiana",
};
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

function runThirtyDays(place: { seed: string; key: string; name: string }) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const start = core.date;
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  expect(
    core.date > start,
    `${place.name} (${place.key}) seed ${place.seed}`,
  ).toBe(true);
}

it("an unincorporated place with a county office opens and advances 30 days", () => {
  runThirtyDays(REGRESSION);
}, 900_000);

it(`a drawn place opens and advances 30 days (seed ${seed})`, () => {
  runThirtyDays(drawPlace(seed, "county-office:a"));
}, 900_000);
