/**
 * The actual local governments a place lies under, from the Census 2025
 * Government Units listing. A statistical place with no government of its own
 * is never given a fictional city; a county the listing records without a
 * county government is said to have none. Ported from the old engine's
 * `nationwide-world/local-governments.ts`; the world writers stay behind.
 */
import {
  countyGovernmentUnit,
  countyGovernmentUnitsForPlace,
  governmentUnitsForPlace,
} from "../reference/government-units";
import type { GovernmentUnitIdentity } from "../reference/government-units";
import type { CorePlace } from "../place-lookup";
import {
  countyEquivalentTerm,
  type CountyEquivalentTerm,
} from "./government-unit-names";
import {
  municipioUnit,
  municipiosForPlace,
} from "./county-governing-body-rules";
import { townshipGovernmentUnitsForPlace } from "./township-governing-body-rules";

export type CountyGovernmentStatus =
  "established" | "no-county-government" | "not-established" | "not-applicable";

export interface HomeLocalGovernmentUnits {
  readonly placeScope: "locality" | "county" | "state" | null;
  readonly municipal: readonly GovernmentUnitIdentity[];
  readonly counties: readonly GovernmentUnitIdentity[];
  /**
   * The town or township governments a place with no government of its own
   * lies in (a census-designated place in a New England or New York town, or
   * in a township), the one holding most of its residents first. Empty for a
   * city, a county or a state, and where no town is a government.
   */
  readonly townships: readonly GovernmentUnitIdentity[];
  readonly countyStatus: CountyGovernmentStatus;
  readonly countyReason: string | null;
  /**
   * Each county government's share of the place's 2020 land area, when the
   * counties came from the Census place-to-county relation. Null when they
   * came from a county-scope life or a city's own county area.
   */
  readonly countyShares:
    | readonly {
        readonly unitId: string;
        readonly landAreaShare: number;
      }[]
    | null;
}

// Said to the player in the state's own word for a county, and without the
// files behind it.
function countyRelationEmpty(term: CountyEquivalentTerm): string {
  return `Which ${term.singular} government serves this place is not known.`;
}

/** Which government units serve one place. Reads only. */
export function placeLocalGovernmentUnits(
  place: CorePlace | null,
): HomeLocalGovernmentUnits {
  const none = (
    placeScope: HomeLocalGovernmentUnits["placeScope"],
    countyStatus: CountyGovernmentStatus,
    countyReason: string | null,
  ): HomeLocalGovernmentUnits => ({
    placeScope,
    municipal: [],
    counties: [],
    townships: [],
    countyStatus,
    countyReason,
    countyShares: null,
  });
  if (!place) return none(null, "not-applicable", null);
  if (place.scope === "state") return none("state", "not-applicable", null);
  const term = countyEquivalentTerm(place.stateJurisdictionKey);
  if (place.scope === "county") {
    const geoid = place.key.startsWith("county:")
      ? place.key.slice("county:".length)
      : (place.sourceGeoid ?? null);
    const county = geoid
      ? (countyGovernmentUnit(geoid) ?? municipioUnit(geoid))
      : null;
    return county
      ? {
          placeScope: "county",
          municipal: [],
          counties: [county],
          townships: [],
          countyStatus: "established",
          countyReason: null,
          countyShares: null,
        }
      : none(
          "county",
          "no-county-government",
          `This ${term.singular} has no government of its own.`,
        );
  }
  const municipal = place.sourceGeoid
    ? governmentUnitsForPlace(place.sourceGeoid).filter(
        (unit) => unit.unitType === "municipality",
      )
    : [];
  const townships =
    place.sourceGeoid && municipal.length === 0
      ? townshipGovernmentUnitsForPlace(place.sourceGeoid)
      : [];
  // Every county government whose area the place lies in, with its share;
  // a place spanning counties keeps them all and none is chosen.
  const relation = place.sourceGeoid
    ? countyGovernmentUnitsForPlace(place.sourceGeoid)
    : [];
  if (relation.length > 0)
    return {
      placeScope: "locality",
      municipal,
      counties: relation.map((share) => share.unit),
      townships,
      countyStatus: "established",
      countyReason: null,
      countyShares: relation.map((share) => ({
        unitId: share.unit.id,
        landAreaShare: share.landAreaShare,
      })),
    };
  // A municipio is its own government under its place's municipal code,
  // though the Census listing holds none: every one the place lies in.
  const municipios = place.sourceGeoid
    ? municipiosForPlace(place.sourceGeoid)
    : [];
  if (municipios.length > 0)
    return {
      placeScope: "locality",
      municipal,
      counties: municipios,
      townships: [],
      countyStatus: "established",
      countyReason: null,
      countyShares: null,
    };
  if (municipal.length === 0)
    return {
      ...none("locality", "not-established", countyRelationEmpty(term)),
      townships,
    };
  const counties = new Map<string, GovernmentUnitIdentity>();
  for (const unit of municipal) {
    const county = unit.countyGeoid
      ? countyGovernmentUnit(unit.countyGeoid)
      : null;
    if (county) counties.set(county.id, county);
  }
  return {
    placeScope: "locality",
    municipal,
    counties: [...counties.values()],
    townships: [],
    countyStatus: counties.size > 0 ? "established" : "no-county-government",
    countyReason:
      counties.size > 0
        ? null
        : `No separate ${term.singular} government serves this city.`,
    countyShares: null,
  };
}
