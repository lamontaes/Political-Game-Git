// The import attribute is required here, and only here, because this module is
// reachable from a Playwright spec's import graph. Playwright collects spec
// files through native Node ESM, where an attribute-less JSON import is a hard
// error — and the error arrives at COLLECTION, so the whole browser suite
// reports zero tests rather than one failure. Vite and Vitest transform the
// bare form happily, which is why the repository's other JSON imports are fine
// and stay as they are: nothing else is reachable from a spec.
import observations from "./municipal-capacity.generated.json" with { type: "json" };

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
