import { corpusCanonicalDigest } from "../../core/index";

export type CampaignComplianceResearchStatus =
  | "KNOWN"
  | "UNKNOWN"
  | "NO_REQUIREMENT_FOUND"
  | "NOT_APPLICABLE";

export interface CampaignComplianceResearchClaim {
  readonly recordId: string;
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly field: string;
  readonly status: CampaignComplianceResearchStatus;
  readonly value: string;
  /** Exact source label in 92M. It is not represented as a publisher URL. */
  readonly officialSourceLabel: string;
  readonly declaredSourceTier: string;
  readonly effectiveDate: string;
  readonly retrievalDate: string;
  readonly productionStatus: "staged-secondary-research";
  readonly blockedReason: string;
}

export interface CompiledCampaignComplianceResearchTransport {
  readonly documentId: string;
  readonly asOfDate: string;
  readonly recordCount: number;
  readonly canonicalSha256: string;
  readonly claims: readonly CampaignComplianceResearchClaim[];
}

const STATUSES = new Set<CampaignComplianceResearchStatus>([
  "KNOWN",
  "UNKNOWN",
  "NO_REQUIREMENT_FOUND",
  "NOT_APPLICABLE",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

/** Compile every 92M row exactly, while keeping its source gate closed. */
export function compileCampaignComplianceResearchTransport(
  bytes: Uint8Array,
): CompiledCampaignComplianceResearchTransport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString("utf-8"));
  } catch (cause) {
    throw new Error("The 92M research transport is not valid JSON.", { cause });
  }
  const root = object(parsed, "92M root");
  const jurisdictions = object(root.jurisdictions, "92M jurisdictions");
  const claims: CampaignComplianceResearchClaim[] = [];
  for (const [jurisdictionKey, rawJurisdiction] of Object.entries(jurisdictions)) {
    const jurisdiction = object(rawJurisdiction, jurisdictionKey);
    const jurisdictionId = requiredString(
      jurisdiction.jurisdiction_id,
      `${jurisdictionKey}.jurisdiction_id`,
    );
    if (jurisdictionId !== jurisdictionKey) {
      throw new Error(`${jurisdictionKey} does not match its jurisdiction_id.`);
    }
    const rules = object(jurisdiction.rules, `${jurisdictionKey}.rules`);
    for (const [field, rawRule] of Object.entries(rules)) {
      const rule = object(rawRule, `${jurisdictionKey}.${field}`);
      const status = requiredString(
        rule.status,
        `${jurisdictionKey}.${field}.status`,
      );
      if (!STATUSES.has(status as CampaignComplianceResearchStatus)) {
        throw new Error(`${jurisdictionKey}.${field} has unsupported status ${status}.`);
      }
      claims.push({
        recordId: `${jurisdictionId}:${field}`,
        jurisdictionId,
        jurisdictionName: requiredString(
          jurisdiction.name,
          `${jurisdictionKey}.name`,
        ),
        field,
        status: status as CampaignComplianceResearchStatus,
        value: requiredString(rule.value, `${jurisdictionKey}.${field}.value`),
        officialSourceLabel: requiredString(
          rule.official_source,
          `${jurisdictionKey}.${field}.official_source`,
        ),
        declaredSourceTier: requiredString(
          rule.source_tier,
          `${jurisdictionKey}.${field}.source_tier`,
        ),
        effectiveDate: requiredString(
          rule.effective_date,
          `${jurisdictionKey}.${field}.effective_date`,
        ),
        retrievalDate: requiredString(
          rule.retrieval_date,
          `${jurisdictionKey}.${field}.retrieval_date`,
        ),
        productionStatus: "staged-secondary-research",
        blockedReason:
          "92M carries a synthesized source label, not a locked publisher URL and artifact for this field; its declared source tier does not clear the production gate.",
      });
    }
  }
  claims.sort((left, right) => left.recordId.localeCompare(right.recordId));
  if (new Set(claims.map((claim) => claim.recordId)).size !== claims.length) {
    throw new Error("The 92M research transport contains duplicate jurisdiction/field rows.");
  }
  return {
    documentId: requiredString(root.document_id, "92M document_id"),
    asOfDate: requiredString(root.as_of_date, "92M as_of_date"),
    recordCount: claims.length,
    canonicalSha256: corpusCanonicalDigest(claims),
    claims,
  };
}
