/**
 * rules-capability/v1 — one scoped answer to "what does the law this game has
 * read say about this action, here, on this date?"
 *
 * The resolver does not hold rules of its own. It reads the compiled rule
 * domains that already exist — state legislative packs, office qualification
 * rows, supported term rules, municipal readings — and reports each field the
 * action touches as ADMITTED, NOT_APPLICABLE or UNKNOWN, with the scope the
 * rule came from and the dates it is supported for.
 *
 * Three rules keep it honest:
 *
 * 1. A missing field refuses only the action that needs it. An unknown filing
 *    deadline never hides an admitted minimum age, and an unread charter never
 *    hides the government itself.
 * 2. Scope is explicit. A state statute that binds every locality of a class
 *    is admitted for that class; a state default that yields to "other general
 *    or special law" is reported as an inherited default, not admitted, until
 *    the unit's own instrument is read. One city's charter is never a state's
 *    default.
 * 3. A government is a government unit, not a place. A census-designated place
 *    has no government of its own and resolves to nothing.
 */

import {
  CANDIDATE_QUALIFICATION_RULE_SETS,
  candidateQualificationRuleSet,
} from "./candidate-qualification";
import type { QualificationValue } from "./candidate-qualification";
import {
  governmentUnit,
  governmentUnitsForPlace,
  type GovernmentUnitIdentity,
} from "./government-units";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import type { LegislativeRulePack, RuleValue } from "./legislature-rules";
import { SUPPORTED_LEGISLATIVE_TERM_RULES } from "./legislative-term-rules";
import {
  municipalGovernments,
  municipalRulePackFor,
  primaryReading,
  type MunicipalGovernment,
} from "./municipal-government";
import {
  officeFamilyForChamberKey,
  officeQualification,
  qualificationStateLabel,
  stateName,
  type QualificationFieldName,
} from "./office-qualification-rules";
import type { IsoDate } from "./types";

export const RULES_CAPABILITY_VERSION = "rules-capability/v1";

export type GovernmentScope =
  | { readonly kind: "state"; readonly stateUsps: string }
  | { readonly kind: "local"; readonly governmentUnitId: string };

export type CapabilityField =
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

export type RuleScope =
  | "state-constitution"
  | "state-statute"
  | "government-class"
  | "local-instrument";

export interface ResolvedField {
  readonly field: CapabilityField;
  readonly state: "ADMITTED" | "UNKNOWN" | "NOT_APPLICABLE";
  readonly value?: unknown;
  readonly ruleScope: RuleScope | null;
  readonly ruleVersion: string;
  readonly validFrom: string | null;
  readonly validThrough: string | null;
  readonly source: {
    readonly citation: string;
    readonly url: string | null;
    readonly artifactId: string | null;
  } | null;
  readonly reason: string | null;
  /**
   * A state-level default that would apply unless the unit's own instrument
   * provides otherwise, reported but NOT admitted while that instrument is
   * unread.
   */
  readonly inheritedDefault?: {
    readonly value: unknown;
    readonly citation: string;
    readonly yieldsTo: string;
  };
}

export type CapabilityAction =
  | "inspect"
  | "stand-for-office"
  | "enter-office-term"
  | "introduce-ordinance"
  | "pass-ordinance"
  | "pass-appropriation";

export interface CapabilityResolution {
  readonly resolverVersion: typeof RULES_CAPABILITY_VERSION;
  readonly scope: GovernmentScope;
  readonly action: CapabilityAction;
  readonly onDate: IsoDate;
  readonly officeKey: string | null;
  readonly unit: GovernmentUnitIdentity | null;
  readonly fields: readonly ResolvedField[];
  /** Non-null only when a field this action needs is not established. */
  readonly refusal: string | null;
}

const REQUIRED: Readonly<Record<CapabilityAction, readonly CapabilityField[]>> =
  {
    inspect: [],
    "stand-for-office": [
      "qualification.minimumAge",
      "qualification.stateResidenceYears",
    ],
    "enter-office-term": ["term.years", "term.start"],
    // A form-of-government label decides nothing about passing an ordinance, so
    // it is reported but never required here.
    "introduce-ordinance": ["body.seats", "ordinance.passage"],
    "pass-ordinance": [
      "body.seats",
      "ordinance.passage",
      "ordinance.introductionToPassage",
      "ordinance.effective",
    ],
    "pass-appropriation": ["body.seats", "finance.appropriationVote"],
  };

