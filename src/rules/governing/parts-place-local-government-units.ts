// STOPGAP RULES3-GOV-072: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/local-governments.ts :: placeLocalGovernmentUnits.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 118: !place */
export function placeLocalGovernmentUnitsRule1(facts: {
  readonly place: unknown;
}) {
  return !facts.place;
}

/** Legacy line 119: place.scope === "state" */
export function placeLocalGovernmentUnitsRule2(facts: {
  readonly placeScope: string;
}) {
  return facts.placeScope === "state";
}

/** Legacy line 121: place.scope === "county" */
export function placeLocalGovernmentUnitsRule3(facts: {
  readonly placeScope: string;
}) {
  return facts.placeScope === "county";
}

/** Legacy line 122: place.key.startsWith("county:")       ? place.key.slice("county:".length)       : (place.sourceGeoid ?? null) */
export function placeLocalGovernmentUnitsRule4(facts: {
  readonly placeKeyStartsWithCounty: boolean;
  readonly placeKeySliceCountyLength: string;
  readonly placeSourceGeoid: string | undefined;
}) {
  return facts.placeKeyStartsWithCounty
    ? facts.placeKeySliceCountyLength
    : (facts.placeSourceGeoid! ?? null);
}

/** Legacy line 125: geoid       ? (countyGovernmentUnit(geoid) ?? municipioUnit(geoid))       : null */
export function placeLocalGovernmentUnitsRule5(facts: {
  readonly geoid: string | null;
  readonly countyGovernmentUnitGeoid: unknown;
  readonly municipioUnitGeoid: unknown;
}) {
  return facts.geoid!
    ? (facts.countyGovernmentUnitGeoid ?? facts.municipioUnitGeoid)
    : null;
}

/** Legacy line 128: county       ? {           placeScope: "county",           municipal: [],           counties: [county],           townships: [],           countyStatus: "established",           countyReason: null,           countyShares: null,         }       : none */
export function placeLocalGovernmentUnitsRule6(facts: {
  readonly county: unknown;
  readonly placeScopeCountyMunicipalCountiesCountyTownshipsCountyStatus: unknown;
  readonly noneResult: unknown;
}) {
  return facts.county
    ? facts.placeScopeCountyMunicipalCountiesCountyTownshipsCountyStatus
    : facts.noneResult;
}

/** Legacy line 144: place.sourceGeoid     ? governmentUnitsForPlace(place.sourceGeoid).filter(         (unit) => unit.unitType === "municipality",       )     : [] */
export function placeLocalGovernmentUnitsRule7(facts: {
  readonly placeSourceGeoid: string | undefined;
  readonly governmentUnitsForPlaceResult: unknown[];
}) {
  return facts.placeSourceGeoid! ? facts.governmentUnitsForPlaceResult : [];
}

/** Legacy line 146: unit.unitType === "municipality" */
export function placeLocalGovernmentUnitsRule8(facts: {
  readonly unitUnitType: string;
}) {
  return facts.unitUnitType === "municipality";
}

/** Legacy line 150: place.sourceGeoid && municipal.length === 0       ? townshipGovernmentUnitsForPlace(place.sourceGeoid)       : [] */
export function placeLocalGovernmentUnitsRule9(facts: {
  readonly placeSourceGeoid: string | undefined;
  readonly municipalLength: number;
  readonly townshipGovernmentUnitsForPlacePlaceSourceGeoid: unknown[];
}) {
  return facts.placeSourceGeoid! && facts.municipalLength === 0
    ? facts.townshipGovernmentUnitsForPlacePlaceSourceGeoid
    : [];
}

/** Legacy line 155: place.sourceGeoid     ? countyGovernmentUnitsForPlace(place.sourceGeoid)     : [] */
export function placeLocalGovernmentUnitsRule10(facts: {
  readonly placeSourceGeoid: string | undefined;
  readonly countyGovernmentUnitsForPlacePlaceSourceGeoid: unknown[];
}) {
  return facts.placeSourceGeoid!
    ? facts.countyGovernmentUnitsForPlacePlaceSourceGeoid
    : [];
}

/** Legacy line 158: relation.length > 0 */
export function placeLocalGovernmentUnitsRule11(facts: {
  readonly relationLength: number;
}) {
  return facts.relationLength > 0;
}

/** Legacy line 173: place.sourceGeoid     ? municipiosForPlace(place.sourceGeoid)     : [] */
export function placeLocalGovernmentUnitsRule12(facts: {
  readonly placeSourceGeoid: string | undefined;
  readonly municipiosForPlacePlaceSourceGeoid: unknown[];
}) {
  return facts.placeSourceGeoid!
    ? facts.municipiosForPlacePlaceSourceGeoid
    : [];
}

/** Legacy line 176: municipios.length > 0 */
export function placeLocalGovernmentUnitsRule13(facts: {
  readonly municipiosLength: number;
}) {
  return facts.municipiosLength > 0;
}

/** Legacy line 186: municipal.length === 0 */
export function placeLocalGovernmentUnitsRule14(facts: {
  readonly municipalLength: number;
}) {
  return facts.municipalLength === 0;
}

/** Legacy line 193: unit.countyGeoid       ? countyGovernmentUnit(unit.countyGeoid)       : null */
export function placeLocalGovernmentUnitsRule15(facts: {
  readonly unitCountyGeoid: string | null;
  readonly countyGovernmentUnitUnitCountyGeoid: unknown;
}) {
  return facts.unitCountyGeoid!
    ? facts.countyGovernmentUnitUnitCountyGeoid
    : null;
}

/** Legacy line 203: counties.size > 0 ? "established" : "no-county-government" */
export function placeLocalGovernmentUnitsRule16(facts: {
  readonly countiesSize: number;
}) {
  return facts.countiesSize > 0 ? "established" : "no-county-government";
}

/** Legacy line 205: counties.size > 0         ? null         : `No separate ${term.singular} government serves this city.` */
export function placeLocalGovernmentUnitsRule17(facts: {
  readonly countiesSize: number;
  readonly termSingular: string;
}) {
  return facts.countiesSize > 0
    ? null
    : `No separate ${facts.termSingular} government serves this city.`;
}
