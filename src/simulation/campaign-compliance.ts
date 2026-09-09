import { daysBetween } from "./dates";
import { requireElectionContest } from "./election-contests";
import { createStableId } from "./ids";
import { lifePlaceByJurisdictionId } from "./life-places";
import { requireCampaign } from "./campaign-queries";
import type {
  CampaignComplianceDocumentRecord,
  CurrencyCode,
  EntityId,
  IsoDate,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";
import { KENTUCKY_COMPLIANCE_REVIEW } from "./campaign-compliance.generated";

export type ComplianceValue<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
      readonly source: ComplianceSourceRef;
    }
  | {
      readonly state: "UNKNOWN";
      readonly reason: string;
      readonly source?: ComplianceSourceRef;
    }
  | {
      readonly state: "NO_REQUIREMENT_FOUND";
      readonly source: ComplianceSourceRef;
    }
  | { readonly state: "NOT_APPLICABLE"; readonly reason: string };

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
  readonly electronicFilingSystem: ComplianceValue<"KEFMS">;
  readonly publicUponReceipt: ComplianceValue<boolean>;
  readonly amendmentTransport: ComplianceValue<"KEFMS">;
  readonly itemizationThresholdMinorUnits: ComplianceValue<number>;
  readonly noComminglingWithPersonalFunds: ComplianceValue<boolean>;
  readonly contributionLimitMinorUnits: ComplianceValue<number>;
}

type ReviewedField =
  (typeof KENTUCKY_COMPLIANCE_REVIEW.records)[number]["field"];
interface ReviewedRecord {
  readonly field: ReviewedField;
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

function reviewedRecord(field: ReviewedField): ReviewedRecord {
  const record = KENTUCKY_COMPLIANCE_REVIEW.records.find(
    (candidate) => candidate.field === field,
  );
  if (!record)
    throw new Error(`Kentucky reviewed transport is missing ${field}.`);
  return record as ReviewedRecord;
}

function sourceFor(record: ReviewedRecord): ComplianceSourceRef {
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
    sourceTitle:
      record.artifactId === "ky-kref-kefms-faq-2025"
        ? "Kentucky Registry of Election Finance — KEFMS FAQ"
        : "Kentucky Revised Statutes § 121.180",
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
    reviewId: KENTUCKY_COMPLIANCE_REVIEW.reviewId,
    reviewedOn: KENTUCKY_COMPLIANCE_REVIEW.reviewedOn as IsoDate,
    researchLineage:
      "Recovered 92M/45 claim, field-reviewed against the hash-locked first-party artifact; no date is inferred from amendment history.",
  };
}

function reviewedValue<T>(
  field: ReviewedField,
  onDate: IsoDate,
): ComplianceValue<T> {
  const record = reviewedRecord(field);
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
    const source = sourceFor(record);
    return onDate < source.supportCoverageFrom
      ? {
          state: "UNKNOWN",
          reason: `The reviewed evidence supports this no-requirement finding from ${source.supportCoverageFrom}; it does not establish the finding on ${onDate}.`,
          source,
        }
      : { state: "NO_REQUIREMENT_FOUND", source };
  }
  const source = sourceFor(record);
  if (onDate < source.supportCoverageFrom) {
    return {
      state: "UNKNOWN",
      reason: `The reviewed evidence supports this field from ${source.supportCoverageFrom}; it does not establish applicability on ${onDate}.`,
      source,
    };
  }
  return { state: "KNOWN", value: record.value as T, source };
}

function kentuckyCampaignCompliancePack(
  onDate: IsoDate,
): CampaignComplianceRulePack {
  return {
    packId: "us-ky-candidate-campaign-compliance-v1",
    jurisdictionKey: "US-KY",
    statementOfIntentWithinDays: reviewedValue<number>(
      "statementOfIntentWithinDays",
      onDate,
    ),
    reportingThresholdMinorUnits: reviewedValue<number>(
      "reportingThresholdMinorUnits",
      onDate,
    ),
    reportSchedules: reviewedValue<
      readonly CampaignComplianceDocumentRecord["schedule"][]
    >("reportSchedules", onDate),
    reportReceiptWithinBusinessDays: reviewedValue<number>(
      "reportReceiptWithinBusinessDays",
      onDate,
    ),
    electronicFilingSystem: reviewedValue<"KEFMS">(
      "electronicFilingSystem",
      onDate,
    ),
    publicUponReceipt: reviewedValue<boolean>("publicUponReceipt", onDate),
    amendmentTransport: reviewedValue<"KEFMS">("amendmentTransport", onDate),
    itemizationThresholdMinorUnits: reviewedValue<number>(
      "itemizationThresholdMinorUnits",
      onDate,
    ),
    noComminglingWithPersonalFunds: reviewedValue<boolean>(
      "noComminglingWithPersonalFunds",
      onDate,
    ),
    contributionLimitMinorUnits: reviewedValue<number>(
      "contributionLimitMinorUnits",
      onDate,
    ),
  };
}

export const KENTUCKY_CAMPAIGN_COMPLIANCE_PACK = kentuckyCampaignCompliancePack(
  KENTUCKY_COMPLIANCE_REVIEW.reviewedOn as IsoDate,
);

