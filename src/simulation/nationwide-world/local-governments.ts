import {
  countyEquivalentTerm,
  governmentUnitDisplayName,
  governmentUnitRecordedName,
} from "./government-unit-names";
import type { CountyEquivalentTerm } from "./government-unit-names";

import {
  GOVERNMENT_UNITS_META,
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
  type LifePlace,
  residentNameForJurisdiction,
  stateJurisdictionForKey,
} from "../life-places";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { municipalGovernmentForPlaceGeoid } from "../municipal-government";
import { municipalOrganizationFor } from "../municipal-public-work";
import type { EntityId, IsoDate, Jurisdiction, World } from "../types";
import {
  countyGoverningBodyRules,
  municipioUnit,
  municipiosForPlace,
} from "./county-governing-body-rules";
import { governingJurisdictionIdFor } from "./government-jurisdiction";
import { townshipGovernmentUnitsForPlace } from "./township-governing-body-rules";
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

export { countyEquivalentTerm };
export type { CountyEquivalentTerm };

export const LOCAL_GOVERNMENT_WRITER_VERSION = "nationwide-local-government-v1";

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
// files behind it: which geography was read, and when, stays with
// the government-units module's metadata for an auditor.
function countyRelationEmpty(term: CountyEquivalentTerm): string {
  return `Which ${term.singular} government serves this place is not known.`;
}

/** Which government units serve the place this person lives in. Reads only. */
export function homeLocalGovernmentUnits(
  world: World,
  personId: EntityId,
): HomeLocalGovernmentUnits {
  const person = world.people[personId];
  const place = person
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)
    : null;
  return placeLocalGovernmentUnits(place);
}

/** Which government units serve one place. Reads only. */
export function placeLocalGovernmentUnits(
  place: LifePlace | null,
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

/** What the state this person lives in calls its counties. */
export function homeCountyEquivalentTerm(
  world: World,
  personId: EntityId,
): CountyEquivalentTerm {
  const person = world.people[personId];
  const place = person
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)
    : null;
  return countyEquivalentTerm(place?.stateJurisdictionKey ?? null);
}

/** The unit's name as people write it; see `governmentUnitDisplayName`. */
export function localGovernmentDisplayName(
  unit: GovernmentUnitIdentity,
): string {
  return governmentUnitDisplayName(unit);
}

