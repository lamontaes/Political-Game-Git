import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ArtifactLock } from "../../core/index";

export type ReviewedComplianceState =
  "KNOWN" | "UNKNOWN" | "NO_REQUIREMENT_FOUND" | "NOT_APPLICABLE";

export type KentuckyComplianceField =
  | "statementOfIntentWithinDays"
  | "reportingThresholdMinorUnits"
  | "reportSchedules"
  | "reportReceiptWithinBusinessDays"
  | "electronicFilingSystem"
  | "publicUponReceipt"
  | "itemizationThresholdMinorUnits"
  | "noComminglingWithPersonalFunds"
  | "amendmentTransport"
  | "contributionLimitMinorUnits";

export interface ReviewedKentuckyComplianceRecord {
  readonly field: KentuckyComplianceField;
  readonly status: ReviewedComplianceState;
  readonly value: unknown;
  readonly artifactId: string | null;
  readonly artifactSha256: string | null;
  readonly sourceUrl: string | null;
  readonly legalLocator: string | null;
  readonly sourceVersionEffectiveOn: string | null;
  readonly claimEffectiveOn: string | null;
  readonly claimEffectiveBasisArtifactId?: string;
  readonly claimEffectiveBasisArtifactSha256?: string;
  readonly claimEffectiveBasisLocator?: string;
  readonly claimEffectiveBasisExcerpt?: string;
  readonly amendmentEvidenceArtifactId?: string;
  readonly amendmentEvidenceArtifactSha256?: string;
  readonly amendmentEvidenceLocator?: string;
  readonly amendmentEvidenceExcerpt?: string;
  readonly supportCoverageFrom: string | null;
  readonly excerpt: string | null;
  readonly reason?: string;
}

export interface ReviewedKentuckyCompliance {
  readonly reviewId: string;
  readonly reviewedOn: string;
  readonly records: readonly ReviewedKentuckyComplianceRecord[];
}

const REQUIRED_FIELDS: readonly KentuckyComplianceField[] = [
  "statementOfIntentWithinDays",
  "reportingThresholdMinorUnits",
  "reportSchedules",
  "reportReceiptWithinBusinessDays",
  "electronicFilingSystem",
  "publicUponReceipt",
  "itemizationThresholdMinorUnits",
  "noComminglingWithPersonalFunds",
  "amendmentTransport",
  "contributionLimitMinorUnits",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string): never {
  throw new Error(`Kentucky reviewed compliance transport: ${message}`);
}

/**
 * Load a reviewed transcription without granting the UNKNOWN-rights parent
 * artifacts to the production text compiler. Every accepted row remains tied
 * to the exact locked bytes that the reviewer read.
 */
export function loadReviewedKentuckyCampaignCompliance(
  lock: ArtifactLock,
  reviewedPath = resolve(
    import.meta.dirname,
    "../../../../data/source/state-campaign-compliance/reviewed/ky-candidate-compliance-2026.json",
  ),
): ReviewedKentuckyCompliance {
  if (lock.domain !== "state-campaign-compliance") {
    fail(`expected state-campaign-compliance lock, received ${lock.domain}.`);
  }
  const parsed = JSON.parse(
    readFileSync(reviewedPath, "utf8"),
  ) as ReviewedKentuckyCompliance;
  if (parsed.reviewId !== "ky-candidate-compliance-2026") {
    fail(`unexpected review id ${String(parsed.reviewId)}.`);
  }
  if (!ISO_DATE.test(parsed.reviewedOn)) fail("reviewedOn is not an ISO date.");
  const seen = new Set<string>();
  for (const record of parsed.records) {
    if (!REQUIRED_FIELDS.includes(record.field)) {
      fail(`unexpected field ${String(record.field)}.`);
    }
    if (seen.has(record.field))
      fail(`duplicate normalized field ${record.field}.`);
    seen.add(record.field);
    for (const [label, date] of [
      ["sourceVersionEffectiveOn", record.sourceVersionEffectiveOn],
      ["claimEffectiveOn", record.claimEffectiveOn],
      ["supportCoverageFrom", record.supportCoverageFrom],
    ] as const) {
      if (date !== null && !ISO_DATE.test(date)) {
        fail(`${record.field} ${label} is not an ISO date.`);
      }
    }
    if (record.claimEffectiveOn !== null) {
      if (
        !record.claimEffectiveBasisArtifactId ||
        !record.claimEffectiveBasisArtifactSha256 ||
        !record.claimEffectiveBasisLocator?.trim() ||
        !record.claimEffectiveBasisExcerpt?.trim()
      ) {
        fail(`${record.field} has a claim effective date without its basis.`);
      }
      const basisArtifact = lock.artifacts.find(
        (candidate) =>
          candidate.artifactId === record.claimEffectiveBasisArtifactId,
      );
      if (!basisArtifact) {
        fail(`${record.field} names an absent claim-effective basis artifact.`);
      }
      if (
        basisArtifact.bytes.sha256 !== record.claimEffectiveBasisArtifactSha256
      ) {
        fail(
          `${record.field} claim-effective basis hash does not match the lock.`,
        );
      }
    }
    const amendmentEvidence = [
      record.amendmentEvidenceArtifactId,
      record.amendmentEvidenceArtifactSha256,
      record.amendmentEvidenceLocator,
      record.amendmentEvidenceExcerpt,
    ];
    if (amendmentEvidence.some((value) => value !== undefined)) {
      if (
        !record.amendmentEvidenceArtifactId ||
        !record.amendmentEvidenceArtifactSha256 ||
        !record.amendmentEvidenceLocator?.trim() ||
        !record.amendmentEvidenceExcerpt?.trim()
      ) {
        fail(`${record.field} has incomplete amendment evidence.`);
      }
      const amendmentArtifact = lock.artifacts.find(
        (candidate) =>
          candidate.artifactId === record.amendmentEvidenceArtifactId,
      );
      if (!amendmentArtifact) {
        fail(`${record.field} names an absent amendment-evidence artifact.`);
      }
      if (
        amendmentArtifact.bytes.sha256 !==
        record.amendmentEvidenceArtifactSha256
      ) {
        fail(
          `${record.field} amendment evidence hash does not match the lock.`,
        );
      }
    }
    if (record.status === "KNOWN" || record.status === "NO_REQUIREMENT_FOUND") {
      if (
        (record.status === "KNOWN" && record.value === null) ||
        (record.status === "NO_REQUIREMENT_FOUND" && record.value !== null) ||
        record.artifactId === null ||
        record.artifactSha256 === null ||
        record.sourceUrl === null ||
        record.legalLocator === null ||
        record.supportCoverageFrom === null ||
        record.excerpt === null
      ) {
        fail(
          `${record.field} is ${record.status} without complete reviewed evidence.`,
        );
      }
      const artifact = lock.artifacts.find(
        (candidate) => candidate.artifactId === record.artifactId,
      );
      if (!artifact)
        fail(`${record.field} names an artifact absent from the lock.`);
      if (artifact.bytes.sha256 !== record.artifactSha256) {
        fail(`${record.field} does not match its locked artifact hash.`);
      }
      if (artifact.retrieval.url !== record.sourceUrl) {
        fail(`${record.field} source URL does not match its locked retrieval.`);
      }
    } else {
      if (!record.reason?.trim())
        fail(`${record.field} is ${record.status} without a reason.`);
      if (record.value !== null) {
        fail(`${record.field} is ${record.status} but carries a value.`);
      }
    }
  }
  const missing = REQUIRED_FIELDS.filter((field) => !seen.has(field));
  if (missing.length > 0) fail(`missing fields: ${missing.join(", ")}.`);
  return parsed;
}
