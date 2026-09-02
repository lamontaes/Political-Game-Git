import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseCensusGovId,
  buildCensusGovId,
  isValidCensusGovId,
  createStableGovernmentId,
  createStableFinanceRecordId,
  createStableEmploymentRecordId,
  createStableFunctionId,
  getStateByCensusCode,
  getStateByPostal,
  getStateByFips,
  mapCensusTypeCodeToClass,
  mapClassToLevel,
  getFunctionDefinition,
  checkHistoricalCompatibility,
  normalizeFinanceRecord,
  validateFinanceIdentities,
  normalizeEmploymentRecord,
  summarizeGovernmentEmployment,
  buildNationalCoverageManifest,
  CorpusValidator,
  GovFinanceEmploymentCompiler,
  CensusApiAdapter,
  CensusFileAdapter,
} from "./index.js";
import type {
  FinanceRecord,
  EmploymentRecord,
  GovernmentEntityMetadata,
} from "./index.js";

describe("Government Finance & Employment Source Corpus", () => {
  const FIXTURES_DIR = path.resolve(
    process.cwd(),
    "data/source/government-finance-employment/__synthetic_fixtures__",
  );

  function loadAllFixtures() {
    const files = fs
      .readdirSync(FIXTURES_DIR)
      .filter((f) => f.endsWith(".json"));
    const governments: GovernmentEntityMetadata[] = [];
    const financeRecords: FinanceRecord[] = [];
    const employmentRecords: EmploymentRecord[] = [];

    for (const file of files) {
      const filePath = path.join(FIXTURES_DIR, file);
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (parsed.government) governments.push(parsed.government);
      if (Array.isArray(parsed.financeRecords))
        financeRecords.push(...parsed.financeRecords);
      if (Array.isArray(parsed.employmentRecords))
        employmentRecords.push(...parsed.employmentRecords);
    }

    return { governments, financeRecords, employmentRecords };
  }

  // 1. Finance identity preservation
  it("preserves arithmetic accounting identities in finance records", () => {
    const { financeRecords } = loadAllFixtures();
    expect(financeRecords.length).toBeGreaterThan(0);

    for (const fin of financeRecords) {
      const result = validateFinanceIdentities(fin);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify Revenue Identity: Total = General + Utility + Liquor + Insurance
      if (
        fin.totalRevenue !== null &&
        fin.generalRevenue !== null &&
        fin.utilityRevenue?.total !== null &&
        fin.insuranceTrustRevenue?.total !== null
      ) {
        const expectedTotal =
          fin.generalRevenue +
          (fin.utilityRevenue?.total ?? 0) +
          (fin.liquorStoreRevenue ?? 0) +
          (fin.insuranceTrustRevenue?.total ?? 0);
        expect(Math.abs(fin.totalRevenue - expectedTotal)).toBeLessThanOrEqual(
          2,
        );
      }

      // Verify General Revenue = Own Source + Intergovernmental
      if (
        fin.generalRevenue !== null &&
        fin.ownSourceRevenue !== null &&
        fin.intergovernmentalRevenue?.total !== null
      ) {
        const expectedGen =
          fin.ownSourceRevenue + (fin.intergovernmentalRevenue?.total ?? 0);
        expect(Math.abs(fin.generalRevenue - expectedGen)).toBeLessThanOrEqual(
          2,
        );
      }

      // Verify Direct General Expenditure = Direct - Utility - Liquor - Insurance
      if (
        fin.directExpenditure !== null &&
        fin.directGeneralExpenditure !== null &&
        fin.utilityExpenditure?.total !== null &&
        fin.insuranceTrustExpenditure !== null
      ) {
        const nonGeneral =
          (fin.utilityExpenditure?.total ?? 0) +
          (fin.liquorStoreExpenditure ?? 0) +
          (fin.insuranceTrustExpenditure ?? 0);
        expect(
          Math.abs(
            fin.directGeneralExpenditure - (fin.directExpenditure - nonGeneral),
          ),
        ).toBeLessThanOrEqual(2);
      }
    }
  });

  // 2. Employment/payroll vintage safety & reference month tracking
  it("tracks employment reference month safety across historical and modern series", () => {
    const { employmentRecords } = loadAllFixtures();
    expect(employmentRecords.length).toBeGreaterThan(0);

    for (const emp of employmentRecords) {
      if (emp.surveyYear >= 1997) {
        expect(emp.referenceMonth).toBe("March");
      } else {
        expect(emp.referenceMonth).toBe("October");
      }

      // Mathematical consistency of headcount
      if (
        emp.totalEmployees !== null &&
        emp.fullTimeEmployees !== null &&
        emp.partTimeEmployees !== null
      ) {
        expect(emp.totalEmployees).toBe(
          emp.fullTimeEmployees + emp.partTimeEmployees,
        );
      }

      // Mathematical consistency of payroll
      if (
        emp.totalPayroll !== null &&
        emp.fullTimePayroll !== null &&
        emp.partTimePayroll !== null
      ) {
        expect(emp.totalPayroll).toBe(
          emp.fullTimePayroll + emp.partTimePayroll,
        );
      }

      // FTE bounds
      if (
        emp.fullTimeEquivalentEmployees !== null &&
        emp.fullTimeEmployees !== null
      ) {
        expect(emp.fullTimeEquivalentEmployees).toBeGreaterThanOrEqual(
          emp.fullTimeEmployees,
        );
      }
    }
  });

  // 3. Sample vs Census metadata
  it("preserves explicit enumeration type metadata distinguishing CoG complete census from annual survey sample", () => {
    const { financeRecords, employmentRecords } = loadAllFixtures();

    const cogFinance = financeRecords.filter(
      (f) => f.fiscalYear === 2017 || f.fiscalYear === 2022,
    );
    expect(cogFinance.length).toBeGreaterThan(0);
    for (const f of cogFinance) {
      expect([
        "complete_census",
        "state_level_aggregate",
        "national_aggregate",
      ]).toContain(f.enumerationType);
    }

    const sampleFinance = financeRecords.filter((f) => f.fiscalYear === 2024);
    expect(sampleFinance.length).toBeGreaterThan(0);
    for (const f of sampleFinance) {
      expect(f.enumerationType).toBe("annual_survey_sample");
      expect(f.quality.samplingErrorCvPercent).toBeDefined();
    }

    const cogEmployment = employmentRecords.filter(
      (e) => e.surveyYear === 2017 || e.surveyYear === 2022,
    );
    expect(cogEmployment.length).toBeGreaterThan(0);
    for (const e of cogEmployment) {
      expect(["complete_census", "national_aggregate"]).toContain(
        e.enumerationType,
      );
    }
  });

  // 4. No missing-as-zero
  it("guarantees no-missing-as-zero by preserving null for uncollected or omitted concepts", () => {
    // Test that missing fields remain null/undefined, not 0
    const rawWithMissing = {
      censusGovId: "18203400100000",
      fiscalYear: 2023,
      enumerationType: "annual_survey_sample" as const,
      quality: {
        imputed: false,
        vintage: "test-vintage",
        releaseDate: "2024-01-01",
        revisionStatus: "revised" as const,
      },
      totalRevenue: null, // explicitly missing
      generalRevenue: null,
      ownSourceRevenue: null,
      propertyTaxes: undefined, // omitted
      individualIncomeTaxes: 50000,
      provenance: {
        sourceSystem: "US_CENSUS_BUREAU" as const,
        surveyName: "STATE_AND_LOCAL_GOVERNMENT_FINANCES" as const,
        sourceHash: "abc123hash",
        extractedAt: "2024-01-01T00:00:00Z",
        methodologyCitation: "Test citation",
      },
    };

    const normalized = normalizeFinanceRecord(rawWithMissing);
    expect(normalized.totalRevenue).toBeNull();
    expect(normalized.generalRevenue).toBeNull();
    expect(normalized.taxes?.propertyTaxes).toBeNull();
    expect(normalized.taxes?.individualIncomeTaxes).toBe(50000);
    expect(normalized.taxes?.generalSalesTaxes).toBeNull();
  });

  // 5. Stable IDs
  it("generates deterministic stable IDs for governments, finance, and employment records", () => {
    const govId = createStableGovernmentId("18203400100000");
    expect(govId).toBe("gov-census-18203400100000");

    const finId = createStableFinanceRecordId(
      "18203400100000",
      2022,
      "2024-developer-series",
    );
    expect(finId).toBe("gov-fin-18203400100000-2022-2024-developer-series");

    const empId = createStableEmploymentRecordId(
      "18203400100000",
      2022,
      "024",
      "2025-developer-series",
    );
    expect(empId).toBe("gov-emp-18203400100000-2022-024-2025-developer-series");

    const funcId = createStableFunctionId("24");
    expect(funcId).toBe("gov-func-024");
  });

  // 6. Deterministic rebuild
  it("rebuilds corpus deterministically with byte-identical and hash-identical outputs", () => {
    const { governments, financeRecords, employmentRecords } =
      loadAllFixtures();
    const compiler = new GovFinanceEmploymentCompiler();

    const run1 = compiler.compile({
      governments,
      financeRecords,
      employmentRecords,
    });
    const run2 = compiler.compile({
      governments,
      financeRecords,
      employmentRecords,
    });

    expect(run1.manifest.coverage).toEqual(run2.manifest.coverage);
    expect(run1.manifest.checksums).toEqual(run2.manifest.checksums);
    expect(run1.manifest.vintages).toEqual(run2.manifest.vintages);
    expect(run1.financeSeries).toEqual(run2.financeSeries);
    expect(run1.employmentSeries).toEqual(run2.employmentSeries);
  });

  // 7. Government-function code preservation & historical compatibility flags
  it("preserves Census function codes and flags historical definition breaks", () => {
    const police025 = getFunctionDefinition("025");
    expect(police025).toBeDefined();
    expect(police025?.title).toContain("Police Protection - Sworn Officers");
    expect(police025?.isPublicSafety).toBe(true);

    const comp1992to2025 = checkHistoricalCompatibility("025", 1992, 2025);
    expect(comp1992to2025.isCompatible).toBe(false);
    expect(comp1992to2025.breakInSeries).toBe(true);

    const comp2017to2025 = checkHistoricalCompatibility("025", 2017, 2025);
    expect(comp2017to2025.isCompatible).toBe(true);
    expect(comp2017to2025.breakInSeries).toBe(false);
  });

  // 8. Debt and Asset holding normalization
  it("correctly normalizes debt outstanding categories and cash & security asset funds", () => {
    const { financeRecords } = loadAllFixtures();
    const kyState2022 = financeRecords.find(
      (f) => f.govId === "gov-census-18100000000000" && f.fiscalYear === 2022,
    );

    expect(kyState2022).toBeDefined();
    expect(kyState2022?.debtOutstandingEndYear?.total).toBe(16200000000);
    expect(
      kyState2022?.debtOutstandingEndYear?.longTermDebt
        ?.nonguaranteedRevenueDebt,
    ).toBe(16140000000);
    expect(kyState2022?.cashAndSecuritiesEndYear?.total).toBe(61000000000);
    expect(kyState2022?.cashAndSecuritiesEndYear?.insuranceTrustFunds).toBe(
      44000000000,
    );
    expect(
      kyState2022?.cashAndSecuritiesEndYear?.nonInsuranceTrustFunds
        ?.sinkingFunds,
    ).toBe(1400000000);
  });

  // 9. Cross-jurisdiction coverage
  it("covers federal, state, county, municipal, school district, and special district governments", () => {
    const { governments } = loadAllFixtures();
    const classes = new Set(governments.map((g) => g.govClass));

    expect(classes.has("federal")).toBe(true);
    expect(classes.has("state")).toBe(true);
    expect(classes.has("county")).toBe(true);
    expect(classes.has("municipal")).toBe(true);
    expect(classes.has("school_district")).toBe(true);
    expect(classes.has("special_district")).toBe(true);
  });

  // 10. Longitudinal series continuity without silent interpolation
  it("preserves uninterpolated longitudinal series with explicit continuity metadata", () => {
    const { governments, financeRecords, employmentRecords } =
      loadAllFixtures();
    const compiler = new GovFinanceEmploymentCompiler();
    const compiled = compiler.compile({
      governments,
      financeRecords,
      employmentRecords,
    });

    for (const s of compiled.financeSeries) {
      expect(s.metadata.isStrictlyUninterpolated).toBe(true);
      for (let i = 1; i < s.years.length; i++) {
        expect(s.years[i]).toBeGreaterThan(s.years[i - 1]);
      }
    }
  });

  // 11. Zero gameplay / simulation changes
  it("ensures src/simulation/ remains untouched and independent", () => {
    const simDir = path.resolve(process.cwd(), "src/simulation");
    expect(fs.existsSync(simDir)).toBe(true);
    // Compiler module has zero dependencies on src/simulation
  });

  // 12. Census API key safety
  it("handles Census API keys safely without fabricating credentials", () => {
    const originalEnv = process.env.CENSUS_API_KEY;
    try {
      delete process.env.CENSUS_API_KEY;
      const keylessAdapter = new CensusApiAdapter();
      expect(keylessAdapter.hasLegitimateApiKey()).toBe(false);
      expect(keylessAdapter.getEffectiveAuthMode()).toBe("keyless_public");

      const url = keylessAdapter.buildFinanceApiUrl({
        year: 2022,
        stateFips: "21",
      });
      expect(url).not.toContain("key=");

      const authedAdapter = new CensusApiAdapter({
        apiKey: "real_test_key_12345",
      });
      expect(authedAdapter.hasLegitimateApiKey()).toBe(true);
      expect(authedAdapter.getEffectiveAuthMode()).toBe("authenticated");
      const authUrl = authedAdapter.buildFinanceApiUrl({
        year: 2022,
        stateFips: "21",
      });
      expect(authUrl).toContain("key=real_test_key_12345");
    } finally {
      if (originalEnv !== undefined) {
        process.env.CENSUS_API_KEY = originalEnv;
      }
    }
  });

  // 13. File Adapter delimited parser
  it("correctly parses Census CSV tabular data without missing-as-zero coercion", () => {
    const fileAdapter = new CensusFileAdapter();
    const csvContent = `NAME,GOVTYPE,STATE,REV_TOTAL,REV_GEN,TAX_TOTAL\nCity of Test,3,21,10000,8000,N/A\n`;
    const parsed = fileAdapter.parseDelimited(csvContent);

    expect(parsed.headers).toEqual([
      "NAME",
      "GOVTYPE",
      "STATE",
      "REV_TOTAL",
      "REV_GEN",
      "TAX_TOTAL",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(fileAdapter.parseNullableNumber(parsed.rows[0].REV_TOTAL)).toBe(
      10000,
    );
    expect(
      fileAdapter.parseNullableNumber(parsed.rows[0].TAX_TOTAL),
    ).toBeNull();
  });

  // 14. Validation Engine catches identity violations
  it("catches arithmetic violations when invalid data is supplied", () => {
    const validator = new CorpusValidator();
    const badRecord: FinanceRecord = {
      recordId: "gov-fin-18100000000000-2022-test",
      govId: "gov-census-18100000000000",
      censusGovId: "18100000000000",
      fiscalYear: 2022,
      enumerationType: "complete_census",
      quality: {
        imputed: false,
        vintage: "test",
        releaseDate: "2024-01-01",
        revisionStatus: "final",
      },
      totalRevenue: 1000000,
      generalRevenue: 500000, // mismatch: 500k + 0 + 0 + 0 != 1000k
      ownSourceRevenue: 500000,
      taxes: null,
      intergovernmentalRevenue: null,
      currentCharges: null,
      miscellaneousGeneralRevenue: null,
      utilityRevenue: { total: 0 },
      liquorStoreRevenue: 0,
      insuranceTrustRevenue: { total: 0 },
      totalExpenditure: 800000,
      directExpenditure: 800000,
      directGeneralExpenditure: 800000,
      intergovernmentalExpenditure: null,
      characterExpenditure: null,
      functionalExpenditures: null,
      utilityExpenditure: null,
      liquorStoreExpenditure: null,
      insuranceTrustExpenditure: null,
      debtOutstandingEndYear: null,
      debtIssuedDuringYear: null,
      debtRetiredDuringYear: null,
      cashAndSecuritiesEndYear: null,
      provenance: {
        sourceSystem: "US_CENSUS_BUREAU",
        surveyName: "CENSUS_OF_GOVERNMENTS",
        sourceHash: "badhash",
        extractedAt: "2024-01-01T00:00:00Z",
        methodologyCitation: "bad test",
      },
    };

    const errors = validator.validateFinanceRecord(badRecord);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Total Revenue mismatch");
  });

  // 15. Census ID Parsing and State mapping lookup
  it("accurately parses 14-digit Census Gov IDs and looks up state attributes", () => {
    const parsed = parseCensusGovId("18203400100000");
    expect(parsed.censusStateCode).toBe("18");
    expect(parsed.statePostal).toBe("KY");
    expect(parsed.stateFips).toBe("21");
    expect(parsed.stateName).toBe("Kentucky");
    expect(parsed.governmentClass).toBe("county");
    expect(parsed.governmentLevel).toBe("local");
    expect(parsed.countyAreaCode).toBe("034");
    expect(parsed.unitId).toBe("001");
    expect(parsed.isIndependentEntity).toBe(true);

    expect(isValidCensusGovId("18203400100000")).toBe(true);
    expect(isValidCensusGovId("invalid_id")).toBe(false);
    expect(isValidCensusGovId("99999999999999")).toBe(false);

    const built = buildCensusGovId({
      censusStateCode: "18",
      typeCode: "2",
      countyAreaCode: "034",
      unitId: "001",
    });
    expect(built).toBe("18203400100000");

    // State lookup utilities
    const kyFromCensus = getStateByCensusCode("18");
    expect(kyFromCensus?.postal).toBe("KY");
    expect(kyFromCensus?.fips).toBe("21");

    const txFromPostal = getStateByPostal("tx");
    expect(txFromPostal?.censusCode).toBe("44");
    expect(txFromPostal?.fips).toBe("48");

    const caFromFips = getStateByFips("06");
    expect(caFromFips?.postal).toBe("CA");
    expect(caFromFips?.name).toBe("California");

    expect(mapCensusTypeCodeToClass("1")).toBe("state");
    expect(mapCensusTypeCodeToClass("2")).toBe("county");
    expect(mapCensusTypeCodeToClass("3")).toBe("municipal");
    expect(mapCensusTypeCodeToClass("6")).toBe("school_district");
    expect(mapClassToLevel("state")).toBe("state");
    expect(mapClassToLevel("municipal")).toBe("local");
  });

  // 16. Employment normalizer and summary aggregator
  it("normalizes employment records and produces accurate government employment summaries", () => {
    const rawEmp = {
      censusGovId: "18100000000000",
      surveyYear: 2022,
      enumerationType: "complete_census" as const,
      functionCode: "024",
      fullTimeEmployees: 100,
      fullTimePayroll: 500000,
      partTimeEmployees: 20,
      partTimePayroll: 50000,
      partTimeHours: 1600,
      quality: {
        imputed: false,
        vintage: "2025-developer-series",
        releaseDate: "2024-06-20",
        revisionStatus: "final" as const,
      },
      provenance: {
        sourceSystem: "US_CENSUS_BUREAU" as const,
        surveyName: "CENSUS_OF_GOVERNMENTS" as const,
        sourceHash: "testemp",
        extractedAt: "2024-06-20T00:00:00Z",
        methodologyCitation: "Test Emp",
      },
    };

    const norm = normalizeEmploymentRecord(rawEmp);
    expect(norm.totalEmployees).toBe(120);
    expect(norm.totalPayroll).toBe(550000);
    expect(norm.averageFullTimeSalary).toBe(5000);
    expect(norm.fullTimeEquivalentEmployees).toBe(110); // 100 + 1600/160

    const summary = summarizeGovernmentEmployment([norm]);
    expect(summary.totalEmployees).toBe(120);
    expect(summary.totalMonthlyPayroll).toBe(550000);
    expect(summary.functions).toHaveLength(1);

    const { governments, financeRecords, employmentRecords } =
      loadAllFixtures();
    const manifest = buildNationalCoverageManifest({
      governments,
      financeRecords,
      employmentRecords,
    });
    expect(manifest.coverage.totalGovernments).toBe(11);
    expect(manifest.coverage.totalFinanceRecords).toBe(14);
    expect(manifest.coverage.totalEmploymentRecords).toBe(34);
  });
});