/** The name an organization for this unit is written into a world under. */
export function localGovernmentRecordedName(
  unit: GovernmentUnitIdentity,
): string {
  return governmentUnitRecordedName(unit);
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

const UNINCORPORATED = new Map<EntityId, readonly EntityId[]>();

/**
 * The town, township and county governments whose ordinances govern a place
 * with no municipal government of its own: an unincorporated place (a
 * census-designated place, or a Puerto Rico place under its municipio) is
 * governed by the law of the town or township it lies in and of its county,
 * the most common rule in every state. Empty for an incorporated place, a
 * county or a state, and for a place with no such government.
 */
export function unincorporatedCountyJurisdictionIds(
  jurisdictionId: EntityId,
): readonly EntityId[] {
  const cached = UNINCORPORATED.get(jurisdictionId);
  if (cached) return cached;
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  const units = placeLocalGovernmentUnits(place);
  const ids =
    units.placeScope === "locality" && units.municipal.length === 0
      ? [...units.townships, ...units.counties].flatMap(
          (unit) => jurisdictionForUnit(unit)?.id ?? [],
        )
      : [];
  UNINCORPORATED.set(jurisdictionId, ids);
  return ids;
}

/** The jurisdiction a local government's own law is recorded under, or null. */
export function localGovernmentJurisdiction(
  unit: GovernmentUnitIdentity,
): Jurisdiction | null {
  return jurisdictionForUnit(unit);
}

function jurisdictionForUnit(
  unit: GovernmentUnitIdentity,
): Jurisdiction | null {
  if (unit.unitType === "township") return townshipJurisdiction(unit);
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
 * A town or township's own jurisdiction. The places corpus holds no county
 * subdivisions, so the town is named here under the one identity every
 * consumer shares (`governingJurisdictionIdFor`), and placed in its state.
 */
function townshipJurisdiction(
  unit: GovernmentUnitIdentity,
): Jurisdiction | null {
  const id = governingJurisdictionIdFor({ kind: "local", unit });
  const state = stateJurisdictionForKey(`US-${unit.stateUsps}`);
  if (!id || !state) return null;
  return {
    id,
    slug: `us-government-unit-${unit.publisherId}`,
    name: governmentUnitDisplayName(unit),
    kind: "government-township",
    parentName: state.name,
    provenance: {
      asOf: unit.asOf as IsoDate,
      source: `${GOVERNMENT_UNITS_META.artifactId} ${unit.id}`,
      jurisdiction: id,
      status: "approved",
    },
  };
}

/**
 * Records each actual government serving this person's home as an organization,
 * once. A government with a sourced or game municipal workspace keeps that
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
  for (const unit of [
    ...units.municipal,
    ...units.townships,
    ...units.counties,
  ]) {
    if (municipalWorkspaceGovernmentForUnit(unit)) continue;
    next = ensureLocalGovernmentOrganization(next, unit);
  }
  return next;
}

/** A matched city's game profile uses the same organization as a sourced city. */
export function municipalWorkspaceGovernmentForUnit(
  unit: GovernmentUnitIdentity,
) {
  const sourced = municipalGovernmentForUnit(unit);
  if (sourced) return sourced;
  if (unit.unitType !== "municipality" || !unit.placeGeoid) return null;
  const matched = municipalGovernmentForPlaceGeoid(unit.placeGeoid);
  return matched?.key === unit.id ? matched : null;
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
  // A municipio is not in the Census listing: its record is the municipal
  // code that makes it a government.
  const code =
    unit.id === `municipio:${unit.countyGeoid}`
      ? countyGoverningBodyRules(unit)
      : null;
  if (code) {
    // On the books since the code took effect, so a matter the world dates
    // before the opening can name it.
    const since = (code.inForceSince ?? next.currentDate) as IsoDate;
    return createOrganization(next, {
      stableKey,
      formedAt: since <= next.currentDate ? since : next.currentDate,
      detailLevel: "lightweight",
      provenance: {
        kind: "source-record",
        reference: `${code.citation} (${code.url})`,
        asOf: since,
      },
      initialProfile: {
        name: unit.name,
        classification: "service:municipal-government",
        locationJurisdictionId: jurisdiction.id,
      },
    });
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
      // The recorded name, unchanged since worlds were first built with it.
      name: governmentUnitRecordedName(unit),
      classification:
        unit.unitType === "county"
          ? "service:county-government"
          : "service:municipal-government",
      locationJurisdictionId: jurisdiction.id,
      // This organization IS the recorded government unit. Its own source
      // identity does not establish ownership of a separate generated employer.
      ...(listed && unit.functionalActive
        ? {
            publicGovernmentIdentity: {
              kind: "local-government" as const,
              governmentKey: unit.id,
              jurisdictionId: jurisdiction.id,
            },
          }
        : {}),
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
  const governments = [
    ...units.municipal,
    ...units.townships,
    ...units.counties,
  ].map((unit) => {
    const resolution = resolveNationwideRuleCapability({
      scope: { kind: "local", unit },
      action: "inspect",
      onDate: world.currentDate,
      fields: MEMBERSHIP_FIELDS,
    });
    const compiled = municipalWorkspaceGovernmentForUnit(unit);
    const organization = compiled
      ? municipalOrganizationFor(world, compiled.key)
      : world.history.organizations.find(
          (entry) => entry.stableKey === localGovernmentOrganizationKey(unit),
        );
    return {
      unitId: unit.id,
      name: localGovernmentDisplayName(unit),
      unitType: unit.unitType,
      compiledGovernmentKey: compiled?.key ?? null,
      organizationId: organization?.id ?? null,
      membershipMissing: unadmittedRuleFields(resolution),
    };
  });
  return { units, governments };
}
