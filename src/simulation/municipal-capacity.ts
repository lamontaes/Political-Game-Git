import observations from "./municipal-capacity.generated.json";

/** Exact government-unit identity only. A place, name, or publisher PID is not a GID. */
export function municipalCapacityObservations(binding: {
  readonly censusGovernmentUnitId: string | null;
}) {
  const id = binding.censusGovernmentUnitId;
  if (id === null || !/^\d{14}$/.test(id))
    return { finance: [], employment: [] };
  return {
    finance: observations.finance.filter((record) => record.censusGovId === id),
    employment: observations.employment.filter(
      (record) => record.censusGovId === id,
    ),
  };
}

export function municipalCapacitySourceUrl(artifactId: string): string | null {
  return (
    (observations.sources as Readonly<Record<string, string>>)[artifactId] ??
    null
  );
}
