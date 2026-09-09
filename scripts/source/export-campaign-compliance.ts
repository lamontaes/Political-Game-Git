/**
 * The one-way, reviewed export of compiled campaign-compliance rules.
 *
 * Same seam and same rule as the qualifications export: `src/source` is
 * Node-only, so the obligations cross into the game as data and the bytes stay
 * behind. What crosses is the jurisdiction, the obligation, the threshold, the
 * citation and the enacted words — the words because a refusal that quotes the
 * statute is a different thing to read than a refusal that asserts one.
 *
 * Regenerate with `npm run export:campaign-compliance`.
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignComplianceRule } from "../../src/source/domains/state-campaign-compliance/index";
import { loadReviewedKentuckyCampaignCompliance } from "../../src/source/domains/state-campaign-compliance/index";
import type { ArtifactLock } from "../../src/source/core/index";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/state-campaign-compliance/corpus.json",
);
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/state-campaign-compliance/corpus-manifest.json",
);
const LOCK_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/state-campaign-compliance/artifact-lock.json",
);
const KENTUCKY_REVIEW_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/state-campaign-compliance/reviewed/ky-candidate-compliance-2026.json",
);
const OUTPUT_PATH = path.join(
  REPOSITORY_ROOT,
  "src/simulation/campaign-compliance.generated.ts",
);

interface CorpusManifest {
  readonly asOf: string;
  readonly canonicalSha256: string;
  readonly recordCount: number;
  readonly compiler: { readonly name: string; readonly version: string };
}

function main(): void {
  const records = JSON.parse(
    readFileSync(CORPUS_PATH, "utf8"),
  ) as readonly CampaignComplianceRule[];
  const manifest = JSON.parse(
    readFileSync(MANIFEST_PATH, "utf8"),
  ) as CorpusManifest;
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as ArtifactLock;
  const kentucky = loadReviewedKentuckyCampaignCompliance(
    lock,
    KENTUCKY_REVIEW_PATH,
  );
  const kentuckyRecords = kentucky.records.map((record) => {
    const artifact =
      record.artifactId === null
        ? null
        : (lock.artifacts.find(
            (candidate) => candidate.artifactId === record.artifactId,
          ) ?? null);
    return {
      ...record,
      sourceRetrievedAt: artifact?.retrieval.retrievedAt ?? null,
      sourceStatedVintage: artifact?.publisher.statedVintage ?? null,
    };
  });

  const rows = records.map((record) => ({
    jurisdictionKey: record.jurisdictionKey,
    regime: record.regime,
    obligation: record.obligation,
    thresholdState: record.threshold.state,
    thresholdMinorUnits:
      record.threshold.state === "KNOWN"
        ? record.threshold.value.amountMinorUnits
        : null,
    thresholdCurrency:
      record.threshold.state === "KNOWN"
        ? record.threshold.value.currency
        : null,
    thresholdAppliesTo:
      record.threshold.state === "KNOWN"
        ? record.threshold.value.appliesTo
        : record.threshold.state === "NOT_APPLICABLE"
          ? record.threshold.reason
          : null,
    legalLocator: record.legalLocator,
    authorityUrl: record.authorityUrl,
    enactedExcerpt: record.enactedExcerpt,
    supportingEnactedExcerpts: record.supportingEnactedExcerpts,
    sourceRetrievedAt: record.sourceRetrievedAt,
    sourceStatedVintage: record.sourceStatedVintage,
    provisionValidity: record.provisionValidity,
  }));

  const output = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/export-campaign-compliance.ts\` from the compiled
 * \`state-campaign-compliance\` corpus. Each obligation below was emitted only
 * because the words that establish it are present in the enacted text of the
 * provision cited, in bytes this repository retrieved from the state's own
 * publisher and hashed. Regenerate with \`npm run export:campaign-compliance\`.
 *
 * Two states. Nothing here is true of any other state's campaigns.
 */

/** Provenance for the obligations below. Surfaced honestly. */
export const CAMPAIGN_COMPLIANCE_META = ${JSON.stringify(
    {
      asOf: manifest.asOf,
      corpusSha256: manifest.canonicalSha256,
      compiler: `${manifest.compiler.name}@${manifest.compiler.version}`,
      recordCount: manifest.recordCount,
      jurisdictions: [
        ...new Set(records.map((record) => record.jurisdictionKey)),
      ].sort(),
    },
    null,
    2,
  )} as const;

/** One row per compiled obligation, as one JSON string. */
export const CAMPAIGN_COMPLIANCE_ROWS: string =
  ${JSON.stringify(JSON.stringify(rows))};

/** Hash-bound, field-level Kentucky reviewed transcription. */
export const KENTUCKY_COMPLIANCE_REVIEW = ${JSON.stringify(
    { ...kentucky, records: kentuckyRecords },
    null,
    2,
  )} as const;
`;

  writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(
    `export:campaign-compliance — ${rows.length} obligations for ${CAMPAIGN_COMPLIANCE_META_JURISDICTIONS(records).join(", ")}`,
  );
}

function CAMPAIGN_COMPLIANCE_META_JURISDICTIONS(
  records: readonly CampaignComplianceRule[],
): readonly string[] {
  return [...new Set(records.map((record) => record.jurisdictionKey))].sort();
}

main();
