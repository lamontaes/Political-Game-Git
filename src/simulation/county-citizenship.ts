import corpus from "./county-citizenship.generated.json";
import { countyGeoidsForPlace } from "./government-units";
import { lifePlaceByJurisdictionId } from "./life-places";
import type { EntityId } from "./types";

type Counts = {
  readonly citizenByBirth: number;
  readonly naturalizedCitizen: number;
  readonly noncitizen: number;
};
const counties = new Map<string, Counts>(Object.entries(corpus.counties));
const totals = (rows: readonly Counts[]): Counts =>
  rows.reduce(
    (sum, row) => ({
      citizenByBirth: sum.citizenByBirth + row.citizenByBirth,
      naturalizedCitizen: sum.naturalizedCitizen + row.naturalizedCitizen,
      noncitizen: sum.noncitizen + row.noncitizen,
    }),
    { citizenByBirth: 0, naturalizedCitizen: 0, noncitizen: 0 },
  );
const all = totals([...counties.values()]);
const states = new Map<string, Counts>();
for (const [geoid, row] of counties) {
  const key = geoid.slice(0, 2);
  states.set(key, totals([states.get(key) ?? totals([]), row]));
}
const cache = new Map<EntityId, ReturnType<typeof readShares>>();

function readShares(jurisdictionId: EntityId) {
  const geoid = lifePlaceByJurisdictionId(jurisdictionId)?.sourceGeoid;
  const countyGeoids = geoid
    ? countyGeoidsForPlace(geoid).filter((id) => counties.has(id))
    : [];
  const state = geoid ? states.get(geoid.slice(0, 2)) : undefined;
  const counts = countyGeoids.length
    ? totals(countyGeoids.map((id) => counties.get(id)!))
    : (state ?? all);
  return {
    counts,
    basis: countyGeoids.length
      ? ("county" as const)
      : state
        ? ("state-counties" as const)
        : ("published-counties" as const),
    countyGeoids,
    sourceVintage: corpus.vintage,
    sourceArtifactSha256s: corpus.artifacts.map((row) => row.rawSha256),
  };
}

/** Population-weighted county mix; missing islands are explicitly estimated. */
export function citizenshipSharesForJurisdiction(jurisdictionId: EntityId) {
  const previous = cache.get(jurisdictionId);
  if (previous) return previous;
  const result = readShares(jurisdictionId);
  cache.set(jurisdictionId, result);
  return result;
}
