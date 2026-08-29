import { describe, expect, it } from "vitest";
import {
  buildCensusGovId,
  CENSUS_2022_NATIONAL_SUMMARY,
  CENSUS_2022_PROVENANCE,
  defaultAuthorityIndex,
  generateFunctionalSpecialDistrictsManifest,
  generateHistoricalCountSeriesManifest,
  generateNationalUniverseManifest,
  generateSchoolSystemsManifest,
  generateStateUniverseManifest,
  generateTypeClassificationManifest,
  getStateByCensusCode,
  getStateByFips,
  getStateByPostal,
  GovernmentUniverseQuery,
  HISTORICAL_COUNT_SERIES,
  isValidCensusGovId,
  normalizeGovernmentRecord,
  normalizeGovernmentUniverse,
  parseCensusGovId,
  REPRESENTATIVE_GOVERNMENT_UNITS,
  SPECIAL_DISTRICT_FUNCTION_SUMMARIES,
  STATE_GOVERNMENT_SUMMARIES,
} from "../src/government_universe/index.js";

describe("U.S. Government-Universe Source Layer", () => {
  describe("Census Government Identification Code parser & decoder", () => {
    it("parses a valid 14-digit Census Gov ID into constituent parts", () => {
      // Fayette County KY (State 18, Type 2, County 034, Unit 001, Func 000, Sub 00)
      const parsed = parseCensusGovId("18203400100000");
      expect(parsed.rawId).toBe("18203400100000");
      expect(parsed.censusStateCode).toBe("18");
      expect(parsed.statePostal).toBe("KY");
      expect(parsed.stateFips).toBe("21");
      expect(parsed.stateName).toBe("Kentucky");
      expect(parsed.typeCode).toBe("2");
      expect(parsed.governmentType).toBe("county");
      expect(parsed.countyAreaCode).toBe("034");
      expect(parsed.unitId).toBe("001");
      expect(parsed.functionCode).toBe("000");
      expect(parsed.functionCategory).toBe("general_government");
      expect(parsed.subunitCode).toBe("00");
      expect(parsed.isIndependentEntity).toBe(true);
    });

    it("correctly decodes all 6 government type codes", () => {
      expect(parseCensusGovId("18100000000000").governmentType).toBe("state");
      expect(parseCensusGovId("18203400100000").governmentType).toBe("county");
      expect(parseCensusGovId("18303400100000").governmentType).toBe(
        "municipal",
      );
      expect(parseCensusGovId("36402500100000").governmentType).toBe(
        "township",
      );
      expect(parseCensusGovId("18503400102400").governmentType).toBe(
        "special_district",
      );
      expect(parseCensusGovId("18603400104400").governmentType).toBe(
        "school_district",
      );
    });

    it("correctly maps functional codes to categories", () => {
      expect(parseCensusGovId("18503400102400").functionCategory).toBe(
        "fire_protection",
      );
      expect(parseCensusGovId("44505700109100").functionCategory).toBe(
        "water_supply",
      );
      expect(parseCensusGovId("14501600108000").functionCategory).toBe(
        "sewerage",
      );
      expect(parseCensusGovId("36505700105200").functionCategory).toBe(
        "drainage_flood_control",
      );
      expect(parseCensusGovId("18503400106100").functionCategory).toBe(
        "libraries",
      );
      expect(parseCensusGovId("14501600106000").functionCategory).toBe(
        "parks_recreation",
      );
      expect(parseCensusGovId("44510100106200").functionCategory).toBe(
        "health_hospitals",
      );
      expect(parseCensusGovId("44505700109400").functionCategory).toBe(
        "mass_transit",
      );
      expect(parseCensusGovId("48501700100100").functionCategory).toBe(
        "airports_ports",
      );
    });

    it("validates 14-digit format and rejects malformed IDs", () => {
      expect(isValidCensusGovId("18203400100000")).toBe(true);
      expect(isValidCensusGovId("1820340010000")).toBe(false); // 13 digits
      expect(isValidCensusGovId("182034001000000")).toBe(false); // 15 digits
      expect(isValidCensusGovId("99203400100000")).toBe(false); // Invalid state 99
      expect(isValidCensusGovId("1820340010000A")).toBe(false); // Contains letter
      expect(isValidCensusGovId("")).toBe(false);
    });

    it("builds a Census Gov ID from constituent parts and handles roundtrip", () => {
      const built = buildCensusGovId({
        censusStateCode: "18",
        typeCode: "2",
        countyAreaCode: "034",
        unitId: "001",
        functionCode: "000",
        subunitCode: "00",
      });
      expect(built).toBe("18203400100000");
      expect(parseCensusGovId(built).censusStateCode).toBe("18");
    });

    it("correctly resolves state mappings across Census code, postal abbreviation, and FIPS code", () => {
      const ky = getStateByPostal("KY");
      expect(ky).toBeDefined();
      expect(ky?.censusCode).toBe("18");
      expect(ky?.fips).toBe("21");
      expect(ky?.name).toBe("Kentucky");

      const tx = getStateByCensusCode("44");
      expect(tx?.postal).toBe("TX");
      expect(tx?.fips).toBe("48");

      const ca = getStateByFips("06");
      expect(ca?.postal).toBe("CA");
      expect(ca?.censusCode).toBe("05");
    });
  });

  describe("Normalization & Deterministic Build", () => {
    it("normalizes a raw government unit into a canonical GovernmentSourceRecord", () => {
      const record = normalizeGovernmentRecord({
        censusGovId: "18203400100000",
        officialName: "Lexington-Fayette Urban County Government",
        state: "KY",
        countyName: "Fayette County",
        countyFips: "067",
        governmentType: "county",
        governmentSubtype: "urban_county_government",
      });

      expect(record.stableSourceId).toBe("gov-src-census-18203400100000");
      expect(record.officialName).toBe(
        "Lexington-Fayette Urban County Government",
      );
      expect(record.state).toBe("KY");
      expect(record.stateFips).toBe("21");
      expect(record.countyAssociation?.countyName).toBe("Fayette County");
      expect(record.countyAssociation?.countyFips).toBe("21067");
      expect(record.governmentType).toBe("county");
      expect(record.governmentSubtype).toBe("urban_county_government");
      expect(record.activeStatus).toBe("active");
      expect(record.sourceVintage).toBe("2022 Census of Governments");
      expect(record.sourceProvenance.sourceAgency).toBe("U.S. Census Bureau");
    });

    it("derives Census Gov ID from constituent fields when not provided explicitly", () => {
      const record = normalizeGovernmentRecord({
        officialName: "Test District",
        state: "KY",
        countyAreaCode: "034",
        unitId: "005",
        governmentType: "special_district",
        functionCode: "024",
      });
      expect(record.censusGovId).toBe("18503400502400");
      expect(record.stableSourceId).toBe("gov-src-census-18503400502400");
    });

    it("normalizes the representative universe deterministically with 100% stable ID uniqueness", () => {
      const firstPass = normalizeGovernmentUniverse(
        REPRESENTATIVE_GOVERNMENT_UNITS,
      );
      const secondPass = normalizeGovernmentUniverse(
        REPRESENTATIVE_GOVERNMENT_UNITS,
      );

      expect(firstPass.length).toBe(REPRESENTATIVE_GOVERNMENT_UNITS.length);
      expect(JSON.stringify(firstPass)).toBe(JSON.stringify(secondPass));

      const stableIds = new Set(firstPass.map((r) => r.stableSourceId));
      expect(stableIds.size).toBe(firstPass.length);
    });

    it("detects and rejects duplicate stable IDs or Census Gov IDs during normalization", () => {
      const duplicateInput = [
        {
          censusGovId: "18203400100000",
          officialName: "Lexington-Fayette 1",
          state: "KY",
          governmentType: "county" as const,
        },
        {
          censusGovId: "18203400100000",
          officialName: "Lexington-Fayette 2",
          state: "KY",
          governmentType: "county" as const,
        },
      ];

      expect(() => normalizeGovernmentUniverse(duplicateInput)).toThrow(
        /Duplicate/,
      );
    });
  });

  describe("Distinction Invariants & Preservations", () => {
    const universe = normalizeGovernmentUniverse(
      REPRESENTATIVE_GOVERNMENT_UNITS,
    );
    const query = new GovernmentUniverseQuery(universe);

    it("keeps duplicate-named government entities completely distinct across states", () => {
      // "Washington County" exists across KY, TX, IL, NY, OH, PA, VA, FL
      const washingtonCounties = universe.filter(
        (r) => r.officialName === "Washington County",
      );
      expect(washingtonCounties.length).toBeGreaterThanOrEqual(5);

      const states = new Set(washingtonCounties.map((r) => r.state));
      expect(states.size).toBe(washingtonCounties.length);

      const stableIds = new Set(
        washingtonCounties.map((r) => r.stableSourceId),
      );
      expect(stableIds.size).toBe(washingtonCounties.length);

      // Verify each has distinct Census state codes and FIPS codes
      for (const wc of washingtonCounties) {
        expect(wc.governmentType).toBe("county");
        expect(wc.stableSourceId).toContain(wc.censusGovId);
      }
    });

    it("keeps duplicate-named entities distinct within the same state (different counties)", () => {
      // In Ohio: Franklin Township in Franklin County vs Franklin Township in Warren County
      const franklinTownshipsOH = universe.filter(
        (r) => r.state === "OH" && r.officialName === "Franklin Township",
      );
      expect(franklinTownshipsOH.length).toBe(2);
      expect(franklinTownshipsOH[0].stableSourceId).not.toBe(
        franklinTownshipsOH[1].stableSourceId,
      );
      expect(franklinTownshipsOH[0].countyAssociation?.countyName).not.toBe(
        franklinTownshipsOH[1].countyAssociation?.countyName,
      );
    });

    it("strictly preserves county vs municipality vs township vs special district distinctions", () => {
      const counties = query.getGovernmentsByClass("county");
      const municipalities = query.getGovernmentsByClass("municipal");
      const townships = query.getGovernmentsByClass("township");
      const specialDistricts = query.getGovernmentsByClass("special_district");
      const schoolDistricts = query.getGovernmentsByClass("school_district");

      expect(counties.length).toBeGreaterThan(0);
      expect(municipalities.length).toBeGreaterThan(0);
      expect(townships.length).toBeGreaterThan(0);
      expect(specialDistricts.length).toBeGreaterThan(0);
      expect(schoolDistricts.length).toBeGreaterThan(0);

      // No crossover in classifications
      for (const c of counties) expect(c.governmentType).toBe("county");
      for (const m of municipalities)
        expect(m.governmentType).toBe("municipal");
      for (const t of townships) expect(t.governmentType).toBe("township");
      for (const s of specialDistricts)
        expect(s.governmentType).toBe("special_district");
      for (const sc of schoolDistricts)
        expect(sc.governmentType).toBe("school_district");
    });

    it("strictly distinguishes general-purpose from special-purpose local governments", () => {
      const general = query.getGeneralPurposeGovernments();
      const special = query.getSpecialPurposeGovernments();

      expect(general.length).toBeGreaterThan(0);
      expect(special.length).toBeGreaterThan(0);

      for (const g of general) {
        expect(["county", "municipal", "township"]).toContain(g.governmentType);
      }

      for (const s of special) {
        expect(["special_district", "school_district"]).toContain(
          s.governmentType,
        );
      }
    });

    it("preserves independent school districts vs dependent school systems", () => {
      // In Kentucky: independent public school districts
      const kySchools = query.getSchoolDistricts("KY");
      expect(kySchools.length).toBeGreaterThanOrEqual(2);
      for (const ks of kySchools) {
        expect(ks.governmentType).toBe("school_district");
        expect(ks.functionCategory).toBe("education_elementary_secondary");
      }

      // National manifest verifies dependent counts without confusing them as independent units
      const schoolManifest = generateSchoolSystemsManifest();
      expect(schoolManifest.nationalSummary.independentDistricts).toBe(12546);
      expect(schoolManifest.nationalSummary.dependentSystems).toBe(1313);
      expect(schoolManifest.nationalSummary.totalOperatingSystems).toBe(13859);
    });
  });

  describe("Qualitative State Authority Reference Index & Unknown Power Boundaries", () => {
    const authorityIndex = defaultAuthorityIndex;

    it("covers all 50 states plus the District of Columbia", () => {
      const allAuth = authorityIndex.getAllAuthorities();
      expect(allAuth.length).toBe(51);

      for (const stateConfig of STATE_GOVERNMENT_SUMMARIES
        ? Object.keys(STATE_GOVERNMENT_SUMMARIES)
        : []) {
        const auth = authorityIndex.getAuthorityForState(stateConfig);
        expect(auth).toBeDefined();
        expect(auth?.state).toBe(stateConfig);
      }
    });

    it("strictly preserves unprovided powers as unknown (no invented powers)", () => {
      for (const auth of authorityIndex.getAllAuthorities()) {
        expect(auth.unprovidedPowersStrictlyUnknown).toBe(true);
        expect(auth.sourceCitation.publication).toBe(
          "2022 Census of Governments: Individual State Descriptions",
        );
        expect(auth.sourceCitation.reportNumber).toBe("G22-CG-ISD");
        expect(auth.sourceCitation.url).toContain("census.gov");
      }
    });

    it("attaches state-specific organization descriptions correctly to each state", () => {
      const ky = authorityIndex.getAuthorityForState("KY");
      expect(ky?.sourceDescription).toContain("Kentucky Constitution of 1891");
      expect(
        ky?.authorizedClasses.some(
          (c) => c.subtypeKey === "urban_county_government",
        ),
      ).toBe(true);
      expect(authorityIndex.hasTownshipGovernments("KY")).toBe(false);

      const tx = authorityIndex.getAuthorityForState("TX");
      expect(tx?.sourceDescription).toContain("Commissioners Court");
      expect(authorityIndex.hasTownshipGovernments("TX")).toBe(false);

      const il = authorityIndex.getAuthorityForState("IL");
      expect(il?.sourceDescription).toContain("civil townships");
      expect(authorityIndex.hasTownshipGovernments("IL")).toBe(true);

      const va = authorityIndex.getAuthorityForState("VA");
      expect(va?.sourceDescription).toContain("city-county separation");
      expect(va?.censusClassificationNotes).toContain(
        "dependent school systems",
      );

      const ma = authorityIndex.getAuthorityForState("MA");
      expect(ma?.sourceDescription).toContain("New England Town");
      expect(authorityIndex.hasTownshipGovernments("MA")).toBe(true);
    });

    it("correctly identifies township authorization across the 20 township states", () => {
      const townshipStates = [
        "CT",
        "IL",
        "IN",
        "KS",
        "ME",
        "MA",
        "MI",
        "MN",
        "MO",
        "NE",
        "NH",
        "NJ",
        "NY",
        "ND",
        "OH",
        "PA",
        "RI",
        "SD",
        "VT",
        "WI",
      ];

      for (const st of townshipStates) {
        expect(authorityIndex.hasTownshipGovernments(st)).toBe(true);
      }

      const nonTownshipStates = [
        "KY",
        "TX",
        "CA",
        "FL",
        "GA",
        "VA",
        "NC",
        "TN",
        "AL",
        "AZ",
      ];
      for (const st of nonTownshipStates) {
        expect(authorityIndex.hasTownshipGovernments(st)).toBe(false);
      }
    });
  });

  describe("Authoritative Summary Manifests", () => {
    it("national universe manifest totals match Census 2022 benchmarks exactly", () => {
      const manifest = generateNationalUniverseManifest(
        "2024-01-01T00:00:00.000Z",
      );

      expect(manifest.totalGovernmentsNationally).toBe(90888);
      expect(manifest.stateGovernmentsNationally).toBe(50);
      expect(manifest.localGovernmentsNationally).toBe(90837);

      expect(manifest.byClass.county).toBe(3031);
      expect(manifest.byClass.municipal).toBe(19491);
      expect(manifest.byClass.township).toBe(16214);
      expect(manifest.byClass.special_district).toBe(39555);
      expect(manifest.byClass.school_district).toBe(12546);

      expect(manifest.schoolSystems.independentSchoolDistricts).toBe(12546);
      expect(manifest.schoolSystems.dependentSchoolSystemsTotal).toBe(1313);
      expect(manifest.schoolSystems.allOperatingPublicSchoolSystems).toBe(
        13859,
      );
      expect(manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it("state universe manifest totals accurately reflect all 50 states + DC", () => {
      const manifest = generateStateUniverseManifest(
        "2024-01-01T00:00:00.000Z",
      );
      expect(manifest.stateCount).toBe(51);

      // Verify Illinois local governments from Table 2
      const il = manifest.states.IL;
      expect(il.countyGovernments).toBe(102);
      expect(il.municipalGovernments).toBe(1295);
      expect(il.townshipGovernments).toBe(1425);
      expect(il.specialDistrictGovernments).toBe(3218);
      expect(il.independentSchoolDistricts).toBe(890);
      expect(il.totalLocalGovernments).toBe(6930);

      // Verify Hawaii from Table 2 and Table 9
      const hi = manifest.states.HI;
      expect(hi.municipalGovernments).toBe(1);
      expect(hi.independentSchoolDistricts).toBe(0);
      expect(hi.dependentSchoolSystems.stateDependent).toBe(1);

      // Verify Texas has over 1,000 independent school districts
      const tx = manifest.states.TX;
      expect(tx.independentSchoolDistricts).toBe(1070);
      expect(tx.countyGovernments).toBe(254);
      expect(tx.totalLocalGovernments).toBe(5533);
    });

    it("special districts functional manifest breaks down all major categories", () => {
      const manifest = generateFunctionalSpecialDistrictsManifest(
        "2024-01-01T00:00:00.000Z",
      );
      expect(manifest.totalSpecialDistricts).toBe(39555);
      expect(manifest.singleFunctionTotal).toBe(32768);
      expect(manifest.multiFunctionTotal).toBe(6787);

      const fire = manifest.functions.find(
        (f) => f.functionCategory === "fire_protection",
      );
      expect(fire?.nationalCount).toBe(5957);

      const housing = manifest.functions.find(
        (f) => f.functionCategory === "housing_community_development",
      );
      expect(housing?.nationalCount).toBe(3304);
    });

    it("type classification manifest captures all 7 government classes with definitions", () => {
      const manifest = generateTypeClassificationManifest(
        "2024-01-01T00:00:00.000Z",
      );
      expect(manifest.generalPurposeTypes).toEqual([
        "county",
        "municipal",
        "township",
      ]);
      expect(manifest.specialPurposeTypes).toEqual([
        "special_district",
        "school_district",
      ]);
      expect(manifest.definitions.county.nationalCount2022).toBe(3031);
      expect(manifest.definitions.municipal.nationalCount2022).toBe(19491);
      expect(manifest.definitions.township.nationalCount2022).toBe(16214);
      expect(manifest.definitions.special_district.nationalCount2022).toBe(
        39555,
      );
      expect(manifest.definitions.school_district.nationalCount2022).toBe(
        12546,
      );
      expect(manifest.definitions.state.nationalCount2022).toBe(50);
      expect(manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it("historical count series manifest accurately captures 70-year evolution (1952–2022)", () => {
      const manifest = generateHistoricalCountSeriesManifest(
        "2024-01-01T00:00:00.000Z",
      );
      expect(manifest.censusYears.length).toBe(9);

      const y1952 = manifest.censusYears.find((y) => y.year === 1952);
      expect(y1952?.totalGovernments).toBe(116807);
      expect(y1952?.schoolDistrictGovernments).toBe(67355);
      expect(y1952?.specialDistrictGovernments).toBe(12340);

      const y2022 = manifest.censusYears.find((y) => y.year === 2022);
      expect(y2022?.totalGovernments).toBe(90888);
      expect(y2022?.schoolDistrictGovernments).toBe(12546);
      expect(y2022?.specialDistrictGovernments).toBe(39555);
      expect(y2022?.townshipGovernments).toBe(16214);
      expect(y2022?.municipalGovernments).toBe(19491);
      expect(y2022?.localGovernments).toBe(90837);

      expect(manifest.majorTrends.schoolDistrictConsolidation).toContain(
        "81.4%",
      );
    });
  });

  describe("Census 2022 Acquired Source Invariants & Regression Proofs", () => {
    it("preserves exact provenance metadata and raw file checksums", () => {
      expect(CENSUS_2022_PROVENANCE.sourceAgency).toBe("U.S. Census Bureau");
      expect(CENSUS_2022_PROVENANCE.sourceTables.length).toBe(6);

      const tableIds = CENSUS_2022_PROVENANCE.sourceTables.map(
        (t) => t.tableId,
      );
      expect(tableIds).toContain("CG2200ORG01");
      expect(tableIds).toContain("CG2200ORG02");
      expect(tableIds).toContain("CG2200ORG03");
      expect(tableIds).toContain("CG2200ORG04");
      expect(tableIds).toContain("CG2200ORG08");
      expect(tableIds).toContain("CG2200ORG09");

      for (const t of CENSUS_2022_PROVENANCE.sourceTables) {
        expect(t.sourceUrl).toContain("census.gov");
        expect(t.vintage).toBe("2022");
        expect(t.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(t.zipSha256).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it("verifies state-by-state mathematical equality for all 51 jurisdictions (C + M + T + SD + ISD = Total Local)", () => {
      const states = Object.values(STATE_GOVERNMENT_SUMMARIES);
      expect(states.length).toBe(51);

      let aggLocal = 0;
      let aggCounty = 0;
      let aggMuni = 0;
      let aggTown = 0;
      let aggSD = 0;
      let aggISD = 0;
      let aggDep = 0;

      for (const s of states) {
        const computedLocal =
          s.countyGovernments +
          s.municipalGovernments +
          s.townshipGovernments +
          s.specialDistrictGovernments +
          s.independentSchoolDistricts;

        expect(computedLocal).toBe(s.totalLocalGovernments);
        expect(s.totalGovernments).toBe(
          s.totalLocalGovernments + s.stateGovernment,
        );

        aggLocal += s.totalLocalGovernments;
        aggCounty += s.countyGovernments;
        aggMuni += s.municipalGovernments;
        aggTown += s.townshipGovernments;
        aggSD += s.specialDistrictGovernments;
        aggISD += s.independentSchoolDistricts;
        aggDep += s.dependentSchoolSystems.total;
      }

      expect(aggLocal).toBe(90837);
      expect(aggCounty).toBe(3031);
      expect(aggMuni).toBe(19491);
      expect(aggTown).toBe(16214);
      expect(aggSD).toBe(39555);
      expect(aggISD).toBe(12546);
      expect(aggDep).toBe(1313);
    });

    it("verifies special district single-function and multi-function partition sum", () => {
      const single = SPECIAL_DISTRICT_FUNCTION_SUMMARIES.filter(
        (f) => !f.isMultiFunction,
      ).reduce((sum, f) => sum + f.nationalCount, 0);
      const multi = SPECIAL_DISTRICT_FUNCTION_SUMMARIES.filter(
        (f) => f.isMultiFunction,
      ).reduce((sum, f) => sum + f.nationalCount, 0);

      expect(single).toBe(32768);
      expect(multi).toBe(6787);
      expect(single + multi).toBe(39555);
      expect(CENSUS_2022_NATIONAL_SUMMARY.specialDistrictGovernments).toBe(
        39555,
      );
    });

    it("verifies national totals encompass 1 Federal + 50 State + 90,837 Local = 90,888 Total", () => {
      expect(CENSUS_2022_NATIONAL_SUMMARY.federalGovernment).toBe(1);
      expect(CENSUS_2022_NATIONAL_SUMMARY.stateGovernments).toBe(50);
      expect(CENSUS_2022_NATIONAL_SUMMARY.localGovernmentsTotal).toBe(90837);
      expect(CENSUS_2022_NATIONAL_SUMMARY.totalFedStateLocal).toBe(90888);
    });

    it("verifies historical series consistency across all 9 benchmark censuses", () => {
      expect(HISTORICAL_COUNT_SERIES.length).toBe(9);
      for (const row of HISTORICAL_COUNT_SERIES) {
        expect(row.year).toBeGreaterThanOrEqual(1952);
        expect(row.localGovernments).toBe(
          row.countyGovernments +
            row.municipalGovernments +
            row.townshipGovernments +
            row.specialDistrictGovernments +
            row.schoolDistrictGovernments,
        );
        expect(row.totalGovernments).toBe(
          row.federalGovernment + row.stateGovernments + row.localGovernments,
        );
      }
    });
  });

  describe("Query Engine & API", () => {
    const universe = normalizeGovernmentUniverse(
      REPRESENTATIVE_GOVERNMENT_UNITS,
    );
    const query = new GovernmentUniverseQuery(universe);

    it("finds government units by stableSourceId and censusGovId", () => {
      const byStable = query.findGovernmentById(
        "gov-src-census-18203400100000",
      );
      expect(byStable).toBeDefined();
      expect(byStable?.officialName).toBe(
        "Lexington-Fayette Urban County Government",
      );

      const byCensus = query.findGovernmentByCensusId("18203400100000");
      expect(byCensus).toBeDefined();
      expect(byCensus?.stableSourceId).toBe("gov-src-census-18203400100000");
    });

    it("queries government units by county", () => {
      const fayetteGovs = query.getGovernmentsForCounty("KY", "Fayette County");
      expect(fayetteGovs.length).toBeGreaterThanOrEqual(4);

      const names = fayetteGovs.map((g) => g.officialName);
      expect(names).toContain("Lexington-Fayette Urban County Government");
      expect(names).toContain("Fayette County Public Schools");
      expect(names).toContain("Lexington Public Library District");
    });

    it("searches governments with multi-criteria filters", () => {
      const fireDistricts = query.searchGovernments({
        functionCategory: "fire_protection",
      });
      expect(fireDistricts.length).toBeGreaterThan(0);
      for (const fd of fireDistricts) {
        expect(fd.functionCategory).toBe("fire_protection");
      }

      const txCities = query.searchGovernments({
        state: "TX",
        governmentType: "municipal",
      });
      expect(txCities.length).toBeGreaterThanOrEqual(3);
      for (const c of txCities) {
        expect(c.state).toBe("TX");
        expect(c.governmentType).toBe("municipal");
      }
    });
  });
});
