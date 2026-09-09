import { addDays, makeIsoDate, yearOf } from "./dates";
import {
  formatMinorUnits,
  legalInstrumentRule,
  programVariant,
  type AmendmentInvitation,
  type ClauseDimension,
  type LegalInstrument,
  type LegalInstrumentRule,
  type PredicateAuthority,
  type ProgramContentEvidence,
  type ProgramFamily,
  type ProgramParameterOption,
  type ProgramParameterSpec,
  type ProgramParameterValue,
  type ProgramVariant,
  type ResolvedParameters,
} from "./legislation-program-families";
import type {
  EntityId,
  IsoDate,
  LegislativeProvisionBeneficiary,
  MetricScope,
} from "./types";

/**
 * Turning a chosen configuration into a bill.
 *
 * This is the whole of the compiler, and most of it is refusal. A family says
 * which clause dimensions it can carry and within what bounds; everything here
 * checks a proposed configuration against that declaration and either produces
 * numbered clauses or explains, at the boundary, why the configuration is not a
 * bill. Nothing downstream re-checks, because nothing downstream can: once a
 * draft exists it is filed through the accepted legislative writers, and those
 * writers are right to trust their input.
 *
 * The refusals matter more than the successes. Four hand-written workflows and
 * one universal legal language are both failure modes — the first cannot grow,
 * the second cannot be wrong. What sits between them is a small typed surface
 * where an incompatible combination is a compile error with a sentence
 * attached, and this module is that sentence.
 *
 * What this module does NOT do, deliberately:
 *   - it does not write to the World. Compilation is pure, and a player looking
 *     at a draft has not filed anything;
 *   - it does not estimate anything. A cap is arithmetic; an effect is a
 *     forecast, and forecasts live behind the policy-semantics knowledge gate;
 *   - it does not read a number back out of prose. Every mechanical value comes
 *     from a typed parameter, and clause text is an output of those values,
 *     never an input to them.
 */

/* -------------------------------------------------------------------------- */
/* Draft identity and inputs                                                   */
/* -------------------------------------------------------------------------- */

export interface CompileBillDraftInput {
  readonly familyKey: string;
  readonly variantKey: string;
  /** Values the player has moved. Anything omitted takes the variant default. */
  readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
  /** The legislature this draft is written for. Never assumed. */
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  /** The designation the docket assigned. Compiled in, never invented here. */
  readonly designation: string;
  readonly filedOn: IsoDate;
  /**
   * The authority this Act acts upon.
   *
   * Required for an instrument that amends, funds or repeals something, and
   * refused for one that creates. Passing it is the caller's job because only
   * the caller knows what is actually on this player's docket; deciding whether
   * it is acceptable is this module's.
   */
  readonly predicateAuthority?: PredicateAuthority;
}

/** One numbered section of a compiled draft. */
export interface CompiledClause {
  readonly fiscalPeriod?: "annual";
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly dimension: ClauseDimension;
  readonly heading: string;
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  readonly fiscalExposureLabel: string | null;
  readonly fiscalExposureMinorUnits: number | null;
  /** The adjustable value this section reads, when it reads one. */
  readonly parameterKey: string | null;
}

/**
 * A bill, as configured, before anybody has filed it.
 *
 * It carries its own lineage — which family and family version produced it,
 * which variant, and every parameter value — so a saved bill can say what it
 * is without the bank being consulted again. That is what keeps a later edit to
 * the bank from restating a bill a player already filed: the filed text lives
 * in canonical provisions, and this record says which configuration wrote it.
 */
