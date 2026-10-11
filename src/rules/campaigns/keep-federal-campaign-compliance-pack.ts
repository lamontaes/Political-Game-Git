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

export function campaignCompliancePackIdForPlace(
  jurisdictionKey: string,
): string {
  return (
    reviewedPacksByPlace[jurisdictionKey as keyof typeof reviewedPacksByPlace]
      ?.packId ?? "federal-campaign-compliance-estimated-v1"
  );
}

export const FEDERAL_BASELINE_ESTIMATE = "federal campaign finance rules";

export function federalCampaignCompliancePack(
  jurisdictionKey: string,
): CampaignComplianceRulePack {
  const estimate = <T>(value: T): ComplianceValue<T> => ({
    state: "KNOWN",
    value,
    estimatedFrom: FEDERAL_BASELINE_ESTIMATE,
  });
  return {
    packId: campaignCompliancePackIdForPlace(jurisdictionKey),
    jurisdictionKey,
    statementOfIntentWithinDays: {
      state: "KNOWN",
      value: 10,
      estimatedFrom: FEDERAL_BASELINE_ESTIMATE,
    },
    reportingThresholdMinorUnits: estimate(500_000),
    reportSchedules: estimate([
      "quarterly",
      "pre-election",
      "post-election",
      "year-end",
    ] as const),
    reportReceiptWithinBusinessDays: estimate(15),
    electronicFilingSystem: estimate("FEC"),
    publicUponReceipt: estimate(true),
    amendmentTransport: estimate("FEC"),
    itemizationThresholdMinorUnits: estimate(20_000),
    noComminglingWithPersonalFunds: estimate(true),
    contributionLimitMinorUnits: estimate(350_000),
  };
}
