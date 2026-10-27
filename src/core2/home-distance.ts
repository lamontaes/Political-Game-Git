/**
 * How far a household lives from the middle of its town, in miles: an
 * estimate from the place's real land area (2020 Census place-county parts)
 * and the household's own place in it, fixed by the world's seed (generation
 * of who lives where, never a choice made in play). A household is a point
 * spread evenly over a disc the size of the town's land, so a larger place
 * has farther homes on average (the mean distance is two thirds of the
 * disc's radius). A place with no recorded land (a territory village) starts
 * from the median place's land, marked ESTIMATED; nothing is unknown.
 */
import { PLACE_COUNTY_RELATIONS_ROWS } from "./reference/place-county-relations.generated";
import { stableHash } from "./kernel/ids";
import { parameter } from "./parameters";
import type { CoreState } from "./types";

const SQUARE_METERS_PER_SQUARE_MILE = 2_589_988.110336;

let landByPlace: ReadonlyMap<string, number> | undefined;
let medianLand = 0;

function load(): ReadonlyMap<string, number> {
  if (landByPlace) return landByPlace;
  const map = new Map<string, number>();
  for (const [place, , land] of JSON.parse(PLACE_COUNTY_RELATIONS_ROWS) as [
    string,
    string,
    number,
  ][])
    map.set(place, (map.get(place) ?? 0) + land);
  const lands = [...map.values()].sort((a, b) => a - b);
  medianLand = lands[Math.floor(lands.length / 2)] ?? 0;
  landByPlace = map;
  return map;
}

/** A place's land area in square miles; the median place's where the place has none recorded. */
export function placeLandSquareMiles(placeKey: string | undefined): number {
  const land = (placeKey ? load().get(placeKey) : undefined) ?? medianLandOf();
  return land / SQUARE_METERS_PER_SQUARE_MILE;
}

function medianLandOf(): number {
  load();
  return medianLand;
}

const kept = new WeakMap<object, Map<string, number>>();

/** Miles from the middle of the town to a household's home (stable for the world). */
export function homeDistanceMiles(
  core: Pick<CoreState, "seed" | "placeMetadata" | "data">,
  householdId: string,
): number {
  const byHousehold = kept.get(core) ?? new Map<string, number>();
  kept.set(core, byHousehold);
  const held = byHousehold.get(householdId);
  if (held !== undefined) return held;
  const p = (key: string) => parameter(key, core.data.parameters);
  // stopgapId: SG-TRAITS-household-distance-estimate
  const radius = Math.sqrt(
    placeLandSquareMiles(core.placeMetadata.placeKey) / Math.PI,
  );
  const hash = stableHash(`${core.seed}:home-distance:${householdId}`);
  const unit =
    (Number.parseInt(hash.slice(0, 12), 16) + p("one") / p("two")) / 16 ** 12;
  // A point spread evenly over the disc sits at radius times the root of a uniform value.
  const miles = radius * Math.sqrt(unit);
  byHousehold.set(householdId, miles);
  return miles;
}
