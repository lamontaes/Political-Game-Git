/**
 * Prints one line for the drawn town after one played year: its median rent
 * at the start, the eviction cases on record (and how many reached removal),
 * and the town's homeless counts. Development tooling for rechecking the
 * eviction and homeless calibration around a change to the rent scale;
 * run before and after with the same seeds (GOLDEN_PATH_SEED).
 */
import { drawPlace } from "../../../scripts/core2-year/place";
import { advanceCore } from "../life";
import { housingStatusCounts } from "../housing-homeless";
import { townFigures } from "../modules/housing";
import { buildPlayedWorld, nextDay, playYear } from "./m1-played-year";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? process.argv[2] ?? "rent-year",
  "rent-year",
);
process.env.GOLDEN_PATH_SEED = drawn.seed;
process.env.GOLDEN_PATH_PLACE_KEY = drawn.key;

const world = buildPlayedWorld();
const { api, core } = world;
const meta = core.placeMetadata ?? {};
const townId = String(meta.housingTown ?? world.placeId);
advanceCore(core, nextDay(world.start));
const rentMinor = townFigures(api, townId).rentMinor;
playYear(world);
const cases = api.moduleState("housing").table("cases").rows() as unknown as {
  stage: string;
}[];
const counts = housingStatusCounts(api, townId);
console.log(
  JSON.stringify({
    place: String(meta.placeKey ?? ""),
    startRent: rentMinor / 100,
    cases: cases.length,
    removed: cases.filter((row) => row.stage === "removed").length,
    homeless: counts.sheltered + counts.unsheltered,
    doubledUp: counts["doubled-up"],
  }),
);
