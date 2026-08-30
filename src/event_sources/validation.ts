import { AUTHORITATIVE_PROVIDER_REGISTRY } from "./registry";
import type {
  ExternalEventSourceContract,
  ProviderId,
  ProviderMetadata,
} from "./types";

export function getProviderMetadata(providerId: ProviderId): ProviderMetadata {
  const metadata = AUTHORITATIVE_PROVIDER_REGISTRY[providerId];
  if (!metadata) {
    throw new Error(`Unknown authoritative provider ID: ${providerId}`);
  }
  return metadata;
}

export function validateExternalEventSourceContract(
  contract: ExternalEventSourceContract,
): void {
  if (!contract.contractId || contract.contractId.trim().length === 0) {
    throw new Error("Contract must have a non-empty contractId.");
  }

  const provider = getProviderMetadata(
    contract.authoritativeProvider.providerId,
  );

  // Guard: Semantic non-conflation check
  if (contract.eventNature !== provider.reportedEventNature) {
    throw new Error(
      `Contract event nature (${contract.eventNature}) does not match provider reported nature (${provider.reportedEventNature}). Administrative declarations and physical hazards must not be conflated.`,
    );
  }

  // Guard: Seasonality must never impose hard prohibitions
  if (contract.seasonality.isHardProhibition !== false) {
    throw new Error(
      "Seasonal observations must never impose binary impossibility rules.",
    );
  }

  // Guard: Duration support must never impose arbitrary hard limits
  if (contract.durationSupport.hasHardLimits !== false) {
    throw new Error(
      "Event duration specs must not impose arbitrary hard min/max limits.",
    );
  }

  // Guard: Calibration enforcement - no ungrounded probability distributions
  if (contract.calibration.status === "calibrated") {
    if (
      !contract.calibration.derivationFormula ||
      !contract.calibration.empiricalBasis ||
      !contract.calibration.sourceArtifactHash
    ) {
      throw new Error(
        "Calibrated contracts must provide explicit derivation formulas, empirical basis descriptions, and verified source artifact hashes.",
      );
    }
    if (contract.calibration.samplePeriodYears <= 0) {
      throw new Error("Calibrated sample period must be greater than zero.");
    }
  } else if (contract.calibration.status === "unresolved_requires_research") {
    if (
      !contract.calibration.rationale ||
      contract.calibration.missingEvidence.length === 0
    ) {
      throw new Error(
        "Unresolved calibration status must specify explicit rationale and missing evidence requirements.",
      );
    }
  }

  if (contract.knownLimitations.length === 0) {
    throw new Error("Contract must state explicit known limitations.");
  }
}