export function campaignCompliancePackFor(
  world: World,
  campaignId: EntityId,
): CampaignComplianceRulePack | null {
  const campaign = requireCampaign(world, campaignId);
  const stateKey = lifePlaceByJurisdictionId(
    campaign.jurisdictionId,
  )?.stateJurisdictionKey;
  return stateKey === KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.jurisdictionKey &&
    campaign.compliancePackId === KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.packId
    ? kentuckyCampaignCompliancePack(world.currentDate)
    : null;
}

export function campaignComplianceDocuments(
  world: World,
): readonly CampaignComplianceDocumentRecord[] {
  return world.history.campaignComplianceDocuments ?? [];
}

/** Public projection: private drafts are absent, not merely redacted. */
export function publicCampaignComplianceDocuments(
  world: World,
  campaignId: EntityId,
): readonly CampaignComplianceDocumentRecord[] {
  return campaignComplianceDocuments(world).filter(
    (record) =>
      record.campaignId === campaignId &&
      record.status === "filed" &&
      record.visibility === "public-record",
  );
}

/** Committee projection for the campaign feature; includes its own drafts. */
export function committeeCampaignComplianceDocuments(
  world: World,
  committeeOrganizationId: EntityId,
): readonly CampaignComplianceDocumentRecord[] {
  return campaignComplianceDocuments(world).filter(
    (record) => record.committeeOrganizationId === committeeOrganizationId,
  );
}

export interface RecordCampaignComplianceDocumentInput {
  readonly stableKey: string;
  readonly campaignId: EntityId;
  readonly kind: CampaignComplianceDocumentRecord["kind"];
  readonly schedule: CampaignComplianceDocumentRecord["schedule"];
  readonly periodStart: IsoDate | null;
  readonly periodEnd: IsoDate | null;
  readonly dueOn: IsoDate;
  readonly status: CampaignComplianceDocumentRecord["status"];
  readonly transport: "KEFMS" | null;
  readonly amendsDocumentId: EntityId | null;
  readonly correctionReason: string | null;
}

/**
 * Append a draft or a filing. Refusals are zero-write and the resulting record
 * says only "filed"—never accepted, approved, valid, or violation-free.
 */
export function recordCampaignComplianceDocument(
  world: World,
  input: RecordCampaignComplianceDocumentInput,
): World {
  assertWorldIntegrity(world);
  const before = JSON.stringify(world);
  const campaign = requireCampaign(world, input.campaignId);
  const pack = campaignCompliancePackFor(world, campaign.id);
  if (!pack) {
    throw new Error(
      "No accepted campaign-compliance pack covers this campaign.",
    );
  }
  if (input.stableKey.trim().length === 0) {
    throw new Error("A compliance document needs a stable key.");
  }
  if (
    campaignComplianceDocuments(world).some(
      (r) => r.stableKey === input.stableKey,
    )
  ) {
    throw new Error(
      `Campaign-compliance stable key already exists: ${input.stableKey}`,
    );
  }
  if ((input.periodStart === null) !== (input.periodEnd === null)) {
    throw new Error("A reporting period requires both a start and an end.");
  }
  if (
    input.periodStart &&
    input.periodEnd &&
    input.periodEnd < input.periodStart
  ) {
    throw new Error("A reporting period cannot end before it starts.");
  }
  if (input.status === "filed") {
    if (pack.electronicFilingSystem.state !== "KNOWN") {
      throw new Error(
        "The filing transport is UNKNOWN on this date; the game will not infer a valid filing channel.",
      );
    }
    if (input.transport !== pack.electronicFilingSystem.value) {
      throw new Error(
        `Kentucky campaign-compliance filings must use ${pack.electronicFilingSystem.value}.`,
      );
    }
    if (
      pack.publicUponReceipt.state !== "KNOWN" ||
      pack.publicUponReceipt.value !== true
    ) {
      throw new Error(
        "Public-record treatment is UNKNOWN on this date; the game will not expose a filing or call it private by inference.",
      );
    }
  }
  if (input.status === "draft" && input.transport !== null) {
    throw new Error("A private draft has no filing transport yet.");
  }
  requireElectionContest(world, campaign.contestId);
  if (
    input.schedule !== "initial" &&
    input.schedule !== "correction" &&
    (pack.reportSchedules.state !== "KNOWN" ||
      !pack.reportSchedules.value.includes(input.schedule))
  ) {
    throw new Error(
      "The selected reporting schedule is not supported by the date-bound rule pack.",
    );
  }
  if (input.kind === "periodic-report" && input.status === "filed") {
    if (pack.reportReceiptWithinBusinessDays.state !== "KNOWN") {
      throw new Error(
        "The report receipt window is UNKNOWN on this date; the game will not infer a deadline.",
      );
    }
    throw new Error(
      `This pack measures timely receipt ${pack.reportReceiptWithinBusinessDays.value} business days after the reporting period ends. The simulation has no Kentucky business-day calendar, so it will preserve a private draft but will not guess an exact filing deadline.`,
    );
  }
  if (input.kind === "statement-of-spending-intent") {
    if (input.schedule !== "initial" || input.amendsDocumentId !== null) {
      throw new Error(
        "An initial spending-intent statement must use the initial schedule.",
      );
    }
    if (input.status === "filed") {
      if (pack.statementOfIntentWithinDays.state !== "KNOWN") {
        throw new Error(
          "The statement-of-spending-intent deadline is UNKNOWN on this date.",
        );
      }
      const statementWindow = daysBetween(campaign.filedAt, input.dueOn);
      if (
        statementWindow < 0 ||
        statementWindow > pack.statementOfIntentWithinDays.value
      ) {
        throw new Error(
          `The spending-intent statement deadline must be within ${pack.statementOfIntentWithinDays.value} days after candidacy filing.`,
        );
      }
    }
  }
  let amended: CampaignComplianceDocumentRecord | null = null;
  if (input.kind === "amendment") {
    if (input.status === "filed" && pack.amendmentTransport.state !== "KNOWN") {
      throw new Error(
        "The amendment transport is UNKNOWN on this date; the game will not infer a correction channel.",
      );
    }
    amended =
      campaignComplianceDocuments(world).find(
        (record) => record.id === input.amendsDocumentId,
      ) ?? null;
    if (
      !amended ||
      amended.campaignId !== campaign.id ||
      amended.status !== "filed" ||
      input.schedule !== "correction" ||
      !input.correctionReason?.trim()
    ) {
      throw new Error(
        "An amendment must identify a filed document in this campaign and explain the correction.",
      );
    }
  } else if (
    input.amendsDocumentId !== null ||
    input.correctionReason !== null
  ) {
    throw new Error("Only an amendment may identify a corrected filing.");
  }

  const record: CampaignComplianceDocumentRecord = {
    id: createStableId(
      "campaign-compliance-document",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    campaignId: campaign.id,
    committeeOrganizationId: campaign.organizationId,
    rulePackId: pack.packId,
    kind: input.kind,
    schedule: input.schedule,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dueOn: input.dueOn,
    status: input.status,
    visibility:
      input.status === "filed" &&
      pack.publicUponReceipt.state === "KNOWN" &&
      pack.publicUponReceipt.value
        ? "public-record"
        : "committee-private",
    transport: input.transport,
    filedAt: input.status === "filed" ? world.currentDate : null,
    amendsDocumentId: amended?.id ?? null,
    correctionReason: input.correctionReason,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      campaignComplianceDocuments: [
        ...campaignComplianceDocuments(world),
        record,
      ],
    },
  };
  if (JSON.stringify(world) !== before) {
    throw new Error("Campaign-compliance recording mutated its input world.");
  }
  assertWorldIntegrity(next);
  return next;
}