const STATE_FIELDS: readonly CapabilityField[] = [
  "institution.form",
  "body.seats",
  "qualification.minimumAge",
  "qualification.stateResidenceYears",
  "qualification.districtResidenceYears",
  "term.years",
  "term.start",
  "term.expiry",
  "election.date",
  "election.cycle",
];

const LOCAL_FIELDS: readonly CapabilityField[] = [
  "institution.form",
  "body.seats",
  "ordinance.passage",
  "ordinance.introductionToPassage",
  "ordinance.effective",
  "finance.appropriationVote",
  "election.date",
  "election.cycle",
];

function unknownField(
  field: CapabilityField,
  reason: string,
  extra: Partial<ResolvedField> = {},
): ResolvedField {
  return {
    field,
    state: "UNKNOWN",
    ruleScope: null,
    ruleVersion: RULES_CAPABILITY_VERSION,
    validFrom: null,
    validThrough: null,
    source: null,
    reason,
    ...extra,
  };
}

function fromRuleValue<T>(
  field: CapabilityField,
  rule: RuleValue<T>,
  ruleScope: RuleScope,
  ruleVersion: string,
): ResolvedField {
  if (rule.kind === "known") {
    return {
      field,
      state: "ADMITTED",
      value: rule.value,
      ruleScope,
      ruleVersion,
      validFrom: null,
      validThrough: null,
      source: {
        citation: rule.source.citation,
        url: rule.source.sourceUrl,
        artifactId: null,
      },
      reason: null,
    };
  }
  if (rule.kind === "not-applicable") {
    return {
      field,
      state: "NOT_APPLICABLE",
      ruleScope,
      ruleVersion,
      validFrom: null,
      validThrough: null,
      source: null,
      reason: rule.note,
    };
  }
  return unknownField(field, rule.note);
}

// ---------------------------------------------------------------------------
// State scope
// ---------------------------------------------------------------------------

function statePack(stateUsps: string): LegislativeRulePack | null {
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) => pack.jurisdictionKey === `US-${stateUsps}`,
    ) ?? null
  );
}

const QUALIFICATION_FIELDS: Readonly<
  Partial<Record<CapabilityField, QualificationFieldName>>
> = {
  "qualification.minimumAge": "MINIMUM_AGE",
  "qualification.stateResidenceYears": "STATE_RESIDENCE",
  "qualification.districtResidenceYears": "DISTRICT_RESIDENCE",
};

const RULE_SET_FIELDS: Readonly<
  Partial<
    Record<
      CapabilityField,
      "minimumAge" | "stateResidenceYears" | "districtResidenceYears"
    >
  >
> = {
  "qualification.minimumAge": "minimumAge",
  "qualification.stateResidenceYears": "stateResidenceYears",
  "qualification.districtResidenceYears": "districtResidenceYears",
};

function fromRuleSetValue(
  field: CapabilityField,
  value: QualificationValue<number>,
  ruleVersion: string,
): ResolvedField {
  switch (value.state) {
    case "KNOWN":
      return {
        field,
        state: "ADMITTED",
        value: value.value,
        ruleScope: "state-constitution",
        ruleVersion,
        validFrom: value.source.provisionEffectiveOn,
        validThrough: null,
        source: {
          citation: value.source.legalLocator,
          url: value.source.sourceUrl,
          artifactId: null,
        },
        reason: null,
      };
    case "NOT_APPLICABLE":
      return {
        field,
        state: "NOT_APPLICABLE",
        ruleScope: "state-constitution",
        ruleVersion,
        validFrom: null,
        validThrough: null,
        source: null,
        reason: value.reason,
      };
    case "NO_REQUIREMENT_FOUND":
      return {
        field,
        state: "NOT_APPLICABLE",
        ruleScope: "state-constitution",
        ruleVersion,
        validFrom: null,
        validThrough: null,
        source: {
          citation: value.source.legalLocator,
          url: value.source.sourceUrl,
          artifactId: null,
        },
        reason: `${value.source.legalLocator} was read and imposes no such requirement.`,
      };
    default:
      return unknownField(field, value.reason);
  }
}

