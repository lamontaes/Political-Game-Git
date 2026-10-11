// STOPGAP(RULES3-CAM-003): see docs/plans/rules3/campaigns-stopgaps.json.
import type { CampaignComplianceRulePack } from "../../simulation/campaign-compliance";
// Lifted unchanged from src/simulation/campaign-donors.ts; RULES-3, 2026-10-11.
import limitResearch from "../../../data/research/campaign-reality/campaign-contribution-limits.json" with { type: "json" };

export const ESTIMATED_CAMPAIGN_CONTRIBUTION_LIMIT = {
  minorUnits: limitResearch.fallback.amountMinorUnits,
  currency: limitResearch.currency,
  estimated: limitResearch.fallback.estimated,
  basis: limitResearch.fallback.basis,
  source: limitResearch.fallback.source,
} as const;

export interface CampaignContributionLimit {
  readonly minorUnits: number;
  readonly estimated: boolean;
  readonly reason: string;
}

export function assessCampaignContribution(
  pack: CampaignComplianceRulePack | null,
): CampaignContributionLimit {
  const value = pack?.contributionLimitMinorUnits;
  if (value?.state === "KNOWN")
    return {
      minorUnits: value.value,
      estimated: false,
      reason: "Recorded state contribution limit.",
    };
  if (value?.state === "NO_REQUIREMENT_FOUND")
    return {
      minorUnits: Number.MAX_SAFE_INTEGER,
      estimated: false,
      reason: "The recorded pack found no contribution limit.",
    };
  return {
    minorUnits: ESTIMATED_CAMPAIGN_CONTRIBUTION_LIMIT.minorUnits,
    estimated: true,
    reason:
      "Estimated from similar states because this place has no accepted contribution-limit pack.",
  };
}