export interface CampaignContributionInput {
  readonly onDate: IsoDate;
  readonly contributorKind: "candidate" | "individual" | "unknown";
  readonly amountMinorUnits: number;
  readonly currency: CurrencyCode;
  readonly contributorName: string | null;
  readonly contributorAddress: string | null;
  readonly employer: string | null;
  readonly occupation: string | null;
}

export interface CampaignContributionAssessment {
  readonly acceptableForRecording: boolean;
  readonly classification:
    "candidate-contribution" | "individual-contribution" | null;
  readonly requiresItemization: boolean | null;
  readonly refusals: readonly string[];
}

/** A recordability gate, not a contribution-limit approval engine. */
export function assessKentuckyCampaignContribution(
  input: CampaignContributionInput,
): CampaignContributionAssessment {
  const refusals: string[] = [];
  const threshold = kentuckyCampaignCompliancePack(
    input.onDate,
  ).itemizationThresholdMinorUnits;
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0
  ) {
    refusals.push(
      "A contribution amount must be a positive integer of minor currency units.",
    );
  }
  if (input.currency !== "USD") {
    refusals.push(
      "The accepted Kentucky pack states amounts in U.S. dollars only.",
    );
  }
  const requiresItemization =
    threshold.state === "KNOWN"
      ? input.amountMinorUnits > threshold.value
      : null;
  if (threshold.state !== "KNOWN") {
    refusals.push(
      `The itemization threshold is ${threshold.state} on ${input.onDate}; the game will not infer a recordability rule from a later source.`,
    );
  }
  if (input.contributorKind === "unknown") {
    refusals.push(
      "The contributor is unknown; the game cannot infer an eligible source or a contribution limit.",
    );
  }
  if (
    requiresItemization === true &&
    (!input.contributorName?.trim() ||
      !input.contributorAddress?.trim() ||
      !input.employer?.trim() ||
      !input.occupation?.trim())
  ) {
    refusals.push(
      `A contribution over $${(threshold.state === "KNOWN" ? threshold.value / 100 : 0).toFixed(0)} lacks the contributor details required for itemization.`,
    );
  }
  return {
    acceptableForRecording: refusals.length === 0,
    classification:
      refusals.length > 0 || input.contributorKind === "unknown"
        ? null
        : input.contributorKind === "candidate"
          ? "candidate-contribution"
          : "individual-contribution",
    requiresItemization,
    refusals,
  };
}