function qualificationField(
  field: CapabilityField,
  stateUsps: string,
  officeKey: string | null,
  onDate: IsoDate,
): ResolvedField {
  if (!officeKey) {
    return unknownField(
      field,
      "A qualification belongs to an office; none was named.",
    );
  }
  const packId = officeKey.split(":")[0]!;
  const ruleSet = candidateQualificationRuleSet(
    `${packId}:candidacy`,
    officeKey,
    onDate,
  );
  const setField = RULE_SET_FIELDS[field];
  if (ruleSet && setField) {
    return fromRuleSetValue(field, ruleSet[setField], ruleSet.ruleSetId);
  }
  const chamberKey = officeKey.split(":").at(-1) ?? "";
  const family = officeFamilyForChamberKey(chamberKey);
  const name = QUALIFICATION_FIELDS[field];
  if (!family || !name) {
    return unknownField(
      field,
      `No office family is declared for "${officeKey}", so no qualification row can be read for it.`,
    );
  }
  const row = officeQualification(`US-${stateUsps}`, family, name, onDate);
  if (!row) {
    return unknownField(
      field,
      `No accepted source in this repository states this requirement for ${officeKey}.`,
    );
  }
  const validity = row.provisionValidity;
  const interval =
    validity.state === "EXACT_INTERVAL"
      ? { validFrom: validity.validFrom, validThrough: validity.validThrough }
      : { validFrom: null, validThrough: null };
  const source = {
    citation: row.citation,
    url: row.authorityUrl || null,
    artifactId: null,
  };
  if (row.temporalApplicability.state === "UNKNOWN") {
    return unknownField(field, row.temporalApplicability.reason, {
      source,
      ...interval,
    });
  }
  if (row.sourceState === "KNOWN" && row.value !== null) {
    return {
      field,
      state: "ADMITTED",
      value: row.value,
      ruleScope: row.authorityType.toUpperCase().includes("CONSTITUTION")
        ? "state-constitution"
        : "state-statute",
      ruleVersion: `office-qualifications:${row.stateUsps}:${row.officeFamily}:${row.field}`,
      ...interval,
      source,
      reason: null,
    };
  }
  if (
    row.sourceState === "NO_REQUIREMENT_FOUND" ||
    row.sourceState === "NOT_APPLICABLE"
  ) {
    return {
      field,
      state: "NOT_APPLICABLE",
      ruleScope: "state-statute",
      ruleVersion: `office-qualifications:${row.stateUsps}:${row.officeFamily}:${row.field}`,
      ...interval,
      source,
      reason: `${qualificationStateLabel(row)} imposes no such requirement for this office.`,
    };
  }
  return unknownField(
    field,
    `The game does not know whether ${qualificationStateLabel(row)} sets this for this office.`,
    { source },
  );
}

function termRule(officeKey: string | null) {
  if (!officeKey) return null;
  return (
    SUPPORTED_LEGISLATIVE_TERM_RULES.find((rule) =>
      rule.officeKeys.some((key) => key === officeKey),
    ) ?? null
  );
}

