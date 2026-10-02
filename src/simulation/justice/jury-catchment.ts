import { ensureJurisdiction } from "../national-election-geography";
/** CTO12:31: county geography is an estimated trial-jury catchment. */
import { countyPopulationSharesForPlace } from "../government-units";
import {
  lifePlaceByJurisdictionId,
  searchLifePlaces,
  type LifePlace,
} from "../life-places";
import {
  materializeTownHousehold,
  townRoster,
} from "../living-world/town-residents";
import type { EntityId, World } from "../types";

export function juryCountyForPlace(jurisdictionId: EntityId): string | null {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (!place?.sourceGeoid) return null;
  const parts = countyPopulationSharesForPlace(place.sourceGeoid)
    .filter((row): row is readonly [string, number] => row[1] !== null)
    .sort((a, b) => b[1] - a[1]);
  if (!parts.length || (parts[1] && parts[0]![1] === parts[1][1])) return null;
  return parts[0]![0];
}

const PLACES = new Map<string, readonly LifePlace[]>();
function countyPlaces(venue: EntityId, county: string): readonly LifePlace[] {
  const state = lifePlaceByJurisdictionId(venue)?.stateJurisdictionKey;
  if (!state) return [];
  const key = `${state}:${county}`;
  let places = PLACES.get(key);
  if (!places) {
    places = searchLifePlaces("", 50000, {
      stateJurisdictionKey: state,
      scope: "locality",
    }).filter(
      (place) => juryCountyForPlace(place.context.jurisdiction.id) === county,
    );
    PLACES.set(key, places);
  }
  return places;
}

/** No county binding means the prior exact-venue pool, never another county. */
export function livesInJuryCatchment(home: EntityId, venue: EntityId): boolean {
  const county = juryCountyForPlace(venue);
  return county ? juryCountyForPlace(home) === county : home === venue;
}

/**
 * Bring existing Census-calibrated roster households into the saved world.
 * Population-weighted cumulative quotas determine which locality supplies the
 * next household; all eligibility and excusals remain in the caller's pool.
 * Each finite roster is exhausted at most once, without a new resident generator.
 */
export function summonJuryResidents(
  world: World,
  venue: EntityId | null,
  required: number,
  eligible: (world: World) => readonly EntityId[],
): World {
  if (!venue || eligible(world).length >= required) return world;
  const county = juryCountyForPlace(venue);
  if (!county) return world;
  const candidates = countyPlaces(venue, county).flatMap((place) => {
    const roster = townRoster(place.context.jurisdiction.id);
    return roster.referencePopulation !== null && roster.referencePopulation > 0
      ? [{ place, roster, index: 0, credit: 0 }]
      : [];
  });
  let next = world;
  while (eligible(next).length < required) {
    const available = candidates.filter(
      (row) => row.index < row.roster.households,
    );
    if (!available.length) break;
    const total = available.reduce(
      (sum, row) => sum + row.roster.population,
      0,
    );
    let chosen = available[0]!;
    for (const row of available) {
      row.credit += row.roster.population / total;
      if (row.credit > chosen.credit) chosen = row;
    }
    chosen.credit -= 1;
    const jurisdiction = chosen.place.context.jurisdiction;
    next = ensureJurisdiction(next, jurisdiction);
    next = materializeTownHousehold(next, jurisdiction.id, chosen.index++);
  }
  return next;
}