export interface CompiledBillDraft {
  readonly familyKey: string;
  readonly familyVersion: string;
  readonly familyTitle: string;
  readonly variantKey: string;
  readonly variantLabel: string;
  readonly synopsis: string;
  readonly mechanism: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  readonly subjectClass: "appropriation" | "general-policy";
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  readonly filedOn: IsoDate;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate | null;
  readonly clauses: readonly CompiledClause[];
  readonly parameterValues: Readonly<Record<string, ProgramParameterValue>>;
  readonly parameters: readonly ProgramParameterSpec[];
  /**
   * What the bill's own text commits, added up.
   *
   * This is arithmetic on stated caps, not a forecast: it is what the sections
   * say, not what anything would cost. Null when the configuration authorizes
   * no money at all, which is a different fact from zero.
   */
  readonly authorizedCeilingMinorUnits: number | null;
  readonly authorizedCeilingLabel: string | null;
  readonly authorizesAppropriation: boolean;
  /** What kind of legal act this is, and what that kind may do. */
  readonly instrument: LegalInstrument;
  readonly instrumentRule: LegalInstrumentRule;
  /** The authority it acts upon, where its instrument takes one. */
  readonly predicateAuthority: PredicateAuthority | null;
  /**
   * Money this Act actually makes available.
   *
   * Non-null only for an appropriation. An authorization states a ceiling and
   * provides nothing, so its ceiling appears above and this stays null — the
   * two numbers are never added, compared or shown as one figure.
   */
  readonly appropriatedMinorUnits: number | null;
  readonly appropriatedLabel: string | null;
  /**
   * A charge the Act imposes, where it imposes one.
   *
   * Held apart from every spending figure. Nothing in this feature nets what a
   * measure raises against what a measure spends, because that netting is an
   * argument somebody makes, not a fact the compiler owns.
   */
  readonly revenueMinorUnits: number | null;
  readonly revenueLabel: string | null;
  readonly declaredLimits: readonly string[];
  readonly amendmentInvitation: AmendmentInvitation;
  readonly evidence: readonly ProgramContentEvidence[];
}

/** Why a configuration is not a bill. Thrown at the boundary, never swallowed. */
export class BillConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillConfigurationError";
  }
}

/* -------------------------------------------------------------------------- */
/* Supported legal contexts                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The legislatures a draft may be written for.
 *
 * Held here as an explicit list rather than accepted from the caller, because
 * "which legislature can this bill exist in" is a question about legal
 * authority, and the honest answer for an unsupported one is a refusal rather
 * than Kentucky with the labels changed.
 */
const SUPPORTED_SCENARIO_KEYS: readonly string[] = [
  "kentucky",
  "nebraska",
  "alaska",
];

export function draftingSupportsScenario(scenarioKey: string): boolean {
  return SUPPORTED_SCENARIO_KEYS.includes(scenarioKey);
}

/* -------------------------------------------------------------------------- */
/* Parameter validation                                                        */
/* -------------------------------------------------------------------------- */

function describeValue(value: ProgramParameterValue): string {
  switch (value.kind) {
    case "money":
      return `${value.currency} ${value.minorUnits}`;
    case "enumerated":
      return `'${value.value}'`;
    case "duration-years":
      return value.years === null ? "ongoing" : `${value.years} years`;
    case "integer":
      return String(value.value);
  }
}

/**
 * Checks one supplied value against the spec that declared it.
 *
 * Bounds are refused rather than clamped on purpose. A player who asks for a
 * figure the family cannot carry has said something meaningful, and silently
 * moving it to the nearest legal number would put a bill in front of them that
 * says something they did not choose.
 */