function resolveStateField(
  field: CapabilityField,
  stateUsps: string,
  officeKey: string | null,
  onDate: IsoDate,
): ResolvedField {
  const pack = statePack(stateUsps);
  switch (field) {
    case "institution.form":
      return pack
        ? {
            field,
            state: "ADMITTED",
            value: pack.structure,
            ruleScope: "state-constitution",
            ruleVersion: pack.packId,
            validFrom: null,
            validThrough: null,
            source: pack.sources[0]
              ? {
                  citation: pack.sources[0].citation,
                  url: pack.sources[0].sourceUrl,
                  artifactId: null,
                }
              : null,
            reason: null,
          }
        : unknownField(
            field,
            `The game does not have ${stateName(stateUsps)}'s legislative rules.`,
          );
    case "body.seats": {
      if (!pack) {
        return unknownField(
          field,
          `The game does not have ${stateName(stateUsps)}'s legislative rules.`,
        );
      }
      const chamberKey = officeKey?.split(":").at(-1) ?? null;
      const chamber = pack.chambers.find(
        (candidate) => candidate.chamberKey === chamberKey,
      );
      if (!chamber) {
        return unknownField(
          field,
          officeKey
            ? `"${officeKey}" is not a chamber of ${pack.displayName}.`
            : "A seat count belongs to one chamber; none was named.",
        );
      }
      return fromRuleValue(
        field,
        chamber.seats,
        "state-constitution",
        pack.packId,
      );
    }
    case "qualification.minimumAge":
    case "qualification.stateResidenceYears":
    case "qualification.districtResidenceYears":
      return qualificationField(field, stateUsps, officeKey, onDate);
    case "term.years": {
      const rule = termRule(officeKey);
      return rule
        ? {
            field,
            state: "ADMITTED",
            value: rule.durationYears,
            ruleScope: "state-constitution",
            ruleVersion: rule.ruleVersion,
            validFrom: null,
            validThrough: null,
            source: {
              citation: rule.sourceNote,
              url: rule.sourceUrl,
              artifactId: null,
            },
            reason: null,
          }
        : unknownField(
            field,
            `The game does not know how long a term of this office runs.`,
          );
    }
    case "term.start": {
      const rule = termRule(officeKey);
      return rule
        ? {
            field,
            state: "ADMITTED",
            value: { kind: rule.commencement },
            ruleScope: "state-constitution",
            ruleVersion: rule.ruleVersion,
            validFrom: null,
            validThrough: null,
            source: {
              citation: rule.sourceNote,
              url: rule.sourceUrl,
              artifactId: null,
            },
            reason: null,
          }
        : unknownField(
            field,
            `The game does not know when a term of this office begins.`,
          );
    }
    case "term.expiry": {
      const rule = termRule(officeKey);
      return rule
        ? {
            field,
            state: "ADMITTED",
            value: { kind: "derived-from-start", years: rule.durationYears },
            ruleScope: "state-constitution",
            ruleVersion: rule.ruleVersion,
            validFrom: null,
            validThrough: null,
            source: {
              citation: rule.sourceNote,
              url: rule.sourceUrl,
              artifactId: null,
            },
            reason: null,
          }
        : unknownField(
            field,
            `A term's end follows from its length and its start, and the game knows neither for this office.`,
          );
    }
    case "election.date":
    case "election.cycle":
      return unknownField(
        field,
        `The game does not have ${stateName(stateUsps)}'s regular election calendar; elections here run on the game's own calendar.`,
      );
    default:
      return unknownField(field, `${field} is not a state-scope field.`);
  }
}

// ---------------------------------------------------------------------------
// Local scope
// ---------------------------------------------------------------------------

let byPublisherId: ReadonlyMap<string, MunicipalGovernment> | null = null;

/** The compiled municipal government whose identity names this Census unit. */
export function municipalGovernmentForUnit(
  unit: GovernmentUnitIdentity,
): MunicipalGovernment | null {
  if (!byPublisherId) {
    const map = new Map<string, MunicipalGovernment>();
    for (const government of municipalGovernments()) {
      const pid = government.identity?.publisherId;
      if (pid) {
        map.set(pid, government);
        continue;
      }
      // Without a declared identity link, a record reaches a unit only through
      // the Census place it names, and only where that place has exactly one
      // municipal government. Names are never matched.
      const units = government.placeGeoid
        ? governmentUnitsForPlace(government.placeGeoid).filter(
            (candidate) => candidate.unitType === "municipality",
          )
        : [];
      if (units.length === 1 && !map.has(units[0]!.publisherId)) {
        map.set(units[0]!.publisherId, government);
      }
    }
    byPublisherId = map;
  }
  return byPublisherId.get(unit.publisherId) ?? null;
}

