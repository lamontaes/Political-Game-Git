import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { legislativeBlueprint } from "../simulation/legislation-scenarios";
import { standingAuthority } from "../simulation/legislation-program-families";
import { TRANSIT_PROGRAM_KEY } from "../simulation/legislation-transit-families";
import { LEGISLATIVE_RULE_PACKS } from "../simulation/legislature-rule-packs";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { MUNICIPAL_GOVERNMENTS_JSON } from "../simulation/municipal-governments.generated";
import { PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY } from "../simulation/public-fiscal";
import { taxPowerEvidenceFor } from "../simulation/tax-policy";
import {
  ALASKA_RECORDED_SITTING,
  ALASKA_REVENUE_RECORDED_SITTING,
} from "./legislative-authored-sitting";

/**
 * One funded-service route for every state: decision -> collected public cash
 * -> payment -> delivered service. Each required field is read from the
 * registry that already owns it, so a state runs the loop only when all of them
 * are admitted, and a refusal names exactly what is missing. Nothing here
 * grants a power, a decision or money; it only reports what the sources carry.
 */
export const FUNDED_SERVICE_FIELDS = [
  "legislative-procedure",
  "appropriation-decision",
  "revenue-decision",
  "tax-power",
  "funding-effective-date",
  "service-program",
  "public-account",
] as const;
export type FundedServiceField = (typeof FUNDED_SERVICE_FIELDS)[number];

const FIELD_LABEL: Readonly<Record<FundedServiceField, string>> = {
  "legislative-procedure": "compiled legislative procedure",
  "appropriation-decision":
    "member and executive decisions for an appropriation",
  "revenue-decision": "member and executive decisions for a revenue bill",
  "tax-power": "acquired state tax-power evidence",
  "funding-effective-date":
    "a sourced effective-date and availability rule for appropriations",
  "service-program": "an authored standing service program",
  "public-account": "a public receipts account that collected taxes can fund",
};

export interface FundedServiceReading {
  readonly field: FundedServiceField;
  readonly admitted: boolean;
  readonly basis: string;
}

export interface StateFundedServiceCapability {
  readonly jurisdictionKey: string;
  readonly name: string;
  readonly supported: boolean;
  readonly readings: readonly FundedServiceReading[];
  readonly missing: readonly FundedServiceField[];
}

export function resolveStateFundedServiceCapability(
  jurisdictionKey: string,
): StateFundedServiceCapability {
  const pack =
    LEGISLATIVE_RULE_PACKS.find(
      (entry) => entry.jurisdictionKey === jurisdictionKey,
    ) ?? null;
  // Recorded sittings exist only for this pack's authored content.
  const recordedSittingPackId = legislativeBlueprint("alaska").pack.packId;
  const sittings = pack !== null && pack.packId === recordedSittingPackId;
  const power = taxPowerEvidenceFor(jurisdictionKey);
  const reading = (
    field: FundedServiceField,
    admitted: boolean,
    admittedBasis: string,
    missingBasis: string,
  ): FundedServiceReading => ({
    field,
    admitted,
    basis: admitted ? admittedBasis : missingBasis,
  });
  const readings: FundedServiceReading[] = [
    reading(
      "legislative-procedure",
      pack !== null,
      `Rule pack ${pack?.packId}.`,
      "No legislative rule pack is compiled for this state.",
    ),
    reading(
      "appropriation-decision",
      sittings,
      `Recorded fictional sitting ${ALASKA_RECORDED_SITTING}.`,
      "No recorded sitting or decision evaluator supplies member and executive decisions for an appropriation.",
    ),
    reading(
      "revenue-decision",
      sittings,
      `Recorded fictional sitting ${ALASKA_REVENUE_RECORDED_SITTING}.`,
      "No recorded sitting or decision evaluator supplies member and executive decisions for a revenue bill.",
    ),
    reading(
      "tax-power",
      power !== null,
      `Acquired constitutional baseline dated ${power?.asOf}.`,
      "No acquired tax-power evidence supports a state tax.",
    ),
    reading(
      "funding-effective-date",
      power !== null &&
        jurisdictionKey === PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY,
      "Ninety days after enactment, with an authored 365-day availability.",
      "No sourced default effective date and availability rule is compiled for this state's appropriations.",
    ),
    reading(
      "service-program",
      standingAuthority(TRANSIT_PROGRAM_KEY) !== null,
      "Authored standing rural transit assistance program (fictional content).",
      "The authored standing transit program is unavailable.",
    ),
    reading(
      "public-account",
      power !== null,
      "Opened at zero with the first filed tax; only collected taxes add cash.",
      "Without a supported tax, no public receipts account can hold collected cash.",
    ),
  ];
  const missing = readings
    .filter((entry) => !entry.admitted)
    .map((entry) => entry.field);
  return {
    jurisdictionKey,
    name: stateJurisdictionForKey(jurisdictionKey)?.name ?? jurisdictionKey,
    supported: missing.length === 0,
    readings,
    missing,
  };
}

