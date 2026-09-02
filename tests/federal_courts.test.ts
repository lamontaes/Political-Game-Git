import { describe, expect, it } from "vitest";
import {
  getAllCircuits,
  getAllDistricts,
  getBankruptcyCourtByDistrict,
  getCircuitById,
  getDistrictById,
  getDistrictsByCircuit,
  getDistrictsByState,
  loadFederalCourtsCorpus,
  resolveCircuit,
  resolveDistrict,
  searchDivisions,
  validateFederalCourtsCorpus,
} from "../src/federal_courts";
import type { FederalCourtsCorpus } from "../src/federal_courts";

describe("Official Federal Courts & Judicial Geography Corpus", () => {
  it("loads the compiled corpus with exactly 13 circuits and 94 districts", () => {
    const corpus = loadFederalCourtsCorpus();
    expect(corpus.dataset_id).toBe("compiled_us_federal_courts_2026");
    expect(corpus.circuits).toHaveLength(13);
    expect(corpus.districts).toHaveLength(94);
    expect(corpus.provenance.article_iii_districts_count).toBe(91);
    expect(corpus.provenance.territorial_districts_count).toBe(3);
  });

  it("contains all 13 official Courts of Appeals circuits with correct properties", () => {
    const circuits = getAllCircuits();
    const ids = circuits.map((c) => c.circuit_id).sort();
    expect(ids).toEqual([
      "ca1",
      "ca10",
      "ca11",
      "ca2",
      "ca3",
      "ca4",
      "ca5",
      "ca6",
      "ca7",
      "ca8",
      "ca9",
      "cadc",
      "cafed",
    ]);

    const ca1 = getCircuitById("ca1");
    expect(ca1).toBeDefined();
    expect(ca1?.name).toBe(
      "United States Court of Appeals for the First Circuit",
    );
    expect(ca1?.headquarters_city).toBe("Boston, MA");
    expect(ca1?.state_or_territory_codes).toEqual([
      "ME",
      "MA",
      "NH",
      "RI",
      "PR",
    ]);

    const fedCir = getCircuitById("cafed");
    expect(fedCir).toBeDefined();
    expect(fedCir?.is_specialized_nationwide).toBe(true);
    expect(fedCir?.circuit_number).toBeNull();
  });

  it("maps every judicial district to a valid parent circuit", () => {
    const districts = getAllDistricts();
    const circuits = getAllCircuits();
    const circuitIds = new Set(circuits.map((c) => c.circuit_id));

    for (const d of districts) {
      expect(circuitIds.has(d.parent_circuit_id)).toBe(true);
    }
  });

  it("pairs every judicial district 1:1 with a U.S. Bankruptcy Court unit under 28 U.S.C. § 151", () => {
    const districts = getAllDistricts();
    for (const d of districts) {
      const bk = getBankruptcyCourtByDistrict(d.district_id);
      expect(bk).toBeDefined();
      expect(bk?.bankruptcy_court_id).toBe(`bk-${d.district_id}`);
      expect(bk?.parent_district_id).toBe(d.district_id);
      expect(bk?.statutory_citation).toBe("28 U.S.C. § 151");
    }
  });

  it("correctly models DC, Puerto Rico, and Article I Territorial Courts", () => {
    const dc = getDistrictById("d-dc");
    expect(dc?.parent_circuit_id).toBe("cadc");
    expect(dc?.constitutional_basis).toBe("ARTICLE_III");

    const pr = getDistrictById("d-pr");
    expect(pr?.parent_circuit_id).toBe("ca1");
    expect(pr?.constitutional_basis).toBe("ARTICLE_III");

    const vi = getDistrictById("d-vi");
    expect(vi?.parent_circuit_id).toBe("ca3");
    expect(vi?.constitutional_basis).toBe("ARTICLE_I_ORGANIC_ACT");

    const gu = getDistrictById("d-gu");
    expect(gu?.parent_circuit_id).toBe("ca9");
    expect(gu?.constitutional_basis).toBe("ARTICLE_I_ORGANIC_ACT");

    const mp = getDistrictById("d-mp");
    expect(mp?.parent_circuit_id).toBe("ca9");
    expect(mp?.constitutional_basis).toBe("ARTICLE_I_ORGANIC_ACT");
  });

  it("provides complete geographic coverage for all 50 states, DC, and territories", () => {
    const statesAndTerritories = [
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
    ];

    for (const code of statesAndTerritories) {
      const matching = getDistrictsByState(code);
      expect(matching.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("resolves district and circuit hierarchies deterministically", () => {
    const fifthCircuitDistricts = getDistrictsByCircuit("ca5");
    expect(fifthCircuitDistricts.map((d) => d.district_id).sort()).toEqual([
      "d-la-ed",
      "d-la-md",
      "d-la-wd",
      "d-ms-nd",
      "d-ms-sd",
      "d-tx-ed",
      "d-tx-nd",
      "d-tx-sd",
      "d-tx-wd",
    ]);

    const resSDNY = resolveDistrict("d-ny-sd");
    expect(resSDNY).toBeDefined();
    expect(resSDNY?.district.name).toBe(
      "United States District Court for the Southern District of New York",
    );
    expect(resSDNY?.parent_circuit.circuit_id).toBe("ca2");
    expect(resSDNY?.bankruptcy_court.bankruptcy_court_id).toBe("bk-d-ny-sd");

    const res2ndCir = resolveCircuit("ca2");
    expect(res2ndCir).toBeDefined();
    expect(res2ndCir?.underlying_districts.map((d) => d.district_id)).toEqual([
      "d-ct",
      "d-ny-nd",
      "d-ny-sd",
      "d-ny-ed",
      "d-ny-wd",
      "d-vt",
    ]);
  });

  it("searches court divisions and courthouses by city and name", () => {
    const dallasMatches = searchDivisions("Dallas");
    expect(dallasMatches.length).toBeGreaterThanOrEqual(1);
    expect(dallasMatches[0].district.district_id).toBe("d-tx-nd");
    expect(dallasMatches[0].division.name).toBe("Dallas Division");

    const bostonMatches = searchDivisions("Boston");
    expect(bostonMatches.length).toBeGreaterThanOrEqual(1);
    expect(bostonMatches[0].district.district_id).toBe("d-ma");
  });

  it("strictly enforces validation rules and flags corrupted data", () => {
    const validCorpus = loadFederalCourtsCorpus();
    const valResult = validateFederalCourtsCorpus(validCorpus);
    expect(valResult.valid).toBe(true);
    expect(valResult.errors).toEqual([]);

    const corrupted: FederalCourtsCorpus = JSON.parse(
      JSON.stringify(validCorpus),
    );
    corrupted.districts[0].parent_circuit_id = "non-existent-circuit";
    const corruptedVal = validateFederalCourtsCorpus(corrupted);
    expect(corruptedVal.valid).toBe(false);
    expect(
      corruptedVal.errors.some((e) =>
        e.includes("references unknown parent_circuit_id"),
      ),
    ).toBe(true);
  });

  it("strictly contains NO non-sourced, gameplay, or subjective fields", () => {
    const corpus = loadFederalCourtsCorpus();
    const rawString = JSON.stringify(corpus);

    expect(rawString).not.toContain("judge_name");
    expect(rawString).not.toContain("ideology");
    expect(rawString).not.toContain("caseload_severity");
    expect(rawString).not.toContain("decision_probability");
    expect(rawString).not.toContain("player_eligibility");
  });
});
