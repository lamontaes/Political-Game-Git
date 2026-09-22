import {
  GOVERNMENT_UNITS_META,
  PLACE_COUNTY_RELATIONS_META,
  countyGovernmentUnit,
  countyGeoidsForPlace,
  countyGovernmentUnitsForPlace,
  governmentUnitsForPlace,
} from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { createOrganization } from "../life";
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
  residentNameForJurisdiction,
} from "../life-places";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import type { EntityId, IsoDate, Jurisdiction, World } from "../types";
import { governingJurisdictionIdFor } from "./government-jurisdiction";
import {
  resolveNationwideRuleCapability,
  unadmittedRuleFields,
} from "./rule-capability-port";
import type { RuleFieldKey } from "./rule-capability-port";

/**
 * The actual local governments a life is lived under, from the Census 2025
 * Government Units listing through RULES' unit index. A statistical place with
 * no government of its own is never given a fictional city; a county the
 * listing records without a county government is said to have none.
 */

export const LOCAL_GOVERNMENT_WRITER_VERSION = "nationwide-local-government-v1";

export type CountyGovernmentStatus =
  "established" | "no-county-government" | "not-established" | "not-applicable";

export interface HomeLocalGovernmentUnits {
  readonly placeScope: "locality" | "county" | "state" | null;
  readonly municipal: readonly GovernmentUnitIdentity[];
  readonly counties: readonly GovernmentUnitIdentity[];
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

const COUNTY_RELATION_EMPTY = `No county government is recorded for this place's county areas as the Census described them on ${PLACE_COUNTY_RELATIONS_META.geographyAsOf}, or the place is not in those files, so its county government is not established.`;

/** Which government units serve the place this person lives in. Reads only. */
export function homeLocalGovernmentUnits(
  world: World,
  personId: EntityId,
): HomeLocalGovernmentUnits {
  const person = world.people[personId];
  const place = person
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)
    : null;
  const none = (
    placeScope: HomeLocalGovernmentUnits["placeScope"],
    countyStatus: CountyGovernmentStatus,
    countyReason: string | null,
  ): HomeLocalGovernmentUnits => ({
    placeScope,
    municipal: [],
    counties: [],
    countyStatus,
    countyReason,
    countyShares: null,
  });
  if (!place) return none(null, "not-applicable", null);
  if (place.scope === "state") return none("state", "not-applicable", null);
  if (place.scope === "county") {
    const geoid = place.key.startsWith("county:")
      ? place.key.slice("county:".length)
      : (place.sourceGeoid ?? null);
    const county = geoid ? countyGovernmentUnit(geoid) : null;
    return county
      ? {
          placeScope: "county",
          municipal: [],
          counties: [county],
          countyStatus: "established",
          countyReason: null,
          countyShares: null,
        }
      : none(
          "county",
          "no-county-government",
          "The Census Government Units listing records no county government for this county area.",
        );
  }
  const municipal = place.sourceGeoid
    ? governmentUnitsForPlace(place.sourceGeoid).filter(
        (unit) => unit.unitType === "municipality",
      )
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
      countyStatus: "established",
      countyReason: null,
      countyShares: relation.map((share) => ({
        unitId: share.unit.id,
        landAreaShare: share.landAreaShare,
      })),
    };
  if (municipal.length === 0)
    return none("locality", "not-established", COUNTY_RELATION_EMPTY);
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
    countyStatus: counties.size > 0 ? "established" : "no-county-government",
    countyReason:
      counties.size > 0
        ? null
        : "The Census Government Units listing records no county government for this city's county area.",
    countyShares: null,
  };
}

const LOWERCASE_WORDS = new Set(["of", "the", "and", "de", "la", "du"]);

