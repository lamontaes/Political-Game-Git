import type {
  BeaCorpusManifest,
  BeaIndicatorCategory,
  BeaRegionalObservation,
  BeaValuationKind,
} from "./types.js";

export interface BeaValidationResult {
  valid: boolean;
  errors: string[];
}

const EXPECTED_VALUATIONS_BY_INDICATOR: Record<
  BeaIndicatorCategory,
  BeaValuationKind[]
> = {
  personal_income: ["nominal", "currency_amount"],
  per_capita_personal_income: ["nominal", "currency_amount"],
  gdp_nominal: ["nominal", "currency_amount"],
  gdp_real: ["real_chained"],
  population: ["headcount"],
  regional_price_parity: ["index"],
};

export function validateBeaObservations(
  observations: BeaRegionalObservation[],
): BeaValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < observations.length; i += 1) {
    const obs = observations[i];
    if (!obs) {
      errors.push(
        `Observation [index ${i}]: observation object is null or undefined.`,
      );
      continue;
    }
    const context = `Observation [index ${i}, id '${obs.id || "MISSING"}']`;

    // 1. ID uniqueness and presence
    if (!obs.id || typeof obs.id !== "string") {
      errors.push(`${context}: missing or non-string id.`);
    } else if (seenIds.has(obs.id)) {
      errors.push(`${context}: duplicate observation id '${obs.id}'.`);
    } else {
      seenIds.add(obs.id);
    }

    // 2. Geography keys
    if (!obs.geoid || typeof obs.geoid !== "string") {
      errors.push(`${context}: missing or non-string geoid.`);
    }
    if (!obs.geoName || typeof obs.geoName !== "string") {
      errors.push(`${context}: missing or non-string geoName.`);
    }
    if (!["state", "county", "msa", "national"].includes(obs.geoLevel)) {
      errors.push(
        `${context}: invalid geoLevel '${obs.geoLevel}'. Must be state, county, msa, or national.`,
      );
    }

    // 3. Time keys
    if (
      typeof obs.year !== "number" ||
      !Number.isInteger(obs.year) ||
      obs.year < 1900 ||
      obs.year > 2100
    ) {
      errors.push(
        `${context}: invalid year '${obs.year}'. Must be an integer between 1900 and 2100.`,
      );
    }

    // 4. Indicator category & valuation consistency
    const allowedValuations =
      EXPECTED_VALUATIONS_BY_INDICATOR[obs.indicatorCategory];
    if (!allowedValuations) {
      errors.push(
        `${context}: unrecognized indicatorCategory '${obs.indicatorCategory}'.`,
      );
    } else if (!obs.unit || !obs.unit.valuationKind) {
      errors.push(`${context}: missing unit metadata or valuationKind.`);
    } else if (!allowedValuations.includes(obs.unit.valuationKind)) {
      errors.push(
        `${context}: mismatched valuationKind '${obs.unit.valuationKind}' for indicatorCategory '${obs.indicatorCategory}'. Expected one of: ${allowedValuations.join(", ")}.`,
      );
    }

    // 5. Units & scaling metadata
    if (!obs.unit || !obs.unit.unitName) {
      errors.push(`${context}: missing unitName.`);
    }
    if (
      !obs.unit ||
      typeof obs.unit.scaleFactor !== "number" ||
      obs.unit.scaleFactor <= 0
    ) {
      errors.push(
        `${context}: invalid unit scaleFactor '${obs.unit?.scaleFactor}'. Must be positive number.`,
      );
    }

    // 6. Honest missing value preservation
    if (obs.isSuppressedOrMissing) {
      if (obs.value !== null) {
        errors.push(
          `${context}: marked as suppressed/missing but contains non-null value ${obs.value}.`,
        );
      }
    } else if (obs.value === null) {
      errors.push(
        `${context}: value is null but isSuppressedOrMissing is false.`,
      );
    } else if (typeof obs.value !== "number" || !Number.isFinite(obs.value)) {
      errors.push(
        `${context}: value must be a finite number or null when missing/suppressed.`,
      );
    }

    // 7. Source table lineage
    if (!obs.tableId || typeof obs.tableId !== "string") {
      errors.push(`${context}: missing tableId.`);
    }
    if (!obs.lineCode || typeof obs.lineCode !== "string") {
      errors.push(`${context}: missing lineCode.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBeaCorpusManifest(
  manifest: BeaCorpusManifest,
  observations: BeaRegionalObservation[],
): BeaValidationResult {
  const errors: string[] = [];

  if (manifest.corpusName !== "BEA Regional Economic Context Corpus Sidecar") {
    errors.push(`Manifest corpusName mismatch: '${manifest.corpusName}'`);
  }

  if (manifest.totalObservations !== observations.length) {
    errors.push(
      `Manifest totalObservations count (${manifest.totalObservations}) does not match actual observation count (${observations.length}).`,
    );
  }

  if (!manifest.sourceArtifacts || manifest.sourceArtifacts.length === 0) {
    errors.push("Manifest sourceArtifacts list is empty.");
  } else {
    for (const artifact of manifest.sourceArtifacts) {
      if (!artifact.artifactId || !artifact.sha256Hex) {
        errors.push(
          `Manifest sourceArtifact '${artifact.artifactId}' missing required artifactId or sha256Hex hash.`,
        );
      } else if (!/^[a-f0-9]{64}$/i.test(artifact.sha256Hex)) {
        errors.push(
          `Manifest sourceArtifact '${artifact.artifactId}' sha256Hex is not a valid 64-char hex string: '${artifact.sha256Hex}'.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBeaCorpus(
  observations: BeaRegionalObservation[],
  manifest: BeaCorpusManifest,
): BeaValidationResult {
  const obsValidation = validateBeaObservations(observations);
  const manifestValidation = validateBeaCorpusManifest(manifest, observations);

  const errors = [...obsValidation.errors, ...manifestValidation.errors];
  return {
    valid: errors.length === 0,
    errors,
  };
}
