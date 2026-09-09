import { addDays, daysBetween } from "./dates";
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

export type ComplianceValue<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
      readonly source: ComplianceSourceRef;
    }
  | { readonly state: "UNKNOWN"; readonly reason: string }
  | {
      readonly state: "NO_REQUIREMENT_FOUND";
      readonly source: ComplianceSourceRef;
    }
  | { readonly state: "NOT_APPLICABLE"; readonly reason: string };

export interface ComplianceSourceRef {
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly legalLocator: string;
  readonly retrievedAt: string;
  readonly effectiveDate: IsoDate | null;
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
  readonly electronicFilingSystem: ComplianceValue<"KEFMS">;
  readonly publicUponReceipt: ComplianceValue<boolean>;
  readonly amendmentTransport: ComplianceValue<"KEFMS">;
  readonly itemizationThresholdMinorUnits: ComplianceValue<number>;
  readonly noComminglingWithPersonalFunds: ComplianceValue<boolean>;
  readonly contributionLimitMinorUnits: ComplianceValue<number>;
}

const KRS_121_180: ComplianceSourceRef = {
  sourceTitle: "Kentucky Revised Statutes § 121.180",
  sourceUrl:
    "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
  legalLocator: "KRS 121.180(1), (3), (4), (8), and (9)",
  retrievedAt: "2026-09-08",
  effectiveDate: "2026-07-15" as IsoDate,
  researchLineage:
    "92M/KY verified against the current first-party statute after HB 139",
};

const KREF_FAQ: ComplianceSourceRef = {
  sourceTitle:
    "Kentucky Registry of Election Finance — Frequently Asked Questions",
  sourceUrl: "https://kref.ky.gov/Pages/Frequently-Asked-Questions.aspx",
  legalLocator: "Candidate FAQs: amending spending intent and candidate funds",
  retrievedAt: "2026-09-08",
  effectiveDate: null,
  researchLineage:
    "45 Part 1 and 92M/KY verified against current Registry guidance",
};

function known<T>(value: T, source: ComplianceSourceRef): ComplianceValue<T> {
  return { state: "KNOWN", value, source };
}

export const KENTUCKY_CAMPAIGN_COMPLIANCE_PACK: CampaignComplianceRulePack = {
  packId: "us-ky-candidate-campaign-compliance-v1",
  jurisdictionKey: "US-KY",
  statementOfIntentWithinDays: known(5, KRS_121_180),
  reportingThresholdMinorUnits: known(500_000, KRS_121_180),
  reportSchedules: known(
    [
      "60-day-preelection",
      "30-day-preelection",
      "15-day-preelection",
      "30-day-postelection",
    ],
    KRS_121_180,
  ),
  electronicFilingSystem: known("KEFMS", KRS_121_180),
  publicUponReceipt: known(true, KRS_121_180),
  amendmentTransport: known("KEFMS", KREF_FAQ),
  itemizationThresholdMinorUnits: known(20_000, KRS_121_180),
  noComminglingWithPersonalFunds: known(true, KRS_121_180),
  contributionLimitMinorUnits: {
    state: "UNKNOWN",
    reason:
      "The 2026 legislation changed contribution limits, and no amount is promoted from the secondary 92M synthesis without a field-specific current first-party compilation.",
  },
};

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
    ? KENTUCKY_CAMPAIGN_COMPLIANCE_PACK
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

function requiredDueDate(
  electionDate: IsoDate,
  schedule: CampaignComplianceDocumentRecord["schedule"],
): IsoDate | null {
  switch (schedule) {
    case "60-day-preelection":
      return addDays(electionDate, -60);
    case "30-day-preelection":
      return addDays(electionDate, -30);
    case "15-day-preelection":
      return addDays(electionDate, -15);
    case "30-day-postelection":
      return addDays(electionDate, 30);
    case "initial":
    case "correction":
      return null;
  }
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
  if (input.status === "filed" && input.transport !== "KEFMS") {
    throw new Error("Kentucky campaign-compliance filings must use KEFMS.");
  }
  if (input.status === "draft" && input.transport !== null) {
    throw new Error("A private draft has no filing transport yet.");
  }
  const contest = requireElectionContest(world, campaign.contestId);
  const statutoryDue = requiredDueDate(contest.electionDate, input.schedule);
  if (statutoryDue !== null && input.dueOn !== statutoryDue) {
    throw new Error(
      `${input.schedule} is due on ${statutoryDue}, not ${input.dueOn}.`,
    );
  }
  if (input.kind === "statement-of-spending-intent") {
    if (input.schedule !== "initial" || input.amendsDocumentId !== null) {
      throw new Error(
        "An initial spending-intent statement must use the initial schedule.",
      );
    }
    if (daysBetween(campaign.filedAt, input.dueOn) > 5) {
      throw new Error(
        "The spending-intent statement deadline exceeds five days after candidacy filing.",
      );
    }
  }
  let amended: CampaignComplianceDocumentRecord | null = null;
  if (input.kind === "amendment") {
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
      input.status === "filed" ? "public-record" : "committee-private",
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
  readonly requiresItemization: boolean;
  readonly refusals: readonly string[];
}

/** A recordability gate, not a contribution-limit approval engine. */
export function assessKentuckyCampaignContribution(
  input: CampaignContributionInput,
): CampaignContributionAssessment {
  const refusals: string[] = [];
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
  const requiresItemization = input.amountMinorUnits > 20_000;
  if (input.contributorKind === "unknown") {
    refusals.push(
      "The contributor is unknown; the game cannot infer an eligible source or a contribution limit.",
    );
  }
  if (
    requiresItemization &&
    (!input.contributorName?.trim() ||
      !input.contributorAddress?.trim() ||
      !input.employer?.trim() ||
      !input.occupation?.trim())
  ) {
    refusals.push(
      "A contribution over $200 lacks the contributor details required for itemization.",
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
