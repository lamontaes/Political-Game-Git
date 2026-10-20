import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

// A town inside a township (Robertsdale, Pennsylvania lies in Township of
// Wood) has a buyer whose own jurisdiction is not the town. It used to stop
// the game on its first monthly settlement (2025-02-01, the first of the month after the
// January 20, 2025 start) with "Actual customer public
// owner coverage record is missing." The contract is now built only where the
// owner's coverage of the place is recorded, and the year goes on.
const REGRESSION = {
  seed: "3c95bb8562a14177f929263165b4517d25ed5263bf83f68c84dead5d0aae3069:2",
  key: "4265296",
  name: "Robertsdale, Pennsylvania",
};
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

function runSixtyDays(place: { seed: string; key: string; name: string }) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const start = core.date;
  advanceCore(core, addDays(makeIsoDate(core.date), 60));
  expect(
    core.date > start,
    `${place.name} (${place.key}) seed ${place.seed}`,
  ).toBe(true);
}

it("a town inside a township advances 60 days past its first public settlement", () => {
  runSixtyDays(REGRESSION);
}, 900_000);

it(`two drawn places advance 60 days (seed ${seed})`, () => {
  for (const label of ["township-owner:a", "township-owner:b"])
    runSixtyDays(drawPlace(seed, label));
}, 1_800_000);
