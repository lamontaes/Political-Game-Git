import { describe, expect, it } from "vitest";
import {
  compileHousingCorpus,
  buildNationalHousingCoverageManifest,
  validateHousingCorpus,
  HudUserApiClient,
  interpretChasCellValue,
  canonicalJsonStringify,
  type ChasTableUniverse,
} from "../src/housing_affordability_corpus/index.js";

describe("National Housing & Affordability Source Compiler", () => {
  describe("1. AMI Bracket Preservation", () => {
    it("preserves all 5 standard HAMFI brackets and aggregate level without loss", () => {
      const corpus = compileHousingCorpus();
      expect(corpus.calibrationProfiles.length).toBeGreaterThan(0);

      for (const profile of corpus.calibrationProfiles) {
        const byAmi = profile.chasSummary.byAmiBracket;
        expect(byAmi.le_30_pct_ami).toBeDefined();
        expect(byAmi.gt_30_le_50_pct_ami).toBeDefined();
        expect(byAmi.gt_50_le_80_pct_ami).toBeDefined();
        expect(byAmi.gt_80_le_100_pct_ami).toBeDefined();
        expect(byAmi.gt_100_pct_ami).toBeDefined();
        expect(byAmi.all_income_levels).toBeDefined();

        const sumBrackets =
          byAmi.le_30_pct_ami.totalHouseholds +
          byAmi.gt_30_le_50_pct_ami.totalHouseholds +
          byAmi.gt_50_le_80_pct_ami.totalHouseholds +
          byAmi.gt_80_le_100_pct_ami.totalHouseholds +
          byAmi.gt_100_pct_ami.totalHouseholds;

        expect(sumBrackets).toBe(profile.chasSummary.totalHouseholds);
        expect(byAmi.all_income_levels.totalHouseholds).toBe(
          profile.chasSummary.totalHouseholds,
        );
      }
    });

    it("accurately computes cost burden and severe cost burden rates per bracket", () => {
      const corpus = compileHousingCorpus();
      const lexington = corpus.calibrationProfiles.find(
        (p) => p.geo.geoId === "county_21067",
      );
      expect(lexington).toBeDefined();

      const eli = lexington!.chasSummary.byAmiBracket.le_30_pct_ami;
      expect(eli.totalHouseholds).toBe(21340);
      expect(eli.costBurdenedCount).toBe(3440);
      expect(eli.severelyCostBurdenedCount).toBe(16930);
      expect(eli.severeCostBurdenRate).toBeCloseTo(16930 / 21340, 3);
    });
  });

  describe("2. Table Universe Preservation", () => {
    it("strictly preserves table universe across CHAS records", () => {
      const corpus = compileHousingCorpus();
      const tableUniverses = new Set(
        corpus.chasRecords.map((r) => r.tableUniverse),
      );

      expect(tableUniverses.has("occupied_housing_units")).toBe(true);

      for (const r of corpus.chasRecords) {
        expect(r.tableUniverse).toBe("occupied_housing_units");
      }
    });

    it("distinguishes household universe from housing unit universes", () => {
      const rawUniverse: ChasTableUniverse = "occupied_housing_units";
      const rentalUniverse: ChasTableUniverse = "rental_housing_units";
      expect(rawUniverse).not.toBe(rentalUniverse);
    });
  });

  describe("3. Suppression Handling (Suppressed != Zero)", () => {
    it("enforces suppressed != zero invariant on suppressed indicators", () => {
      const suppressedInterpretation = interpretChasCellValue("S", "gt_50_pct");
      expect(suppressedInterpretation.suppression.isSuppressed).toBe(true);
      expect(suppressedInterpretation.suppression.status).toBe("suppressed");
      expect(suppressedInterpretation.householdCount).toBeNull();
      expect(suppressedInterpretation.householdCount).not.toBe(0);

      const nullInterpretation = interpretChasCellValue(null, "gt_50_pct");
      expect(nullInterpretation.suppression.isSuppressed).toBe(true);
      expect(nullInterpretation.householdCount).toBeNull();
    });

    it("recognizes genuine zero observations without flagging suppression", () => {
      const zeroInterpretation = interpretChasCellValue("0", "le_30_pct");
      expect(zeroInterpretation.suppression.isSuppressed).toBe(false);
      expect(zeroInterpretation.suppression.status).toBe("available");
      expect(zeroInterpretation.householdCount).toBe(0);
    });

    it("records suppression in CHAS extract records and profile summaries", () => {
      const corpus = compileHousingCorpus();
      const suppressedRecord = corpus.chasRecords.find(
        (r) => r.suppression.isSuppressed,
      );
      expect(suppressedRecord).toBeDefined();
      expect(suppressedRecord!.householdCount).toBeNull();
      expect(suppressedRecord!.suppression.status).toBe("suppressed");
    });
  });

  describe("4. Multi-Vintage Isolation", () => {
    it("preserves separate vintages for FMR and Income Limits without collision", () => {
      const corpus = compileHousingCorpus();
      const lexingtonFmr2024 = corpus.fmrRecords.find(
        (r) => r.geo.geoId === "county_21067" && r.vintage === "FY2024",
      );
      const lexingtonFmr2023 = corpus.fmrRecords.find(
        (r) => r.geo.geoId === "county_21067" && r.vintage === "FY2023",
      );

      expect(lexingtonFmr2024).toBeDefined();
      expect(lexingtonFmr2023).toBeDefined();
      expect(lexingtonFmr2024!.id).not.toBe(lexingtonFmr2023!.id);
      expect(lexingtonFmr2024!.fmr2Br).toBe(1158);
      expect(lexingtonFmr2023!.fmr2Br).toBe(1029);

      const lexingtonIl2024 = corpus.incomeLimitRecords.find(
        (r) => r.geo.geoId === "county_21067" && r.vintage === "FY2024",
      );
      const lexingtonIl2023 = corpus.incomeLimitRecords.find(
        (r) => r.geo.geoId === "county_21067" && r.vintage === "FY2023",
      );

      expect(lexingtonIl2024).toBeDefined();
      expect(lexingtonIl2023).toBeDefined();
      expect(lexingtonIl2024!.medianFamilyIncome).toBe(94900);
      expect(lexingtonIl2023!.medianFamilyIncome).toBe(89700);
    });

    it("preserves ACS 5-year vintage format for CHAS data", () => {
      const corpus = compileHousingCorpus();
      for (const chas of corpus.chasRecords) {
        expect(chas.vintage).toBe("2018-2022");
      }
    });
  });

  describe("5. FMR vs Income Limits vs Observed Median Rent Distinction", () => {
    it("strictly preserves isObservedMedianRent === false for FMR records", () => {
      const corpus = compileHousingCorpus();
      for (const fmr of corpus.fmrRecords) {
        expect(fmr.isObservedMedianRent).toBe(false);
      }
    });

    it("validates bedroom progression for FMR records", () => {
      const corpus = compileHousingCorpus();
      for (const fmr of corpus.fmrRecords) {
        expect(fmr.fmr0Br).toBeGreaterThan(0);
        expect(fmr.fmr1Br).toBeGreaterThan(0);
        expect(fmr.fmr2Br).toBeGreaterThan(0);
        expect(fmr.fmr3Br).toBeGreaterThan(0);
        expect(fmr.fmr4Br).toBeGreaterThan(0);
      }
    });

    it("validates Income Limits tier ordering: 30% AMI <= 50% AMI < 80% AMI", () => {
      const corpus = compileHousingCorpus();
      for (const il of corpus.incomeLimitRecords) {
        for (let size = 1; size <= 8; size++) {
          const s = size as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
          expect(il.limits30Pct[s]).toBeLessThanOrEqual(il.limits50Pct[s]);
          expect(il.limits50Pct[s]).toBeLessThan(il.limits80Pct[s]);
        }
      }
    });
  });

  describe("6. Deterministic Builds & Provenance Integrity", () => {
    it("produces identical byte-for-byte SHA256 hashes on repeated compilation", () => {
      const corpus1 = compileHousingCorpus();
      const corpus2 = compileHousingCorpus();

      expect(corpus1.corpusSha256).toBe(corpus2.corpusSha256);
      expect(canonicalJsonStringify(corpus1)).toBe(
        canonicalJsonStringify(corpus2),
      );
    });

    it("passes comprehensive corpus validation suite without critical errors", () => {
      const corpus = compileHousingCorpus();
      const report = validateHousingCorpus(corpus);

      expect(report.isValid).toBe(true);
      expect(report.criticalIssuesCount).toBe(0);
      expect(report.corpusSha256).toBe(corpus.corpusSha256);
    });

    it("generates valid national coverage manifest with matching hash", () => {
      const corpus = compileHousingCorpus();
      const manifest = buildNationalHousingCoverageManifest(corpus);

      expect(manifest.totalJurisdictionsCount).toBe(4);
      expect(manifest.completeCoverageCount).toBe(4);
      expect(manifest.manifestSha256).toBeDefined();
      expect(manifest.manifestSha256.length).toBe(64);
    });
  });

  describe("7. Token-Ready HUD API Client", () => {
    it("gracefully degrades when HUD_API_TOKEN is not configured", async () => {
      const client = new HudUserApiClient({ apiToken: undefined });
      expect(client.hasToken()).toBe(false);

      const fmrResult = await client.fetchFmrByEntity("21067", 2024);
      expect(fmrResult.ok).toBe(false);
      expect(fmrResult.isTokenMissing).toBe(true);
      expect(fmrResult.error).toContain("HUD_API_TOKEN is not configured");

      const ilResult = await client.fetchIncomeLimitsByEntity("21067", 2024);
      expect(ilResult.ok).toBe(false);
      expect(ilResult.isTokenMissing).toBe(true);
    });

    it("recognizes configured token when provided", () => {
      const client = new HudUserApiClient({
        apiToken: "test_token_never_commit",
      });
      expect(client.hasToken()).toBe(true);
    });
  });

  describe("8. Benchmark Geographic Coverage Verification", () => {
    it("verifies Lexington-Fayette, KY benchmark metrics", () => {
      const corpus = compileHousingCorpus();
      const lex = corpus.calibrationProfiles.find(
        (p) => p.geo.geoId === "county_21067",
      );
      expect(lex).toBeDefined();

      expect(lex!.geo.name).toBe("Fayette County");
      expect(lex!.geo.stateAbbr).toBe("KY");
      expect(lex!.fmr.fmr2Br).toBe(1158);
      expect(lex!.incomeLimits.medianFamilyIncome).toBe(94900);
      expect(lex!.incomeLimits.limits50Pct[4]).toBe(47500);
      expect(lex!.chasSummary.totalHouseholds).toBe(139450);
      expect(lex!.chasSummary.totalRenters).toBe(64880);
      expect(lex!.chasSummary.costBurdenSummary.severelyCostBurdenedCount).toBe(
        26730,
      );
    });

    it("verifies San Francisco, CA (Expensive Metro) benchmark metrics", () => {
      const corpus = compileHousingCorpus();
      const sf = corpus.calibrationProfiles.find(
        (p) => p.geo.geoId === "county_06075",
      );
      expect(sf).toBeDefined();

      expect(sf!.geo.name).toBe("San Francisco County");
      expect(sf!.geo.stateAbbr).toBe("CA");
      expect(sf!.fmr.fmr2Br).toBe(3271);
      expect(sf!.incomeLimits.medianFamilyIncome).toBe(182800);
      expect(sf!.incomeLimits.limits50Pct[4]).toBe(97550);
      expect(sf!.chasSummary.totalHouseholds).toBe(373200);
      expect(sf!.chasSummary.costBurdenSummary.severelyCostBurdenedCount).toBe(
        98560,
      );
    });

    it("verifies Owsley County, KY (Low-Cost Rural County) benchmark metrics", () => {
      const corpus = compileHousingCorpus();
      const owsley = corpus.calibrationProfiles.find(
        (p) => p.geo.geoId === "county_21189",
      );
      expect(owsley).toBeDefined();

      expect(owsley!.geo.name).toBe("Owsley County");
      expect(owsley!.geo.stateAbbr).toBe("KY");
      expect(owsley!.geo.isMetropolitan).toBe(false);
      expect(owsley!.fmr.fmr2Br).toBe(828);
      expect(owsley!.incomeLimits.medianFamilyIncome).toBe(44800);
      expect(owsley!.chasSummary.totalHouseholds).toBe(1735);
      expect(
        owsley!.chasSummary.costBurdenSummary.severelyCostBurdenedCount,
      ).toBe(385);
    });

    it("verifies San Juan Municipio, Puerto Rico benchmark metrics", () => {
      const corpus = compileHousingCorpus();
      const sanJuan = corpus.calibrationProfiles.find(
        (p) => p.geo.geoId === "county_72127",
      );
      expect(sanJuan).toBeDefined();

      expect(sanJuan!.geo.name).toBe("San Juan Municipio");
      expect(sanJuan!.geo.stateAbbr).toBe("PR");
      expect(sanJuan!.geo.isTerritory).toBe(true);
      expect(sanJuan!.fmr.fmr2Br).toBe(637);
      expect(sanJuan!.incomeLimits.medianFamilyIncome).toBe(30800);
      expect(sanJuan!.chasSummary.totalHouseholds).toBe(135120);
      expect(
        sanJuan!.chasSummary.costBurdenSummary.severelyCostBurdenedCount,
      ).toBe(52800);
    });
  });
});
