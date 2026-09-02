/**
 * Tests for Official BLS LAUS Local Area Unemployment Statistics Corpus
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBriefingCard,
  compileCorpus,
  getAreaByCode,
  getAreaByFips,
  parseAreaFile,
  parseAreaTypeFile,
  parseDataFile,
  parseFootnoteFile,
  parseMeasureFile,
  parseSeriesFile,
  queryCorpus,
  reconcilePeriodGroup,
} from "../src/laus_corpus/index";
import type {
  LausObservation,
  LausQueryResult,
} from "../src/laus_corpus/types";

const REPO_ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(REPO_ROOT, "data/laus/raw");
const COMPILED_PATH = path.join(
  REPO_ROOT,
  "data/laus/compiled/laus-compiled-corpus.json",
);

function loadRaw(filename: string): string {
  return fs.readFileSync(path.join(RAW_DIR, filename), "utf-8");
}

describe("BLS LAUS Local Unemployment Corpus", () => {
  describe("Official Schema Parsing", () => {
    it("parses area types accurately", () => {
      const raw = loadRaw("la.area_type");
      const types = parseAreaTypeFile(raw);
      expect(types["A"]).toBe("Statewide");
      expect(types["F"]).toBe("Counties and equivalents");
      expect(types["B"]).toBe("Metropolitan areas");
    });

    it("parses measures accurately", () => {
      const raw = loadRaw("la.measure");
      const measures = parseMeasureFile(raw);
      expect(measures["03"]).toBe("unemployment rate");
      expect(measures["04"]).toBe("unemployment");
      expect(measures["05"]).toBe("employment");
      expect(measures["06"]).toBe("labor force");
    });

    it("parses footnotes accurately", () => {
      const raw = loadRaw("la.footnote");
      const footnotes = parseFootnoteFile(raw);
      expect(footnotes["P"]).toBe("Preliminary.");
      expect(footnotes["N"]).toBe("Not available.");
    });

    it("parses area records and extracts state/county FIPS codes", () => {
      const raw = loadRaw("la.area");
      const areas = parseAreaFile(raw);
      expect(areas.length).toBeGreaterThan(0);

      const alabamaState = areas.find((a) => a.areaCode === "ST0100000000000");
      expect(alabamaState).toBeDefined();
      expect(alabamaState?.areaText).toBe("Alabama");
      expect(alabamaState?.areaTypeCode).toBe("A");
      expect(alabamaState?.stateFips).toBe("01");
      expect(alabamaState?.countyFips).toBeNull();

      const autaugaCounty = areas.find((a) => a.areaCode === "CN0100100000000");
      expect(autaugaCounty).toBeDefined();
      expect(autaugaCounty?.areaText).toBe("Autauga County, AL");
      expect(autaugaCounty?.areaTypeCode).toBe("F");
      expect(autaugaCounty?.stateFips).toBe("01");
      expect(autaugaCounty?.countyFips).toBe("01001");
    });

    it("parses series records and seasonal indicators", () => {
      const raw = loadRaw("la.series");
      const seriesList = parseSeriesFile(raw);
      expect(seriesList.length).toBeGreaterThan(0);

      const sampleSeries = seriesList[0];
      expect(sampleSeries.seriesId).toBeDefined();
      expect(sampleSeries.areaCode).toBeDefined();
      expect(sampleSeries.measureCode).toBeDefined();
      expect(["S", "U"]).toContain(sampleSeries.seasonal);
    });
  });

  describe("Geography & Time Identity Invariants", () => {
    it("correctly identifies state and county FIPS via query API", () => {
      const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf-8"));
      const stateArea = getAreaByFips(compiled, "01");
      expect(stateArea).not.toBeNull();
      expect(stateArea?.areaText).toBe("Alabama");

      const countyArea = getAreaByFips(compiled, "01001");
      expect(countyArea).not.toBeNull();
      expect(countyArea?.areaText).toBe("Autauga County, AL");

      const areaByCode = getAreaByCode(compiled, "ST0100000000000");
      expect(areaByCode).not.toBeNull();
      expect(areaByCode?.areaText).toBe("Alabama");
    });

    it("queries observations accurately by year, period, and seasonal status", () => {
      const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf-8"));
      const result: LausQueryResult = queryCorpus(compiled, {
        areaCode: "CN0100100000000",
        year: 1990,
        period: "M01",
        seasonal: "U",
      });

      expect(result.totalMatchedObservations).toBeGreaterThan(0);
      expect(result.observations[0].periodName).toBe("January");
      expect(result.observations[0].year).toBe(1990);
    });
  });

  describe("Known Published Examples", () => {
    it("matches exact published figures for Autauga County, AL (1990)", () => {
      const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf-8"));
      const result = queryCorpus(compiled, {
        areaCode: "CN0100100000000",
        year: 1990,
        period: "M01",
        measureCode: "03",
      });

      expect(result.observations.length).toBe(1);
      const obs = result.observations[0];
      expect(obs.value).toBe(6.5);
      expect(obs.status).toBe("FINAL");
    });
  });

  describe("Missing & Preliminary Semantics", () => {
    it("never coerces missing or suppressed values to numeric zero", () => {
      const sampleData = `series_id\tyear\tperiod\tvalue\tfootnote_codes
LAUCN010010000000003\t2025\tM10\t-\tN
LAUCN010010000000003\t2025\tM11\t\t
LAUCN010010000000003\t2025\tM12\t5.2\tP`;

      const obsList = parseDataFile(sampleData, undefined, {
        N: "Not available.",
        P: "Preliminary.",
      });
      expect(obsList).toHaveLength(3);

      // Missing/Suppressed
      expect(obsList[0].value).toBeNull();
      expect(obsList[0].status).toBe("SUPPRESSED");
      expect(obsList[0].value).not.toBe(0);

      // Empty missing
      expect(obsList[1].value).toBeNull();
      expect(obsList[1].status).toBe("MISSING");
      expect(obsList[1].value).not.toBe(0);

      // Preliminary
      expect(obsList[2].value).toBe(5.2);
      expect(obsList[2].status).toBe("PRELIMINARY");
    });
  });

  describe("Rate & Count Reconciliation", () => {
    it("reconciles rate = (unemployment / labor_force) * 100 within official BLS rounding limits", () => {
      const sampleObs: LausObservation[] = [
        {
          seriesId: "LAUCN010010000000006",
          areaCode: "CN0100100000000",
          areaTypeCode: "F",
          measureCode: "06", // Labor Force
          seasonal: "U",
          year: 2024,
          period: "M01",
          periodName: "January",
          value: 26000,
          status: "FINAL",
          footnoteCodes: [],
          footnoteTexts: [],
        },
        {
          seriesId: "LAUCN010010000000005",
          areaCode: "CN0100100000000",
          areaTypeCode: "F",
          measureCode: "05", // Employment
          seasonal: "U",
          year: 2024,
          period: "M01",
          periodName: "January",
          value: 25100,
          status: "FINAL",
          footnoteCodes: [],
          footnoteTexts: [],
        },
        {
          seriesId: "LAUCN010010000000004",
          areaCode: "CN0100100000000",
          areaTypeCode: "F",
          measureCode: "04", // Unemployment
          seasonal: "U",
          year: 2024,
          period: "M01",
          periodName: "January",
          value: 900,
          status: "FINAL",
          footnoteCodes: [],
          footnoteTexts: [],
        },
        {
          seriesId: "LAUCN010010000000003",
          areaCode: "CN0100100000000",
          areaTypeCode: "F",
          measureCode: "03", // Published Rate
          seasonal: "U",
          year: 2024,
          period: "M01",
          periodName: "January",
          value: 3.5, // (900 / 26000) * 100 = 3.4615... -> 3.5%
          status: "FINAL",
          footnoteCodes: [],
          footnoteTexts: [],
        },
      ];

      const recon = reconcilePeriodGroup(
        "CN0100100000000",
        2024,
        "M01",
        "U",
        sampleObs,
      );
      expect(recon.calculatedRate).toBe(3.5);
      expect(recon.publishedRate).toBe(3.5);
      expect(recon.rateDifference).toBe(0);
      expect(recon.countsSumCheck.matches).toBe(true);
      expect(recon.isReconciled).toBe(true);
    });
  });

  describe("Deterministic Recompilation", () => {
    it("produces identical compiled JSON output byte-for-byte on recompilation", () => {
      const rawFiles = {
        areaType: loadRaw("la.area_type"),
        measure: loadRaw("la.measure"),
        footnote: loadRaw("la.footnote"),
        area: loadRaw("la.area"),
        series: loadRaw("la.series"),
        data: loadRaw("la.data.sample"),
      };

      const compiled1 = compileCorpus(rawFiles, {
        blsReleaseVintage: "2026-08",
      });
      const compiled2 = compileCorpus(rawFiles, {
        blsReleaseVintage: "2026-08",
      });

      // Override dynamic timestamps for byte equality
      compiled1.manifest.compiledAt = "2026-09-02T00:00:00.000Z";
      compiled2.manifest.compiledAt = "2026-09-02T00:00:00.000Z";

      expect(JSON.stringify(compiled1)).toBe(JSON.stringify(compiled2));
    });
  });

  describe("Isolation Guards & Boundary Rules", () => {
    it("has zero file path collisions with Packet 2 OEWS/SOC paths", () => {
      const forbiddenPaths = ["src/oews_soc", "scripts/oews-soc", "data/oews"];
      for (const p of forbiddenPaths) {
        expect(fs.existsSync(path.join(REPO_ROOT, p))).toBe(false);
      }
    });

    it("has zero imports from gameplay simulation or approval engines", () => {
      const filesToCheck = [
        "src/laus_corpus/types.ts",
        "src/laus_corpus/parser.ts",
        "src/laus_corpus/reconciliation.ts",
        "src/laus_corpus/compiler.ts",
        "src/laus_corpus/query.ts",
        "src/laus_corpus/briefing_adapter.ts",
        "src/laus_corpus/index.ts",
      ];

      for (const fileRel of filesToCheck) {
        const fullPath = path.join(REPO_ROOT, fileRel);
        const code = fs.readFileSync(fullPath, "utf-8");
        expect(code).not.toContain("../simulation/");
        expect(code).not.toContain("../player/");
        expect(code).not.toContain("approval");
        expect(code).not.toContain("election");
      }
    });
  });

  describe("Dynamic Briefing Screen Adapter", () => {
    it("builds a structured briefing card model without baking text into visual art", () => {
      const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf-8"));
      const card = buildBriefingCard(
        compiled,
        "CN0100100000000",
        1990,
        "M01",
        "U",
      );

      expect(card.headline).toBe("Autauga County, AL Unemployment Briefing");
      expect(card.unemploymentRateText).toBe("6.5%");
      expect(card.seasonalAdjustmentText).toBe("Not Seasonally Adjusted");
      expect(card.reconciliationNote).toContain("Verified");
      expect(card.provenanceDisclaimer).toContain(
        "U.S. Bureau of Labor Statistics",
      );
    });
  });
});