/** The publisher's own name, in ordinary capitals; no words are added or dropped. */
export function localGovernmentDisplayName(
  unit: GovernmentUnitIdentity,
): string {
  return unit.name
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.replace(
            /(^|[-'(])([a-z])/g,
            (_, lead: string, letter: string) =>
              `${lead}${letter.toUpperCase()}`,
          ),
    )
    .join(" ");
}

/**
 * The government's area as a resident says it: "Baltimore County", not the
 * listing's filing name "County of Baltimore". For a party chapter, a club or
 * anything else named for the place rather than for the government itself.
 * Falls back to the display name for a unit with no seated place.
 */
export function localGovernmentAreaName(unit: GovernmentUnitIdentity): string {
  const jurisdiction = jurisdictionForUnit(unit);
  return jurisdiction
    ? residentNameForJurisdiction(
        jurisdiction.name,
        jurisdiction.parentName ?? null,
      )
    : localGovernmentDisplayName(unit);
}

/**
 * States whose party committees are town and ward committees rather than
 * county ones. A blanket rule, filed for research as
 * `party-local-organizing-unit-by-state`: New England towns govern themselves
 * and several of its county governments were abolished, so a place there with
 * no county government is named for itself, not for its county's area.
 */
const TOWN_ORGANIZED_STATES: ReadonlySet<string> = new Set([
  "US-CT",
  "US-MA",
  "US-ME",
  "US-NH",
  "US-RI",
  "US-VT",
]);

// A county-equivalent's legal kind, as the Census names its area. What is left
// is the name a resident knows it by.
const COUNTY_AREA_KIND =
  / (County|Parish|Borough|City and Borough|Municipality|city)$/;

/**
 * The area a person's local party organization is named for: the county,
 * parish or borough they live in, the way they say it, or their own town where
 * the town is the county or where there is no county to name.
 *
 * Parties organize by county, parish and borough, and they do so whether or
 * not that area has a separate government. Houma, Louisiana is run by the
 * Terrebonne Parish consolidated government, which the Census listing files as
 * a municipality, so reading only county governments named its chapter for
 * Houma; the parish is the Terrebonne Parish Democrats. So:
 *
 *   - A county government of the home place: that county, as residents say it.
 *   - Otherwise the one county area the place lies in (2020 geography), named
 *     as residents say it: "Terrebonne Parish", "Davidson County".
 *   - The town itself when that area is the town (Denver, Juneau, Anchorage,
 *     Richmond, St. Louis, Philadelphia), when the place spans several county
 *     areas and none can be chosen (New York), when the area is a Census Area
 *     that is only statistical (Bethel, Alaska), when the state has no county
 *     area named for the place (Connecticut), and in the town-organized states
 *     above.
 */
export function homeLocalPartyAreaName(
  world: World,
  personId: EntityId,
): string | null {
  const county = homeLocalGovernmentUnits(world, personId).counties[0];
  if (county) return localGovernmentAreaName(county);
  const person = world.people[personId];
  const home = person ? world.jurisdictions[person.homeJurisdictionId] : null;
  if (!home) return null;
  const town = residentNameForJurisdiction(home.name, home.parentName ?? null);
  const place = lifePlaceByJurisdictionId(home.id);
  if (
    !place ||
    place.scope !== "locality" ||
    !place.sourceGeoid ||
    (place.stateJurisdictionKey !== null &&
      TOWN_ORGANIZED_STATES.has(place.stateJurisdictionKey))
  ) {
    return town;
  }
  const areas = countyGeoidsForPlace(place.sourceGeoid);
  if (areas.length !== 1) return town;
  const area = lifePlaceByKey(`county:${areas[0]}`);
  if (!area) return town;
  const areaName = residentNameForJurisdiction(
    area.displayName,
    area.withinName,
  );
  if (areaName.endsWith(" Census Area")) return town;
  const core = areaName.replace(COUNTY_AREA_KIND, "");
  return core === town || core === place.displayName.split(",")[0]
    ? town
    : areaName;
}

export function localGovernmentOrganizationKey(
  unit: GovernmentUnitIdentity,
): string {
  return `local-government:${unit.id}`;
}

function jurisdictionForUnit(
  unit: GovernmentUnitIdentity,
): Jurisdiction | null {
  const place =
    unit.unitType === "county"
      ? unit.countyGeoid
        ? lifePlaceByKey(`county:${unit.countyGeoid}`)
        : null
      : unit.placeGeoid
        ? lifePlaceByKey(unit.placeGeoid)
        : null;
  const jurisdiction = place?.context.jurisdiction ?? null;
  // The one mapping every consumer shares; never a second identity.
  return jurisdiction &&
    jurisdiction.id === governingJurisdictionIdFor({ kind: "local", unit })
    ? jurisdiction
    : null;
}

/**
 * Records each actual government serving this person's home as an organization,
 * once. A government compiled from its own enacted text keeps the municipal
 * workspace's install path and is not duplicated here. Nothing about members,
 * powers or form is recorded: those are RULES facts, reported by
 * `homeLocalGovernmentStatus` as missing until admitted.
 */
export function ensureHomeLocalGovernments(
  world: World,
  personId: EntityId,
): World {
  const units = homeLocalGovernmentUnits(world, personId);
  let next = world;
  for (const unit of [...units.municipal, ...units.counties]) {
    if (municipalGovernmentForUnit(unit)) continue;
    next = ensureLocalGovernmentOrganization(next, unit);
  }
  return next;
}

/**
 * One government unit recorded as an organization, once, in the jurisdiction
 * it governs. Unchanged when that jurisdiction cannot be named, since a
 * government placed in the wrong jurisdiction is worse than none.
 */
export function ensureLocalGovernmentOrganization(
  world: World,
  unit: GovernmentUnitIdentity,
): World {
  const stableKey = localGovernmentOrganizationKey(unit);
  if (world.history.organizations.some((o) => o.stableKey === stableKey))
    return world;
  const jurisdiction = jurisdictionForUnit(unit);
  if (!jurisdiction) return world;
  let next = world;
  if (!next.jurisdictions[jurisdiction.id]) {
    next = {
      ...next,
      jurisdictions: {
        ...next.jurisdictions,
        [jurisdiction.id]: jurisdiction,
      },
      jurisdictionOrder: [...next.jurisdictionOrder, jurisdiction.id],
    };
  }
  const asOf = unit.asOf as IsoDate;
  const listed = asOf <= next.currentDate;
  return createOrganization(next, {
    stableKey,
    formedAt: listed ? asOf : next.currentDate,
    detailLevel: "lightweight",
    provenance: listed
      ? {
          kind: "source-record",
          reference: `${GOVERNMENT_UNITS_META.artifactId} ${unit.id} "${unit.name}"`,
          asOf,
        }
      : {
          kind: "authored",
          note: `Placed from ${GOVERNMENT_UNITS_META.artifactId} ${unit.id}, which speaks as of ${asOf}, after this world's ${next.currentDate}; not backdated.`,
        },
    initialProfile: {
      name: localGovernmentDisplayName(unit),
      classification:
        unit.unitType === "county"
          ? "service:county-government"
          : "service:municipal-government",
      locationJurisdictionId: jurisdiction.id,
    },
  });
}

const MEMBERSHIP_FIELDS: readonly RuleFieldKey[] = [
  "institution.form",
  "body.seats",
];

export interface LocalGovernmentStatus {
  readonly unitId: string;
  readonly name: string;
  readonly unitType: GovernmentUnitIdentity["unitType"];
  /** The compiled municipal record that carries this government, if any. */
  readonly compiledGovernmentKey: string | null;
  readonly organizationId: EntityId | null;
  /** Members are produced only once form and seat count are admitted. */
  readonly membershipMissing: readonly RuleFieldKey[];
}

export function homeLocalGovernmentStatus(
  world: World,
  personId: EntityId,
): {
  readonly units: HomeLocalGovernmentUnits;
  readonly governments: readonly LocalGovernmentStatus[];
} {
  const units = homeLocalGovernmentUnits(world, personId);
  const governments = [...units.municipal, ...units.counties].map((unit) => {
    const resolution = resolveNationwideRuleCapability({
      scope: { kind: "local", unit },
      action: "inspect",
      onDate: world.currentDate,
      fields: MEMBERSHIP_FIELDS,
    });
    const stableKey = localGovernmentOrganizationKey(unit);
    return {
      unitId: unit.id,
      name: localGovernmentDisplayName(unit),
      unitType: unit.unitType,
      compiledGovernmentKey: municipalGovernmentForUnit(unit)?.key ?? null,
      organizationId:
        world.history.organizations.find((o) => o.stableKey === stableKey)
          ?.id ?? null,
      membershipMissing: unadmittedRuleFields(resolution),
    };
  });
  return { units, governments };
}
