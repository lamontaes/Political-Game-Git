import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import { advanceCore } from "./life";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalities, placeStateKeys } from "./places";

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

// Every locality whose own government is its county (no city, village or
// township) carries two coverage rows for that county: the county-buyer
// account's recorded count and its offices in the place. They number 8,242
// of the recorded localities, at about 12 seconds an opening, so one run
// builds one drawn locality of the kind in every jurisdiction that has any.
function countyGoverned(stateKey: string) {
  return [...placeLocalities(stateKey)]
    .filter((locality) => {
      const units = placeLocalGovernmentUnits(corePlaceByKey(locality.key));
      return (
        units.municipal.length === 0 &&
        units.townships.length === 0 &&
        units.counties.length > 0
      );
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

it(`a county-governed locality in every jurisdiction that has one opens (seed ${seed})`, () => {
  setBookkeeping(false);
  const failed: string[] = [];
  const built: string[] = [];
  for (const stateKey of [...placeStateKeys()].sort()) {
    const localities = countyGoverned(stateKey);
    if (!localities.length) continue;
    const hash = createHash("sha256")
      .update(`${seed}:county-office:${stateKey}`)
      .digest("hex");
    const locality =
      localities[parseInt(hash.slice(0, 8), 16) % localities.length]!;
    const name = `${locality.displayName} (${locality.key}) seed ${hash}`;
    // Named before the build, so a worker that dies building it still names it.
    process.stdout.write(`county-office: ${name}\n`);
    try {
      buildBenchWorld(hash, gameStartDate(), {
        twoLevel: true,
        placeKey: locality.key,
      });
      built.push(name);
    } catch (error) {
      failed.push(`${name}: ${(error as Error).message}`);
    }
  }
  expect(failed, failed.join("\n")).toEqual([]);
  expect(built.length).toBeGreaterThan(0);
}, 1_800_000);
