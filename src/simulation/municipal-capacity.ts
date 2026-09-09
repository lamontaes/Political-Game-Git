import observations from "./municipal-capacity.generated.json";
import type { MunicipalGovernmentBinding } from "./municipal-public-work";

/** Exact government-unit identity only. A place, name, or publisher PID is not a GID. */
export function municipalCapacityObservations(binding: MunicipalGovernmentBinding) {
  const id = binding.censusGovernmentUnitId;
  if (id === null || !/^\d{14}$/.test(id)) return { finance: [], employment: [] };
  return {
    finance: observations.finance.filter((record) => record.censusGovId === id),
    employment: observations.employment.filter((record) => record.censusGovId === id),
  };
}
