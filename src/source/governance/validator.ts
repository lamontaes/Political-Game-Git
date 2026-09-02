import { isValidSourceIsoDate } from "../sourced-value.js";
import type {
  CensusFipsIdentifiers,
  ConflictingValue,
  HistoricalValue,
  JurisdictionOfficeProfile,
  JurisdictionProfile,
  JurisdictionType,
  KnownValue,
  LegislativeStructure,
  NotApplicableValue,
  ProvenanceRecord,
  UnknownValue,
} from "./types.js";

export interface JurisdictionProfileValidationError {
  readonly path: string;
  readonly code:
    | "INVALID_STRUCTURE"
    | "INVALID_STATE"
    | "MISSING_PROVENANCE"
    | "INVALID_URL"
    | "INVALID_DATE"
    | "INVALID_VALUE"
    | "CONFLICTING_CLAIMS_COUNT"
    | "UNKNOWN_COERCION_ATTEMPT"
    | "CHAMBER_MODEL_MISMATCH";
  readonly message: string;
}

export interface JurisdictionProfileValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly JurisdictionProfileValidationError[];
}

const URL_SCHEME_PATTERN = /^(https?|urn|file):\/\/[^\s]+$/;

function isValidUrl(url: string): boolean {
  if (typeof url !== "string" || url.trim() === "") return false;
  return URL_SCHEME_PATTERN.test(url.trim());
}

function isValidIsoDateString(dateStr: string): boolean {
  // Uses the shared source-layer date rule rather than simulation's
  // `makeIsoDate`, so the source substrate stays free of gameplay imports.
  return isValidSourceIsoDate(dateStr);
}

function validateProvenance(
  path: string,
  provenance: unknown,
  errors: JurisdictionProfileValidationError[],
): void {
  if (!provenance || typeof provenance !== "object") {
    errors.push({
      path: `${path}.provenance`,
      code: "MISSING_PROVENANCE",
      message: "Provenance object is missing or invalid.",
    });
    return;
  }

  const p = provenance as Partial<ProvenanceRecord>;

  if (typeof p.sourceId !== "string" || p.sourceId.trim() === "") {
    errors.push({
      path: `${path}.provenance.sourceId`,
      code: "MISSING_PROVENANCE",
      message: "Provenance sourceId must be a non-empty string.",
    });
  }

  if (
    typeof p.authoritativeUrl !== "string" ||
    !isValidUrl(p.authoritativeUrl)
  ) {
    errors.push({
      path: `${path}.provenance.authoritativeUrl`,
      code: "INVALID_URL",
      message: `Invalid authoritative URL: "${String(p.authoritativeUrl)}". Must be a valid http, https, urn, or file URL.`,
    });
  }

  if (typeof p.publisher !== "string" || p.publisher.trim() === "") {
    errors.push({
      path: `${path}.provenance.publisher`,
      code: "MISSING_PROVENANCE",
      message: "Provenance publisher must be a non-empty string.",
    });
  }

  if (
    typeof p.effectiveDate !== "string" ||
    !isValidIsoDateString(p.effectiveDate)
  ) {
    errors.push({
      path: `${path}.provenance.effectiveDate`,
      code: "INVALID_DATE",
      message: `Invalid provenance effective date: "${String(p.effectiveDate)}". Must be YYYY-MM-DD.`,
    });
  }

  if (typeof p.locator !== "string" || p.locator.trim() === "") {
    errors.push({
      path: `${path}.provenance.locator`,
      code: "MISSING_PROVENANCE",
      message:
        "Provenance locator (article/section/table/record) must be a non-empty string.",
    });
  }

  if (
    typeof p.sourceClassification !== "string" ||
    p.sourceClassification.trim() === ""
  ) {
    errors.push({
      path: `${path}.provenance.sourceClassification`,
      code: "MISSING_PROVENANCE",
      message: "Provenance sourceClassification must be specified.",
    });
  }

  if (
    p.retrievedAt !== undefined &&
    (typeof p.retrievedAt !== "string" || !isValidIsoDateString(p.retrievedAt))
  ) {
    errors.push({
      path: `${path}.provenance.retrievedAt`,
      code: "INVALID_DATE",
      message: `Invalid provenance retrievedAt date: "${String(p.retrievedAt)}".`,
    });
  }
}

