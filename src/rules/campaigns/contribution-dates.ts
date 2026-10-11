// Lifted unchanged from src/simulation/campaign-compliance-rules.ts; RULES-3, 2026-10-11.
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
