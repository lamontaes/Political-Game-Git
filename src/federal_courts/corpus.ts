import compiledDataRaw from "../../data/federal-courts/compiled-federal-courts.json";
import type {
  CircuitResolution,
  DistrictResolution,
  FederalBankruptcyCourt,
  FederalCircuit,
  FederalCourtsCorpus,
  FederalDistrict,
} from "./types";
import { validateFederalCourtsCorpus } from "./validation";

const defaultCorpus: FederalCourtsCorpus =
  compiledDataRaw as FederalCourtsCorpus;

export function loadFederalCourtsCorpus(
  overrideCorpus?: FederalCourtsCorpus,
): FederalCourtsCorpus {
  if (overrideCorpus) {
    const val = validateFederalCourtsCorpus(overrideCorpus);
    if (!val.valid) {
      throw new Error(
        `Invalid override FederalCourtsCorpus: ${val.errors.join("; ")}`,
      );
    }
    return overrideCorpus;
  }

  const val = validateFederalCourtsCorpus(defaultCorpus);
  if (!val.valid) {
    throw new Error(
      `Compiled FederalCourtsCorpus validation failed: ${val.errors.join("; ")}`,
    );
  }

  return defaultCorpus;
}

export function getAllCircuits(corpus?: FederalCourtsCorpus): FederalCircuit[] {
  return (corpus ?? loadFederalCourtsCorpus()).circuits;
}

export function getAllDistricts(
  corpus?: FederalCourtsCorpus,
): FederalDistrict[] {
  return (corpus ?? loadFederalCourtsCorpus()).districts;
}

export function getCircuitById(
  circuitId: string,
  corpus?: FederalCourtsCorpus,
): FederalCircuit | undefined {
  const c = corpus ?? loadFederalCourtsCorpus();
  return c.circuits.find(
    (cir) => cir.circuit_id.toLowerCase() === circuitId.toLowerCase(),
  );
}

export function getDistrictById(
  districtId: string,
  corpus?: FederalCourtsCorpus,
): FederalDistrict | undefined {
  const c = corpus ?? loadFederalCourtsCorpus();
  return c.districts.find(
    (d) => d.district_id.toLowerCase() === districtId.toLowerCase(),
  );
}

export function getDistrictsByState(
  stateOrTerritoryCode: string,
  corpus?: FederalCourtsCorpus,
): FederalDistrict[] {
  const c = corpus ?? loadFederalCourtsCorpus();
  const code = stateOrTerritoryCode.toUpperCase();
  return c.districts.filter((d) =>
    d.state_or_territory_codes.some((st) => st.toUpperCase() === code),
  );
}

export function getDistrictsByCircuit(
  circuitId: string,
  corpus?: FederalCourtsCorpus,
): FederalDistrict[] {
  const c = corpus ?? loadFederalCourtsCorpus();
  const cid = circuitId.toLowerCase();
  return c.districts.filter((d) => d.parent_circuit_id.toLowerCase() === cid);
}

export function getBankruptcyCourtByDistrict(
  districtId: string,
  corpus?: FederalCourtsCorpus,
): FederalBankruptcyCourt | undefined {
  const d = getDistrictById(districtId, corpus);
  return d?.bankruptcy_court;
}

export function resolveDistrict(
  districtId: string,
  corpus?: FederalCourtsCorpus,
): DistrictResolution | undefined {
  const c = corpus ?? loadFederalCourtsCorpus();
  const d = getDistrictById(districtId, c);
  if (!d) return undefined;

  const parentCircuit = getCircuitById(d.parent_circuit_id, c);
  if (!parentCircuit) return undefined;

  return {
    district: d,
    parent_circuit: parentCircuit,
    bankruptcy_court: d.bankruptcy_court,
  };
}

export function resolveCircuit(
  circuitId: string,
  corpus?: FederalCourtsCorpus,
): CircuitResolution | undefined {
  const c = corpus ?? loadFederalCourtsCorpus();
  const cir = getCircuitById(circuitId, c);
  if (!cir) return undefined;

  const underlyingDistricts = getDistrictsByCircuit(cir.circuit_id, c);
  return {
    circuit: cir,
    underlying_districts: underlyingDistricts,
  };
}

export function searchDivisions(
  query: string,
  corpus?: FederalCourtsCorpus,
): Array<{
  district: FederalDistrict;
  division: FederalDistrict["divisions"][number];
}> {
  const c = corpus ?? loadFederalCourtsCorpus();
  const q = query.toLowerCase().trim();
  const results: Array<{
    district: FederalDistrict;
    division: FederalDistrict["divisions"][number];
  }> = [];

  for (const d of c.districts) {
    for (const div of d.divisions) {
      if (
        div.name.toLowerCase().includes(q) ||
        div.primary_courthouse_city.toLowerCase().includes(q) ||
        div.primary_courthouse_name.toLowerCase().includes(q)
      ) {
        results.push({ district: d, division: div });
      }
    }
  }

  return results;
}