/** The player-facing refusal: what this state lacks, in words. */
export function fundedServiceRefusal(
  capability: StateFundedServiceCapability,
): string {
  return `Funded public service is not yet playable for ${capability.name}. Missing: ${capability.missing
    .map((field) => FIELD_LABEL[field])
    .join("; ")}.`;
}

export interface FundedServiceCoverage {
  readonly states: readonly StateFundedServiceCapability[];
  readonly local: {
    readonly governments: number;
    readonly stateKeys: number;
    readonly supported: number;
    readonly missing: readonly string[];
  };
}

/** All 50 states and every loaded local government, from existing registries. */
export function nationwideFundedServiceCoverage(): FundedServiceCoverage {
  const governments = JSON.parse(MUNICIPAL_GOVERNMENTS_JSON) as readonly {
    readonly key: string;
    readonly state: string;
  }[];
  return {
    states: ARTICLE_V_STATE_KEYS.map(resolveStateFundedServiceCapability),
    local: {
      governments: governments.length,
      stateKeys: new Set(governments.map((row) => row.state)).size,
      supported: 0,
      missing: [
        "a local appropriation -> payment -> delivery adapter (the route is state-only)",
        "local member and executive decisions consumed by that adapter",
        "local tax power and a local public receipts account",
      ],
    },
  };
}

export function renderFundedServiceCoverage(
  coverage: FundedServiceCoverage,
): string {
  const supported = coverage.states.filter((row) => row.supported);
  const lines = [
    "# Funded civic service coverage",
    "",
    "Generated by `node --import tsx scripts/civic-service/coverage.ts`; check",
    "with `--check`. Do not edit by hand.",
    "",
    "The funded-service route (appropriation and tax through their decisions,",
    "collected public cash, paid delivery) is resolved per state from the",
    "registries that own each field. A missing field limits only this route.",
    "",
    `States with the full route: ${supported.length} of ${coverage.states.length} (${
      supported.map((row) => row.name).join(", ") || "none"
    }).`,
    "",
    "| State | Route | Missing |",
    "| --- | --- | --- |",
    ...coverage.states.map(
      (row) =>
        `| ${row.name} | ${row.supported ? "playable" : "not yet"} | ${
          row.missing.join(", ") || "none"
        } |`,
    ),
    "",
    "## Local governments",
    "",
    `Loaded local governments: ${coverage.local.governments} across ${coverage.local.stateKeys} state keys. With the full route: ${coverage.local.supported}.`,
    "",
    "Every local government currently lacks:",
    "",
    ...coverage.local.missing.map((entry) => `- ${entry}`),
    "",
    "## Field meanings",
    "",
    ...FUNDED_SERVICE_FIELDS.map(
      (field) => `- \`${field}\`: ${FIELD_LABEL[field]}.`,
    ),
    "",
  ];
  return lines.join("\n");
}
