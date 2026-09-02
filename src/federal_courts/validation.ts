import type {
  FederalCourtsCorpus,
  FederalCircuit,
  FederalDistrict,
} from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFederalCourtsCorpus(
  corpus: FederalCourtsCorpus,
): ValidationResult {
  const errors: string[] = [];

  if (!corpus || typeof corpus !== "object") {
    return { valid: false, errors: ["Corpus must be a non-null object."] };
  }

  if (!Array.isArray(corpus.circuits)) {
    errors.push("Corpus missing 'circuits' array.");
  }

  if (!Array.isArray(corpus.districts)) {
    errors.push("Corpus missing 'districts' array.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (corpus.circuits.length !== 13) {
    errors.push(
      `Expected 13 federal circuits, found ${corpus.circuits.length}.`,
    );
  }

  if (corpus.districts.length !== 94) {
    errors.push(
      `Expected 94 federal judicial districts, found ${corpus.districts.length}.`,
    );
  }

  const circuitMap = new Map<string, FederalCircuit>();
  for (const c of corpus.circuits) {
    if (!c.circuit_id || typeof c.circuit_id !== "string") {
      errors.push("Circuit missing valid 'circuit_id'.");
      continue;
    }
    if (circuitMap.has(c.circuit_id)) {
      errors.push(`Duplicate circuit_id found: '${c.circuit_id}'.`);
    }
    circuitMap.set(c.circuit_id, c);

    if (!c.name || !c.short_name || !c.headquarters_city) {
      errors.push(
        `Circuit '${c.circuit_id}' missing required display or headquarters metadata.`,
      );
    }

    if (
      !Array.isArray(c.state_or_territory_codes) ||
      c.state_or_territory_codes.length === 0
    ) {
      errors.push(
        `Circuit '${c.circuit_id}' missing state_or_territory_codes coverage.`,
      );
    }
  }

  const districtMap = new Map<string, FederalDistrict>();
  for (const d of corpus.districts) {
    if (!d.district_id || typeof d.district_id !== "string") {
      errors.push("District missing valid 'district_id'.");
      continue;
    }
    if (districtMap.has(d.district_id)) {
      errors.push(`Duplicate district_id found: '${d.district_id}'.`);
    }
    districtMap.set(d.district_id, d);

    if (!circuitMap.has(d.parent_circuit_id)) {
      errors.push(
        `District '${d.district_id}' references unknown parent_circuit_id '${d.parent_circuit_id}'.`,
      );
    }

    if (!d.bankruptcy_court || !d.bankruptcy_court.bankruptcy_court_id) {
      errors.push(
        `District '${d.district_id}' missing bankruptcy_court object.`,
      );
    } else if (d.bankruptcy_court.parent_district_id !== d.district_id) {
      errors.push(
        `District '${d.district_id}' bankruptcy court parent mismatch: expected '${d.district_id}', got '${d.bankruptcy_court.parent_district_id}'.`,
      );
    }

    if (
      d.constitutional_basis !== "ARTICLE_III" &&
      d.constitutional_basis !== "ARTICLE_I_ORGANIC_ACT"
    ) {
      errors.push(
        `District '${d.district_id}' has invalid constitutional_basis '${d.constitutional_basis}'.`,
      );
    }

    if (!Array.isArray(d.divisions) || d.divisions.length === 0) {
      errors.push(
        `District '${d.district_id}' must have at least one official division.`,
      );
    }
  }

  const expectedUSPS = new Set([
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
    "PR",
    "VI",
    "GU",
    "MP",
  ]);

  const coveredUSPS = new Set<string>();
  for (const d of corpus.districts) {
    for (const st of d.state_or_territory_codes) {
      coveredUSPS.add(st);
    }
  }

  for (const st of expectedUSPS) {
    if (!coveredUSPS.has(st)) {
      errors.push(
        `Missing district coverage for state/territory code '${st}'.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