export function validateSourcedValue<T>(
  path: string,
  sourcedValue: unknown,
  errors: JurisdictionProfileValidationError[],
  valueValidator?: (
    valPath: string,
    val: T,
    errors: JurisdictionProfileValidationError[],
  ) => void,
): void {
  if (!sourcedValue || typeof sourcedValue !== "object") {
    errors.push({
      path,
      code: "INVALID_STRUCTURE",
      message: "SourcedValue must be an object with state indicator.",
    });
    return;
  }

  const sv = sourcedValue as Record<string, unknown>;

  if (typeof sv.state !== "string") {
    errors.push({
      path: `${path}.state`,
      code: "INVALID_STATE",
      message: "SourcedValue state must be a string.",
    });
    return;
  }

  switch (sv.state) {
    case "KNOWN": {
      const known = sv as unknown as KnownValue<T>;
      if (known.value === undefined || known.value === null) {
        errors.push({
          path: `${path}.value`,
          code: "INVALID_VALUE",
          message:
            "KNOWN state SourcedValue must contain a defined non-null value.",
        });
      } else if (valueValidator) {
        valueValidator(`${path}.value`, known.value, errors);
      }
      validateProvenance(path, known.provenance, errors);
      break;
    }

    case "UNKNOWN": {
      const unknownVal = sv as unknown as UnknownValue;
      if (
        "value" in unknownVal &&
        ((unknownVal as { value?: unknown }).value === false ||
          (unknownVal as { value?: unknown }).value === 0 ||
          (unknownVal as { value?: unknown }).value === "")
      ) {
        errors.push({
          path,
          code: "UNKNOWN_COERCION_ATTEMPT",
          message:
            "UNKNOWN state cannot contain a coerced default value (false, 0, or empty string). UNKNOWN must remain an uncoerced state object.",
        });
      }
      break;
    }

    case "NOT_APPLICABLE": {
      const na = sv as unknown as NotApplicableValue;
      if (typeof na.reason !== "string" || na.reason.trim() === "") {
        errors.push({
          path: `${path}.reason`,
          code: "INVALID_VALUE",
          message:
            "NOT_APPLICABLE state must provide a non-empty explanation reason.",
        });
      }
      break;
    }

    case "CONFLICTING": {
      const conflicting = sv as unknown as ConflictingValue<T>;
      if (!Array.isArray(conflicting.claims) || conflicting.claims.length < 2) {
        errors.push({
          path: `${path}.claims`,
          code: "CONFLICTING_CLAIMS_COUNT",
          message:
            "CONFLICTING state must contain at least 2 conflicting claims with distinct provenance records.",
        });
      } else {
        conflicting.claims.forEach((claimItem, index) => {
          const claimPath = `${path}.claims[${index}]`;
          if (!claimItem || typeof claimItem !== "object") {
            errors.push({
              path: claimPath,
              code: "INVALID_STRUCTURE",
              message: "Conflicting source claim must be an object.",
            });
          } else {
            if (claimItem.claim === undefined || claimItem.claim === null) {
              errors.push({
                path: `${claimPath}.claim`,
                code: "INVALID_VALUE",
                message:
                  "Conflicting claim must contain a defined claim value.",
              });
            } else if (valueValidator) {
              valueValidator(`${claimPath}.claim`, claimItem.claim, errors);
            }
            validateProvenance(claimPath, claimItem.provenance, errors);
          }
        });
      }
      break;
    }

    case "HISTORICAL": {
      const historical = sv as unknown as HistoricalValue<T>;
      if (historical.value === undefined || historical.value === null) {
        errors.push({
          path: `${path}.value`,
          code: "INVALID_VALUE",
          message: "HISTORICAL state must contain a defined superseded value.",
        });
      } else if (valueValidator) {
        valueValidator(`${path}.value`, historical.value, errors);
      }
      if (
        typeof historical.effectiveStart !== "string" ||
        !isValidIsoDateString(historical.effectiveStart)
      ) {
        errors.push({
          path: `${path}.effectiveStart`,
          code: "INVALID_DATE",
          message: `Invalid HISTORICAL effectiveStart date: "${String(historical.effectiveStart)}".`,
        });
      }
      if (
        typeof historical.effectiveEnd !== "string" ||
        !isValidIsoDateString(historical.effectiveEnd)
      ) {
        errors.push({
          path: `${path}.effectiveEnd`,
          code: "INVALID_DATE",
          message: `Invalid HISTORICAL effectiveEnd date: "${String(historical.effectiveEnd)}".`,
        });
      }
      validateProvenance(path, historical.provenance, errors);
      break;
    }

    default:
      errors.push({
        path: `${path}.state`,
        code: "INVALID_STATE",
        message: `Unrecognized SourcedValue state: "${String(sv.state)}". Must be KNOWN, UNKNOWN, NOT_APPLICABLE, CONFLICTING, or HISTORICAL.`,
      });
  }
}

function validateNonEmptyString(
  path: string,
  value: unknown,
  errors: JurisdictionProfileValidationError[],
): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push({
      path,
      code: "INVALID_VALUE",
      message: "Field must be a non-empty string.",
    });
  }
}

function validatePositiveNumber(
  path: string,
  value: unknown,
  errors: JurisdictionProfileValidationError[],
): void {
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    errors.push({
      path,
      code: "INVALID_VALUE",
      message: "Field must be a positive number.",
    });
  }
}

