import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { compileCorpus } from "../scripts/political-districts-corpus/compile.js";
import {
  getDistrictsByState,
  getDistrictsByType,
  getDistrictsByStateAndType,
  getDistrictByGeoid,
  getDistrictByGeoidfq,
  findDistrict,
} from "../src/political_districts/index.js";
import type { PoliticalDistrictCorpusData } from "../src/political_districts/types.js";

const COMPILED_PATH = path.join(
  process.cwd(),
  "data",
  "political-districts",
  "compiled-political-districts.json",
);
const PROVENANCE_PATH = path.join(
  process.cwd(),
  "data",
  "political-districts",
  "provenance.json",
);
const RAW_DIR = path.join(process.cwd(), "data", "political-districts", "raw");

const FORBIDDEN_KEYS = [
  "party",
  "partisan",
  "representative",
  "winner",
  "election",
  "ideology",
  "candidate",
  "incumbent",
  "office",
  "eligibility",
  "ballot",
  "votes",
  "margin",
  "poll",
];

function checkForbiddenKeys(obj: unknown, pathStr = ""): string[] {
  const errors: string[] = [];
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        errors.push(...checkForbiddenKeys(item, `${pathStr}[${idx}]`));
      });
    } else {
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>,
      )) {
        const lowerKey = key.toLowerCase();
        for (const forbidden of FORBIDDEN_KEYS) {
          if (lowerKey.includes(forbidden)) {
            errors.push(
              `Forbidden key "${key}" found at path "${pathStr}.${key}"`,
            );
          }
        }
        errors.push(...checkForbiddenKeys(value, `${pathStr}.${key}`));
      }
    }
  }
  return errors;
}

