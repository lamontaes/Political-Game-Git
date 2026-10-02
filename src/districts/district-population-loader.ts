import { districtIdentityCatalog } from "./catalog";
import { DISTRICT_POPULATION_LOADERS } from "./district-population-loaders.generated";
import type { DistrictChamber } from "./types";

export interface DistrictPopulationPart {
  readonly placeGeoid: string;
  readonly chamber: DistrictChamber;
  readonly boundaryVintage: string;
  readonly districtGeoid: string;
  readonly partPopulationCount: number;
  readonly placePopulationCount: number;
  readonly partLandAreaSquareMeters?: number | null;
}

const pendingStates = new Map<string, Promise<boolean>>();
const partsByState = new Map<
  string,
  ReadonlyMap<string, readonly DistrictPopulationPart[]>
>();

/** The async opening prepares its own state before synchronous residence writes. */
export function prepareDistrictPopulationForState(
  stateJurisdictionKey: string | null,
): Promise<boolean> {
  const stateFips = districtIdentityCatalog().find(
    (identity) => `US-${identity.stateUsps}` === stateJurisdictionKey,
  )?.stateFips;
  const loader =
    stateFips === undefined
      ? undefined
      : DISTRICT_POPULATION_LOADERS[stateFips];
  if (!stateFips || !loader) return Promise.resolve(false);
  const existing = pendingStates.get(stateFips);
  if (existing) return existing;
  const pending = loader().then(({ default: value }) => {
    if (!Array.isArray(value))
      throw new Error("District population shard is not a row table.");
    const byPlace = new Map<string, DistrictPopulationPart[]>();
    for (const row of value as unknown[][]) {
      if (
        !Array.isArray(row) ||
        row.length !== 7 ||
        typeof row[0] !== "string" ||
        !row[0].startsWith(stateFips)
      )
        throw new Error(
          "District population shard contains a row outside its state.",
        );
      const [
        placeGeoid,
        chamber,
        boundaryVintage,
        districtGeoid,
        partPopulationCount,
        placePopulationCount,
        partLandAreaSquareMeters,
      ] = row as [
        string,
        DistrictChamber,
        string,
        string,
        number,
        number,
        number | null,
      ];
      const parts = byPlace.get(placeGeoid) ?? [];
      parts.push({
        placeGeoid,
        chamber,
        boundaryVintage,
        districtGeoid,
        partPopulationCount,
        placePopulationCount,
        partLandAreaSquareMeters,
      });
      byPlace.set(placeGeoid, parts);
    }
    partsByState.set(stateFips, byPlace);
    return true;
  });
  pending.catch(() => pendingStates.delete(stateFips));
  pendingStates.set(stateFips, pending);
  return pending;
}

export function districtPopulationPreparationStatus(
  placeGeoid: string,
): "loaded" | "not-loaded" | "unsupported" {
  const stateFips = placeGeoid.slice(0, 2);
  return partsByState.has(stateFips)
    ? "loaded"
    : DISTRICT_POPULATION_LOADERS[stateFips]
      ? "not-loaded"
      : "unsupported";
}

/** Unknown preparation is distinct from absent source coverage; neither invents rows. */
export function preparedDistrictPopulationParts(
  placeGeoid: string,
): readonly DistrictPopulationPart[] {
  return partsByState.get(placeGeoid.slice(0, 2))?.get(placeGeoid) ?? [];
}
