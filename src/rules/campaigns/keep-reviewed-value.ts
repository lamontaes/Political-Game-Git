// Lifted unchanged from src/simulation/campaign-compliance.ts; RULES-3, 2026-10-11.
import type {
  CampaignComplianceDocumentRecord,
  IsoDate,
} from "../../simulation/types";
import reviewedPacksByPlace from "../../../data/research/campaign-compliance/pack-records-by-place.json" with { type: "json" };

export type ComplianceValue<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
      readonly source?: ComplianceSourceRef;
      readonly estimatedFrom?: string;
    }
  | {
      readonly state: "UNKNOWN";
      readonly reason: string;
      readonly source?: ComplianceSourceRef;
      readonly estimatedFrom?: string;
    }
  | {
      readonly state: "NO_REQUIREMENT_FOUND";
      readonly source: ComplianceSourceRef;
      readonly estimatedFrom?: string;
    }
  | {
      readonly state: "NOT_APPLICABLE";
      readonly reason: string;
      readonly estimatedFrom?: string;
    };

export interface ComplianceSourceRef {
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly legalLocator: string;
  readonly sourceArtifactId: string;
  readonly sourceArtifactSha256: string;
  readonly sourceExcerpt: string;
  readonly sourceRetrievedAt: string;
  readonly sourceStatedVintage: string | null;
  readonly sourceVersionEffectiveOn: IsoDate | null;
  readonly claimEffectiveOn: IsoDate | null;
  readonly claimEffectiveBasisArtifactId: string | null;
  readonly claimEffectiveBasisArtifactSha256: string | null;
  readonly claimEffectiveBasisLocator: string | null;
  readonly claimEffectiveBasisExcerpt: string | null;
  readonly amendmentEvidenceArtifactId: string | null;
  readonly amendmentEvidenceArtifactSha256: string | null;
  readonly amendmentEvidenceLocator: string | null;
  readonly amendmentEvidenceExcerpt: string | null;
  readonly supportCoverageFrom: IsoDate;
  readonly transportKind: "reviewed-transcription";
  readonly reviewId: string;
  readonly reviewedOn: IsoDate;
  readonly researchLineage: string;
}

export interface CampaignComplianceRulePack {
  readonly packId: string;
  readonly jurisdictionKey: string;
  readonly statementOfIntentWithinDays: ComplianceValue<number>;
  readonly reportingThresholdMinorUnits: ComplianceValue<number>;
  readonly reportSchedules: ComplianceValue<
    readonly CampaignComplianceDocumentRecord["schedule"][]
  >;
  readonly reportReceiptWithinBusinessDays: ComplianceValue<number>;
  readonly electronicFilingSystem: ComplianceValue<"FEC" | "KEFMS">;
  readonly publicUponReceipt: ComplianceValue<boolean>;
  readonly amendmentTransport: ComplianceValue<"FEC" | "KEFMS">;
  readonly itemizationThresholdMinorUnits: ComplianceValue<number>;
  readonly noComminglingWithPersonalFunds: ComplianceValue<boolean>;
  readonly contributionLimitMinorUnits: ComplianceValue<number>;
}

export type ReviewedField = Exclude<
  keyof CampaignComplianceRulePack,
  "packId" | "jurisdictionKey"
>;

export interface ReviewedRecord {
  readonly field: ReviewedField;
  readonly sourceTitle?: string;
  readonly status:
    "KNOWN" | "UNKNOWN" | "NO_REQUIREMENT_FOUND" | "NOT_APPLICABLE";
  readonly value: unknown;
  readonly artifactId: string | null;
  readonly artifactSha256: string | null;
  readonly sourceUrl: string | null;
  readonly legalLocator: string | null;
  readonly excerpt: string | null;
  readonly sourceRetrievedAt: string | null;
  readonly sourceStatedVintage: string | null;
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
  readonly reason?: string;
}

export function reviewedRecord(
  jurisdictionKey: string,
  field: ReviewedField,
): ReviewedRecord {
  const reviewedPack =
    reviewedPacksByPlace[jurisdictionKey as keyof typeof reviewedPacksByPlace];
  const record = reviewedPack?.records.find(
    (candidate) => candidate.field === field,
  );
  if (!record)
    throw new Error(
      `${jurisdictionKey} reviewed transport is missing ${field}.`,
    );
  return {
    ...(record as ReviewedRecord),
    sourceTitle: reviewedPack?.sourceTitle,
  };
}

