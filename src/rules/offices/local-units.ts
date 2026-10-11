import type { LifePlace } from "../../simulation/life-places";
import type {
  GovernmentUnitIdentity,
  CountyGovernmentShare,
} from "../../simulation/government-units";
import type {
  HomeLocalGovernmentUnits,
  CountyGovernmentStatus,
} from "../../simulation/nationwide-world/local-governments";
type UnitResult = Omit<HomeLocalGovernmentUnits, "countyReason">;
export interface LocalUnitFacts {
  readonly counties: ReadonlyMap<string, GovernmentUnitIdentity>;
  readonly municipios: ReadonlyMap<string, GovernmentUnitIdentity>;
  readonly governmentUnits: readonly GovernmentUnitIdentity[];
  readonly townships: readonly GovernmentUnitIdentity[];
  readonly relation: readonly CountyGovernmentShare[];
  readonly placeMunicipios: readonly GovernmentUnitIdentity[];
}
export function placeLocalGovernmentUnits(
  place: LifePlace | null,
  facts: LocalUnitFacts,
): UnitResult {
  const none = (
    placeScope: UnitResult["placeScope"],
    countyStatus: CountyGovernmentStatus,
  ): UnitResult => ({
    placeScope,
    municipal: [],
    counties: [],
    townships: [],
    countyStatus,

    countyShares: null,
  });
  if (!place) return none(null, "not-applicable");
  if (place.scope === "state") return none("state", "not-applicable");
  if (place.scope === "county") {
    const geoid = place.key.startsWith("county:")
      ? place.key.slice("county:".length)
      : (place.sourceGeoid ?? null);
    const county = geoid
      ? (facts.counties.get(geoid) ?? facts.municipios.get(geoid) ?? null)
      : null;
    return county
      ? {
          placeScope: "county",
          municipal: [],
          counties: [county],
          townships: [],
          countyStatus: "established",

          countyShares: null,
        }
      : none("county", "no-county-government");
  }
  const municipal = place.sourceGeoid
    ? facts.governmentUnits.filter((unit) => unit.unitType === "municipality")
    : [];
  const townships =
    place.sourceGeoid && municipal.length === 0 ? facts.townships : [];
  const relation = place.sourceGeoid ? facts.relation : [];
  if (relation.length > 0)
    return {
      placeScope: "locality",
      municipal,
      counties: relation.map((share) => share.unit),
      townships,
      countyStatus: "established",

      countyShares: relation.map((share) => ({
        unitId: share.unit.id,
        landAreaShare: share.landAreaShare,
      })),
    };
  const municipios = place.sourceGeoid ? facts.placeMunicipios : [];
  if (municipios.length > 0)
    return {
      placeScope: "locality",
      municipal,
      counties: municipios,
      townships: [],
      countyStatus: "established",

      countyShares: null,
    };
  if (municipal.length === 0)
    return {
      ...none("locality", "not-established"),
      townships,
    };
  const counties = new Map<string, GovernmentUnitIdentity>();
  for (const unit of municipal) {
    const county = unit.countyGeoid
      ? (facts.counties.get(unit.countyGeoid) ?? null)
      : null;
    if (county) counties.set(county.id, county);
  }
  return {
    placeScope: "locality",
    municipal,
    counties: [...counties.values()],
    townships: [],
    countyStatus: counties.size > 0 ? "established" : "no-county-government",
    countyShares: null,
  };
}
