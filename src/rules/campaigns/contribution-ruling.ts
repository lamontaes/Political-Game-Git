// STOPGAP(RULES3-CAM-007): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/campaign-compliance-rules.ts; RULES-3, 2026-10-11.
import type { CampaignRecord, EntityId } from "../../simulation/types";
import type { IsoDate } from "../../simulation/types";

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
  readonly sourceRetrievedAt: string;
  readonly sourceStatedVintage: string | null;
  readonly provisionValidity:
    | {
        readonly kind: "EXACT_INTERVAL";
        readonly validFrom: IsoDate;
        readonly validThrough: IsoDate | null;
        readonly amendmentAnnotations: readonly string[];
      }
    | {
        readonly kind: "CURRENT_OBSERVATION";
        readonly observedOn: IsoDate;
        readonly reason: string;
        readonly amendmentAnnotations: readonly string[];
      }
    | {
        readonly kind: "UNKNOWN";
        readonly amendmentAnnotations: readonly string[];
      };
}

export interface DateBoundCampaignComplianceObligation extends CampaignComplianceObligation {
  readonly temporalApplicability:
    | { readonly state: "SUPPORTED" }
    | { readonly state: "UNKNOWN"; readonly reason: string };
}

export function temporalApplicability(
  row: CampaignComplianceObligation,
  onDate: IsoDate,
): DateBoundCampaignComplianceObligation["temporalApplicability"] {
  const validity = row.provisionValidity;
  if (validity.kind === "EXACT_INTERVAL") {
    if (onDate < validity.validFrom) {
      return {
        state: "UNKNOWN",
        reason: `The acquired evidence supports this provision from ${validity.validFrom}; it does not establish the rule on ${onDate}.`,
      };
    }
    if (validity.validThrough !== null && onDate > validity.validThrough) {
      return {
        state: "UNKNOWN",
        reason: `The acquired evidence supports this provision only through ${validity.validThrough}; it does not establish the rule on ${onDate}.`,
      };
    }
    return { state: "SUPPORTED" };
  }
  if (validity.kind === "CURRENT_OBSERVATION") {
    return onDate < validity.observedOn
      ? {
          state: "UNKNOWN",
          reason: `A source observed on ${validity.observedOn} does not establish historical applicability on ${onDate}.`,
        }
      : { state: "SUPPORTED" };
  }
  return {
    state: "UNKNOWN",
    reason: `The acquired source does not establish when this provision applied on ${onDate}.`,
  };
}

export type ComplianceDecision =
  "allowed" | "refused" | "unregulated" | "unresolved";

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

export function assessContribution(
  facts: {
    readonly campaign: CampaignRecord | null;
    readonly obligations: readonly DateBoundCampaignComplianceObligation[];
    readonly committeeExists: boolean;
    readonly otherContributionsMinorUnits: number;
  },
  input: ContributionRulingInput,
): ComplianceRuling {
  const campaign = facts.campaign;
  if (!campaign) {
    throw new Error(
      "Campaign-finance compliance was asked about a campaign that is not in the world.",
    );
  }
  const obligations = facts.obligations;
  const organizedCommitteeRule = obligations.find(
    (row) => row.obligation === "organized-committee-with-treasurer-required",
  );
  if (organizedCommitteeRule) {
    if (organizedCommitteeRule.temporalApplicability.state === "UNKNOWN") {
      return {
        decision: "unresolved",
        reason: organizedCommitteeRule.temporalApplicability.reason,
        citation: organizedCommitteeRule.legalLocator,
        authorityUrl: organizedCommitteeRule.authorityUrl,
        obligation: organizedCommitteeRule.obligation,
      };
    }
    const committee = facts.committeeExists;
    if (
      !committee ||
      input.statementOfOrganizationFiled !== true ||
      input.treasurerPersonId === null ||
      input.treasurerQualifiedElector !== true
    ) {
      return {
        decision: "refused",
        reason:
          "This committee cannot accept a contribution until its statement of organization is filed and it has a treasurer recorded as a qualified elector. Starting a campaign is not the same as filing, and the game will not guess whether the treasurer qualifies.",
        citation: organizedCommitteeRule.legalLocator,
        authorityUrl: organizedCommitteeRule.authorityUrl,
        obligation: organizedCommitteeRule.obligation,
      };
    }
    return {
      decision: "allowed",
      reason:
        "The statement of organization is filed and the treasurer is recorded as a qualified elector. That clears this contribution to be recorded; it does not approve the filing or the campaign.",
      citation: organizedCommitteeRule.legalLocator,
      authorityUrl: organizedCommitteeRule.authorityUrl,
      obligation: organizedCommitteeRule.obligation,
    };
  }
  const rule = obligations.find(
    (row) => row.obligation === "principal-campaign-committee-required",
  );
  if (rule?.temporalApplicability.state === "UNKNOWN") {
    return {
      decision: "unresolved",
      reason: rule.temporalApplicability.reason,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }
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

  const already = facts.otherContributionsMinorUnits;
  const fromCandidate = input.sourcePersonId === campaign.candidatePersonId;
  const after = already + (fromCandidate ? 0 : input.incomingMinorUnits);
  if (fromCandidate) {
    return {
      decision: "allowed",
      reason: `A candidate's own money does not count toward the $${(rule.thresholdMinorUnits / 100).toFixed(0)} limit. It still belongs to the campaign committee once it is recorded.`,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }
  if (after <= rule.thresholdMinorUnits) {
    return {
      decision: "allowed",
      reason: `Under the limit. The rule applies above $${(rule.thresholdMinorUnits / 100).toFixed(0)} in total from anyone but the candidate, and this campaign would be at $${(after / 100).toFixed(2)}.`,
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
  const committee = facts.committeeExists;
  if (!committee) {
    return {
      decision: "refused",
      reason: `A candidate cannot accept more than $${(rule.thresholdMinorUnits / 100).toFixed(0)} in total from anyone but themselves until they have designated a principal campaign committee, and this campaign has none.`,
      citation: rule.legalLocator,
      authorityUrl: rule.authorityUrl,
      obligation: rule.obligation,
    };
  }

  return {
    decision: "allowed",
    reason: `Above the $${(rule.thresholdMinorUnits / 100).toFixed(0)} limit, which is allowed here because this campaign has designated a principal campaign committee.`,
    citation: rule.legalLocator,
    authorityUrl: rule.authorityUrl,
    obligation: rule.obligation,
  };
}
