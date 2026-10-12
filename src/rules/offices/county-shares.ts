import type {
  GovernmentUnitIdentity,
  CountyGovernmentShare,
} from "../../simulation/government-units";
export type CountyPart = readonly [
  county: string,
  land: number,
  population: number,
];
export function countyPopulationSharesForPlace(
  parts: readonly CountyPart[],
): readonly (readonly [countyGeoid: string, share: number | null])[] {
  if (parts.length === 1) return [[parts[0]![0], 1]];
  const total = parts.reduce((sum, [, , population]) => sum + population, 0);
  return parts.map(([county, , population]) => [
    county,
    total > 0 ? population / total : null,
  ]);
}

export function countyGovernmentUnitsForPlace(
  parts: readonly CountyPart[],
  units: ReadonlyMap<string, GovernmentUnitIdentity> = new Map(),
): readonly CountyGovernmentShare[] {
  const placeLand = parts.reduce((sum, [, land]) => sum + land, 0);
  const shares: CountyGovernmentShare[] = [];
  for (const [countyGeoid, land] of parts) {
    const unit = units.get(countyGeoid);
    if (unit) shares.push({ unit, landAreaShare: land / placeLand });
  }
  return shares.sort(
    (left, right) =>
      right.landAreaShare - left.landAreaShare ||
      left.unit.id.localeCompare(right.unit.id),
  );
}

export function countyLandSharesForPlace(
  parts: readonly CountyPart[],
): readonly (readonly [countyGeoid: string, share: number])[] {
  const total = parts.reduce((sum, [, land]) => sum + land, 0);
  if (total <= 0) return [];
  return [...parts]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([countyGeoid, land]) => [countyGeoid, land / total] as const);
}

export function countyGeoidsForPlace(
  parts: readonly CountyPart[],
): readonly string[] {
  return [...parts]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([countyGeoid]) => countyGeoid);
}
