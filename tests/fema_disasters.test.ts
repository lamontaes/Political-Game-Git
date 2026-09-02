import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { buildDeclarationId } from "../src/fema_disasters/types";
import { compileFemaCorpus } from "../scripts/fema-corpus/compile-fema";
import { validateFemaCorpus } from "../scripts/fema-corpus/validate-fema";

const REPO_ROOT = path.resolve(__dirname, "..");
const COMPILED_PATH = path.join(
  REPO_ROOT,
  "data/fema-disasters/compiled-fema-disasters.json",
);
const PINNED_RAW_PATH = path.join(
  REPO_ROOT,
  "data/fema-disasters/raw/fema-disaster-declarations-pinned.json",
);
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "data/fema-disasters/raw/acquisition-manifest.json",
);

const FORBIDDEN_PR62_PATH_1 = ["src", "source"].join("/");
const FORBIDDEN_PR62_PATH_2 = ["data", "source"].join("/");

describe("FEMA Disaster Declarations Historical Corpus Sidecar", () => {
  it("compiles deterministically from pinned raw input", () => {
    const dataset1 = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const dataset2 = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);

    expect(dataset1).toEqual(dataset2);
    expect(dataset1.records.length).toBeGreaterThan(0);
    expect(dataset1.schemaVersion).toBe("1.0.0");
    expect(dataset1.provenance.compilerVersion).toBe("1.0.0");
  });

  it("passes full corpus validation checks via validator script", () => {
    const result = validateFemaCorpus(COMPILED_PATH, PINNED_RAW_PATH);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("generates stable, deterministic declaration IDs", () => {
    const id1 = buildDeclarationId(4332, "TX", "Harris (County)", "201");
    const id2 = buildDeclarationId(4332, "TX", "Harris (County)", "201");
    const id3 = buildDeclarationId(4332, "TX", "Galveston (County)", "167");

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toBe("fema-disaster:4332:TX:harris-county-");
  });

  it("contains known historical disaster declaration landmark examples", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const records = dataset.records;

    // Hurricane Katrina (1603)
    const katrina = records.find((r) => r.disasterNumber === 1603);
    expect(katrina).toBeDefined();
    expect(katrina?.declarationTitle).toBe("HURRICANE KATRINA");
    expect(katrina?.incidentType).toBe("Hurricane");
    expect(katrina?.underlying_physical_hazard).toBe("Hurricane");
    expect(katrina?.administrative_declaration_or_response).toBe(
      "Major Disaster Declaration (DR)",
    );

    // Superstorm Sandy (4085)
    const sandy = records.find((r) => r.disasterNumber === 4085);
    expect(sandy).toBeDefined();
    expect(sandy?.declarationTitle).toBe("HURRICANE SANDY");

    // Hurricane Harvey (4332)
    const harvey = records.find(
      (r) => r.disasterNumber === 4332 && r.designatedArea?.includes("Harris"),
    );
    expect(harvey).toBeDefined();
    expect(harvey?.state).toBe("TX");

    // Winter Storm Uri (4586)
    const uri = records.find((r) => r.disasterNumber === 4586);
    expect(uri).toBeDefined();
    expect(uri?.incidentType).toBe("Winter Storm");

    // Hurricane Ian (4673)
    const ian = records.find((r) => r.disasterNumber === 4673);
    expect(ian).toBeDefined();
    expect(ian?.state).toBe("FL");

    // Hurricane Helene (4830)
    const helene = records.find(
      (r) => r.disasterNumber === 4830 && r.designatedAreaType === "county",
    );
    expect(helene).toBeDefined();
    expect(helene?.declarationTitle).toBe("HURRICANE HELENE");
  });

  it("maintains chronological date ordering without inventing missing dates", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const records = dataset.records;

    for (let i = 1; i < records.length; i++) {
      const prevDate = records[i - 1].declarationDate;
      const currDate = records[i].declarationDate;
      expect(currDate >= prevDate).toBe(true);
    }

    // Ongoing/unreported disaster records have incidentEndDate === null
    const ongoingRecord = records.find((r) => r.disasterNumber === 4765);
    expect(ongoingRecord).toBeDefined();
    expect(ongoingRecord?.incidentEndDate).toBeNull();
    expect(ongoingRecord?.incidentEndDate).not.toBe("");
  });

  it("preserves missing values explicitly without coercing missing to false or zero (missing != zero)", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const records = dataset.records;

    // Fire Management record FM-5480 has null program flags in raw source
    const fireRecord = records.find((r) => r.disasterNumber === 5480);
    expect(fireRecord).toBeDefined();
    expect(fireRecord?.ihProgramDeclared).toBeNull();
    expect(fireRecord?.iaProgramDeclared).toBeNull();
    expect(fireRecord?.paProgramDeclared).toBe(true);
  });

  it("preserves designated area types including county, tribal, and statewide declarations", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const records = dataset.records;

    const countyArea = records.find((r) => r.designatedAreaType === "county");
    expect(countyArea).toBeDefined();

    const tribalArea = records.find((r) => r.designatedAreaType === "tribal");
    expect(tribalArea).toBeDefined();
    expect(tribalArea?.designatedArea).toBe("Cherokee Nation");

    const statewideArea = records.find(
      (r) => r.designatedAreaType === "statewide",
    );
    expect(statewideArea).toBeDefined();
    expect(statewideArea?.designatedArea).toBe("Statewide");
  });

  it("handles duplicate disaster numbers across multiple areas without collision", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const harveyRecords = dataset.records.filter(
      (r) => r.disasterNumber === 4332,
    );

    expect(harveyRecords.length).toBeGreaterThanOrEqual(2);
    const ids = harveyRecords.map((r) => r.declarationId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("strictly contains NO arrival rate, probability, risk, or casualty fields", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const jsonString = JSON.stringify(dataset);

    const forbiddenTerms = [
      "probability",
      "annual_rate",
      "risk_score",
      "severity_score",
      "casualty_count",
      "occurrence_rate",
    ];
    for (const term of forbiddenTerms) {
      expect(jsonString.toLowerCase()).not.toContain(`"${term}"`);
    }
  });

  it("verifies provenance integrity and raw file SHA-256 hash match", () => {
    const dataset = compileFemaCorpus(PINNED_RAW_PATH, MANIFEST_PATH);
    const rawBytes = fs.readFileSync(PINNED_RAW_PATH);
    const calculatedHash = crypto
      .createHash("sha256")
      .update(rawBytes)
      .digest("hex");

    expect(dataset.provenance.rawSourceSha256).toBe(calculatedHash);
    expect(dataset.provenance.recordCount).toBe(dataset.records.length);
    expect(dataset.provenance.officialEndpointUrl).toContain("fema.gov");
  });

  it("is completely disjoint from PR #62 and does not touch or import forbidden paths", () => {
    const femaSrcDir = path.join(REPO_ROOT, "src/fema_disasters");
    const femaScriptsDir = path.join(REPO_ROOT, "scripts/fema-corpus");

    const checkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, "utf-8");
          expect(content).not.toContain(FORBIDDEN_PR62_PATH_1);
          expect(content).not.toContain(FORBIDDEN_PR62_PATH_2);
        }
      }
    };

    checkDir(femaSrcDir);
    checkDir(femaScriptsDir);

    expect(fs.existsSync(path.join(REPO_ROOT, FORBIDDEN_PR62_PATH_1))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(REPO_ROOT, FORBIDDEN_PR62_PATH_2))).toBe(
      false,
    );
  });
});
