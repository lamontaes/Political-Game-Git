/**
 * Official U.S. Census Bureau Political Districts Geography Corpus
 * Validation Script
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { PoliticalDistrictCorpusData } from "../../src/political_districts/types.js";

const COMPILED_PATH = path.join(
  process.cwd(),
  "data",
  "political-districts",
  "compiled-political-districts.json",
);

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

function checkForbiddenKeys(obj: unknown, keyPath = ""): string[] {
  const errors: string[] = [];
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        errors.push(...checkForbiddenKeys(item, `${keyPath}[${idx}]`));
      });
    } else {
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>,
      )) {
        const lowerKey = key.toLowerCase();
        for (const forbidden of FORBIDDEN_KEYS) {
          if (lowerKey.includes(forbidden)) {
            errors.push(
              `Forbidden key "${key}" found at path "${keyPath}.${key}"`,
            );
          }
        }
        errors.push(...checkForbiddenKeys(value, `${keyPath}.${key}`));
      }
    }
  }
  return errors;
}

export function validateCorpus(): void {
  console.log("Validating political district corpus integrity...");

  if (!fs.existsSync(COMPILED_PATH)) {
    throw new Error(`Compiled corpus file missing: ${COMPILED_PATH}`);
  }

  const rawJson = fs.readFileSync(COMPILED_PATH, "utf-8");
  const corpus: PoliticalDistrictCorpusData = JSON.parse(rawJson);

  // 1. Check forbidden keys
  const forbiddenErrors = checkForbiddenKeys(corpus);
  if (forbiddenErrors.length > 0) {
    throw new Error(
      `Forbidden keys detected in corpus:\n${forbiddenErrors.join("\n")}`,
    );
  }

  // 2. Validate counts
  const { totalRecordCount, recordCountsByType, compiledSha256 } =
    corpus.manifest;

  if (totalRecordCount !== 7283) {
    throw new Error(
      `Expected total record count 7283, got ${totalRecordCount}`,
    );
  }

  if (recordCountsByType.cd !== 440) {
    throw new Error(`Expected 440 CD records, got ${recordCountsByType.cd}`);
  }

  if (recordCountsByType.sldl !== 4879) {
    throw new Error(
      `Expected 4879 SLDL records, got ${recordCountsByType.sldl}`,
    );
  }

  if (recordCountsByType.sldu !== 1964) {
    throw new Error(
      `Expected 1964 SLDU records, got ${recordCountsByType.sldu}`,
    );
  }

  if (corpus.records.length !== 7283) {
    throw new Error(
      `Actual records array length ${corpus.records.length} does not match totalRecordCount 7283`,
    );
  }

  // 3. Validate SHA256 integrity
  const copyForHash = JSON.parse(JSON.stringify(corpus));
  copyForHash.manifest.compiledSha256 = "";
  const expectedHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(copyForHash, null, 2), "utf-8")
    .digest("hex");

  if (compiledSha256 !== expectedHash) {
    throw new Error(
      `SHA256 mismatch! Manifest: ${compiledSha256}, Computed: ${expectedHash}`,
    );
  }

  // 4. Validate Nebraska unicameral
  const neRecords = corpus.records.filter((r) => r.usps === "NE");
  const neCd = neRecords.filter((r) => r.geographyType === "cd");
  const neSldu = neRecords.filter((r) => r.geographyType === "sldu");
  const neSldl = neRecords.filter((r) => r.geographyType === "sldl");

  if (neCd.length !== 3) {
    throw new Error(`Expected 3 Nebraska CD records, got ${neCd.length}`);
  }
  if (neSldu.length !== 49) {
    throw new Error(
      `Expected 49 Nebraska SLDU (Senate) records, got ${neSldu.length}`,
    );
  }
  if (neSldl.length !== 0) {
    throw new Error(
      `Nebraska unicameral error: expected 0 SLDL records, got ${neSldl.length}`,
    );
  }

  // 5. Validate DC
  const dcRecords = corpus.records.filter((r) => r.usps === "DC");
  const dcCd = dcRecords.filter((r) => r.geographyType === "cd");
  const dcSldu = dcRecords.filter((r) => r.geographyType === "sldu");
  const dcSldl = dcRecords.filter((r) => r.geographyType === "sldl");

  if (dcCd.length !== 1 || dcCd[0].districtCode !== "98") {
    throw new Error(
      `DC CD delegate district missing or incorrect: ${JSON.stringify(dcCd)}`,
    );
  }
  if (dcSldu.length !== 8) {
    throw new Error(`Expected 8 DC SLDU ward records, got ${dcSldu.length}`);
  }
  if (dcSldl.length !== 0) {
    throw new Error(`Expected 0 DC SLDL records, got ${dcSldl.length}`);
  }

  // 6. Validate At-Large Congressional Districts
  const atLargeStates = ["AK", "DE", "ND", "SD", "VT", "WY"];
  for (const st of atLargeStates) {
    const stCds = corpus.records.filter(
      (r) => r.usps === st && r.geographyType === "cd",
    );
    if (stCds.length !== 1 || stCds[0].districtCode !== "00") {
      throw new Error(
        `At-large state ${st} expected 1 CD with code "00", got ${JSON.stringify(stCds)}`,
      );
    }
  }

  // 7. Validate key uniqueness per (usps, geographyType, districtCode)
  const seenKeys = new Set<string>();
  for (const r of corpus.records) {
    const key = `${r.usps}:${r.geographyType}:${r.districtCode}`;
    if (seenKeys.has(key)) {
      throw new Error(`Duplicate district key detected: ${key}`);
    }
    seenKeys.add(key);

    // Validate state FIPS matches GEOID
    if (r.geoid.substring(0, 2) !== r.stateFips) {
      throw new Error(
        `State FIPS mismatch for record ${r.geoid}: stateFips=${r.stateFips}, geoid=${r.geoid}`,
      );
    }
  }

  console.log("Validation successful! All integrity checks passed.");
}

if (process.argv[1] && process.argv[1].endsWith("validate.ts")) {
  try {
    validateCorpus();
  } catch (err) {
    console.error("Validation failed:", err);
    process.exit(1);
  }
}