describe("Official Census Political Districts Corpus", () => {
  let corpus: PoliticalDistrictCorpusData;

  beforeAll(() => {
    // Compile or load
    if (!fs.existsSync(COMPILED_PATH)) {
      corpus = compileCorpus();
    } else {
      const raw = fs.readFileSync(COMPILED_PATH, "utf-8");
      corpus = JSON.parse(raw);
    }
  });

  it("1. verifies exact schema and delimiter parsing on raw Census files", () => {
    const cdFile = path.join(RAW_DIR, "2025_Gaz_119CDs_national.txt");
    const sldlFile = path.join(RAW_DIR, "2025_Gaz_sldl_national.txt");
    const slduFile = path.join(RAW_DIR, "2025_Gaz_sldu_national.txt");

    expect(fs.existsSync(cdFile)).toBe(true);
    expect(fs.existsSync(sldlFile)).toBe(true);
    expect(fs.existsSync(slduFile)).toBe(true);

    const cdHeader = fs
      .readFileSync(cdFile, "utf-8")
      .split(/\r?\n/)[0]
      .split("|")
      .map((c) => c.trim());
    expect(cdHeader).toEqual([
      "USPS",
      "GEOID",
      "GEOIDFQ",
      "ALAND",
      "AWATER",
      "ALAND_SQMI",
      "AWATER_SQMI",
      "INTPTLAT",
      "INTPTLONG",
    ]);

    const sldlHeader = fs
      .readFileSync(sldlFile, "utf-8")
      .split(/\r?\n/)[0]
      .split("|")
      .map((c) => c.trim());
    expect(sldlHeader).toEqual([
      "USPS",
      "GEOID",
      "GEOIDFQ",
      "NAME",
      "ALAND",
      "AWATER",
      "ALAND_SQMI",
      "AWATER_SQMI",
      "INTPTLAT",
      "INTPTLONG",
    ]);
  });

  it("2. verifies geography-code shape and state FIPS relationships", () => {
    expect(corpus.records.length).toBe(7283);
    for (const record of corpus.records) {
      expect(record.usps).toBeTruthy();
      expect(record.stateFips).toHaveLength(2);
      expect(record.geoid.substring(0, 2)).toBe(record.stateFips);

      if (record.geographyType === "cd") {
        expect(record.geoid).toHaveLength(4);
        expect(record.geoidfq).toMatch(/^5001900US[A-Z0-9]{4}$/);
      } else {
        expect(record.geoid).toHaveLength(5);
        if (record.geographyType === "sldl") {
          expect(record.geoidfq).toMatch(/^620L900US[A-Z0-9-]{5,}$/);
        } else {
          expect(record.geoidfq).toMatch(/^610U900US[A-Z0-9-]{5,}$/);
        }
      }
    }
  });

  it("3. verifies At-Large congressional district and delegate handling", () => {
    const atLargeStates = ["AK", "DE", "ND", "SD", "VT", "WY"];
    for (const st of atLargeStates) {
      const cds = getDistrictsByStateAndType(corpus, st, "cd");
      expect(cds).toHaveLength(1);
      expect(cds[0].districtCode).toBe("00");
      expect(cds[0].name).toBe("Congressional District (At Large)");
    }

    const dcCd = getDistrictsByStateAndType(corpus, "DC", "cd");
    expect(dcCd).toHaveLength(1);
    expect(dcCd[0].districtCode).toBe("98");
    expect(dcCd[0].name).toBe("Delegate District (At Large)");

    const prCd = getDistrictsByStateAndType(corpus, "PR", "cd");
    expect(prCd).toHaveLength(1);
    expect(prCd[0].districtCode).toBe("98");
    expect(prCd[0].name).toBe("Resident Commissioner District");
  });

  it("4. verifies Nebraska unicameral legislature (NE has 0 SLDL records)", () => {
    const neCds = getDistrictsByStateAndType(corpus, "NE", "cd");
    const neSldu = getDistrictsByStateAndType(corpus, "NE", "sldu");
    const neSldl = getDistrictsByStateAndType(corpus, "NE", "sldl");

    expect(neCds).toHaveLength(3);
    expect(neSldu).toHaveLength(49);
    expect(neSldl).toHaveLength(0); // STRICTLY ZERO
  });

  it("5. verifies DC and territory records match official Census source", () => {
    const dcSldl = getDistrictsByStateAndType(corpus, "DC", "sldl");
    const dcSldu = getDistrictsByStateAndType(corpus, "DC", "sldu");
    expect(dcSldl).toHaveLength(0);
    expect(dcSldu).toHaveLength(8); // Wards 1 to 8

    const prSldl = getDistrictsByStateAndType(corpus, "PR", "sldl");
    const prSldu = getDistrictsByStateAndType(corpus, "PR", "sldu");
    expect(prSldl).toHaveLength(41); // 40 districts + 1 ZZZ
    expect(prSldu).toHaveLength(9); // 8 districts + 1 ZZZ
  });

  it("6. verifies duplicate district numbers across states remain distinct", () => {
    const cd1s = corpus.records.filter(
      (r) => r.geographyType === "cd" && r.districtCode === "01",
    );
    expect(cd1s.length).toBeGreaterThan(30);

    const caCd1 = findDistrict(corpus, "CA", "cd", "01");
    const txCd1 = findDistrict(corpus, "TX", "cd", "01");
    const nyCd1 = findDistrict(corpus, "NY", "cd", "01");

    expect(caCd1).toBeDefined();
    expect(txCd1).toBeDefined();
    expect(nyCd1).toBeDefined();

    expect(caCd1?.geoid).not.toBe(txCd1?.geoid);
    expect(caCd1?.geoidfq).not.toBe(txCd1?.geoidfq);
    expect(caCd1?.stateFips).toBe("06");
    expect(txCd1?.stateFips).toBe("48");
  });

  it("7. verifies deterministic recompilation yields byte-identical JSON and SHA-256", () => {
    const freshCompiled = compileCorpus();
    const diskRaw = fs.readFileSync(COMPILED_PATH, "utf-8");
    const freshRaw = JSON.stringify(freshCompiled, null, 2) + "\n";

    expect(freshRaw).toBe(diskRaw);

    const hash1 = crypto
      .createHash("sha256")
      .update(diskRaw, "utf-8")
      .digest("hex");
    const hash2 = crypto
      .createHash("sha256")
      .update(freshRaw, "utf-8")
      .digest("hex");

    expect(hash1).toBe(hash2);
  });

  it("8. verifies known specific district cases", () => {
    // Alabama CD 1
    const alCd1 = getDistrictByGeoid(corpus, "0101");
    expect(alCd1).toBeDefined();
    expect(alCd1?.usps).toBe("AL");
    expect(alCd1?.name).toBe("Congressional District 1");

    // Alaska Senate District A
    const akSenateA = getDistrictByGeoid(corpus, "0200A");
    expect(akSenateA).toBeDefined();
    expect(akSenateA?.usps).toBe("AK");
    expect(akSenateA?.name).toBe("State Senate District A");

    // Nebraska Senate District 1
    const neSenate1 = getDistrictByGeoid(corpus, "31001");
    expect(neSenate1).toBeDefined();
    expect(neSenate1?.usps).toBe("NE");
    expect(neSenate1?.name).toBe("State Senate District 1");

    // DC Ward 1
    const dcWard1 = getDistrictByGeoidfq(corpus, "610U900US11001");
    expect(dcWard1).toBeDefined();
    expect(dcWard1?.name).toBe("Ward 1");
  });

  it("9. verifies provenance metadata completeness and raw byte SHA-256 integrity", () => {
    expect(fs.existsSync(PROVENANCE_PATH)).toBe(true);
    const provRaw = fs.readFileSync(PROVENANCE_PATH, "utf-8");
    const prov = JSON.parse(provRaw);

    expect(prov.sources).toHaveLength(3);

    for (const src of prov.sources) {
      expect(src.sourceUrl).toContain("census.gov");
      expect(src.txtSha256).toHaveLength(64);
      expect(src.zipSha256).toHaveLength(64);

      const rawTxtPath = path.join(RAW_DIR, src.txtFileName);
      expect(fs.existsSync(rawTxtPath)).toBe(true);
      const fileBytes = fs.readFileSync(rawTxtPath);
      const computedHash = crypto
        .createHash("sha256")
        .update(fileBytes)
        .digest("hex");
      expect(computedHash).toBe(src.txtSha256);
    }
  });

  it("10. verifies strict absence of forbidden political outcome/rule keys in compiled corpus", () => {
    const forbiddenErrors = checkForbiddenKeys(corpus);
    expect(forbiddenErrors).toEqual([]);
  });

  it("11. verifies TypeScript query helper functions", () => {
    const caRecords = getDistrictsByState(corpus, "CA");
    expect(caRecords.length).toBeGreaterThan(100);

    const slduRecords = getDistrictsByType(corpus, "sldu");
    expect(slduRecords).toHaveLength(1964);

    const txCdRecords = getDistrictsByStateAndType(corpus, "TX", "cd");
    expect(txCdRecords).toHaveLength(38); // Texas has 38 CDs in 119th Congress
  });
});
