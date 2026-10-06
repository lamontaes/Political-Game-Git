import type { BrowserEconomicGeographyBinding } from "./economic-context-browser";
import { countyGeoidsForPlace } from "../simulation/government-units";
import { lifePlaceByKey } from "../simulation/life-places";
import type { LifePlace } from "../simulation/life-places";

/**
 * Which provider geographies stand behind the place a player lives in.
 *
 * A binding is never inferred from a display name, from state membership, or
 * from a nearby geography. It comes from the
 * sourced Census place-to-county
 * relation the game already carries, which is a sourced statement about which
 * county areas a place lies in and not a guess about which one is close.
 *
 * ## Why deriving is not inferring
 *
 * This registry used to hold one entry, and the comment above it said a second
 * city was "one import and one line". That was true, and it was not the
 * bottleneck: at one reviewed crosswalk per town, a country of 32,350 places
 * is 32,350 reviews, so the shipped corpus — 3,597 BEA geographies and 4,934
 * HUD geographies, already on disk — stayed unreadable everywhere but
 * Lexington.
 *
 * What makes a derived binding honest is that every code in it is computed
 * from an identifier the sources themselves established. A county GEOID is the
 * whole of the Census county identity; a HUD area code is that county plus the
 * `99999` suffix HUD files it under; a state's BEA code is the state FIPS plus
 * `000`. None of those is a judgment call, and each is checked against the
 * shipped manifest index at query time, so a geography the corpus does not
 * carry yields no rows and is reported unavailable rather than guessed at.
 *
 * ## What is deliberately not derived
 *
 * Metropolitan areas require an accepted place-to-MSA crosswalk. A county
 * does not establish that relation, so no containing metro is inferred.
 */
/**
 * The state FIPS prefix of a Census GEOID.
 *
 * Place and county GEOIDs alike open with the two-digit state FIPS, so this
 * reads an identity the source assigned rather than mapping a USPS code
 * through a table this file would then own a second copy of.
 */
function stateFipsOf(geoid: string): string | null {
  return /^\d{2}/.test(geoid) ? geoid.slice(0, 2) : null;
}

/**
 * Which county areas this place lies in, as the Census relation records them.
 *
 * A county-scope place is its own county. A locality is asked through the
 * place-to-county relation, which returns more than one GEOID for a town
 * straddling a county line — all of them are kept, because somebody living in
 * such a town lives in all of them and the panel should say so.
 */
function countyGeoidsFor(place: LifePlace): readonly string[] {
  const geoid = place.sourceGeoid;
  if (!geoid) return [];
  if (place.scope === "county") return [geoid];
  return countyGeoidsForPlace(geoid);
}

/**
 * A binding built from the place's own sourced identity, or null.
 *
 * Null when the place carries no Census GEOID — the authored statewide
 * entries, which are not somewhere a person lives.
 */
function deriveBinding(
  place: LifePlace,
): BrowserEconomicGeographyBinding | null {
  const geoid = place.sourceGeoid;
  if (!geoid) return null;
  const stateFips = stateFipsOf(geoid);
  if (!stateFips) return null;

  const counties = countyGeoidsFor(place);
  // A county a player lives in IS their jurisdiction; a town merely sits in one.
  const ownsItsCounty = place.scope === "county";

  return {
    bindingKey: `economic-context.derived.${place.key}.v1`,
    placeKey: place.key,
    placeLabel: place.displayName,
    beaAreas: [
      ...counties.map((countyGeoid) => ({
        geographyLevel: "county" as const,
        geoFips: countyGeoid,
        relationship: ownsItsCounty
          ? ("same-jurisdiction" as const)
          : ("containing-county" as const),
      })),
      {
        geographyLevel: "state" as const,
        geoFips: `${stateFips}000`,
        relationship: "containing-state" as const,
      },
    ],
    lausAreaCodes: [
      {
        areaCode: `ST${stateFips}00000000000`,
        relationship: "containing-state" as const,
      },
    ],
    hudFipsCodes: counties.map((countyGeoid) => ({
      hudFipsCode: `${countyGeoid}99999`,
      relationship: ownsItsCounty
        ? ("same-jurisdiction" as const)
        : ("containing-hud-area" as const),
    })),
  };
}

export function economicContextBindingForPlace(
  placeKey: string,
): BrowserEconomicGeographyBinding | null {
  const place = lifePlaceByKey(placeKey);
  return place ? deriveBinding(place) : null;
}

/**
 * Why this place has no binding, in the words a player should read.
 *
 * A surface that renders nothing when it has nothing is indistinguishable from
 * a surface that is broken, and this one rendered nothing for every town in
 * the country. Where a reason exists, it is said.
 */
export function economicContextUnavailableReason(placeKey: string): string {
  const place = lifePlaceByKey(placeKey);
  if (!place) {
    return "The game has no record of this place, so it cannot look up how the area is doing.";
  }
  if (!place.sourceGeoid) {
    return `${place.displayName} is a whole state rather than somewhere a person lives, so there is no local area to report on.`;
  }
  return `No county area is recorded for ${place.displayName} in the Census relation the game reads, so it cannot say which published figures describe this place.`;
}
