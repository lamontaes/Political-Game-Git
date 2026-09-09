/**
 * Whether the law lets this campaign take this money, and whose law says so.
 *
 * The merged campaign system already owns a candidacy, a committee, the
 * committee's money and the work a campaign does. What it has never had is a
 * rule from outside itself: fundraising has been bounded by the hours in a day
 * and the money in the treasury, and by nothing a legislature ever passed.
 *
 * This is one rule from outside, for one state. Minnesota says a candidate must
 * not accept contributions from a source other than themselves, in aggregate,
 * above $750 unless they have designated a single principal campaign committee
 * — and may not form a second one. Both halves are read off Minn. Stat.
 * § 10A.105, subd. 1, and a Minnesota campaign in this game now runs under
 * them.
 *
 * The shape of the boundary matters as much as the rule. This module reads
 * canonical campaign, organization and resource state and returns a decision
 * with a sentence; it writes nothing, schedules nothing and moves no money. The
 * campaign system keeps its mutation path, and a caller that wants to refuse an
 * action asks first rather than being intercepted. That is the seam the
 * campaign and UI owners consume.
 *
 * What it will not do. It does not decide that anybody is corrupt, does not
 * score compliance, and does not model an enforcement action: the statute
 * creates an obligation, and an obligation is not a verdict. It does not reach
 * a campaign outside Minnesota, and it says so rather than falling back on
 * Minnesota's numbers — a Missouri campaign is unregulated *by this repository*,
 * which is a fact about the repository and not about Missouri.
 */

import {
  CAMPAIGN_COMPLIANCE_META,
  CAMPAIGN_COMPLIANCE_ROWS,
} from "./campaign-compliance.generated";
import { campaigns } from "./campaign-queries";
import {
  resourceFlowsForEndpoint,
  resourceFlowTermsAt,
} from "./resource-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import type { CampaignRecord, EntityId, World } from "./types";

export type CampaignObligationKind =
  | "principal-campaign-committee-required"
  | "single-principal-campaign-committee"
  | "organized-committee-with-treasurer-required";

export interface CampaignComplianceObligation {
  readonly jurisdictionKey: string;
  readonly regime: string;
  readonly obligation: CampaignObligationKind;
  readonly thresholdState: string;
  readonly thresholdMinorUnits: number | null;
  readonly thresholdCurrency: string | null;
  readonly thresholdAppliesTo: string | null;
  readonly legalLocator: string;
  readonly authorityUrl: string;
  readonly enactedExcerpt: string;
  readonly supportingEnactedExcerpts: readonly string[];
}

const ROWS: readonly CampaignComplianceObligation[] = JSON.parse(
  CAMPAIGN_COMPLIANCE_ROWS,
) as readonly CampaignComplianceObligation[];

export { CAMPAIGN_COMPLIANCE_META };

/** Every state whose campaign-finance law this repository has read. */
export const CAMPAIGN_COMPLIANCE_STATE_KEYS: readonly string[] = [
  ...new Set(ROWS.map((row) => row.jurisdictionKey)),
].sort();

export function campaignObligations(
  stateJurisdictionKey: string | null,
): readonly CampaignComplianceObligation[] {
  if (stateJurisdictionKey === null) return [];
  return ROWS.filter((row) => row.jurisdictionKey === stateJurisdictionKey);
}

/** The state whose law governs a campaign, by the place it is being run in. */
export function campaignStateJurisdictionKey(
  campaign: CampaignRecord,
): string | null {
  return (
    lifePlaceByJurisdictionId(campaign.jurisdictionId)?.stateJurisdictionKey ??
    null
  );
}

/**
 * What this committee has taken in from anybody but the candidate, to date.
 *
 * Read from the ordinary resource system rather than from a campaign-specific
 * counter, because the committee's money is a position like any other and a
 * second tally would eventually disagree with the first. Flows whose source is
 * the candidate are excluded, because the statute excludes them: "from a
 * source, other than self".
 */
