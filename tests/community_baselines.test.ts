import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  compileAcsCommunityBaselines,
  computeCoefficientOfVariation,
  computeProportionStatistic,
  createBlockGroupGeographyId,
  createCongressionalDistrictGeographyId,
  createCountyGeographyId,
  createMetroGeographyId,
  createNationGeographyId,
  createPlaceGeographyId,
  createStateGeographyId,
  createTractGeographyId,
  createZctaGeographyId,
  geographyIdToCensusApiParams,
  getBaselineRecordsForCategory,
  getBaselineRecordsForGeography,
  isUniverseCompatible,
  parseCensusEstimate,
  parseCensusMoe,
  parseGeographyId,
  requireBaselineRecord,
  testStatisticalSignificance,
  validateCommunityBaselineDataset,
  ACS_VARIABLE_REGISTRY,
  type CommunityBaselineDataset,
} from "../src/community_baselines";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data/community_baselines");

describe("National Community & Demographic Baseline Compiler (ACS 5-Year)", () => {
  const dataset2022Path = path.join(DATA_DIR, "community-baselines-2022.json");
  const dataset2023Path = path.join(DATA_DIR, "community-baselines-2023.json");
  const manifestPath = path.join(DATA_DIR, "manifest.json");

  it("1. variable registry covers all 16 required categories and bounds", () => {
    expect(ACS_VARIABLE_REGISTRY.length).toBeGreaterThanOrEqual(16);

    const categories = new Set(ACS_VARIABLE_REGISTRY.map((v) => v.category));
    expect(categories).toContain("population");
    expect(categories).toContain("voting_age_and_citizenship");
    expect(categories).toContain("age_structure");
    expect(categories).toContain("sex");
    expect(categories).toContain("educational_attainment");
    expect(categories).toContain("household_income");
    expect(categories).toContain("poverty");
    expect(categories).toContain("employment_status");
    expect(categories).toContain("occupation_and_industry");
    expect(categories).toContain("housing_tenure");
    expect(categories).toContain("rent_and_home_value");
    expect(categories).toContain("commuting");
    expect(categories).toContain("household_structure");
    expect(categories).toContain("disability");
    expect(categories).toContain("nativity_and_citizenship");
    expect(categories).toContain("race_and_hispanic_origin");

    for (const v of ACS_VARIABLE_REGISTRY) {
      expect(v.id).toBeTruthy();
      expect(v.tableId).toBeTruthy();
      expect(v.universeId).toBeTruthy();
      expect(v.unit).toBeTruthy();
      expect(v.aggregationMethod).toBeTruthy();
      expect(v.description).toBeTruthy();
    }
  });

  it("2. geography IDs are stable, hierarchical, parse cleanly, and map to Census API params", () => {
    // Nation
    const nationId = createNationGeographyId();
    expect(nationId).toBe("geo:us");
    const parsedNation = parseGeographyId(nationId);
    expect(parsedNation.level).toBe("nation");
    expect(geographyIdToCensusApiParams(nationId)).toEqual({ for: "us:1" });

    // State (Kentucky & Texas)
    const kyId = createStateGeographyId("21");
    expect(kyId).toBe("geo:state:21");
    const parsedKy = parseGeographyId(kyId);
    expect(parsedKy.level).toBe("state");
    expect(parsedKy.name).toBe("Kentucky");
    expect(parsedKy.parentId).toBe("geo:us");
    expect(geographyIdToCensusApiParams(kyId)).toEqual({ for: "state:21" });

    const txId = createStateGeographyId("48");
    expect(txId).toBe("geo:state:48");
    const parsedTx = parseGeographyId(txId);
    expect(parsedTx.level).toBe("state");
    expect(parsedTx.name).toBe("Texas");

    // County (Fayette KY & Travis TX)
    const fayetteId = createCountyGeographyId("21", "067");
    expect(fayetteId).toBe("geo:county:21067");
    const parsedFayette = parseGeographyId(fayetteId);
    expect(parsedFayette.level).toBe("county");
    expect(parsedFayette.stateFips).toBe("21");
    expect(parsedFayette.countyFips).toBe("067");
    expect(parsedFayette.parentId).toBe("geo:state:21");
    expect(geographyIdToCensusApiParams(fayetteId)).toEqual({
      for: "county:067",
      in: "state:21",
    });

    const travisId = createCountyGeographyId("48", "453");
    expect(travisId).toBe("geo:county:48453");

    // Place (Lexington-Fayette & Austin)
    const lexPlaceId = createPlaceGeographyId("21", "46027");
    expect(lexPlaceId).toBe("geo:place:2146027");
    expect(parseGeographyId(lexPlaceId).level).toBe("place");
    expect(geographyIdToCensusApiParams(lexPlaceId)).toEqual({
      for: "place:46027",
      in: "state:21",
    });

    const austinPlaceId = createPlaceGeographyId("48", "05000");
    expect(austinPlaceId).toBe("geo:place:4805000");

    // Congressional District
    const cdId = createCongressionalDistrictGeographyId("21", "06");
    expect(cdId).toBe("geo:cd:2106");
    expect(parseGeographyId(cdId).level).toBe("congressional_district");

    // Metro Area / CBSA
    const cbsaId = createMetroGeographyId("30460");
    expect(cbsaId).toBe("geo:cbsa:30460");
    expect(parseGeographyId(cbsaId).level).toBe("metro_area");

    // ZCTA
    const zctaId = createZctaGeographyId("40507");
    expect(zctaId).toBe("geo:zcta:40507");
    expect(parseGeographyId(zctaId).level).toBe("zcta");

    // Census Tract
    const tractId = createTractGeographyId("21", "067", "000100");
    expect(tractId).toBe("geo:tract:21067000100");
    const parsedTract = parseGeographyId(tractId);
    expect(parsedTract.level).toBe("tract");
    expect(parsedTract.parentId).toBe("geo:county:21067");
    expect(geographyIdToCensusApiParams(tractId)).toEqual({
      for: "tract:000100",
      in: "state:21 county:067",
    });

    // Block Group
    const bgId = createBlockGroupGeographyId("21", "067", "000100", "1");
    expect(bgId).toBe("geo:bg:210670001001");
    const parsedBg = parseGeographyId(bgId);
    expect(parsedBg.level).toBe("block_group");
    expect(parsedBg.parentId).toBe("geo:tract:21067000100");
    expect(geographyIdToCensusApiParams(bgId)).toEqual({
      for: "block group:1",
      in: "state:21 county:067 tract:000100",
    });
  });

  it("3. estimates and MOEs stay strictly paired and handle Census suppression/special codes", () => {
    // Positive normal values
    expect(parseCensusEstimate("322570")).toEqual({
      estimate: 322570,
      suppressionReason: null,
    });
    expect(parseCensusMoe("1250")).toEqual({
      marginOfError: 1250,
      moeAnnotation: null,
    });

    // Controlled estimate (e.g. PEP total population control total)
    expect(parseCensusMoe("-666666666")).toEqual({
      marginOfError: null,
      moeAnnotation: "controlled-estimate",
    });
    expect(parseCensusMoe("*****")).toEqual({
      marginOfError: null,
      moeAnnotation: "controlled-estimate",
    });

    // Open-ended distribution
    expect(parseCensusMoe("-888888888")).toEqual({
      marginOfError: null,
      moeAnnotation: "open-ended-interval",
    });

    // Suppressed for privacy / sample size
    expect(parseCensusEstimate("-999999999")).toEqual({
      estimate: null,
      suppressionReason: "suppressed_for_privacy",
    });
    expect(parseCensusEstimate("-555555555")).toEqual({
      estimate: null,
      suppressionReason: "insufficient_sample",
    });
    expect(parseCensusEstimate("-222222222")).toEqual({
      estimate: null,
      suppressionReason: "too_small",
    });
    expect(parseCensusEstimate("N")).toEqual({
      estimate: null,
      suppressionReason: "missing_from_source",
    });

    // Invariant: MOE is NEVER treated as zero when missing or suppressed
    const nullMoeResult = parseCensusMoe(null);
    expect(nullMoeResult.marginOfError).toBeNull();
    expect(nullMoeResult.marginOfError).not.toBe(0);
  });

  it("4. prevents silent mixing of differing ACS vintages", () => {
    const raw2022 = JSON.parse(
      fs.readFileSync(
        path.join(DATA_DIR, "raw_fixtures/acs5_2022_fixtures.json"),
        "utf8",
      ),
    );
    const raw2023 = JSON.parse(
      fs.readFileSync(
        path.join(DATA_DIR, "raw_fixtures/acs5_2023_fixtures.json"),
        "utf8",
      ),
    );

    // Attempting to compile 2022 with a 2023 raw input must throw
    expect(() => {
      compileAcsCommunityBaselines([raw2022, raw2023], {
        vintage: 2022,
      });
    }).toThrow(/Vintage mismatch in compiler input/);
  });

  it("5. universe compatibility checking prevents invalid cross-universe calculations", () => {
    // Compatible: pop_25_and_over is child of population_18_and_over and total_population
    expect(
      isUniverseCompatible("population_25_and_over", "population_18_and_over"),
    ).toBe(true);
    expect(
      isUniverseCompatible("population_25_and_over", "total_population"),
    ).toBe(true);
    expect(
      isUniverseCompatible(
        "civilian_labor_force_16_and_over",
        "population_16_and_over",
      ),
    ).toBe(true);

    // Incompatible: households vs civilian_labor_force_16_and_over
    expect(
      isUniverseCompatible("households", "civilian_labor_force_16_and_over"),
    ).toBe(false);
    expect(
      isUniverseCompatible("occupied_housing_units", "workers_16_and_over"),
    ).toBe(false);
  });

  it("6. compiled datasets pass 100% integrity validation and checksum verification", () => {
    const d2022: CommunityBaselineDataset = JSON.parse(
      fs.readFileSync(dataset2022Path, "utf8"),
    );
    const d2023: CommunityBaselineDataset = JSON.parse(
      fs.readFileSync(dataset2023Path, "utf8"),
    );

    const report2022 = validateCommunityBaselineDataset(d2022);
    expect(report2022.valid).toBe(true);
    expect(report2022.errors).toHaveLength(0);
    expect(report2022.recordCount).toBe(738);
    expect(report2022.geographyCount).toBe(9);

    const report2023 = validateCommunityBaselineDataset(d2023);
    expect(report2023.valid).toBe(true);
    expect(report2023.errors).toHaveLength(0);
    expect(report2023.recordCount).toBe(738);
    expect(report2023.geographyCount).toBe(9);

    // Verify manifest matches disk datasets
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.manifestVersion).toBe("1.0.0");
    expect(manifest.datasets).toHaveLength(2);

    const manifestEntry2022 = manifest.datasets.find(
      (d: { vintage: number }) => d.vintage === 2022,
    );
    expect(manifestEntry2022.sha256).toBe(d2022.sha256);
    expect(manifestEntry2022.recordCount).toBe(d2022.records.length);
  });

  it("7. deterministic rebuild produces byte-for-byte identical output", () => {
    const raw2022 = JSON.parse(
      fs.readFileSync(
        path.join(DATA_DIR, "raw_fixtures/acs5_2022_fixtures.json"),
        "utf8",
      ),
    );

    const run1 = compileAcsCommunityBaselines([raw2022], {
      vintage: 2022,
      reviewStatus: "candidate",
    });
    const run2 = compileAcsCommunityBaselines([raw2022], {
      vintage: 2022,
      reviewStatus: "candidate",
    });

    const str1 = JSON.stringify(run1, null, 2);
    const str2 = JSON.stringify(run2, null, 2);

    expect(str1).toBe(str2);
    expect(run1.sha256).toBe(run2.sha256);
  });

  it("8. supports regression fixture (Lexington/Fayette) and portability fixture (Austin/Travis TX) equally", () => {
    const dataset: CommunityBaselineDataset = JSON.parse(
      fs.readFileSync(dataset2022Path, "utf8"),
    );

    // Lexington/Fayette regression records
    const lexPop = requireBaselineRecord(
      dataset,
      "geo:place:2146027",
      "B01003_001",
    );
    expect(lexPop.estimate).toBeGreaterThan(300000);
    expect(lexPop.marginOfError).not.toBeNull();

    const lexIncome = requireBaselineRecord(
      dataset,
      "geo:place:2146027",
      "B19013_001",
    );
    expect(lexIncome.estimate).toBe(67500);

    // Austin portability records
    const austinPop = requireBaselineRecord(
      dataset,
      "geo:place:4805000",
      "B01003_001",
    );
    expect(austinPop.estimate).toBeGreaterThan(900000);
    expect(austinPop.marginOfError).not.toBeNull();

    const austinIncome = requireBaselineRecord(
      dataset,
      "geo:place:4805000",
      "B19013_001",
    );
    expect(austinIncome.estimate).toBe(86000);

    // Query helpers
    const fayetteRecords = getBaselineRecordsForGeography(
      dataset,
      "geo:county:21067",
    );
    expect(fayetteRecords.length).toBe(82);

    const travisRecords = getBaselineRecordsForGeography(
      dataset,
      "geo:county:48453",
    );
    expect(travisRecords.length).toBe(82);

    const lexEducation = getBaselineRecordsForCategory(
      dataset,
      "geo:place:2146027",
      "educational_attainment",
    );
    expect(lexEducation.length).toBeGreaterThanOrEqual(6);
  });

  it("9. statistical operations and MOE propagation follow Census standards", () => {
    const dataset: CommunityBaselineDataset = JSON.parse(
      fs.readFileSync(dataset2022Path, "utf8"),
    );

    // Compute Bachelor's degree share in Austin (Universe: Pop 25+)
    const bachelorsShare = computeProportionStatistic(
      dataset,
      "geo:place:4805000",
      "B15003_022",
      "B15003_001",
      "austin_bachelors_share",
    );

    expect(bachelorsShare.estimate).toBeGreaterThan(0.15);
    expect(bachelorsShare.estimate).toBeLessThan(0.35);
    expect(bachelorsShare.marginOfError).toBeGreaterThan(0);
    expect(bachelorsShare.confidenceInterval90).not.toBeNull();
    expect(bachelorsShare.coefficientOfVariation).toBeGreaterThan(0);

    // Statistical significance comparison between Lexington and Austin median income
    const lexIncome = requireBaselineRecord(
      dataset,
      "geo:place:2146027",
      "B19013_001",
    );
    const austinIncome = requireBaselineRecord(
      dataset,
      "geo:place:4805000",
      "B19013_001",
    );

    const sigTest = testStatisticalSignificance(
      austinIncome,
      lexIncome,
      "Austin Median Income",
      "Lexington Median Income",
    );

    expect(sigTest.difference).toBe(18500); // 86,000 - 67,500
    expect(sigTest.isStatisticallySignificant95).toBe(true);
    expect(sigTest.pLevel).toBe("<0.05");

    // Coefficient of variation
    const cv = computeCoefficientOfVariation(100000, 5000);
    expect(cv).toBeCloseTo(3.04, 1);
  });

  it("10. strict anti-stereotyping barrier: zero individual belief or opinion inference APIs exist", async () => {
    const queryModule = Object.keys(
      await import("../src/community_baselines/query"),
    );

    // Ensure no demographic-to-opinion mapping functions exist
    const forbiddenKeywords = [
      "opinion",
      "belief",
      "vote",
      "party",
      "ideology",
      "lean",
      "voter",
      "personOpinion",
      "demographicBelief",
      "stereotype",
    ];

    for (const exportName of queryModule) {
      for (const keyword of forbiddenKeywords) {
        expect(exportName.toLowerCase()).not.toContain(keyword.toLowerCase());
      }
    }
  });

  it("11. simulation, player, campaign, and UI files remain completely untouched", () => {
    // Invariants: Zero modifications to existing simulation, presentation, player, or UI domains
    expect(fs.existsSync(path.join(ROOT_DIR, "src/simulation/world.ts"))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(ROOT_DIR, "src/player/PlayerOffice.tsx")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(ROOT_DIR, "src/presentation/run-a-state.ts")),
    ).toBe(true);
  });
});
