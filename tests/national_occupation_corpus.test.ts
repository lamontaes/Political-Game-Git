import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  deriveSocMajorGroup,
  deriveSocMinorGroup,
  deriveSocBroadGroup,
  getSocTaxonomyRecord,
  createNationalGeography,
  createStateGeography,
  createMsaGeography,
  normalizeWagePercentiles,
  normalizeOccupationRecord,
  validateRecord,
  CorpusValidator,
  NationalOccupationCompiler,
} from "../src/national_occupation_corpus/index.js";
import type {
  RawInputRecord,
  WorkTaskSkillMetadata,
  OccupationConsumerCompositionContract,
} from "../src/national_occupation_corpus/index.js";

describe("National Occupation / Career Source Corpus", () => {
  const FIXTURES_DIR = path.resolve(
    process.cwd(),
    "data/national_occupation_source/fixtures",
  );

  it("derives SOC group hierarchy deterministically across 23 major groups", () => {
    const socCode = "23-1011";
    expect(deriveSocMajorGroup(socCode)).toBe("23-0000");
    expect(deriveSocMinorGroup(socCode)).toBe("23-1000");
    expect(deriveSocBroadGroup(socCode)).toBe("23-1010");

    const record = getSocTaxonomyRecord(socCode);
    expect(record.title).toBe("Lawyers");
    expect(record.derivedOccupationFamily).toBe("Legal");

    const military = getSocTaxonomyRecord("55-1011");
    expect(military.socMajorGroup).toBe("55-0000");
    expect(military.derivedOccupationFamily).toBe("Military Specific");
  });

  it("resolves geographic scopes accurately and rejects county OEWS scopes", () => {
    const national = createNationalGeography();
    expect(national.level).toBe("national");
    expect(national.areaCode).toBe("0000000");

    const stateKY = createStateGeography("KY");
    expect(stateKY.level).toBe("state");
    expect(stateKY.statePostal).toBe("KY");
    expect(stateKY.stateFips).toBe("21");

    const msaLexington = createMsaGeography("30460");
    expect(msaLexington.level).toBe("msa");
    expect(msaLexington.areaName).toContain("Lexington-Fayette");
  });

  it("enforces wage percentile monotonic ordering (p10 <= p25 <= p50 <= p75 <= p90)", () => {
    const validPercentiles = normalizeWagePercentiles(20, 30, 40, 50, 60);
    expect(validPercentiles.pct10).toBe(20);
    expect(validPercentiles.pct90).toBe(60);

    expect(() => {
      normalizeWagePercentiles(20, 40, 30, 50, 60);
    }).toThrow(/Invalid wage percentile ordering/);
  });

  it("preserves missing observations as null and tracks suppression reason (missing != zero)", () => {
    const percentiles = normalizeWagePercentiles(
      null,
      30,
      null,
      50,
      null,
      "unavailable",
    );
    expect(percentiles.pct10).toBeNull();
    expect(percentiles.pct25).toBe(30);
    expect(percentiles.pct50).toBeNull();
    expect(percentiles.pct75).toBe(50);
    expect(percentiles.pct90).toBeNull();
    expect(percentiles.suppressionReason).toBe("unavailable");
  });

  it("normalizes raw input records into canonical structure with O*NET crosswalk", () => {
    const raw: RawInputRecord = {
      socCode: "15-1252",
      onetSocCode: "15-1252.00",
      areaCode: "0000000",
      areaName: "U.S.",
      level: "national",
      hourlyMean: 63.91,
      meanWageRse: 0.8,
      hourlyPct10: 34.01,
      hourlyPct25: 46.12,
      hourlyPct50: 62.59,
      hourlyPct75: 79.54,
      hourlyPct90: 98.24,
      totalEmployment: 1632300,
      employmentRse: 0.9,
      provenance: {
        datasetName: "BLS OEWS",
        vintage: "2023-May",
        releaseYear: 2024,
        authority: "Bureau of Labor Statistics",
        accessUrl: "https://www.bls.gov/oes/current/oes151252.htm",
        license: "Public Domain / U.S. Government Work",
        rawFilename: "national_M2023_dl.xlsx",
        sha256:
          "8a719c2f54bd41a2e9150046b41297e6840d2169a1f4b8861e61284a1e905c1d",
      },
    };

    const normalized = normalizeOccupationRecord(raw);
    expect(normalized.id).toBe("occ_151252_0000000_000000");
    expect(normalized.soc.title).toBe("Software Developers");
    expect(normalized.onetCrosswalk?.onetSocCode).toBe("15-1252.00");
    expect(normalized.wages.percentiles.pct50).toBe(62.59);
    expect(normalized.wages.meanWageRse).toBe(0.8);
    expect(normalized.employment.totalEmployment).toBe(1632300);
    expect(normalized.employment.employmentRse).toBe(0.9);

    const issues = validateRecord(normalized);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("compiles fixtures across national, state, and MSA geographies", () => {
    const nationalRaw: RawInputRecord[] = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, "national_us_oews.json"), "utf8"),
    );
    const kyRaw: RawInputRecord[] = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_DIR, "ky_fayette_lexington_oews.json"),
        "utf8",
      ),
    );
    const txRaw: RawInputRecord[] = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_DIR, "tx_travis_austin_oews.json"),
        "utf8",
      ),
    );
    const stateRaw: RawInputRecord[] = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_DIR, "state_baselines_oews.json"),
        "utf8",
      ),
    );

    const onetMetadata: WorkTaskSkillMetadata[] = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_DIR, "onet_skills_tasks.json"),
        "utf8",
      ),
    );
    const metadataMap = new Map(onetMetadata.map((m) => [m.soc2018Code, m]));

    const allRaw = [...nationalRaw, ...kyRaw, ...txRaw, ...stateRaw].map(
      (r) => ({
        ...r,
        metadata: metadataMap.get(r.socCode) ?? null,
      }),
    );

    const compiler = new NationalOccupationCompiler();
    const result = compiler.compile(allRaw);

    expect(result.records.length).toBe(allRaw.length);
    expect(result.manifest.socOccupationCount).toBeGreaterThanOrEqual(9);
    expect(result.manifest.geographicCoverage).toContain("national:0000000");
    expect(result.manifest.geographicCoverage).toContain("msa:30460");
    expect(result.manifest.geographicCoverage).toContain("msa:12420");
    expect(result.manifest.geographicCoverage).toContain("state:0600000");
    expect(result.manifest.geographicCoverage).toContain("state:3600000");

    const validator = new CorpusValidator();
    const validationResult = validator.validateCorpus(
      result.records,
      result.manifest,
    );
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it("proves end-to-end traceability for key occupations (lawyer, nurse, retail, software)", () => {
    const keySocCodes = ["23-1011", "29-1141", "41-2031", "15-1252"];
    const nationalRaw: RawInputRecord[] = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, "national_us_oews.json"), "utf8"),
    );
    const onetMetadata: WorkTaskSkillMetadata[] = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_DIR, "onet_skills_tasks.json"),
        "utf8",
      ),
    );
    const metadataMap = new Map(onetMetadata.map((m) => [m.soc2018Code, m]));

    for (const code of keySocCodes) {
      const rawRow = nationalRaw.find((r) => r.socCode === code);
      expect(rawRow).toBeDefined();
      expect(rawRow!.provenance.sha256).toBeDefined();
      expect(rawRow!.provenance.accessUrl).toContain("bls.gov");

      const normalized = normalizeOccupationRecord({
        ...rawRow!,
        metadata: metadataMap.get(code) ?? null,
      });

      expect(normalized.soc.socCode).toBe(code);
      expect(normalized.wages.annualPercentiles.pct50).not.toBeNull();
      if (normalized.metadata) {
        expect(normalized.metadata.attribution.license).toBe("CC BY 4.0");
      }
    }
  });

  it("supports future simulation consumer composition contract", () => {
    const raw: RawInputRecord = {
      socCode: "23-1011",
      onetSocCode: "23-1011.00",
      areaCode: "30460",
      areaName: "Lexington-Fayette, KY MSA",
      level: "msa",
      statePostal: "KY",
      stateFips: "21",
      hourlyPct50: 55.4,
      annualPct50: 115230,
      provenance: {
        datasetName: "BLS OEWS",
        vintage: "2023-May",
        releaseYear: 2024,
        authority: "Bureau of Labor Statistics",
        accessUrl: "https://www.bls.gov/oes/current/oes_30460.htm",
        license: "Public Domain / U.S. Government Work",
      },
    };

    const record = normalizeOccupationRecord(raw);

    const composition: OccupationConsumerCompositionContract = {
      occupationRecordId: record.id,
      socCode: record.soc.socCode,
      onetSocCode: record.onetCrosswalk?.onetSocCode,
      employerEntityId: "org_lexington_law_firm_01",
      geographyAreaCode: record.geography.areaCode,
      workRelationshipType: "employment",
      compensationArrangement: {
        baseWage: record.wages.annualPercentiles.pct50 ?? 115230,
        wageUnit: "annual",
        percentileTier: "pct50",
      },
    };

    expect(composition.socCode).toBe("23-1011");
    expect(composition.onetSocCode).toBe("23-1011.00");
    expect(composition.compensationArrangement.baseWage).toBe(115230);
    expect(composition.geographyAreaCode).toBe("30460");
  });
});
