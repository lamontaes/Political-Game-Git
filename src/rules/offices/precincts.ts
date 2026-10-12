// STOPGAP offices.precinct-population-proxy: Addresses are absent; precinct populations apportion people in roster order, with a state/pooled mean where VTD counts are missing.
// stopgapId: "offices.precinct-population-proxy"
import type { EntityId } from "../../simulation/types";
import type { VotingPrecinctPlan } from "../../simulation/living-world/town-wards";
export interface PrecinctAverage {
  readonly population: number | null;
  readonly vtdCount: number | null;
  readonly meanPopulation: number | null;
}
export interface PrecinctFacts {
  readonly place: { readonly sourceGeoid?: string } | null;
  readonly hasJurisdiction: boolean;
  readonly recorded: Readonly<Record<string, number>> | undefined;
  readonly stateFips: string | undefined;
  readonly own: PrecinctAverage | undefined;
  readonly stateAverages: Readonly<Record<string, PrecinctAverage>>;
  readonly referencePopulation: number | undefined;
  readonly residents: number;
  readonly rosterPopulation: number;
}
export function votingPrecinctPlan(
  facts: PrecinctFacts,
  townId: EntityId,
): VotingPrecinctPlan {
  const place = facts.place;
  if (!place || !facts.hasJurisdiction)
    throw new Error("Precinct membership requires a recorded home place.");
  const placeGeoid = place.sourceGeoid ?? null;
  const recorded = facts.recorded;
  const rows = Object.entries(recorded ?? {})
    .filter(([, count]) => Number.isSafeInteger(count) && count > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  if (rows.length > 0)
    return {
      version: "voting-precinct-population/v1",
      assignmentBasis: "estimated-address-free-population-share",
      townId,
      placeGeoid,
      populationVintage: "census-2020",
      basis: "census-vtd-population",
      sourceStateFips: [placeGeoid!.slice(0, 2)],
      precincts: rows.map(([key, population]) => ({ key, population })),
    };
  const { stateFips, own } = facts;
  const donors = Object.entries(facts.stateAverages).filter(
    ([, value]) =>
      value.population !== null &&
      value.vtdCount !== null &&
      value.vtdCount > 0 &&
      value.population > 0,
  );
  const ownAverage = own?.meanPopulation;
  const average =
    ownAverage && ownAverage > 0
      ? ownAverage
      : donors.reduce((sum, [, value]) => sum + value.population!, 0) /
        donors.reduce((sum, [, value]) => sum + value.vtdCount!, 0);
  if (!Number.isFinite(average) || average <= 0)
    throw new Error(
      "No admitted VTD population average for a precinct estimate.",
    );
  const reference = facts.referencePopulation;
  const residents = facts.residents;
  const population = Math.max(
    reference ?? facts.rosterPopulation,
    residents,
    1,
  );
  const count = Math.max(1, Math.round(population / average));
  return {
    version: "voting-precinct-population/v1",
    assignmentBasis: "estimated-address-free-population-share",
    townId,
    placeGeoid,
    populationVintage: "census-2020",
    basis:
      ownAverage && ownAverage > 0
        ? "estimated-from-state-vtd-average"
        : "estimated-from-compiled-vtd-average",
    sourceStateFips:
      ownAverage && ownAverage > 0
        ? [stateFips!]
        : donors.map(([fips]) => fips).sort(),
    precincts: Array.from({ length: count }, (_, index) => ({
      key: `estimated:${townId}:${index + 1}`,
      population: population / count,
    })),
  };
}
export function precinctAssignments(
  plan: VotingPrecinctPlan,
  residents: readonly EntityId[],
) {
  const total = plan.precincts.reduce((sum, row) => sum + row.population, 0);
  const shares = plan.precincts.map((row) => {
    const exact = (residents.length * row.population) / total;
    return {
      key: row.key,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const remainder =
    residents.length - shares.reduce((sum, row) => sum + row.count, 0);
  for (const row of [...shares]
    .sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key))
    .slice(0, remainder))
    row.count += 1;
  const assignments: Record<EntityId, string> = {};
  let at = 0;
  for (const share of shares)
    for (let n = 0; n < share.count; n += 1)
      assignments[residents[at++]!] = share.key;

  return assignments;
}
export function precinctArrival(
  plan: VotingPrecinctPlan,
  residents: number,
  counts: ReadonlyMap<string, number>,
): string {
  const total = plan.precincts.reduce((sum, row) => sum + row.population, 0);
  const winner = [...plan.precincts].sort(
    (a, b) =>
      (residents * b.population) / total -
        counts.get(b.key)! -
        ((residents * a.population) / total - counts.get(a.key)!) ||
      a.key.localeCompare(b.key),
  )[0]!;

  return winner.key;
}
export function shouldEstablishPrecincts(
  reason: "opening" | "census",
  onDate: string,
  previous: { readonly occurredAt: string } | null,
): boolean {
  if (reason === "census" && Number(onDate.slice(0, 4)) % 10 !== 1)
    return false;
  if (previous && reason === "opening") return false;
  if (
    reason === "census" &&
    (!previous ||
      Number(onDate.slice(0, 4)) % 10 !== 1 ||
      previous.occurredAt.slice(0, 4) === onDate.slice(0, 4))
  )
    return false;
  return true;
}