export function validateJurisdictionProfile(
  profile: unknown,
): JurisdictionProfileValidationResult {
  const errors: JurisdictionProfileValidationError[] = [];

  if (!profile || typeof profile !== "object") {
    return {
      isValid: false,
      errors: [
        {
          path: "root",
          code: "INVALID_STRUCTURE",
          message: "Profile must be a non-null object.",
        },
      ],
    };
  }

  const p = profile as Partial<JurisdictionProfile>;

  if (p.schemaVersion !== "1.0.0") {
    errors.push({
      path: "schemaVersion",
      code: "INVALID_VALUE",
      message: `Invalid schemaVersion: "${String(p.schemaVersion)}". Expected "1.0.0".`,
    });
  }

  if (typeof p.profileId !== "string" || p.profileId.trim() === "") {
    errors.push({
      path: "profileId",
      code: "INVALID_VALUE",
      message: "Profile profileId must be a non-empty string.",
    });
  }

  if (typeof p.isSynthetic !== "boolean") {
    errors.push({
      path: "isSynthetic",
      code: "INVALID_VALUE",
      message: "isSynthetic must be an explicit boolean.",
    });
  }

  // IDENTITY
  if (!p.identity || typeof p.identity !== "object") {
    errors.push({
      path: "identity",
      code: "INVALID_STRUCTURE",
      message: "Identity section is missing or invalid.",
    });
  } else {
    validateNonEmptyString(
      "identity.jurisdictionId",
      p.identity.jurisdictionId,
      errors,
    );
    validateSourcedValue<string>(
      "identity.officialName",
      p.identity.officialName,
      errors,
      (path, val) => validateNonEmptyString(path, val, errors),
    );
    validateSourcedValue<JurisdictionType>(
      "identity.jurisdictionType",
      p.identity.jurisdictionType,
      errors,
      (path, val) => validateNonEmptyString(path, val, errors),
    );
    validateSourcedValue<string>(
      "identity.postalAbbreviation",
      p.identity.postalAbbreviation,
      errors,
    );
    validateSourcedValue<CensusFipsIdentifiers>(
      "identity.censusFips",
      p.identity.censusFips,
      errors,
    );
    validateSourcedValue<string | null>(
      "identity.parentJurisdictionId",
      p.identity.parentJurisdictionId,
      errors,
    );
    validateSourcedValue<string>(
      "identity.effectiveDate",
      p.identity.effectiveDate,
      errors,
      (path, val) => {
        if (typeof val !== "string" || !isValidIsoDateString(val)) {
          errors.push({
            path,
            code: "INVALID_DATE",
            message: `Invalid effectiveDate ISO format: "${String(val)}".`,
          });
        }
      },
    );
    validateSourcedValue<string>(
      "identity.vintageDate",
      p.identity.vintageDate,
      errors,
      (path, val) => {
        if (typeof val !== "string" || !isValidIsoDateString(val)) {
          errors.push({
            path,
            code: "INVALID_DATE",
            message: `Invalid vintageDate ISO format: "${String(val)}".`,
          });
        }
      },
    );
  }

  // INSTITUTIONS
  if (!p.institutions || typeof p.institutions !== "object") {
    errors.push({
      path: "institutions",
      code: "INVALID_STRUCTURE",
      message: "Institutions section is missing or invalid.",
    });
  } else {
    validateSourcedValue(
      "institutions.executiveStructure",
      p.institutions.executiveStructure,
      errors,
    );
    validateSourcedValue<LegislativeStructure>(
      "institutions.legislativeChamberStructure",
      p.institutions.legislativeChamberStructure,
      errors,
      (path, leg) => {
        if (leg && typeof leg === "object") {
          if (
            leg.model === "BICAMERAL" &&
            Array.isArray(leg.chambers) &&
            leg.chambers.length !== 2
          ) {
            errors.push({
              path: `${path}.chambers`,
              code: "CHAMBER_MODEL_MISMATCH",
              message: `BICAMERAL legislative structure must have exactly 2 chambers (found ${leg.chambers.length}).`,
            });
          } else if (
            leg.model === "UNICAMERAL" &&
            Array.isArray(leg.chambers) &&
            leg.chambers.length !== 1
          ) {
            errors.push({
              path: `${path}.chambers`,
              code: "CHAMBER_MODEL_MISMATCH",
              message: `UNICAMERAL legislative structure must have exactly 1 chamber (found ${leg.chambers.length}).`,
            });
          }
        }
      },
    );
    validateSourcedValue(
      "institutions.judicialStructuralSummary",
      p.institutions.judicialStructuralSummary,
      errors,
    );
    validateSourcedValue(
      "institutions.constitutionalStatutoryOfficeTypes",
      p.institutions.constitutionalStatutoryOfficeTypes,
      errors,
    );
  }

  // OFFICES
  if (
    !p.offices ||
    typeof p.offices !== "object" ||
    !Array.isArray(p.offices.offices)
  ) {
    errors.push({
      path: "offices.offices",
      code: "INVALID_STRUCTURE",
      message: "Offices section offices array is missing or invalid.",
    });
  } else {
    p.offices.offices.forEach(
      (officeItem: JurisdictionOfficeProfile, idx: number) => {
        const officePath = `offices.offices[${idx}]`;
        validateNonEmptyString(
          `${officePath}.officeId`,
          officeItem.officeId,
          errors,
        );
        validateSourcedValue<string>(
          `${officePath}.officeType`,
          officeItem.officeType,
          errors,
          (path, val) => validateNonEmptyString(path, val, errors),
        );
        validateSourcedValue(
          `${officePath}.selectionMethod`,
          officeItem.selectionMethod,
          errors,
        );
        validateSourcedValue<number>(
          `${officePath}.termLengthYears`,
          officeItem.termLengthYears,
          errors,
          (path, val) => validatePositiveNumber(path, val, errors),
        );
        validateSourcedValue(
          `${officePath}.termLimits`,
          officeItem.termLimits,
          errors,
        );
        validateSourcedValue(
          `${officePath}.staggerRules`,
          officeItem.staggerRules,
          errors,
        );
        validateSourcedValue(
          `${officePath}.eligibilityRules`,
          officeItem.eligibilityRules,
          errors,
        );
      },
    );
  }

  // ELECTION STRUCTURE
  if (!p.electionStructure || typeof p.electionStructure !== "object") {
    errors.push({
      path: "electionStructure",
      code: "INVALID_STRUCTURE",
      message: "Election structure section is missing or invalid.",
    });
  } else {
    validateSourcedValue(
      "electionStructure.ordinaryCycleCadence",
      p.electionStructure.ordinaryCycleCadence,
      errors,
    );
    validateSourcedValue(
      "electionStructure.primaryElectionType",
      p.electionStructure.primaryElectionType,
      errors,
    );
    validateSourcedValue(
      "electionStructure.generalElectionType",
      p.electionStructure.generalElectionType,
      errors,
    );
    validateSourcedValue(
      "electionStructure.structuralTimingRules",
      p.electionStructure.structuralTimingRules,
      errors,
    );
    validateSourcedValue(
      "electionStructure.ruleSourceReferences",
      p.electionStructure.ruleSourceReferences,
      errors,
    );
  }

  // LOCAL GOVERNMENT STRUCTURE
  if (
    !p.localGovernmentStructure ||
    typeof p.localGovernmentStructure !== "object"
  ) {
    errors.push({
      path: "localGovernmentStructure",
      code: "INVALID_STRUCTURE",
      message: "Local government structure section is missing or invalid.",
    });
  } else {
    validateSourcedValue(
      "localGovernmentStructure.countyModel",
      p.localGovernmentStructure.countyModel,
      errors,
    );
    validateSourcedValue(
      "localGovernmentStructure.municipalClassifications",
      p.localGovernmentStructure.municipalClassifications,
      errors,
    );
    validateSourcedValue(
      "localGovernmentStructure.townshipStructure",
      p.localGovernmentStructure.townshipStructure,
      errors,
    );
    validateSourcedValue(
      "localGovernmentStructure.homeRuleConcepts",
      p.localGovernmentStructure.homeRuleConcepts,
      errors,
    );
    validateSourcedValue(
      "localGovernmentStructure.stateSpecificClassifications",
      p.localGovernmentStructure.stateSpecificClassifications,
      errors,
    );
  }

  // METADATA
  if (!p.metadata || typeof p.metadata !== "object") {
    errors.push({
      path: "metadata",
      code: "INVALID_STRUCTURE",
      message: "Metadata section is missing or invalid.",
    });
  } else {
    if (
      typeof p.metadata.createdAt !== "string" ||
      !isValidIsoDateString(p.metadata.createdAt)
    ) {
      errors.push({
        path: "metadata.createdAt",
        code: "INVALID_DATE",
        message: `Invalid metadata createdAt ISO date: "${String(p.metadata.createdAt)}".`,
      });
    }
    if (
      typeof p.metadata.lastUpdatedAt !== "string" ||
      !isValidIsoDateString(p.metadata.lastUpdatedAt)
    ) {
      errors.push({
        path: "metadata.lastUpdatedAt",
        code: "INVALID_DATE",
        message: `Invalid metadata lastUpdatedAt ISO date: "${String(p.metadata.lastUpdatedAt)}".`,
      });
    }
    validateNonEmptyString(
      "metadata.authorOrWorkerId",
      p.metadata.authorOrWorkerId,
      errors,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