/**
 * State statutes that bind every locality of a class, admitted for the class.
 *
 * Only a rule whose own text reaches the whole class without yielding to local
 * law belongs here. Code of Virginia § 15.2-1428 governs every locality's
 * governing body and does not yield to a charter; § 15.2-1427(A) yields to
 * "other general or special law" and is therefore only an inherited default.
 */
const CLASS_STATUTES: Readonly<
  Record<string, Partial<Record<CapabilityField, ResolvedField>>>
> = {
  VA: {
    "finance.appropriationVote": {
      field: "finance.appropriationVote",
      state: "ADMITTED",
      value: {
        appliesTo:
          "an ordinance or resolution appropriating more than $500, imposing taxes, or authorizing borrowing",
        basis: "MAJORITY_OF_ALL_ELECTED_MEMBERS",
        recordedYeaNay: true,
        overVeto:
          "two-thirds of all members elected, where the power of veto exists",
      },
      ruleScope: "government-class",
      ruleVersion: "va-code-15-2-1428",
      validFrom: null,
      validThrough: null,
      source: {
        citation: "Code of Virginia § 15.2-1428",
        url: "https://law.lis.virginia.gov/vacode/title15.2/chapter14/section15.2-1428/",
        artifactId: "va-code-15-2-1428",
      },
      reason:
        "A floor every Virginia locality's governing body must meet; a local instrument may add to it.",
    },
  },
};

const INHERITED_DEFAULTS: Readonly<
  Record<
    string,
    Partial<
      Record<CapabilityField, NonNullable<ResolvedField["inheritedDefault"]>>
    >
  >
> = {
  VA: {
    "ordinance.passage": {
      value: "majority of those present and voting at any lawful meeting",
      citation: "Code of Virginia § 15.2-1427(A)",
      yieldsTo:
        "the Constitution or other general or special law, including the unit's own charter, which has not been read",
    },
    "ordinance.effective": {
      value: "upon adoption or upon a date fixed by the governing body",
      citation: "Code of Virginia § 15.2-1427(B)",
      yieldsTo: "the unit's own ordinance or charter, which has not been read",
    },
  },
};