export function sourceFor(
  record: ReviewedRecord,
  reviewedPack: (typeof reviewedPacksByPlace)[keyof typeof reviewedPacksByPlace],
): ComplianceSourceRef {
  if (
    record.sourceUrl === null ||
    record.legalLocator === null ||
    record.artifactId === null ||
    record.artifactSha256 === null ||
    record.excerpt === null ||
    record.sourceRetrievedAt === null ||
    record.supportCoverageFrom === null
  ) {
    throw new Error(`${record.field} has no reviewed source transport.`);
  }
  return {
    sourceTitle: record.sourceTitle ?? "Reviewed campaign-finance source",
    sourceUrl: record.sourceUrl,
    legalLocator: record.legalLocator,
    sourceArtifactId: record.artifactId,
    sourceArtifactSha256: record.artifactSha256,
    sourceExcerpt: record.excerpt,
    sourceRetrievedAt: record.sourceRetrievedAt,
    sourceStatedVintage: record.sourceStatedVintage,
    sourceVersionEffectiveOn: record.sourceVersionEffectiveOn as IsoDate | null,
    claimEffectiveOn: record.claimEffectiveOn as IsoDate | null,
    claimEffectiveBasisArtifactId: record.claimEffectiveBasisArtifactId ?? null,
    claimEffectiveBasisArtifactSha256:
      record.claimEffectiveBasisArtifactSha256 ?? null,
    claimEffectiveBasisLocator: record.claimEffectiveBasisLocator ?? null,
    claimEffectiveBasisExcerpt: record.claimEffectiveBasisExcerpt ?? null,
    amendmentEvidenceArtifactId: record.amendmentEvidenceArtifactId ?? null,
    amendmentEvidenceArtifactSha256:
      record.amendmentEvidenceArtifactSha256 ?? null,
    amendmentEvidenceLocator: record.amendmentEvidenceLocator ?? null,
    amendmentEvidenceExcerpt: record.amendmentEvidenceExcerpt ?? null,
    supportCoverageFrom: record.supportCoverageFrom as IsoDate,
    transportKind: "reviewed-transcription",
    reviewId: reviewedPack.reviewId,
    reviewedOn: reviewedPack.reviewedOn as IsoDate,
    researchLineage:
      "Field-reviewed against the hash-locked first-party artifact; no date is inferred from amendment history.",
  };
}

export function reviewedValue<T>(
  jurisdictionKey: string,
  field: ReviewedField,
  onDate: IsoDate,
): ComplianceValue<T> {
  const record = reviewedRecord(jurisdictionKey, field);
  const reviewedPack =
    reviewedPacksByPlace[jurisdictionKey as keyof typeof reviewedPacksByPlace];
  if (!reviewedPack) {
    throw new Error(
      `No reviewed campaign-compliance row for ${jurisdictionKey}.`,
    );
  }
  if (record.status === "UNKNOWN") {
    return { state: "UNKNOWN", reason: record.reason ?? "Unknown." };
  }
  if (record.status === "NOT_APPLICABLE") {
    return {
      state: "NOT_APPLICABLE",
      reason: record.reason ?? "Not applicable.",
    };
  }
  if (record.status === "NO_REQUIREMENT_FOUND") {
    const source = sourceFor(record, reviewedPack);
    return onDate < source.supportCoverageFrom
      ? {
          state: "UNKNOWN",
          reason: `The reviewed evidence supports this no-requirement finding from ${source.supportCoverageFrom}; it does not establish the finding on ${onDate}.`,
          source,
        }
      : { state: "NO_REQUIREMENT_FOUND", source };
  }
  const source = sourceFor(record, reviewedPack);
  if (onDate < source.supportCoverageFrom) {
    return {
      state: "UNKNOWN",
      reason: `The reviewed evidence supports this field from ${source.supportCoverageFrom}; it does not establish applicability on ${onDate}.`,
      source,
    };
  }
  return { state: "KNOWN", value: record.value as T, source };
}
