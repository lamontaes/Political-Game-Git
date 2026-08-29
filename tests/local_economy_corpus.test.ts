import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertUnitCompatibility,
  checkUnitCompatibility,
  createNominalDollarUnit,
  createRealDollarUnit,
  determineGeoLevel,
  EconomyCorpusQueryEngine,
  getSectorForNaics,
  getSupersectorForNaics,
  LocalEconomyCorpusCompiler,
  normalizeFips,
  validateCorpusPackage,
  validateFips,
  validateNaicsCode,
} from "../src/local_economy_corpus/index.js";
import type { NormalizedEconomyCorpusPackage } from "../src/local_economy_corpus/types.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "data/local_economy_source/fixtures",
);
const BEA_DIR = path.join(FIXTURES_DIR, "bea");
const QCEW_DIR = path.join(FIXTURES_DIR, "qcew");
const VINTAGES_DIR = path.join(FIXTURES_DIR, "vintages");

describe("Local Economy & Labor-Market Source Corpus Compiler", () => {
  // Test 1: Deterministic same-input rebuild
  it("produces byte-for-byte identical output and matching checksums on rebuild", () => {
    const compilerA = new LocalEconomyCorpusCompiler();
    const compilerB = new LocalEconomyCorpusCompiler();

    const fayetteBea = JSON.parse(
      fs.readFileSync(path.join(BEA_DIR, "ky_fayette_21067_bea.json"), "utf-8"),
    );
    const fayetteQcew = JSON.parse(
      fs.readFileSync(
        path.join(QCEW_DIR, "ky_fayette_21067_qcew.json"),
        "utf-8",
      ),
    );

    compilerA.ingest({ provider: "bea_regional", raw: fayetteBea.data });
    compilerA.ingest({ provider: "bls_qcew", raw: fayetteQcew.data });

    compilerB.ingest({ provider: "bea_regional", raw: fayetteBea.data });
    compilerB.ingest({ provider: "bls_qcew", raw: fayetteQcew.data });

    const pkgA = compilerA.compile("2026-08-28T00:00:00.000Z");
    const pkgB = compilerB.compile("2026-08-28T00:00:00.000Z");

    expect(pkgA.buildMetadata.checksum).toBe(pkgB.buildMetadata.checksum);
    expect(pkgA.manifest.sha256).toBe(pkgB.manifest.sha256);
    expect(JSON.stringify(pkgA)).toBe(JSON.stringify(pkgB));
  });

  // Test 2: Invariant to ingestion order
  it("produces identical observation IDs and checksums independent of source ingestion order", () => {
    const compiler1 = new LocalEconomyCorpusCompiler();
    const compiler2 = new LocalEconomyCorpusCompiler();

    const fayetteBea = JSON.parse(
      fs.readFileSync(path.join(BEA_DIR, "ky_fayette_21067_bea.json"), "utf-8"),
    );
    const countiesBea = JSON.parse(
      fs.readFileSync(
        path.join(BEA_DIR, "contrasting_counties_bea.json"),
        "utf-8",
      ),
    );

    // Order 1: Fayette then contrasting counties
    compiler1.ingest({ provider: "bea_regional", raw: fayetteBea.data });
    compiler1.ingest({ provider: "bea_regional", raw: countiesBea.data });

    // Order 2: Contrasting counties then Fayette
    compiler2.ingest({ provider: "bea_regional", raw: countiesBea.data });
    compiler2.ingest({ provider: "bea_regional", raw: fayetteBea.data });

    const pkg1 = compiler1.compile("2026-08-28T00:00:00.000Z");
    const pkg2 = compiler2.compile("2026-08-28T00:00:00.000Z");

    expect(pkg1.observations.map((o) => o.observationId)).toEqual(
      pkg2.observations.map((o) => o.observationId),
    );
    expect(pkg1.buildMetadata.checksum).toBe(pkg2.buildMetadata.checksum);
  });

  // Test 3: Geography correctness & FIPS validation
  it("validates and standardizes geographic FIPS codes and hierarchies", () => {
    expect(normalizeFips("21067")).toBe("21067");
    expect(normalizeFips("21")).toBe("21000");
    expect(normalizeFips("0")).toBe("00000");
    expect(normalizeFips("US")).toBe("00000");

    expect(determineGeoLevel("21067")).toBe("county");
    expect(determineGeoLevel("21000")).toBe("state");
    expect(determineGeoLevel("00000")).toBe("national");

    expect(validateFips("21067").valid).toBe(true);
    expect(validateFips("00000").valid).toBe(true);
    expect(validateFips("99999").valid).toBe(false); // Unknown state prefix
    expect(validateFips("ABCDE").valid).toBe(false);
  });

  // Test 4: NAICS code safety and taxonomy hierarchy
  it("enforces NAICS code safety, validates formats, and rolls up hierarchy", () => {
    expect(validateNaicsCode("10").valid).toBe(true);
    expect(validateNaicsCode("101").valid).toBe(true);
    expect(validateNaicsCode("31-33").valid).toBe(true);
    expect(validateNaicsCode("54").valid).toBe(true);
    expect(validateNaicsCode("336111").valid).toBe(true); // 6-digit auto mfg
    expect(validateNaicsCode("INVALID_NAICS").valid).toBe(false);

    expect(getSectorForNaics("336111")).toBe("31-33");
    expect(getSectorForNaics("541")).toBe("54");
    expect(getSupersectorForNaics("31-33")).toBe("goods_producing");
    expect(getSupersectorForNaics("54")).toBe("service_providing");
  });

  // Test 5: Strict Price Basis & Unit Safety (Never mix nominal and real dollars silently)
  it("strictly prevents silent mixing of nominal and real chained dollars", () => {
    const nominalUSD = createNominalDollarUnit(1000);
    const real2017USD = createRealDollarUnit(2017, 1000);
    const real2012USD = createRealDollarUnit(2012, 1000);

    const checkNomVsReal = checkUnitCompatibility(nominalUSD, real2017USD);
    expect(checkNomVsReal.compatible).toBe(false);
    expect(checkNomVsReal.reason).toContain("Price basis mismatch");

    const checkReal2017Vs2012 = checkUnitCompatibility(
      real2017USD,
      real2012USD,
    );
    expect(checkReal2017Vs2012.compatible).toBe(false);
    expect(checkReal2017Vs2012.reason).toContain("reference year mismatch");

    expect(() => assertUnitCompatibility(nominalUSD, real2017USD)).toThrow(
      "Economic Unit Incompatibility Error",
    );
  });

  // Test 6: Cadence truthfulness (No fake monthly values from annual totals)
  it("preserves genuine reporting cadence and rejects synthetic monthly data", () => {
    const compiler = new LocalEconomyCorpusCompiler();
    const fayetteBea = JSON.parse(
      fs.readFileSync(path.join(BEA_DIR, "ky_fayette_21067_bea.json"), "utf-8"),
    );
    compiler.ingest({ provider: "bea_regional", raw: fayetteBea.data });

    const pkg = compiler.compile();
    for (const obs of pkg.observations) {
      if (obs.provenance.provider === "bea_regional") {
        expect(obs.frequency).toBe("annual");
        expect(obs.month).toBeNull();
      }
    }
  });

  // Test 7: QCEW Confidentiality & Suppression survival
  it("preserves confidentiality and disclosure suppression flags without zero coercion", () => {
    const compiler = new LocalEconomyCorpusCompiler();
    const fayetteQcew = JSON.parse(
      fs.readFileSync(
        path.join(QCEW_DIR, "ky_fayette_21067_qcew.json"),
        "utf-8",
      ),
    );
    compiler.ingest({ provider: "bls_qcew", raw: fayetteQcew.data });

    const pkg = compiler.compile();
    const engine = new EconomyCorpusQueryEngine(pkg);

    // NAICS 21 (Mining) in Fayette County is confidential/suppressed
    const miningObs = engine.findObservation({
      geoFips: "21067",
      category: "employment",
      naicsCode: "21",
      ownershipCode: "5",
      year: 2022,
    });

    expect(miningObs).toBeDefined();
    expect(miningObs?.isSuppressed).toBe(true);
    expect(miningObs?.suppressionStatus).toBe("suppressed_confidential");
    expect(miningObs?.suppressionCode).toBe("N");
    expect(miningObs?.value).toBeNull();
  });

  // Test 8: BEA Vintage Isolation and Revision Lineage
  it("tracks preliminary, revised, and comprehensive benchmark vintages as distinct records", () => {
    const compiler = new LocalEconomyCorpusCompiler();
    const vintageFixture = JSON.parse(
      fs.readFileSync(
        path.join(VINTAGES_DIR, "bea_vintage_revisions.json"),
        "utf-8",
      ),
    );

    const [vPrelim, vRevised, vBench] = vintageFixture.vintages;

    compiler.ingest({
      provider: "bea_regional",
      raw: vintageFixture.preliminaryData,
      options: { vintageOverride: vPrelim },
    });

    compiler.ingest({
      provider: "bea_regional",
      raw: vintageFixture.revisedData,
      options: { vintageOverride: vRevised },
    });

    compiler.ingest({
      provider: "bea_regional",
      raw: vintageFixture.benchmarkData,
      options: { vintageOverride: vBench },
    });

    const pkg = compiler.compile();

    const gdp2021Observations = pkg.observations.filter(
      (o) => o.geoFips === "21067" && o.year === 2021 && o.category === "gdp",
    );

    // All 3 vintages must exist independently
    expect(gdp2021Observations.length).toBe(3);
    const values = gdp2021Observations.map((o) => o.value);
    expect(values).toContain(21800000); // Preliminary
    expect(values).toContain(22150000); // Revised
    expect(values).toContain(22420000); // Comprehensive benchmark

    const vintageIds = gdp2021Observations.map((o) => o.provenance.vintageId);
    expect(new Set(vintageIds).size).toBe(3);
  });

  // Test 9: Complete Full Corpus Compilation & Validation
  it("successfully compiles and validates the entire national/regional corpus", () => {
    const compiler = new LocalEconomyCorpusCompiler();

    const beaFiles = fs.readdirSync(BEA_DIR).filter((f) => f.endsWith(".json"));
    for (const f of beaFiles) {
      const raw = JSON.parse(fs.readFileSync(path.join(BEA_DIR, f), "utf-8"));
      compiler.ingest({ provider: "bea_regional", raw: raw.data || raw });
    }

    const qcewFiles = fs
      .readdirSync(QCEW_DIR)
      .filter((f) => f.endsWith(".json"));
    for (const f of qcewFiles) {
      const raw = JSON.parse(fs.readFileSync(path.join(QCEW_DIR, f), "utf-8"));
      compiler.ingest({ provider: "bls_qcew", raw: raw.data || raw });
    }

    const pkg = compiler.compile("2026-08-28T00:00:00.000Z");
    const validation = validateCorpusPackage(pkg);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.totalJurisdictionsChecked).toBeGreaterThanOrEqual(11);
    expect(validation.totalObservationsChecked).toBeGreaterThan(300);
  });

  // Test 10: Analytical & Calibration Seam (LQs, Transfer Dependency, Wage Indices)
  it("calculates accurate Location Quotients and economic structure profiles", () => {
    const corpusPath = path.resolve(
      process.cwd(),
      "data/local_economy_source/corpus/normalized_economy_corpus.json",
    );
    const corpus: NormalizedEconomyCorpusPackage = JSON.parse(
      fs.readFileSync(corpusPath, "utf-8"),
    );
    const engine = new EconomyCorpusQueryEngine(corpus);

    // 1. Fayette County, KY
    const fayetteProfile = engine.buildEconomicStructureProfile({
      geoFips: "21067",
      year: 2022,
    });
    expect(fayetteProfile.totalGdpNominalUsd).toBe(24150000);
    expect(fayetteProfile.totalGdpRealUsd).toBe(20420000);
    expect(fayetteProfile.transferShareOfPersonalIncome).toBeCloseTo(0.1628, 3);
    expect(fayetteProfile.proprietorShareOfJobs).toBeCloseTo(0.1813, 3);

    // Agriculture LQ in Fayette County relative to US (21067 vs 00000)
    const fayetteAgLQ = engine.calculateLocationQuotient({
      geoFips: "21067",
      benchmarkFips: "00000",
      naicsCode: "11",
      year: 2022,
    });
    expect(fayetteAgLQ.status).toBe("valid");
    expect(fayetteAgLQ.locationQuotient).toBeGreaterThan(1.0); // Equine & ag hub concentration

    // 2. Martin County, KY (Appalachian Coal/Transfer Dependent)
    const martinProfile = engine.buildEconomicStructureProfile({
      geoFips: "21159",
      year: 2022,
    });
    expect(martinProfile.transferShareOfPersonalIncome).toBeGreaterThan(0.45); // ~48.7% transfer dependence

    const martinMiningLQ = engine.calculateLocationQuotient({
      geoFips: "21159",
      benchmarkFips: "00000",
      naicsCode: "21",
      year: 2022,
    });
    expect(martinMiningLQ.status).toBe("valid");
    expect(martinMiningLQ.locationQuotient).toBeGreaterThan(30.0); // Extreme mining specialization

    // 3. Wayne County, MI (Manufacturing)
    const wayneMfgLQ = engine.calculateLocationQuotient({
      geoFips: "26163",
      benchmarkFips: "00000",
      naicsCode: "31-33",
      year: 2022,
    });
    expect(wayneMfgLQ.status).toBe("valid");
    expect(wayneMfgLQ.locationQuotient).toBeGreaterThan(1.4); // Automotive manufacturing

    // 4. Santa Clara County, CA (Tech)
    const santaClaraInfoLQ = engine.calculateLocationQuotient({
      geoFips: "06085",
      benchmarkFips: "00000",
      naicsCode: "51",
      year: 2022,
    });
    expect(santaClaraInfoLQ.status).toBe("valid");
    expect(santaClaraInfoLQ.locationQuotient).toBeGreaterThan(4.0); // Tech/Information concentration

    // 5. Midland County, TX (Oil Extraction)
    const midlandMiningLQ = engine.calculateLocationQuotient({
      geoFips: "48329",
      benchmarkFips: "00000",
      naicsCode: "21",
      year: 2022,
    });
    expect(midlandMiningLQ.status).toBe("valid");
    expect(midlandMiningLQ.locationQuotient).toBeGreaterThan(50.0); // Permian basin concentration

    // 6. Real GDP Growth in Fayette County (2020 -> 2023)
    const growth = engine.calculateRealGdpGrowth({
      geoFips: "21067",
      startYear: 2020,
      endYear: 2023,
    });
    expect(growth).not.toBeNull();
    expect(growth?.growthRate).toBeCloseTo(0.1179, 3); // ~11.8% real GDP expansion
  });
});
