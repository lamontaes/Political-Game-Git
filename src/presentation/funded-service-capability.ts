import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { legislativeBlueprint } from "../simulation/legislation-scenarios";
import { standingAuthority } from "../simulation/legislation-program-families";
import { TRANSIT_PROGRAM_KEY } from "../simulation/legislation-transit-families";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { MUNICIPAL_GOVERNMENTS_JSON } from "../simulation/municipal-governments.generated";
import { PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY } from "../simulation/public-fiscal";
import {
  RULES_CAPABILITY_VERSION,
  resolveCapability,
} from "../simulation/rule-capability-resolver";
import { taxPowerEvidenceFor } from "../simulation/tax-policy";
import type { IsoDate } from "../simulation/types";
import {
  ALASKA_RECORDED_SITTING,
  ALASKA_REVENUE_RECORDED_SITTING,
} from "./legislative-authored-sitting";

/**
 * One funded-service route for every state: decision -> collected public cash
 * -> payment -> delivered service. The legal institution comes from RULES'
 * scoped resolver (rules-capability/v1); the fields that resolver does not
 * carry for a state (decision producers, tax power, the funding effective-date
 * rule, the authored program and the receipts account) are read from the
 * registry that owns each one and say so. A state runs the loop only when every
 * field is admitted, and a refusal names exactly what is missing. Nothing here
 * grants a power, a decision or money.
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
  "legislative-procedure": "a compiled legislative institution",
  "appropriation-decision":
    "member and executive decisions for an appropriation",
  "revenue-decision": "member and executive decisions for a revenue bill",
  "tax-power": "acquired state tax-power evidence",
  "funding-effective-date":
    "a sourced effective-date and availability rule for appropriations",
  "service-program": "an authored standing service program",
  "public-account": "a public receipts account that collected taxes can fund",
};

/** Fields rules-capability/v1 has no state-scope answer for, stated in each basis. */
const OUTSIDE_RULES = `Not a ${RULES_CAPABILITY_VERSION} state field; read from its own source.`;

export interface FundedServiceReading {
  readonly field: FundedServiceField;
  readonly admitted: boolean;
  readonly basis: string;
}

export interface StateFundedServiceCapability {
  readonly jurisdictionKey: string;
  readonly name: string;
  readonly onDate: IsoDate;
  readonly supported: boolean;
  readonly readings: readonly FundedServiceReading[];
  readonly missing: readonly FundedServiceField[];
}

export function resolveStateFundedServiceCapability(
  jurisdictionKey: string,
  onDate: IsoDate,
): StateFundedServiceCapability {
  // RULES decides whether the law this game has read establishes the state's
  // legislative institution on this date. Its refusal for an appropriation is
  // not used: that action's vote field is local-scope only in v1.
  const institution = resolveCapability({
    scope: { kind: "state", stateUsps: jurisdictionKey.replace(/^US-/, "") },
    action: "inspect",
    onDate,
  }).fields.find((entry) => entry.field === "institution.form");
  const institutionAdmitted = institution?.state === "ADMITTED";
  // Recorded sittings exist only for this jurisdiction's authored content.
  const sittings =
    institutionAdmitted &&
    legislativeBlueprint("alaska").pack.jurisdictionKey === jurisdictionKey;
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
      institutionAdmitted,
      `${RULES_CAPABILITY_VERSION} institution.form (${institution?.ruleVersion}): ${institution?.source?.citation ?? "admitted"}.`,
      `${RULES_CAPABILITY_VERSION} institution.form: ${institution?.reason ?? "not established"}`,
    ),
    reading(
      "appropriation-decision",
      sittings,
      `Recorded fictional sitting ${ALASKA_RECORDED_SITTING}. ${OUTSIDE_RULES}`,
      `No recorded sitting or decision evaluator supplies member and executive decisions for an appropriation. ${OUTSIDE_RULES}`,
    ),
    reading(
      "revenue-decision",
      sittings,
      `Recorded fictional sitting ${ALASKA_REVENUE_RECORDED_SITTING}. ${OUTSIDE_RULES}`,
      `No recorded sitting or decision evaluator supplies member and executive decisions for a revenue bill. ${OUTSIDE_RULES}`,
    ),
    reading(
      "tax-power",
      power !== null,
      `Acquired constitutional baseline dated ${power?.asOf}. ${OUTSIDE_RULES}`,
      `No acquired tax-power evidence supports a state tax. ${OUTSIDE_RULES}`,
    ),
    reading(
      "funding-effective-date",
      power !== null &&
        jurisdictionKey === PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY,
      `Ninety days after enactment, with an authored 365-day availability. ${OUTSIDE_RULES}`,
      `No sourced default effective date and availability rule is compiled for this state's appropriations. ${OUTSIDE_RULES}`,
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
    onDate,
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
  readonly onDate: IsoDate;
  readonly states: readonly StateFundedServiceCapability[];
  readonly local: {
    readonly governments: number;
    readonly stateKeys: number;
    readonly supported: number;
    readonly missing: readonly string[];
  };
}

/** All 50 states and every loaded local government, resolved on one date. */
export function nationwideFundedServiceCoverage(
  onDate: IsoDate,
): FundedServiceCoverage {
  const governments = JSON.parse(MUNICIPAL_GOVERNMENTS_JSON) as readonly {
    readonly key: string;
    readonly state: string;
  }[];
  return {
    onDate,
    states: ARTICLE_V_STATE_KEYS.map((key) =>
      resolveStateFundedServiceCapability(key, onDate),
    ),
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
    "collected public cash, paid delivery) is resolved per state on",
    `${coverage.onDate}. The legislative institution comes from`,
    `${RULES_CAPABILITY_VERSION}; the other fields come from the registries that`,
    "own them. A missing field limits only this route.",
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
