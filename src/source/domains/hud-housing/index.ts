/**
 * The HUD housing domain's public API.
 *
 * The donor's data was a hand-authored seven-record file labelled as raw source
 * from huduser.gov, so nothing factual came from it. These are HUD's own FY2025
 * workbooks, and the two products stay separate rather than being folded into a
 * single record under a single vintage.
 *
 * Its other blocker cannot recur here: the audit found `npm test` dirtying the
 * working tree because a test called a compiler that wrote a wall-clock
 * timestamp into a tracked manifest. In this substrate no compiler writes
 * anything — the writer is a separate module the command matrix calls — and
 * there is no wall clock to write.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  readXlsxSheet,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  FMR_ARTIFACT,
  FMR_SHEET,
  INCOME_LIMIT_ARTIFACT,
  INCOME_LIMIT_SHEET,
  hudHousingAcquisition,
} from "./acquisition";
import { normalizeFairMarketRents, normalizeIncomeLimits } from "./normalize";
import { validateHudCorpus } from "./validate";
import type { HudRecord } from "./types";

export type {
  HudArea,
  HudFairMarketRentRecord,
  HudIncomeLimitRecord,
  HudProduct,
  HudRecord,
} from "./types";
export { normalizeFairMarketRents, normalizeIncomeLimits } from "./normalize";
export {
  EXPECTED_FMR_AREA_COUNT,
  EXPECTED_INCOME_LIMIT_AREA_COUNT,
} from "./validate";

export const HUD_COMPILER_VERSION = "1.0.0";
export const HUD_PARSER_VERSION = "1.0.0";

/**
 * The vintages, declared per product because they are published per product.
 *
 * HUD issues Fair Market Rents for a fiscal year beginning in October and
 * Income Limits in the spring. Sharing one vintage string across both is how
 * the two came to look like one dataset.
 */
export const FMR_VINTAGE = "FY2025";
export const INCOME_LIMIT_VINTAGE = "FY2025";

/** Federal fiscal year 2025 ends on 30 September 2025. */
export const HUD_CORPUS_AS_OF = "2025-09-30";

type HudRole = "fairMarketRents" | "incomeLimits";
export type HudArtifacts = OpenedArtifacts<HudRole>;

/** Compile the HUD reference corpus from locked publisher workbooks. */
export function compileHudHousing(
  input: ProductionInput<HudArtifacts> | FixtureInput<HudArtifacts>,
): CompiledCorpus<HudRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const { fairMarketRents, incomeLimits } = input.artifacts;

  const rentSheet = readXlsxSheet(fairMarketRents.bytes, FMR_SHEET);
  const limitSheet = readXlsxSheet(incomeLimits.bytes, INCOME_LIMIT_SHEET);

  const rents = normalizeFairMarketRents(
    rentSheet,
    fairMarketRents.artifact.artifactId,
    FMR_VINTAGE,
  );
  const limits = normalizeIncomeLimits(
    limitSheet,
    incomeLimits.artifact.artifactId,
    INCOME_LIMIT_VINTAGE,
  );

  const defects = [...rents.defects, ...limits.defects];
  if (defects.length > 0) {
    throw new Error(
      `The HUD workbooks produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  const records: HudRecord[] = [...rents.records, ...limits.records].sort(
    (left, right) =>
      left.recordId < right.recordId
        ? -1
        : left.recordId > right.recordId
          ? 1
          : 0,
  );

  return {
    corpus: {
      corpusId: "hud-housing",
      compiler: { name: "hud-housing", version: HUD_COMPILER_VERSION },
      parser: { name: "hud-xlsx", version: HUD_PARSER_VERSION },
      inputs: [
        {
          artifactId: fairMarketRents.artifact.artifactId,
          sha256: fairMarketRents.artifact.bytes.sha256,
        },
        {
          artifactId: incomeLimits.artifact.artifactId,
          sha256: incomeLimits.artifact.bytes.sha256,
        },
      ],
      asOf: HUD_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every area in HUD's FY2025 county-level Fair Market Rent file and every area in its FY2025 Section 8 Income Limits file, held as two separate products. Both are complete as published; HUD also issues Small Area Fair Market Rents by ZIP code, which is a third product and is not part of this corpus.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<HudRecord>;
}

export function openHudProduction(
  lock: ArtifactLock,
): ProductionInput<HudArtifacts> {
  return openProductionArtifacts<HudRole>("hud-housing", lock, {
    fairMarketRents: FMR_ARTIFACT,
    incomeLimits: INCOME_LIMIT_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<HudRecord> = {
  domain: "hud-housing",
  compilerVersion: HUD_COMPILER_VERSION,
  acquisitionPlan: hudHousingAcquisition,
  lockPath: "data/source/hud-housing/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<HudRecord, "production"> {
    return compileHudHousing(openHudProduction(lock)) as CompiledCorpus<
      HudRecord,
      "production"
    >;
  },
  validateCorpus(corpus: CompiledCorpus<HudRecord>): ValidationReport {
    return validateHudCorpus(corpus);
  },
};
