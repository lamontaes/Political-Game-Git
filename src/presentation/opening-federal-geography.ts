import { lifePlaceByKey, lifePlaceSearch } from "../simulation/life-places";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../simulation/rng";
import type { EntityId, World } from "../simulation/types";

export const OPENING_FEDERAL_GEOGRAPHY_VERSION = "opening-federal-geography-v1";
/** Census place identity; not a made-up federal jurisdiction or a venue ID. */
export const WASHINGTON_PLACE_KEY = "1150000";

export interface OpeningFederalGeography {
  readonly world: World;
  readonly homeJurisdictionId: EntityId;
  readonly birthplaceJurisdictionId: EntityId;
  readonly institutionJurisdictionId: EntityId;
}

/**
 * A bounded opening scenario, not a model of officials' real demographics.
 * Birthplace draws a state/DC and then a locality within it, uniformly at each
 * stage. It uses a separate seeded stream and never the player's hometown.
 * These two fictional incumbents initially reside in Washington; this does
 * not assert that every federal official must live there, or establish their
 * instantaneous location, constituency, street address or prior residences.
 */
export function prepareOpeningFederalGeography(
  world: World,
  personKey: string,
): OpeningFederalGeography {
  if (personKey.trim().length === 0) {
    throw new Error("Opening federal geography needs a stable person key.");
  }
  const washington = lifePlaceByKey(WASHINGTON_PLACE_KEY);
  if (
    !washington ||
    washington.scope !== "locality" ||
    washington.stateJurisdictionKey !== "US-DC"
  ) {
    throw new Error("The accepted Washington locality is unavailable.");
  }
  const rng = new SeededRng(world.seed).fork(
    `${OPENING_FEDERAL_GEOGRAPHY_VERSION}:${personKey}`,
  );
  const regions = [...US_STATE_USPS, "DC"].sort();
  const region = rng.fork("birth-region").pick(regions);
  // No UI pagination limit, dependence on the visited places, or first-match
  // fallback. These are accepted geography rows, not inferred biographies.
  const places = [
    ...lifePlaceSearch("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: `US-${region}`,
      scope: "locality",
    }),
  ].sort((left, right) =>
    left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
  );
  if (
    places.length === 0 ||
    places.some(
      (place) =>
        place.scope !== "locality" ||
        place.stateJurisdictionKey !== `US-${region}`,
    )
  ) {
    throw new Error(
      `Accepted birthplace localities are unavailable for ${region}.`,
    );
  }
  const birthplace = rng.fork("birth-locality").pick(places);
  let next = world;
  for (const place of [washington, birthplace]) {
    const jurisdiction = place.context.jurisdiction;
    if (next.jurisdictions[jurisdiction.id]) continue;
    next = {
      ...next,
      jurisdictions: { ...next.jurisdictions, [jurisdiction.id]: jurisdiction },
      jurisdictionOrder: [...next.jurisdictionOrder, jurisdiction.id],
    };
  }
  return {
    world: next,
    homeJurisdictionId: washington.context.jurisdiction.id,
    birthplaceJurisdictionId: birthplace.context.jurisdiction.id,
    institutionJurisdictionId: washington.context.jurisdiction.id,
  };
}
