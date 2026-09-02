#!/usr/bin/env node
/**
 * Integrity & Boundary Validation CLI for U.S. Government-Universe
 *
 * Enforces all product invariants:
 * - Deterministic build and unique stable IDs
 * - Duplicate-name governments remain distinct
 * - County vs Municipality vs Township vs Special District vs School District distinctions
 * - State-specific structural organization text stays attached to correct state
 * - Missing authority strictly preserved as unknown (no invented powers)
 * - Manifest numbers match authoritative Census totals
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultAuthorityIndex } from "../../src/government_universe/authority_index.js";
import {
  isValidCensusGovId,
  parseCensusGovId,
} from "../../src/government_universe/census_id.js";
import type {
  GovernmentSourceRecord,
  GovernmentTypeAuthorityRecord,
  NationalUniverseManifest,
} from "../../src/government_universe/types.js";

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const corpusDir = join(rootDir, "data", "government_universe", "corpus");
  const manifestsDir = join(
    rootDir,
    "data",
    "government_universe",
    "manifests",
  );

  console.log(
    "Running U.S. Government-Universe Integrity & Boundary Validation...\n",
  );

  let failureCount = 0;

  function assert(condition: boolean, message: string): void {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failureCount++;
    } else {
      console.log(`✓ PASS: ${message}`);
    }
  }

  // 1. Validate compiled corpus files exist
  const normalizedPath = join(corpusDir, "normalized_government_universe.json");
  const authoritiesPath = join(corpusDir, "government_type_authorities.json");
  const nationalManifestPath = join(
    manifestsDir,
    "national_universe_manifest.json",
  );

  let records: GovernmentSourceRecord[] = [];
  let authorities: GovernmentTypeAuthorityRecord[] = [];
  let nationalManifest: NationalUniverseManifest | undefined;

  try {
    const rawRecords = await readFile(normalizedPath, "utf-8");
    records = JSON.parse(rawRecords);
    assert(
      Array.isArray(records) && records.length > 0,
      `Loaded ${records.length} normalized government units from corpus.`,
    );
  } catch (err) {
    assert(
      false,
      `Failed to load normalized corpus from ${normalizedPath}: ${err}`,
    );
  }

  try {
    const rawAuth = await readFile(authoritiesPath, "utf-8");
    authorities = JSON.parse(rawAuth);
    assert(
      Array.isArray(authorities) && authorities.length === 51,
      `Loaded ${authorities.length} state structural authority records (50 states + DC).`,
    );
  } catch (err) {
    assert(false, `Failed to load authorities from ${authoritiesPath}: ${err}`);
  }

  try {
    const rawManifest = await readFile(nationalManifestPath, "utf-8");
    nationalManifest = JSON.parse(rawManifest);
    assert(
      !!nationalManifest?.totalGovernmentsNationally,
      "Loaded national universe manifest.",
    );
  } catch (err) {
    assert(
      false,
      `Failed to load national manifest from ${nationalManifestPath}: ${err}`,
    );
  }

  // 2. Validate stable ID and Census Gov ID uniqueness and format
  const stableIds = new Set<string>();
  const censusGovIds = new Set<string>();

  for (const rec of records) {
    if (rec.governmentType === "federal") continue;

    assert(
      rec.stableSourceId.startsWith("gov-src-census-"),
      `Record "${rec.officialName}" has valid stableSourceId prefix ("${rec.stableSourceId}")`,
    );
    assert(
      !stableIds.has(rec.stableSourceId),
      `Stable ID uniqueness invariant satisfied for "${rec.stableSourceId}"`,
    );
    stableIds.add(rec.stableSourceId);

    assert(
      isValidCensusGovId(rec.censusGovId),
      `Census Gov ID "${rec.censusGovId}" is valid 14-digit format.`,
    );
    assert(
      !censusGovIds.has(rec.censusGovId),
      `Census Gov ID uniqueness invariant satisfied for "${rec.censusGovId}"`,
    );
    censusGovIds.add(rec.censusGovId);

    const parsed = parseCensusGovId(rec.censusGovId);
    assert(
      parsed.statePostal === rec.state,
      `Census Gov ID state matches record state (${rec.state}) for "${rec.officialName}"`,
    );
    assert(
      parsed.governmentType === rec.governmentType,
      `Census Gov ID type code matches record type (${rec.governmentType}) for "${rec.officialName}"`,
    );
  }

  // 3. Duplicate name differentiation test
  const washingtonCounties = records.filter(
    (r) => r.officialName === "Washington County",
  );
  assert(
    washingtonCounties.length >= 5,
    `Duplicate-name government entities ("Washington County") present across multiple states (${washingtonCounties.length} found).`,
  );
  const washIds = new Set(washingtonCounties.map((r) => r.stableSourceId));
  assert(
    washIds.size === washingtonCounties.length,
    "All duplicate-named 'Washington County' entities have distinct stable IDs.",
  );

  const franklinTownships = records.filter(
    (r) => r.officialName === "Franklin Township",
  );
  assert(
    franklinTownships.length >= 2,
    `Duplicate-name township entities ("Franklin Township") present (${franklinTownships.length} found).`,
  );
  const franklinIds = new Set(franklinTownships.map((r) => r.stableSourceId));
  assert(
    franklinIds.size === franklinTownships.length,
    "All duplicate-named 'Franklin Township' entities have distinct stable IDs.",
  );

  // 4. Validate state structural authority invariant & unprovided powers boundary
  const authValidation = defaultAuthorityIndex.validateIntegrity();
  assert(
    authValidation.valid,
    `Authority reference index integrity validation passed (${authValidation.errors.length} errors).`,
  );

  for (const auth of authorities) {
    assert(
      auth.unprovidedPowersStrictlyUnknown === true,
      `State ${auth.state} enforces unprovided powers strictly unknown boundary.`,
    );
    assert(
      auth.authorizedClasses.length > 0,
      `State ${auth.state} specifies authorized classes.`,
    );
  }

  // 5. Validate National Manifest totals match authoritative Census 2022 baseline
  if (nationalManifest) {
    assert(
      nationalManifest.totalGovernmentsNationally === 90888,
      `National manifest total federal, state, and local governments matches Census Table 1 baseline (90,888)`,
    );
    assert(
      nationalManifest.localGovernmentsNationally === 90837,
      `National manifest total local governments matches Census Table 2 baseline (90,837)`,
    );
    assert(
      nationalManifest.byClass.county === 3031,
      `National county count matches Census baseline (3,031)`,
    );
    assert(
      nationalManifest.byClass.municipal === 19491,
      `National municipal count matches Census Table 2 baseline (19,491)`,
    );
    assert(
      nationalManifest.byClass.township === 16214,
      `National township count matches Census Table 2 baseline (16,214)`,
    );
    assert(
      nationalManifest.byClass.special_district === 39555,
      `National special district count matches Census Table 2/8 baseline (39,555)`,
    );
    assert(
      nationalManifest.byClass.school_district === 12546,
      `National independent school district count matches Census Table 2/9 baseline (12,546)`,
    );
    assert(
      nationalManifest.schoolSystems.dependentSchoolSystemsTotal === 1313,
      `National dependent school systems total matches Census Table 9 baseline (1,313)`,
    );
    assert(
      nationalManifest.schoolSystems.allOperatingPublicSchoolSystems === 13859,
      `National all operating public school systems total matches Census Table 9 baseline (13,859)`,
    );
  }

  console.log(
    `\nValidation complete: ${failureCount === 0 ? "ALL CHECKS PASSED" : `${failureCount} CHECKS FAILED`}`,
  );
  if (failureCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation execution failed:", err);
  process.exit(1);
});
