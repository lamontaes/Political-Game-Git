/**
 * Prints one line for the drawn town: its median rent at the start of the
 * year in the played world, next to the sourced median gross rent of its
 * county or municipio (ACS 2020-2024 B25064). Development tooling; run it for
 * several draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY) before and after a
 * change to the rent scale.
 */
import housingData from "../data/housing/housing.json" with { type: "json" };
import { advanceCore } from "../life";
import {
  publishedRentValueOf as rentValueOf,
  townFigures,
} from "../modules/housing";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildPlayedWorld, nextDay } from "./m1-played-year";

// The place is drawn from all 56 by the seed, as the other tools draw it.
const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? process.argv[2] ?? "rent-table",
  "rent-table",
);
process.env.GOLDEN_PATH_SEED = drawn.seed;
process.env.GOLDEN_PATH_PLACE_KEY = drawn.key;

const world = buildPlayedWorld();
const { api, core } = world;
const meta = core.placeMetadata ?? {};
const townId = String(meta.housingTown ?? world.placeId);
const county = String(meta.housingCounty ?? "");
advanceCore(core, nextDay(world.start));
const opening = townFigures(api, townId);
const sourced = rentValueOf(county);
void housingData;
console.log(
  JSON.stringify({
    place: String(meta.placeKey ?? ""),
    county,
    sourcedCountyRent: sourced?.[0] ?? null,
    townRent: opening.rentMinor / 100,
  }),
);