export function contributionsFromOthersMinorUnits(
  world: World,
  campaign: CampaignRecord,
): number {
  const flows = resourceFlowsForEndpoint(world, {
    kind: "organization",
    organizationId: campaign.organizationId,
  });
  let total = 0;
  for (const flow of flows) {
    if (
      flow.recipient.kind !== "organization" ||
      flow.recipient.organizationId !== campaign.organizationId
    ) {
      continue;
    }
    if (
      flow.source.kind === "person" &&
      flow.source.personId === campaign.candidatePersonId
    ) {
      continue;
    }
    const terms = resourceFlowTermsAt(world, flow.id);
    if (!terms || terms.status === "expected") continue;
    if (terms.amount.currency !== campaign.treasuryCurrency) continue;
    total += terms.amount.minorUnits;
  }
  return total;
}

export type ComplianceDecision = "allowed" | "refused" | "unregulated";

export interface ComplianceRuling {
  readonly decision: ComplianceDecision;
  /** The sentence a player should read. */
  readonly reason: string;
  /** The provision that decided, where a real one did. */
  readonly citation: string | null;
  readonly authorityUrl: string | null;
  readonly obligation: CampaignObligationKind | null;
}

export interface ContributionRulingInput {
  readonly campaignId: EntityId;
  /** Null for a non-person source; exact person id when a person supplies it. */
  readonly sourcePersonId: EntityId | null;
  readonly incomingMinorUnits: number;
  /** Exact filing/treasurer facts required only where the compiled rule does. */
  readonly statementOfOrganizationFiled: boolean | null;
  readonly treasurerPersonId: EntityId | null;
  readonly treasurerQualifiedElector: boolean | null;
}

/**
 * Whether this campaign may accept this contribution.
 *
 * The obligation is not "do not take money"; it is "have a committee before you
 * take this much of it". So the ruling turns on whether a principal campaign
 * committee has been designated — which in canonical terms is whether the
 * campaign has an organization of its own — and on the aggregate the committee
 * has already taken from other people.
 */
