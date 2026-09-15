import type { IsoDate } from "../types";
import type { NationwideGovernmentScope } from "./government-jurisdiction";
import { rulesCapabilityResolver } from "./rules-capability-binding";

/**
 * The frozen rules-capability/v1 contract, as RULES TO PLAY published it.
 *
 * RULES owns the resolver and every value it admits. The nationwide producers
 * read legal facts ONLY through this port, so a field RULES widens reaches every
 * state and local unit without a producer change. Until RULES' module is in the
 * composition, the bridge below admits nothing: every requested field is
 * UNKNOWN, and the producers limit exactly the action that needs it.
 */
export const RULE_CAPABILITY_RESOLVER_VERSION = "rules-capability/v1";

export type RuleFieldKey =
  | "institution.form"
  | "body.seats"
  | "term.years"
  | "term.start"
  | "term.expiry"
  | "qualification.minimumAge"
  | "qualification.stateResidenceYears"
  | "qualification.districtResidenceYears"
  | "election.date"
  | "election.cycle"
  | "ordinance.passage"
  | "ordinance.introductionToPassage"
  | "ordinance.effective"
  | "finance.appropriationVote";

export type RuleCapabilityAction =
  | "inspect"
  | "stand-for-office"
  | "enter-office-term"
  | "introduce-ordinance"
  | "pass-ordinance"
  | "pass-appropriation";

export type RuleFieldState = "ADMITTED" | "UNKNOWN" | "NOT_APPLICABLE";

export interface ResolvedRuleField {
  readonly field: RuleFieldKey;
  readonly state: RuleFieldState;
  readonly value?: unknown;
  readonly ruleScope:
    | "state-constitution"
    | "state-statute"
    | "government-class"
    | "local-instrument"
    | null;
  readonly ruleVersion: string;
  readonly validFrom: string | null;
  readonly validThrough: string | null;
  readonly source: {
    readonly citation: string;
    readonly url: string | null;
    readonly artifactId: string | null;
  } | null;
  readonly reason: string | null;
}

export interface RuleCapabilityRequest {
  readonly scope: NationwideGovernmentScope;
  readonly officeKey?: string;
  readonly action: RuleCapabilityAction;
  readonly onDate: IsoDate;
  readonly fields: readonly RuleFieldKey[];
}

export interface RuleCapabilityResolution {
  readonly resolverVersion: typeof RULE_CAPABILITY_RESOLVER_VERSION;
  readonly action: RuleCapabilityAction;
  readonly onDate: IsoDate;
  readonly fields: readonly ResolvedRuleField[];
  /** Non-null only when a field this action needs is not admitted. */
  readonly refusal: string | null;
}

export type RuleCapabilityResolver = (
  request: RuleCapabilityRequest,
) => RuleCapabilityResolution;

const BRIDGE_VERSION = "nationwide-world-pre-rules-v1-bridge";

/** Admits nothing. Replaced by RULES' resolveCapability at composition. */
export const unadmittedRuleCapabilityResolver: RuleCapabilityResolver = (
  request,
) => ({
  resolverVersion: RULE_CAPABILITY_RESOLVER_VERSION,
  action: request.action,
  onDate: request.onDate,
  fields: request.fields.map((field) => ({
    field,
    state: "UNKNOWN",
    ruleScope: "state-constitution",
    ruleVersion: BRIDGE_VERSION,
    validFrom: null,
    validThrough: null,
    source: null,
    reason:
      "No admitted rule value is in this composition for this field; RULES TO PLAY owns admitting it.",
  })),
  refusal:
    request.fields.length === 0
      ? null
      : `${request.fields[0]} is not admitted for this government in this composition.`,
});

// Composition: RULES TO PLAY's rules-capability/v1 resolver is in this tree.
let activeResolver: RuleCapabilityResolver = rulesCapabilityResolver;

/** The one composition seam: LAND binds RULES' resolver here once. */
export function bindRuleCapabilityResolver(
  resolver: RuleCapabilityResolver,
): void {
  activeResolver = resolver;
}

export function resolveNationwideRuleCapability(
  request: RuleCapabilityRequest,
): RuleCapabilityResolution {
  return activeResolver(request);
}

export function admittedRuleField(
  resolution: RuleCapabilityResolution,
  field: RuleFieldKey,
): ResolvedRuleField | null {
  const found = resolution.fields.find((entry) => entry.field === field);
  return found?.state === "ADMITTED" ? found : null;
}

export function unadmittedRuleFields(
  resolution: RuleCapabilityResolution,
): readonly RuleFieldKey[] {
  return resolution.fields
    .filter((entry) => entry.state !== "ADMITTED")
    .map((entry) => entry.field);
}
