/**
 * Compact Gazetteer district identities for runtime use.
 *
 * Interior points, land/water area and evidence locators stay in the Node-only
 * source corpus. This projection is identity, chamber and residual status only:
 * it is not a boundary file and it is not a home-membership crosswalk.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { toCanonicalJson } from "../../src/source/core/index";
import {
  DISTRICTS_COMPILER_VERSION,
  DISTRICTS_CORPUS_AS_OF,
} from "../../src/source/domains/political-districts/index";
import type { PoliticalDistrictRecord } from "../../src/source/domains/political-districts/index";
import {
  DISTRICT_IDENTITY_VINTAGE,
  type DistrictIdentity,
} from "../../src/districts/types";

const ROOT = resolve(import.meta.dirname, "../..");
const CORPUS = resolve(ROOT, "data/source/political-districts/corpus.json");
const OUT_DIR = resolve(ROOT, "src/districts");
const OUT_FILE = resolve(OUT_DIR, "identities.generated.json");

const records = JSON.parse(
  readFileSync(CORPUS, "utf8"),
) as PoliticalDistrictRecord[];

const identities: DistrictIdentity[] = records.map((record) => ({
  vintage: DISTRICT_IDENTITY_VINTAGE,
  asOf: DISTRICTS_CORPUS_AS_OF,
  compilerVersion: DISTRICTS_COMPILER_VERSION,
  recordId: record.recordId,
  chamber: record.chamber,
  geoid: record.geoid,
  geoidFq: record.geoidFq,
  stateFips: record.stateFips,
  stateUsps: record.stateUsps,
  districtCode: record.districtCode,
  sourceName: record.sourceName,
  isUnassignedResidual: record.isUnassignedResidual,
}));

identities.sort((left, right) => left.recordId.localeCompare(right.recordId));

const payload = {
  vintage: DISTRICT_IDENTITY_VINTAGE,
  asOf: DISTRICTS_CORPUS_AS_OF,
  compilerVersion: DISTRICTS_COMPILER_VERSION,
  recordCount: identities.length,
  records: identities,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, `${toCanonicalJson(payload)}\n`);
console.log(`Exported ${identities.length} district identities to ${OUT_FILE}`);
