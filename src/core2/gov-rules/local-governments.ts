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
  governmentUnitJurisdictionId,
  governmentUnitsForPlace,
} from "../reference/government-units";
import type { GovernmentUnitIdentity } from "../reference/government-units";
import { GOVERNMENT_UNITS_META } from "../reference/government-units.generated";
import {
  corePlaceByKey,
  coreStateJurisdiction,
  type CorePlace,
} from "../place-lookup";
import type { EntityId, IsoDate } from "../kernel/brands";
import {
  countyEquivalentTerm,
  governmentUnitRecordedName,
  type CountyEquivalentTerm,
} from "./government-unit-names";
import {
  countyGoverningBodyRules,
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

/**
 * One recorded local government as the opening writes it, as an organization
 * in the jurisdiction it governs (`opening-town-jobs.ts` writes it).
 */
export interface LocalGovernmentOrganization {
  readonly stableKey: string;
  readonly formedAt: IsoDate;
  readonly provenance:
    | {
        readonly kind: "source-record";
        readonly reference: string;
        readonly asOf: IsoDate;
      }
    | { readonly kind: "authored"; readonly note: string };
  readonly name: string;
  readonly classification:
    "service:municipal-government" | "service:county-government";
  readonly locationJurisdictionId: EntityId;
  readonly publicGovernmentIdentity?: {
    readonly kind: "local-government";
    readonly governmentKey: string;
    readonly jurisdictionId: EntityId;
  };
}

/** The stable key a recorded local government's organization carries. */
export function localGovernmentOrganizationKey(
  unit: Pick<GovernmentUnitIdentity, "id">,
): string {
  return `local-government:${unit.id}`;
}

/**
 * Whether the one jurisdiction a government unit governs can be named: a
 * county's county area or a city's place in the places corpus, under the one
 * identity every consumer shares, or a town or township's own identity in its
 * state. A government placed in the wrong jurisdiction is worse than none.
 */
function governedJurisdictionId(
  unit: GovernmentUnitIdentity,
): ReturnType<typeof governmentUnitJurisdictionId> | null {
  const id = governmentUnitJurisdictionId(unit);
  if (unit.unitType === "township")
    return coreStateJurisdiction(`US-${unit.stateUsps}`) ? id : null;
  const place =
    unit.unitType === "county"
      ? unit.countyGeoid
        ? corePlaceByKey(`county:${unit.countyGeoid}`)
        : null
      : unit.placeGeoid
        ? corePlaceByKey(unit.placeGeoid)
        : null;
  return place?.context.jurisdiction.id === id ? id : null;
}

/**
 * One recorded government unit as the organization the opening writes, in
 * the jurisdiction it governs, as of a date; null when that jurisdiction
 * cannot be named. A municipio is not in the Census listing: its record is
 * the municipal code that makes it a government, on the books since the code
 * took effect. A listed unit is on the books from the listing's date, or from
 * the opening when the listing speaks after it (not backdated). Ported from
 * the old engine's `ensureLocalGovernmentOrganization`.
 */
export function localGovernmentOrganization(
  unit: GovernmentUnitIdentity,
  onDate: IsoDate,
): LocalGovernmentOrganization | null {
  const jurisdictionId = governedJurisdictionId(unit);
  if (!jurisdictionId) return null;
  const stableKey = localGovernmentOrganizationKey(unit);
  const code =
    unit.id === `municipio:${unit.countyGeoid}`
      ? countyGoverningBodyRules(unit)
      : null;
  if (code) {
    const since = (code.inForceSince ?? onDate) as IsoDate;
    return {
      stableKey,
      formedAt: since <= onDate ? since : onDate,
      provenance: {
        kind: "source-record",
        reference: `${code.citation} (${code.url})`,
        asOf: since,
      },
      name: unit.name,
      classification: "service:municipal-government",
      locationJurisdictionId: jurisdictionId,
    };
  }
  const asOf = unit.asOf as IsoDate;
  const listed = asOf <= onDate;
  return {
    stableKey,
    formedAt: listed ? asOf : onDate,
    provenance: listed
      ? {
          kind: "source-record",
          reference: `${GOVERNMENT_UNITS_META.artifactId} ${unit.id} "${unit.name}"`,
          asOf,
        }
      : {
          kind: "authored",
          note: `Placed from ${GOVERNMENT_UNITS_META.artifactId} ${unit.id}, which speaks as of ${asOf}, after this world's ${onDate}; not backdated.`,
        },
    // The recorded name, unchanged since worlds were first built with it.
    name: governmentUnitRecordedName(unit),
    classification:
      unit.unitType === "county"
        ? "service:county-government"
        : "service:municipal-government",
    locationJurisdictionId: jurisdictionId,
    // This organization IS the recorded government unit. Its own source
    // identity does not establish ownership of a separate generated employer.
    ...(listed && unit.functionalActive
      ? {
          publicGovernmentIdentity: {
            kind: "local-government" as const,
            governmentKey: unit.id,
            jurisdictionId,
          },
        }
      : {}),
  };
}

/**
 * The government a place's town-hall and county-clerk jobs are held in, as
 * the organization the opening writes: the place's one municipal government
 * (else its one town or township) and its one county government. A place
 * spanning governments gets none of that kind: a worker is never silently
 * assigned to the first county, and no municipality is invented.
 */
export function placeGovernmentOrganizations(
  place: CorePlace,
  onDate: IsoDate,
): {
  readonly municipal: LocalGovernmentOrganization | null;
  readonly county: LocalGovernmentOrganization | null;
} {
  const governments = placeLocalGovernmentUnits(place);
  const one = (units: readonly GovernmentUnitIdentity[]) =>
    units.length === 1 ? localGovernmentOrganization(units[0]!, onDate) : null;
  return {
    municipal: one(
      governments.municipal.length > 0
        ? governments.municipal
        : governments.townships,
    ),
    county: one(governments.counties),
  };
}