function resolveLocalField(
  field: CapabilityField,
  unit: GovernmentUnitIdentity,
): ResolvedField {
  const government = municipalGovernmentForUnit(unit);
  const reading =
    government && primaryReading(government).evidence === "enacted-text"
      ? primaryReading(government)
      : null;
  const classStatute = CLASS_STATUTES[unit.stateUsps]?.[field];
  const inherited = INHERITED_DEFAULTS[unit.stateUsps]?.[field];
  const unread = (what: string) =>
    unknownField(
      field,
      government
        ? `The game does not know ${government.displayName}'s ${what}.`
        : `The game does not know ${unit.name}'s ${what}.`,
      inherited ? { inheritedDefault: inherited } : {},
    );
  const cite = (path: string) => {
    const evidence = reading?.facts.find((fact) => fact.path === path)
      ?.evidence?.[0];
    const source = reading?.sources.find(
      (candidate) => candidate.key === evidence?.artifactId,
    );
    return evidence
      ? {
          citation: evidence.locator.citation ?? source?.title ?? path,
          url: source?.url ?? null,
          artifactId: evidence.artifactId,
        }
      : null;
  };
  const admitted = (value: unknown, path: string): ResolvedField => ({
    field,
    state: "ADMITTED",
    value,
    ruleScope: "local-instrument",
    ruleVersion: `municipal-governance:${government!.key}:${reading!.asOf}`,
    validFrom: null,
    validThrough: null,
    source: cite(path),
    reason: null,
  });

  switch (field) {
    case "institution.form":
      return reading?.form
        ? admitted(reading.form, "legalBasis.form")
        : unread("form of government");
    case "body.seats":
      return reading?.bodySize
        ? admitted(reading.bodySize, "electedStructure.bodySize")
        : unread("council size");
    case "ordinance.passage": {
      if (!reading || !government) return unread("ordinance passage rule");
      const pack = municipalRulePackFor(government);
      if (!pack.ok) {
        const gap = pack.missing.find(
          (entry) => entry.field === "passage threshold",
        );
        return gap
          ? unknownField(
              field,
              gap.reason,
              inherited ? { inheritedDefault: inherited } : {},
            )
          : admitted(
              reading.procedure.passageText,
              "legislativeProcedure.passageThreshold",
            );
      }
      const stage = pack.pack.chambers[0]!.floorStages.at(-1)!;
      return stage.vote.kind === "known"
        ? {
            ...admitted(
              stage.vote.value.label,
              "legislativeProcedure.passageThreshold",
            ),
            source: {
              citation: stage.vote.source.citation,
              url: stage.vote.source.sourceUrl,
              artifactId: null,
            },
          }
        : unread("ordinance passage rule");
    }
    case "ordinance.introductionToPassage":
      if (!reading)
        return unread("least time between introduction and passage");
      if (reading.procedure.introductionToPassage) {
        return admitted(
          reading.procedure.introductionToPassage,
          "legislativeProcedure.introductionToPassage",
        );
      }
      return unread("least time between introduction and passage");
    case "ordinance.effective":
      return reading?.procedure.effectivePublication
        ? admitted(
            reading.procedure.effectivePublication,
            "legislativeProcedure.effectivePublication",
          )
        : unread("effective-date rule");
    case "finance.appropriationVote":
      return classStatute ?? unread("appropriation vote rule");
    case "election.date":
    case "election.cycle":
      return unread("regular election calendar");
    default:
      return unknownField(field, `${field} is not a local-scope field.`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function refusalFor(
  action: CapabilityAction,
  fields: readonly ResolvedField[],
): string | null {
  for (const required of REQUIRED[action]) {
    const found = fields.find((entry) => entry.field === required);
    if (!found || found.state === "UNKNOWN") {
      return `${required} is not established: ${found?.reason ?? "no rule was resolved."}`;
    }
  }
  return null;
}

/** Resolve every field an action touches in one scope on one date. */
export function resolveCapability(input: {
  readonly scope: GovernmentScope;
  readonly officeKey?: string | null;
  readonly action: CapabilityAction;
  readonly onDate: IsoDate;
}): CapabilityResolution {
  const officeKey = input.officeKey ?? null;
  if (input.scope.kind === "state") {
    const usps = input.scope.stateUsps;
    const fields = STATE_FIELDS.map((field) =>
      resolveStateField(field, usps, officeKey, input.onDate),
    );
    return {
      resolverVersion: RULES_CAPABILITY_VERSION,
      scope: input.scope,
      action: input.action,
      onDate: input.onDate,
      officeKey,
      unit: null,
      fields,
      refusal: refusalFor(input.action, fields),
    };
  }
  const unit = governmentUnit(input.scope.governmentUnitId);
  if (!unit) {
    return {
      resolverVersion: RULES_CAPABILITY_VERSION,
      scope: input.scope,
      action: input.action,
      onDate: input.onDate,
      officeKey,
      unit: null,
      fields: [],
      refusal: `"${input.scope.governmentUnitId}" is not a general-purpose government the game knows.`,
    };
  }
  const fields = LOCAL_FIELDS.map((field) => resolveLocalField(field, unit));
  return {
    resolverVersion: RULES_CAPABILITY_VERSION,
    scope: input.scope,
    action: input.action,
    onDate: input.onDate,
    officeKey,
    unit,
    fields,
    refusal: refusalFor(input.action, fields),
  };
}

/** One field, for a consumer that needs only one. */
export function resolveCapabilityField(input: {
  readonly scope: GovernmentScope;
  readonly officeKey?: string | null;
  readonly field: CapabilityField;
  readonly onDate: IsoDate;
}): ResolvedField {
  const resolution = resolveCapability({
    scope: input.scope,
    officeKey: input.officeKey ?? null,
    action: "inspect",
    onDate: input.onDate,
  });
  return (
    resolution.fields.find((entry) => entry.field === input.field) ??
    unknownField(input.field, `${input.field} does not apply to this scope.`)
  );
}

/** The candidacy rule sets that exist outside the qualification corpus. */
export function supplementalQualificationOfficeKeys(): readonly string[] {
  return CANDIDATE_QUALIFICATION_RULE_SETS.map((rules) => rules.officeKey);
}