function validateValue(
  spec: ProgramParameterSpec,
  value: ProgramParameterValue,
): void {
  if (spec.kind !== value.kind) {
    throw new BillConfigurationError(
      `'${spec.key}' is a ${spec.kind} parameter; received a ${value.kind} value.`,
    );
  }
  switch (spec.kind) {
    case "money": {
      const money = value as Extract<ProgramParameterValue, { kind: "money" }>;
      if (money.currency !== spec.currency) {
        throw new BillConfigurationError(
          `'${spec.key}' is authorized in ${spec.currency}; received ${money.currency}.`,
        );
      }
      if (!Number.isSafeInteger(money.minorUnits)) {
        throw new BillConfigurationError(
          `'${spec.key}' must be a whole number of minor units; received ${money.minorUnits}.`,
        );
      }
      if (
        money.minorUnits < spec.minMinorUnits ||
        money.minorUnits > spec.maxMinorUnits
      ) {
        throw new BillConfigurationError(
          `${spec.label} must be between ${formatMinorUnits(
            spec.minMinorUnits,
            spec.currency,
          )} and ${formatMinorUnits(
            spec.maxMinorUnits,
            spec.currency,
          )}; received ${formatMinorUnits(money.minorUnits, spec.currency)}.`,
        );
      }
      return;
    }
    case "enumerated": {
      const chosen = value as Extract<
        ProgramParameterValue,
        { kind: "enumerated" }
      >;
      if (!spec.options.some((option) => option.value === chosen.value)) {
        throw new BillConfigurationError(
          `${spec.label} does not offer '${chosen.value}'; this configuration supports ${spec.options
            .map((option) => `'${option.value}'`)
            .join(", ")}.`,
        );
      }
      return;
    }
    case "duration-years": {
      const term = value as Extract<
        ProgramParameterValue,
        { kind: "duration-years" }
      >;
      if (term.years === null) {
        if (spec.maxYears !== null) {
          throw new BillConfigurationError(
            `${spec.label} must state a term; this configuration does not support an ongoing program.`,
          );
        }
        return;
      }
      if (!Number.isSafeInteger(term.years) || term.years < spec.minYears) {
        throw new BillConfigurationError(
          `${spec.label} must be at least ${spec.minYears} whole years; received ${describeValue(term)}.`,
        );
      }
      if (spec.maxYears !== null && term.years > spec.maxYears) {
        throw new BillConfigurationError(
          `${spec.label} may not exceed ${spec.maxYears} years; received ${term.years}.`,
        );
      }
      return;
    }
    case "integer": {
      const count = value as Extract<
        ProgramParameterValue,
        { kind: "integer" }
      >;
      if (!Number.isSafeInteger(count.value)) {
        throw new BillConfigurationError(
          `${spec.label} must be a whole ${spec.unitLabel}; received ${count.value}.`,
        );
      }
      if (count.value < spec.min || count.value > spec.max) {
        throw new BillConfigurationError(
          `${spec.label} must be between ${spec.min} and ${spec.max} ${spec.unitLabel}; received ${count.value}.`,
        );
      }
      return;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Instrument checking                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Whether this configuration is shaped like the kind of act it says it is.
 *
 * An authoring check rather than a player-facing one: a variant that declares
 * itself an appropriation and carries no clause naming what it appropriates
 * for is a bug in the bank, and it fails here loudly rather than producing a
 * bill that reads as an appropriation of nothing in particular.
 */
function checkInstrumentShape(
  family: ProgramFamily,
  variant: ProgramVariant,
  rule: LegalInstrumentRule,
): void {
  const present = new Set(variant.clauses.map((clause) => clause.dimension));
  for (const required of rule.requiredDimensions) {
    if (!present.has(required)) {
      throw new BillConfigurationError(
        `The ${variant.label} configuration is declared as ${rule.label.toLowerCase()}, which must carry a ${required} clause, and it has none.`,
      );
    }
  }
  for (const dimension of present) {
    if (!rule.permittedDimensions.includes(dimension)) {
      throw new BillConfigurationError(
        `${rule.label} does not carry ${dimension} clauses, and the ${variant.label} configuration has one.`,
      );
    }
    if (!family.acceptedDimensions.includes(dimension)) {
      throw new BillConfigurationError(
        `The ${family.title} family does not carry ${dimension} clauses, and the ${variant.label} configuration has one.`,
      );
    }
  }
  if (variant.authorizesAppropriation && !rule.mayAuthorizeAppropriation) {
    throw new BillConfigurationError(
      `${rule.label} states no amount, so the ${variant.label} configuration may not authorize an appropriation.`,
    );
  }
}

/**
 * Whether the authority this Act names is one it can actually act upon.
 *
 * The refusals here are the whole point of the instrument. An appropriation
 * with nothing to appropriate for is not a small problem to be papered over
 * with a default; it is the sentence that makes the Act do anything, missing.
 * Equally, an authorization handed an authority is being asked to amend
 * something it does not amend, and that is refused rather than ignored, because
 * ignoring it would tell the caller their bill was about a programme when it
 * was not.
 */
function checkPredicateAuthority(
  variant: ProgramVariant,
  rule: LegalInstrumentRule,
  authority: PredicateAuthority | null,
): PredicateAuthority | null {
  if (!rule.requiresPredicateAuthority) {
    if (authority !== null) {
      throw new BillConfigurationError(
        `${rule.label} creates rather than amends, so the ${variant.label} configuration cannot be written against ${authority.citationLabel}.`,
      );
    }
    return null;
  }
  if (authority === null) {
    throw new BillConfigurationError(
      `${rule.label} acts on something that already exists, and the ${variant.label} configuration was given no authority to act on.`,
    );
  }
  if (rule.predicateMustAuthorizeSpending && !authority.authorizesSpending) {
    throw new BillConfigurationError(
      `${authority.citationLabel} authorizes no spending, so there is nothing for the ${variant.label} configuration to appropriate against.`,
    );
  }
  return authority;
}

/**
 * An appropriation may not exceed the ceiling the authority it names set.
 *
 * Checked against the authority's own recorded ceiling rather than against a
 * bound in the bank, because the limit is a fact about that programme, not a
 * design choice about this bill — and it moves when the player appropriates
 * against a bigger bill of their own. Refused rather than clamped, on the same
 * ground as every other bound here.
 */
function checkAppropriationCeiling(
  variant: ProgramVariant,
  rule: LegalInstrumentRule,
  authority: PredicateAuthority | null,
  appropriated: number | null,
): void {
  if (!rule.makesMoneyAvailable || authority === null) return;
  if (appropriated === null) return;
  const ceiling = authority.authorizedCeilingMinorUnits;
  if (ceiling === null) {
    throw new BillConfigurationError(
      `${authority.citationLabel} states no ceiling, so an appropriation cannot be measured against it.`,
    );
  }
  if (appropriated > ceiling) {
    throw new BillConfigurationError(
      `The ${variant.label} configuration would appropriate ${formatMinorUnits(
        appropriated,
        authority.currency,
      )} against ${authority.citationLabel}, which authorizes ${formatMinorUnits(
        ceiling,
        authority.currency,
      )}.`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Compilation                                                                 */
/* -------------------------------------------------------------------------- */

export function compileBillDraft(
  input: CompileBillDraftInput,
): CompiledBillDraft {
  const { family, variant } = programVariant(input.familyKey, input.variantKey);

  if (!draftingSupportsScenario(input.scenarioKey)) {
    throw new BillConfigurationError(
      `No drafting authority is supported for the '${input.scenarioKey}' legislature, so a bill cannot be written for it.`,
    );
  }

  const rule = legalInstrumentRule(variant.instrument);
  const authority = checkPredicateAuthority(
    variant,
    rule,
    input.predicateAuthority ?? null,
  );
  checkInstrumentShape(family, variant, rule);

  const supplied = input.parameterValues ?? {};
  const specsByKey = new Map(
    variant.parameters.map((spec) => [spec.key, spec]),
  );

  // A value for something this configuration does not have is refused rather
  // than ignored. Ignoring it would let a caller believe they had set a cap on
  // a bill that carries none.
  for (const key of Object.keys(supplied)) {
    const spec = specsByKey.get(key);
    if (!spec) {
      throw new BillConfigurationError(
        `The ${variant.label} configuration has no '${key}' to set.`,
      );
    }
    // The family-level declaration is checked too, so a variant cannot quietly
    // introduce a dimension its family says it does not carry.
    if (!family.acceptedDimensions.includes(spec.dimension)) {
      throw new BillConfigurationError(
        `The ${family.title} family does not carry ${spec.dimension} clauses.`,
      );
    }
    if (spec.dimension === "funding-cap" && !variant.authorizesAppropriation) {
      throw new BillConfigurationError(
        `The ${variant.label} configuration authorizes no appropriation, so '${spec.key}' cannot be set on it.`,
      );
    }
  }

  const values: Record<string, ProgramParameterValue> = {};
  for (const spec of variant.parameters) {
    const value = supplied[spec.key] ?? variant.defaults[spec.key];
    if (value === undefined) {
      throw new BillConfigurationError(
        `${variant.label} requires a value for '${spec.key}' and the bank declares no default for it.`,
      );
    }
    validateValue(spec, value);
    values[spec.key] = value;
  }

  const timing = resolveTiming(variant, values, input.filedOn);
  const resolved = resolveParameters(
    variant,
    values,
    input.filedOn,
    timing.startsOn,
    timing.endsOn,
    authority,
  );

  const clauses: CompiledClause[] = variant.clauses.map((template, index) => {
    const rendering = template.render(resolved);
    if (
      rendering.fiscalExposureMinorUnits !== null &&
      template.dimension !== "revenue" &&
      !variant.authorizesAppropriation
    ) {
      // A configuration that authorizes nothing may not produce a section that
      // exposes the state to money. This is a bank-authoring check, so it is
      // stated as a plain failure rather than a player-facing sentence.
      throw new BillConfigurationError(
        `The ${variant.label} configuration authorizes no appropriation, but its '${template.provisionKey}' section states a fiscal exposure.`,
      );
    }
    return {
      provisionKey: template.provisionKey,
      sectionNumber: index + 1,
      dimension: template.dimension,
      heading: template.heading,
      text:
        authority?.kind === "docket-measure"
          ? `This section takes effect only if ${authority.citationLabel} has become law. ${rendering.text}`
          : rendering.text,
      ...(rendering.fiscalPeriod !== undefined
        ? { fiscalPeriod: rendering.fiscalPeriod }
        : {}),
      beneficiary: rendering.beneficiary,
      fiscalExposureLabel: rendering.fiscalExposureLabel,
      fiscalExposureMinorUnits: rendering.fiscalExposureMinorUnits,
      parameterKey: template.parameterKey,
    };
  });

  // What the sections state, added up — and kept in three separate buckets,
  // because a ceiling, an appropriation and a charge are three different facts
  // about money and adding any two of them together would produce a number
  // that describes nothing.
  const spendingClauses = clauses.filter(
    (clause) => clause.dimension !== "revenue",
  );
  const revenueClauses = clauses.filter(
    (clause) => clause.dimension === "revenue",
  );
  const exposures = spendingClauses
    .map((clause) => clause.fiscalExposureMinorUnits)
    .filter((amount): amount is number => amount !== null);
  const stated = variant.authorizesAppropriation
    ? exposures.reduce((total, amount) => total + amount, 0)
    : null;

  // An authorization states a ceiling and provides nothing. An appropriation
  // provides money and states no ceiling of its own. The same arithmetic lands
  // in a different field depending on which act this is, and nothing reads
  // both.
  const ceiling = rule.makesMoneyAvailable ? null : stated;
  const appropriated = rule.makesMoneyAvailable ? stated : null;
  checkAppropriationCeiling(variant, rule, authority, appropriated);

  const revenueAmounts = revenueClauses
    .map((clause) => clause.fiscalExposureMinorUnits)
    .filter((amount): amount is number => amount !== null);
  const revenue =
    revenueAmounts.length === 0
      ? null
      : revenueAmounts.reduce((total, amount) => total + amount, 0);

  return {
    familyKey: family.familyKey,
    familyVersion: family.familyVersion,
    familyTitle: family.title,
    variantKey: variant.variantKey,
    variantLabel: variant.label,
    synopsis: variant.synopsis,
    mechanism: family.mechanism,
    designation: input.designation,
    shortTitle: variant.shortTitle,
    summary: variant.synopsis,
    subjectClass: variant.subjectClass,
    scenarioKey: input.scenarioKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: input.rulePackId,
    filedOn: input.filedOn,
    startsOn: timing.startsOn,
    endsOn: timing.endsOn,
    clauses,
    parameterValues: values,
    parameters: variant.parameters,
    authorizedCeilingMinorUnits: ceiling,
    authorizedCeilingLabel:
      ceiling === null
        ? null
        : `${formatMinorUnits(ceiling, "USD")}${spendingClauses.some((clause) => clause.fiscalPeriod === "annual") ? " per year" : ""}`,
    authorizesAppropriation: variant.authorizesAppropriation,
    instrument: variant.instrument,
    instrumentRule: rule,
    predicateAuthority: authority,
    appropriatedMinorUnits: appropriated,
    appropriatedLabel:
      appropriated === null ? null : formatMinorUnits(appropriated, "USD"),
    revenueMinorUnits: revenue,
    revenueLabel: revenue === null ? null : formatMinorUnits(revenue, "USD"),
    declaredLimits: variant.declaredLimits,
    amendmentInvitation: variant.amendmentInvitation,
    evidence: [
      ...family.structuralProvenance,
      ...variant.parameters.map((spec) => spec.evidence),
      variant.amendmentInvitation.evidence,
    ],
  };
}

/**
 * When the programme runs.
 *
 * A configuration with no timing parameter starts when it is filed and does not
 * end — which is a real thing for a formula change and would be a lie for a
 * pilot, so the variants that are pilots declare a term. An end before a start
 * is refused here rather than rendered, because a sunset clause that closes the
 * programme before it opens is a contradiction the text cannot express
 * honestly.
 */
function resolveTiming(
  variant: ProgramVariant,
  values: Readonly<Record<string, ProgramParameterValue>>,
  filedOn: IsoDate,
): { readonly startsOn: IsoDate; readonly endsOn: IsoDate | null } {
  const startsOn = filedOn;
  const timingSpec = variant.parameters.find(
    (spec) => spec.dimension === "timing",
  );
  if (!timingSpec) return { startsOn, endsOn: null };
  const value = values[timingSpec.key];
  if (value === undefined || value.kind !== "duration-years") {
    return { startsOn, endsOn: null };
  }
  if (value.years === null) return { startsOn, endsOn: null };

  const endsOn = addYears(startsOn, value.years);
  if (endsOn <= startsOn) {
    throw new BillConfigurationError(
      `${timingSpec.label} would end the program on ${endsOn}, on or before it starts on ${startsOn}.`,
    );
  }
  return { startsOn, endsOn };
}

/**
 * Whole calendar years forward, on the existing date helpers.
 *
 * Done by rebuilding the ISO string rather than by adding 365 days, so a term
 * lands on the same calendar date it started on. February 29 is walked back to
 * the 28th, which is what a statute does with the same problem.
 */
function addYears(date: IsoDate, years: number): IsoDate {
  const year = yearOf(date) + years;
  const monthDay = date.slice(4);
  if (monthDay === "-02-29") {
    const candidate = `${year}-02-29`;
    try {
      return makeIsoDate(candidate);
    } catch {
      return makeIsoDate(`${year}-02-28`);
    }
  }
  return makeIsoDate(`${year}${monthDay}`);
}

function resolveParameters(
  variant: ProgramVariant,
  values: Readonly<Record<string, ProgramParameterValue>>,
  filedOn: IsoDate,
  startsOn: IsoDate,
  endsOn: IsoDate | null,
  authority: PredicateAuthority | null,
): ResolvedParameters {
  const specsByKey = new Map(
    variant.parameters.map((spec) => [spec.key, spec]),
  );
  return {
    values,
    filedOn,
    startsOn,
    endsOn,
    authority,
    money: (key) => {
      const value = values[key];
      if (value === undefined || value.kind !== "money") {
        throw new BillConfigurationError(
          `Section text asked for a money value at '${key}', which this configuration does not carry.`,
        );
      }
      return formatMinorUnits(value.minorUnits, value.currency);
    },
    choice: (key): ProgramParameterOption => {
      const value = values[key];
      const spec = specsByKey.get(key);
      if (
        value === undefined ||
        value.kind !== "enumerated" ||
        spec === undefined ||
        spec.kind !== "enumerated"
      ) {
        throw new BillConfigurationError(
          `Section text asked for a choice at '${key}', which this configuration does not carry.`,
        );
      }
      const option = spec.options.find((entry) => entry.value === value.value);
      if (!option) {
        throw new BillConfigurationError(
          `'${value.value}' is not an option of ${spec.label}.`,
        );
      }
      return option;
    },
    integer: (key) => {
      const value = values[key];
      if (value === undefined || value.kind !== "integer") {
        throw new BillConfigurationError(
          `Section text asked for a count at '${key}', which this configuration does not carry.`,
        );
      }
      return value.value;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Reading a compiled draft                                                    */
/* -------------------------------------------------------------------------- */

/** The section a proposed amendment would touch, found by its clause key. */
export function clauseByKey(
  draft: CompiledBillDraft,
  provisionKey: string,
): CompiledClause | null {
  return (
    draft.clauses.find((clause) => clause.provisionKey === provisionKey) ?? null
  );
}

/**
 * The dimensions this draft's sections actually cover.
 *
 * Reported from the compiled clauses rather than from the family declaration,
 * because what a family *can* carry and what a configuration *did* carry are
 * different facts, and the second is the one a player is reading.
 */
export function draftClauseDimensions(
  draft: CompiledBillDraft,
): readonly ClauseDimension[] {
  const seen: ClauseDimension[] = [];
  for (const clause of draft.clauses) {
    if (!seen.includes(clause.dimension)) seen.push(clause.dimension);
  }
  return seen;
}

/** The sections with no money in them at all. */
export function nonMoneyClauses(
  draft: CompiledBillDraft,
): readonly CompiledClause[] {
  return draft.clauses.filter(
    (clause) => clause.fiscalExposureMinorUnits === null,
  );
}

/**
 * A side-by-side reading of two configurations of the same bill.
 *
 * Used for the prepared-versus-current comparison the working document already
 * establishes, so a player can see what moving a parameter actually did to the
 * text rather than being told it changed.
 */
export interface ClauseComparisonRow {
  readonly provisionKey: string;
  readonly heading: string;
  readonly dimension: ClauseDimension;
  readonly currentText: string | null;
  readonly proposedText: string | null;
  readonly changed: boolean;
}

export function compareDrafts(
  current: CompiledBillDraft,
  proposed: CompiledBillDraft,
): readonly ClauseComparisonRow[] {
  const keys: string[] = [];
  for (const clause of [...current.clauses, ...proposed.clauses]) {
    if (!keys.includes(clause.provisionKey)) keys.push(clause.provisionKey);
  }
  return keys.map((provisionKey) => {
    const left = clauseByKey(current, provisionKey);
    const right = clauseByKey(proposed, provisionKey);
    return {
      provisionKey,
      heading: right?.heading ?? left?.heading ?? provisionKey,
      dimension: right?.dimension ?? left?.dimension ?? "eligibility-scope",
      currentText: left?.text ?? null,
      proposedText: right?.text ?? null,
      changed: (left?.text ?? null) !== (right?.text ?? null),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Designations                                                                */
/* -------------------------------------------------------------------------- */

/**
 * What the chamber calls a bill it has just received.
 *
 * Derived from the originating chamber's own key rather than from the state, so
 * a unicameral legislature gets its own prefix instead of a House number it
 * does not issue.
 */
export function designationPrefix(chamberKey: string): string {
  switch (chamberKey) {
    case "house":
      return "HB";
    case "senate":
      return "SB";
    case "legislature":
      return "LB";
    default:
      throw new BillConfigurationError(
        `No bill designation is defined for a '${chamberKey}' chamber.`,
      );
  }
}

export function draftScope(draft: CompiledBillDraft): MetricScope {
  return { jurisdictionId: draft.jurisdictionId, segmentKey: null };
}

/** The day after a date, used where a term must not overlap its successor. */
export function dayAfter(date: IsoDate): IsoDate {
  return addDays(date, 1);
}

export type { ProgramFamily, ProgramVariant };