export function assessContribution(
  world: World,
  input: ContributionRulingInput,
): ComplianceRuling {
  const campaign = campaigns(world).find(
    (record) => record.id === input.campaignId,
  );
  if (!campaign) {
    throw new Error(
      "Campaign-finance compliance was asked about a campaign that is not in the world.",
    );
  }
  const stateKey = campaignStateJurisdictionKey(campaign);
  const obligations = campaignObligations(stateKey);
  const organizedCommitteeRule = obligations.find(
    (row) => row.obligation === "organized-committee-with-treasurer-required",
  );
  if (organizedCommitteeRule) {
    const committee = world.history.organizations.find(
      (organization) => organization.id === campaign.organizationId,
    );
    if (
      !committee ||
      input.statementOfOrganizationFiled !== true ||
      input.treasurerPersonId === null ||
      input.treasurerQualifiedElector !== true
    ) {
      return {
        decision: "refused",
        reason: `${organizedCommitteeRule.legalLocator} bars this committee from accepting a contribution until its statement of organization is filed and it has a treasurer who is recorded as a qualified elector. The game will not treat campaign creation as filing approval or guess the treasurer's qualification.`,
        citation: organizedCommitteeRule.legalLocator,
        authorityUrl: organizedCommitteeRule.authorityUrl,
        obligation: organizedCommitteeRule.obligation,
      };
    }
    return {
      decision: "allowed",
      reason: `${organizedCommitteeRule.legalLocator}'s recorded organization-filing and qualified-treasurer prerequisites are satisfied. This is permission to record the contribution, not approval of a filing or of the campaign.`,
      citation: organizedCommitteeRule.legalLocator,
      authorityUrl: organizedCommitteeRule.authorityUrl,
      obligation: organizedCommitteeRule.obligation,
    };
  }
  const rule = obligations.find(
    (row) => row.obligation === "principal-campaign-committee-required",
  );
  if (!rule || rule.thresholdMinorUnits === null) {
    return {
      decision: "unregulated",
      reason:
        "The game has not read this state's campaign-finance law, so it imposes no filing or committee rule on this campaign. That is a limit of what has been read, not a statement that the state has no such law.",
      citation: null,
      authorityUrl: null,
      obligation: null,
    };
  }

  const already = contributionsFromOthersMinorUnits(world, campaign);
  const fromCandidate = input.sourcePersonId === campaign.candidatePersonId;
  const after = already + (fromCandidate ? 0 : input.incomingMinorUnits);
  if (fromCandidate) {
    return {
      decision: "allowed",
      reason: `${rule.legalLocator} excludes the candidate's own contribution from this $${(rule.thresholdMinorUnits / 100).toFixed(0)} aggregate threshold; the money still belongs to the campaign committee after it is recorded.`,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }
  if (after <= rule.thresholdMinorUnits) {
    return {
      decision: "allowed",
      reason: `Under the threshold: ${rule.legalLocator} bites above $${(rule.thresholdMinorUnits / 100).toFixed(0)} in aggregate from sources other than the candidate, and this campaign would be at $${(after / 100).toFixed(2)}.`,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }

  /*
   * Above the threshold, the question becomes whether the committee exists.
   *
   * A campaign in this world always has an organization — filing creates one —
   * so in ordinary play this is satisfied and the rule reads as a permission
   * rather than a refusal. It is still checked rather than assumed, because a
   * campaign record that lost its organization is exactly the state in which a
   * silent "allowed" would be a false statement about Minnesota law.
   */
  const committee = world.history.organizations.find(
    (organization) => organization.id === campaign.organizationId,
  );
  if (!committee) {
    return {
      decision: "refused",
      reason: `${rule.legalLocator} does not let a candidate accept more than $${(rule.thresholdMinorUnits / 100).toFixed(0)} in aggregate from anyone but themselves until they have designated a principal campaign committee, and this campaign has none.`,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }

  return {
    decision: "allowed",
    reason: `Above the $${(rule.thresholdMinorUnits / 100).toFixed(0)} threshold in ${rule.legalLocator}, which is permitted because this campaign has designated a principal campaign committee.`,
    citation: rule.legalLocator,
    authorityUrl: rule.authorityUrl,
    obligation: rule.obligation,
  };
}

/**
 * Whether this person may open another campaign committee.
 *
 * Minnesota's second obligation, and the one that actually refuses in ordinary
 * play: a candidate may not cause a second committee to be formed. A candidate
 * already running has one, so a second filing for the same office is refused by
 * the statute rather than by a rule of the game's own invention.
 *
 * A different office is a different matter — the statute says a single
 * committee "for each office sought" — so this refuses a second committee for a
 * campaign the person is already running, and says nothing about a later one.
 */
export interface SecondCommitteeRulingInput {
  readonly personId: EntityId;
  readonly stateJurisdictionKey: string | null;
  readonly officeKey: string;
}

export function assessSecondCommittee(
  world: World,
  input: SecondCommitteeRulingInput,
): ComplianceRuling {
  const rule = campaignObligations(input.stateJurisdictionKey).find(
    (row) => row.obligation === "single-principal-campaign-committee",
  );
  if (!rule) {
    return {
      decision: "unregulated",
      reason:
        "The game has not read this state's campaign-finance law, so it does not say whether a second committee is allowed here.",
      citation: null,
      authorityUrl: null,
      obligation: null,
    };
  }
  const existing = campaigns(world).find(
    (campaign) =>
      campaign.candidatePersonId === input.personId &&
      campaign.officeKey === input.officeKey &&
      campaignStateJurisdictionKey(campaign) === input.stateJurisdictionKey,
  );
  if (!existing) {
    return {
      decision: "allowed",
      reason: `${rule.legalLocator} permits a single principal campaign committee for each office sought, and this character has none.`,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }
  return {
    decision: "refused",
    reason: `${rule.legalLocator} does not let a candidate cause a second committee to be formed, and this character already has one running.`,
    citation: rule.legalLocator,
    authorityUrl: rule.authorityUrl,
    obligation: rule.obligation,
  };
}
