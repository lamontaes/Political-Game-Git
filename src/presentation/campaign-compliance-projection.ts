import {
  KENTUCKY_CAMPAIGN_COMPLIANCE_PACK,
  campaignCompliancePackFor,
  committeeCampaignComplianceDocuments,
  publicCampaignComplianceDocuments,
} from "../simulation/campaign-compliance";
import { requireCampaign } from "../simulation/campaign-queries";
import type {
  CampaignComplianceDocumentRecord,
  EntityId,
  World,
} from "../simulation/types";

export interface CampaignComplianceObligationView {
  readonly key: string;
  readonly state: "KNOWN" | "UNKNOWN" | "NO_REQUIREMENT_FOUND" | "NOT_APPLICABLE";
  readonly summary: string;
  readonly sourceUrl: string | null;
}

export interface CampaignComplianceView {
  readonly campaignId: EntityId;
  readonly audience: "public" | "committee-private";
  readonly packId: string | null;
  readonly obligations: readonly CampaignComplianceObligationView[];
  readonly documents: readonly CampaignComplianceDocumentRecord[];
  readonly treasuryBoundary: string;
}

function isCommitteeViewer(
  world: World,
  campaignId: EntityId,
  viewerPersonId: EntityId | null,
): boolean {
  if (viewerPersonId === null) return false;
  const campaign = requireCampaign(world, campaignId);
  if (campaign.candidatePersonId === viewerPersonId) return true;
  return campaign.staffWorkRelationshipIds.some(
    (relationshipId) =>
      world.history.workRelationships.find(
        (relationship) => relationship.id === relationshipId,
      )?.personId === viewerPersonId,
  );
}

function obligation(
  key: string,
  value:
    | typeof KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.statementOfIntentWithinDays
    | typeof KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.reportSchedules
    | typeof KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.electronicFilingSystem
    | typeof KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.amendmentTransport
    | typeof KENTUCKY_CAMPAIGN_COMPLIANCE_PACK.contributionLimitMinorUnits,
  knownSummary: (value: unknown) => string,
): CampaignComplianceObligationView {
  if (value.state === "KNOWN") {
    return {
      key,
      state: value.state,
      summary: knownSummary(value.value),
      sourceUrl: value.source.sourceUrl,
    };
  }
  return {
    key,
    state: value.state,
    summary:
      value.state === "UNKNOWN"
        ? value.reason
        : value.state === "NOT_APPLICABLE"
          ? value.reason
          : "The named authority was read and no requirement was found.",
    sourceUrl: value.state === "NO_REQUIREMENT_FOUND" ? value.source.sourceUrl : null,
  };
}

/** Feature-local adapter; it does not own navigation or campaign-clock state. */
export function projectCampaignCompliance(
  world: World,
  campaignId: EntityId,
  viewerPersonId: EntityId | null,
): CampaignComplianceView {
  const campaign = requireCampaign(world, campaignId);
  const pack = campaignCompliancePackFor(world, campaignId);
  const committeeViewer = isCommitteeViewer(world, campaignId, viewerPersonId);
  if (!pack) {
    return {
      campaignId,
      audience: committeeViewer ? "committee-private" : "public",
      packId: null,
      obligations: [],
      documents: committeeViewer
        ? committeeCampaignComplianceDocuments(world, campaign.organizationId)
        : publicCampaignComplianceDocuments(world, campaignId),
      treasuryBoundary:
        "Campaign money remains in the committee-owned resource position, separate from the candidate's personal resources.",
    };
  }
  return {
    campaignId,
    audience: committeeViewer ? "committee-private" : "public",
    packId: pack.packId,
    obligations: [
      obligation(
        "statement-of-spending-intent",
        pack.statementOfIntentWithinDays,
        (days) => `File the statement of spending intent within ${String(days)} days.`,
      ),
      obligation("report-schedules", pack.reportSchedules, (schedules) =>
        `Report schedules: ${(schedules as readonly string[]).join(", ")}.`,
      ),
      obligation("electronic-filing", pack.electronicFilingSystem, (system) =>
        `File through ${String(system)}.`,
      ),
      obligation("amendments", pack.amendmentTransport, (system) =>
        `Submit corrections through ${String(system)} as amendments.`,
      ),
      obligation("contribution-limit", pack.contributionLimitMinorUnits, () =>
        "A current contribution limit is known.",
      ),
    ],
    documents: committeeViewer
      ? committeeCampaignComplianceDocuments(world, campaign.organizationId)
      : publicCampaignComplianceDocuments(world, campaignId),
    treasuryBoundary:
      "Campaign money remains in the committee-owned resource position, separate from the candidate's personal resources.",
  };
}
