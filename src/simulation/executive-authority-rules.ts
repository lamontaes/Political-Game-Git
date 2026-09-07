/**
 * Runtime institutional rule contract for the executive branch.
 *
 * This module describes what an executive office's *formal powers and
 * constraints* say, for offices above the legislature's own bill-presentment
 * facts. Presentment, veto, line-item veto and override already live in
 * {@link LegislativeRulePack}'s `executive` rule; this contract never restates
 * them. It composes them by reference (see {@link ExecutivePresentmentRef} and
 * {@link resolvePresentmentAuthority}) so the two systems cannot drift apart.
 *
 * As in the legislature contract, epistemic states stay distinct and never
 * collapse into one another. This subsystem carries exactly two:
 * - `known`    the rule is resolved from an official source;
 * - `unknown`  no source resolved it (NOT zero, NOT none, NOT absent).
 *
 * A rule that genuinely says "there is none" is a `known` value carrying the
 * negative fact (for example, a governor who commands no militia at all).
 *
 * The shared {@link RuleValue} union also offers `not-applicable`, and this
 * contract deliberately does NOT accept it (see {@link ExecutiveRuleValue}).
 * `not-applicable` is only honest as an affirmative, *sourced* determination
 * that a concept does not exist, and the shared shape carries no source for it
 * — only a free-text note. A note that merely looks like a citation is
 * decoration, not evidence, so admitting it would let an absence of research
 * become a claim about the law. Until this subsystem has a source-bearing
 * representation for inapplicability, such a field stays `unknown`.
 *
 * Nothing here models political behaviour, and nothing here scores an office.
 * There is deliberately no veto-deterrence, legal-risk, morale, competence,
 * loyalty, confirmability or "strong executive" number: those were product
 * ideas in the 92H research, not accepted canonical primitives, and encoding
 * one would turn a rule contract into a rating engine.
 */

import {
  assertSourceRef,
  knownRule,
  unknownRule,
  type LegislativeRulePack,
  type ExecutiveRule,
  type RuleSourceRef,
  type RuleValue,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";

// ---------------------------------------------------------------------------
// The rule-value states this subsystem carries
// ---------------------------------------------------------------------------

/**
 * A {@link RuleValue} restricted to the two states an executive-authority pack
 * may hold: `known` and `unknown`.
 *
 * `not-applicable` is excluded on purpose. It is a claim *about the law* — that
 * a concept does not exist for this office — and the shared union represents it
 * as nothing but a free-text note. There is no source object, no verification
 * status, and no pinpoint a reader could check, so a validator can only inspect
 * the note's wording. Wording is forgeable: "No authority found; see Art. V § 3"
 * reads as a citation and asserts the opposite of one. Any check built on the
 * note's shape therefore converts silence into a legal claim, which is exactly
 * the fail-open this type closes.
 *
 * Narrowing here (rather than in {@link RuleValue} itself) keeps the repair
 * local: the legislature contract, which resolves inapplicability against its
 * own structures, is untouched. When this subsystem gains a source-bearing way
 * to state inapplicability affirmatively, it belongs in a distinct shape that
 * carries a {@link RuleSourceRef}, not in a note.
 */
export type ExecutiveRuleValue<T> = Extract<
  RuleValue<T>,
  { kind: "known" } | { kind: "unknown" }
>;

/**
 * A resolved executive rule, narrowed to {@link ExecutiveRuleValue}.
 *
 * Pack data is authored through these two constructors rather than the shared
 * `knownRule` / `unknownRule`, whose return type still admits the third state.
 * That is the point: with these, an author cannot write a `not-applicable` into
 * a pack without a deliberate cast, so the contract holds at authoring time and
 * not only at the validation seam.
 */
export function executiveKnown<T>(
  value: T,
  source: RuleSourceRef,
): ExecutiveRuleValue<T> {
  return knownRule(value, source) as ExecutiveRuleValue<T>;
}

/** An unresolved executive rule — the state a field holds until sourced. */
export function executiveUnknown<T>(note: string): ExecutiveRuleValue<T> {
  return unknownRule<T>(note) as ExecutiveRuleValue<T>;
}

// ---------------------------------------------------------------------------
// Office identity
// ---------------------------------------------------------------------------

/**
 * How the elected leadership of the executive branch is arranged.
 *
 * This is a real structural difference, not a label. A `unitary` executive
 * vests the whole branch in one elected officer, so every principal officer
 * ultimately answers to them. A `plural` executive elects several statewide
 * officers independently, so the attorney general or secretary of state is not
 * the chief executive's subordinate and cannot simply be directed or removed.
 */
export type ExecutiveBranchStructure = "unitary" | "plural";

/** Identity of the single executive office a pack describes. */
export interface ExecutiveOfficeIdentity {
  /** Stable office key, e.g. "us-federal-president" or "us-ky-governor". */
  readonly officeKey: string;
  /** The office's own title, e.g. "President" or "Governor". */
  readonly title: string;
  readonly branchStructure: ExecutiveRuleValue<ExecutiveBranchStructure>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Presentment composition (referenced, never duplicated)
// ---------------------------------------------------------------------------

/**
 * A pointer to the legislative rule pack that already owns this executive's
 * bill-presentment facts — presentment requirement, action windows, inaction
 * outcome, line-item veto and override. This contract stores no copy of those
 * fields; a reader resolves them from the referenced pack.
 */
export interface ExecutivePresentmentRef {
  /**
   * The `packId` of the {@link LegislativeRulePack} whose `executive` rule
   * carries presentment and veto for this jurisdiction, where one exists, and
   * `unknown` where no legislative pack has been compiled yet (the federal
   * executive is packed here before Congress is). An office that never receives
   * bills at all would be a sourced claim about that office's law, which this
   * contract has no way to carry (see {@link ExecutiveRuleValue}); it stays
   * `unknown` until it does.
   */
  readonly legislativeRulePackId: ExecutiveRuleValue<string>;
}

// ---------------------------------------------------------------------------
// Appointment and removal
// ---------------------------------------------------------------------------

/** The executive's authority to appoint principal officers. */
export interface AppointmentAuthorityRule {
  /** Whether the executive appoints principal officers of the branch. */
  readonly executiveAppoints: ExecutiveRuleValue<boolean>;
  /** Whether a legislative body must confirm those appointments. */
  readonly legislativeConfirmationRequired: ExecutiveRuleValue<boolean>;
  /** Which body confirms, where one does (e.g. "the Senate"). */
  readonly confirmingBody: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

/**
 * How securely an appointee holds office against the appointer.
 *
 * `at-pleasure`    the appointee serves at the executive's pleasure and may be
 *                  removed at will;
 * `for-cause`      removal requires stated cause and/or a process;
 * `fixed-term`     the appointee holds a fixed term the executive cannot cut
 *                  short at will;
 * `mixed`          different classes of officer follow different rules.
 */
export type RemovalMode = "at-pleasure" | "for-cause" | "fixed-term" | "mixed";

export interface RemovalAuthorityRule {
  readonly mode: ExecutiveRuleValue<RemovalMode>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Special session
// ---------------------------------------------------------------------------

export interface SpecialSessionAuthorityRule {
  /** Whether the executive may convene an extraordinary/special session. */
  readonly executiveMayConvene: ExecutiveRuleValue<boolean>;
  /**
   * Whether the legislature, once convened, may act only on the subjects the
   * executive named in the call. This is the substantive lever: a call whose
   * agenda the legislature can expand is a much weaker power than one it cannot.
   */
  readonly agendaLimitedToCall: ExecutiveRuleValue<boolean>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Executive directives / orders
// ---------------------------------------------------------------------------

export interface ExecutiveDirectiveAuthorityRule {
  /** Whether the office issues binding executive orders/directives. */
  readonly hasDirectiveAuthority: ExecutiveRuleValue<boolean>;
  /**
   * What the authority rests on, in the research's words — a constitutional
   * vesting/execution clause, a general statute, or a narrower grant.
   */
  readonly authorityBasis: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Reorganization
// ---------------------------------------------------------------------------

export interface ReorganizationAuthorityRule {
  /** Whether the executive may reorganize executive-branch agencies. */
  readonly executiveMayReorganize: ExecutiveRuleValue<boolean>;
  /**
   * Whether a reorganization takes effect unless the legislature disapproves it
   * within a window — the legislative-veto pattern many reorganization statutes
   * use.
   */
  readonly legislativeDisapprovalAvailable: ExecutiveRuleValue<boolean>;
  /** Whether the grant of authority itself expires, and when. */
  readonly sunset: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Emergency declaration
// ---------------------------------------------------------------------------

export interface EmergencyDeclarationAuthorityRule {
  /** Whether the executive may declare a state of emergency/disaster. */
  readonly executiveMayDeclare: ExecutiveRuleValue<boolean>;
  /** How long the declaration stands before it must be renewed, in days. */
  readonly initialDurationDays: ExecutiveRuleValue<number>;
  /** How, and by whom, a declaration is extended past its initial term. */
  readonly extension: ExecutiveRuleValue<string>;
  /** Whether and how the legislature may terminate a declaration. */
  readonly legislativeTermination: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Clemency
// ---------------------------------------------------------------------------

/**
 * Who actually holds the clemency power, which varies far more than the word
 * "pardon" suggests.
 *
 * `executive-sole`      the executive grants clemency alone;
 * `board-advisory`      the executive grants it, on a board's non-binding
 *                       recommendation;
 * `board-required`      the executive may act only on a board's affirmative
 *                       recommendation (the board can block);
 * `board-exclusive`     a board, not the executive, holds the power.
 */
export type ClemencyModel =
  "executive-sole" | "board-advisory" | "board-required" | "board-exclusive";

export interface ClemencyAuthorityRule {
  readonly model: ExecutiveRuleValue<ClemencyModel>;
  /** What the power reaches and what it excludes (e.g. impeachment). */
  readonly scope: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Budget submission
// ---------------------------------------------------------------------------

export interface BudgetSubmissionRule {
  /** Whether the executive is required to submit a budget to the legislature. */
  readonly executiveMustSubmit: ExecutiveRuleValue<boolean>;
  /** When the budget is due, in the research's words. */
  readonly submissionDeadline: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Administrative authority
// ---------------------------------------------------------------------------

export interface AdministrativeAuthorityRule {
  /** Whether a faithful-execution / "take care" duty binds the office. */
  readonly faithfulExecutionDuty: ExecutiveRuleValue<boolean>;
  /** The general supervisory authority the office holds over the branch. */
  readonly supervisoryAuthority: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Plural-executive constraints
// ---------------------------------------------------------------------------

/**
 * One statewide officer who is elected or chosen independently of the chief
 * executive, and is therefore a constraint on it rather than a subordinate.
 * The list of these is what makes a `plural` executive concrete.
 */
export interface PluralExecutiveConstraint {
  /** The office, e.g. "Attorney General" or "Secretary of State". */
  readonly officeLabel: string;
  /** Whether that officer is elected independently of the chief executive. */
  readonly independentlyElected: ExecutiveRuleValue<boolean>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Guard / militia authority
// ---------------------------------------------------------------------------

export interface GuardAuthorityRule {
  /** Whether the office commands the state militia / National Guard. */
  readonly commandsMilitia: ExecutiveRuleValue<boolean>;
  /** What the command reaches, and any limit on it, in the research's words. */
  readonly scope: ExecutiveRuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------

/**
 * A complete runtime rule pack for one executive office. Packs are data
 * compiled from sourced research; the engine holds no jurisdiction knowledge of
 * its own. Every field the research did not resolve stays `unknown`, and so
 * does every field whose concept an office may not have at all: this contract
 * carries no sourced way to assert inapplicability, and will not let an
 * unresearched field claim one (see {@link ExecutiveRuleValue}).
 */
export interface ExecutiveAuthorityRulePack {
  readonly packId: string;
  /** Jurisdiction key, e.g. "US" for the federal executive or "US-KY". */
  readonly jurisdictionKey: string;
  readonly displayName: string;
  readonly office: ExecutiveOfficeIdentity;
  readonly presentment: ExecutivePresentmentRef;
  readonly appointment: AppointmentAuthorityRule;
  readonly removal: RemovalAuthorityRule;
  readonly specialSession: SpecialSessionAuthorityRule;
  readonly executiveDirective: ExecutiveDirectiveAuthorityRule;
  readonly reorganization: ReorganizationAuthorityRule;
  readonly emergencyDeclaration: EmergencyDeclarationAuthorityRule;
  readonly clemency: ClemencyAuthorityRule;
  readonly budgetSubmission: BudgetSubmissionRule;
  readonly administrative: AdministrativeAuthorityRule;
  /**
   * The independently-elected officers that constrain this executive. Empty for
   * a `unitary` branch; non-empty for a `plural` one, and the two must agree
   * (see {@link assertExecutiveAuthorityPackIntegrity}).
   */
  readonly pluralExecutive: readonly PluralExecutiveConstraint[];
  readonly guard: GuardAuthorityRule;
  readonly sources: readonly RuleSourceRef[];
  /** Research gaps carried forward rather than guessed. */
  readonly unresolvedGaps: readonly string[];
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/**
 * Resolves this executive's bill-presentment and veto authority from the
 * legislative rule pack that owns it, rather than from any copy stored here.
 *
 * The caller supplies the already-loaded {@link LegislativeRulePack} (found via
 * `rulePackById`). This reader checks the pack is the one the executive pack
 * points at, and that the two describe the same jurisdiction, then hands back
 * the legislature's own {@link ExecutiveRule}. It is the single seam through
 * which presentment reaches an executive-authority consumer.
 */
export function resolvePresentmentAuthority(
  executivePack: ExecutiveAuthorityRulePack,
  legislativePack: LegislativeRulePack,
): ExecutiveRule {
  const ref = executivePack.presentment.legislativeRulePackId;
  if (ref.kind !== "known") {
    throw new Error(
      `Executive pack '${executivePack.packId}' does not reference a legislative pack for presentment: ${ref.note}`,
    );
  }
  // Resolve the referenced authority from the live registry, never from the
  // caller's object. `rulePackById` throws for a synthetic or unregistered id,
  // and the identity check below refuses a fabricated object whose id merely
  // looks right — so the ExecutiveRule handed back is always the one the
  // registered legislative pack actually holds.
  const registered = rulePackById(ref.value);
  if (legislativePack !== registered) {
    if (legislativePack.packId !== ref.value) {
      throw new Error(
        `Executive pack '${executivePack.packId}' references legislative pack '${ref.value}', not '${legislativePack.packId}'.`,
      );
    }
    throw new Error(
      `Executive pack '${executivePack.packId}' presentment must resolve to the live registered legislative pack '${ref.value}', not a caller-supplied object bearing that id.`,
    );
  }
  if (executivePack.jurisdictionKey !== registered.jurisdictionKey) {
    throw new Error(
      `Executive pack '${executivePack.packId}' (${executivePack.jurisdictionKey}) and legislative pack '${registered.packId}' (${registered.jurisdictionKey}) describe different jurisdictions.`,
    );
  }
  return registered.executive;
}

/** True where the office is arranged as a plural executive. */
export function isPluralExecutive(pack: ExecutiveAuthorityRulePack): boolean {
  return (
    pack.office.branchStructure.kind === "known" &&
    pack.office.branchStructure.value === "plural"
  );
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Citation shapes that name an instrument without pinpointing anything inside
 * it. A source like "<State> Const. executive article" or "<State> Const. veto
 * section" reads like evidence and is not: it identifies a body of law, not the
 * operative provision that would establish a specific rule for a specific
 * office. A `known` value resting on one of these is unfalsifiable, so the
 * contract refuses it at the seam rather than leaving it to review.
 */
const GENERIC_CITATION_PATTERNS: readonly RegExp[] = [
  /\bexecutive\s+article\b/i,
  /\bveto\s+section\b/i,
  /\bsuccession\s+clause\b/i,
  /\bexecutive\s+section\b/i,
  /\bgenerally\b/i,
  /\bvarious\b/i,
  /\bpassim\b/i,
];

/**
 * The shapes a real pinpoint takes:
 *
 * 1. a provision word or section sign immediately followed by the provision's
 *    own number or roman numeral — "Art. II, Sec. 3", "Sec. 88", "ch. 10A",
 *    and a section-sign form such as "§ 1983"; or
 * 2. a statutory-code abbreviation immediately followed by its section number —
 *    "KRS 117.015(2)", "10 ILCS 5/1A-1".
 *
 * A bare four-digit year is deliberately NOT a pinpoint. The second pattern
 * keys on a one-to-three-digit section number and refuses a longer run, so a
 * trailing year such as "1787" in "US CONSTITUTION 1787" cannot masquerade as a
 * locator by containing digits. A genuine four-digit section (a federal
 * "§ 1983") still pinpoints, because a section sign or provision word
 * introduces it and the first pattern matches that.
 */
const PINPOINT_PATTERNS: readonly RegExp[] = [
  /(?:§|\b(?:sec|section|art|article|cl|clause|rule|ch|chapter|title|para|paragraph)\b\.?)\s*[0-9IVXLCDM]/i,
  /\b[A-Z]{2,}\b\.?\s*(?:§\s*)?\d{1,3}(?![0-9])/,
];

/** True where a citation or note carries an operative pinpoint provision. */
function hasPinpointProvision(text: string): boolean {
  return PINPOINT_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * True where a citation identifies no pinpoint provision — either because it
 * matches a known generic template, or because it names an instrument (and
 * perhaps a year) without an article, section, clause, rule or statutory-code
 * locator. A year alone is never a pinpoint. Exported so a caller can check a
 * citation before building a rule from it.
 */
export function isGenericCitation(citation: string): boolean {
  const trimmed = citation.trim();
  if (trimmed.length === 0) {
    return true;
  }
  if (GENERIC_CITATION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  return !hasPinpointProvision(trimmed);
}

function assertPinpointedSource(source: RuleSourceRef, label: string): void {
  assertSourceRef(source, label);
  if (isGenericCitation(source.citation)) {
    throw new Error(
      `${label} rests on a citation with no pinpoint provision ('${source.citation}'); a known rule must name the operative provision it comes from.`,
    );
  }
}

/**
 * The closed domains the three enumerated executive fields may take, declared as
 * runtime data and not only as TypeScript unions. A hand-built or deserialized
 * pack never passes through the compiler, so the domain is enforced here, at the
 * validation seam, where an invalid enum value is rejected rather than accepted.
 */
const BRANCH_STRUCTURES: readonly ExecutiveBranchStructure[] = [
  "unitary",
  "plural",
];
const REMOVAL_MODES: readonly RemovalMode[] = [
  "at-pleasure",
  "for-cause",
  "fixed-term",
  "mixed",
];
const CLEMENCY_MODELS: readonly ClemencyModel[] = [
  "executive-sole",
  "board-advisory",
  "board-required",
  "board-exclusive",
];

/** A value check confirming a known value lies within a closed string domain. */
function withinDomain<T extends string>(
  domain: readonly T[],
): (resolved: T, label: string) => void {
  return (resolved, label) => {
    if (typeof resolved !== "string" || !domain.includes(resolved)) {
      throw new Error(
        `${label} carries '${String(resolved)}', which is outside its closed domain {${domain.join(", ")}}.`,
      );
    }
  };
}

/**
 * Runtime integrity of a single {@link RuleValue}, strict enough that a
 * malformed value fails closed instead of being accepted.
 *
 * The two epistemic states this subsystem carries are held to their exact
 * shapes:
 * - `known` carries a resolved value and a pinpointed source and nothing else; a
 *   missing value, an empty string, a non-finite number, or a value outside the
 *   field's closed domain (via `validate`) is rejected.
 * - `unknown` carries only an explanatory note; it may not smuggle a `value` or
 *   `source`, so an "unknown" that secretly resolves something fails.
 *
 * `not-applicable` is refused outright, before its note is read. See
 * {@link ExecutiveRuleValue}: the shared shape carries no source for that claim,
 * so any acceptance test could only inspect free-text wording, and wording is
 * forgeable. Reading the note at all — however strict the reading — is what let
 * a citation-shaped sentence turn an absent record into a statement about the
 * law. The note is therefore never consulted, and such a field stays `unknown`.
 *
 * The parameter is typed as the full {@link RuleValue} on purpose: this check
 * exists for values that never passed through the compiler (hand-built,
 * deserialized, or cast), so it must be able to receive the state it rejects.
 */
function assertRuleValue<T>(
  value: RuleValue<T>,
  label: string,
  validate?: (resolved: T, label: string) => void,
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a rule value.`);
  }
  const record = value as Record<string, unknown>;
  const shape = Object.keys(record).sort().join(",");

  if (record.kind === "known") {
    if (shape !== "kind,source,value") {
      throw new Error(
        `${label} is a malformed known value; a known rule carries exactly a value and a source (found: ${shape}).`,
      );
    }
    if (record.value === undefined || record.value === null) {
      throw new Error(`${label} is known but carries no resolved value.`);
    }
    if (typeof record.value === "string" && record.value.trim().length === 0) {
      throw new Error(`${label} known value must not be an empty string.`);
    }
    if (typeof record.value === "number" && !Number.isFinite(record.value)) {
      throw new Error(`${label} known numeric value must be finite.`);
    }
    assertPinpointedSource(record.source as RuleSourceRef, label);
    validate?.(record.value as T, label);
    return;
  }

  // Refused before the note is inspected, and regardless of its shape: this
  // subsystem has no source-bearing way to state that a concept does not exist,
  // and a note cannot supply one no matter how it is worded.
  if (record.kind === "not-applicable") {
    throw new Error(
      `${label} is marked not-applicable, which this executive-authority contract does not accept. Inapplicability is a sourced claim about the law, and a not-applicable value carries only a note — a citation-shaped note is decoration, not evidence, so admitting one would let an unresearched field assert that a power does not exist. Leave the field unknown until this subsystem carries an affirmative, source-bearing representation of inapplicability.`,
    );
  }

  if (record.kind === "unknown") {
    if (shape !== "kind,note") {
      throw new Error(
        `${label} is a malformed ${record.kind} value; it may carry only an explanatory note (found: ${shape}).`,
      );
    }
    if (typeof record.note !== "string" || record.note.trim().length === 0) {
      throw new Error(`${label} must explain its ${record.kind} state.`);
    }
    return;
  }

  throw new Error(`${label} has an unrecognized rule state.`);
}

/**
 * Structural validation of an executive-authority pack. This checks that the
 * office described is internally coherent and fully sourced; it never invents a
 * missing rule. In particular it enforces the one cross-field invariant that
 * matters: a `plural` branch must actually list its independent officers, and a
 * `unitary` branch must not.
 */
export function assertExecutiveAuthorityPackIntegrity(
  pack: ExecutiveAuthorityRulePack,
): void {
  if (pack.packId.trim().length === 0) {
    throw new Error("An executive-authority pack must have an identifier.");
  }
  if (pack.jurisdictionKey.trim().length === 0) {
    throw new Error(
      `Executive pack '${pack.packId}' must name a jurisdiction.`,
    );
  }
  if (pack.displayName.trim().length === 0) {
    throw new Error(
      `Executive pack '${pack.packId}' must have a display name.`,
    );
  }

  if (pack.office.officeKey.trim().length === 0) {
    throw new Error(`Executive pack '${pack.packId}' office needs a key.`);
  }
  if (pack.office.title.trim().length === 0) {
    throw new Error(`Executive pack '${pack.packId}' office needs a title.`);
  }
  assertSourceRef(pack.office.source, `office identity in '${pack.packId}'`);
  assertRuleValue(
    pack.office.branchStructure,
    `branch structure in '${pack.packId}'`,
    withinDomain(BRANCH_STRUCTURES),
  );

  assertRuleValue(
    pack.presentment.legislativeRulePackId,
    `presentment reference in '${pack.packId}'`,
  );

  assertSourceRef(pack.appointment.source, `appointment in '${pack.packId}'`);
  assertRuleValue(
    pack.appointment.executiveAppoints,
    `appointment power in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.appointment.legislativeConfirmationRequired,
    `confirmation requirement in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.appointment.confirmingBody,
    `confirming body in '${pack.packId}'`,
  );

  assertSourceRef(pack.removal.source, `removal in '${pack.packId}'`);
  assertRuleValue(
    pack.removal.mode,
    `removal mode in '${pack.packId}'`,
    withinDomain(REMOVAL_MODES),
  );

  assertSourceRef(
    pack.specialSession.source,
    `special session in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.specialSession.executiveMayConvene,
    `special-session convening in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.specialSession.agendaLimitedToCall,
    `special-session agenda scope in '${pack.packId}'`,
  );

  assertSourceRef(
    pack.executiveDirective.source,
    `executive directive in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.executiveDirective.hasDirectiveAuthority,
    `directive authority in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.executiveDirective.authorityBasis,
    `directive basis in '${pack.packId}'`,
  );

  assertSourceRef(
    pack.reorganization.source,
    `reorganization in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.reorganization.executiveMayReorganize,
    `reorganization power in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.reorganization.legislativeDisapprovalAvailable,
    `reorganization disapproval in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.reorganization.sunset,
    `reorganization sunset in '${pack.packId}'`,
  );

  assertSourceRef(
    pack.emergencyDeclaration.source,
    `emergency declaration in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.emergencyDeclaration.executiveMayDeclare,
    `emergency-declaration power in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.emergencyDeclaration.initialDurationDays,
    `emergency-declaration duration in '${pack.packId}'`,
    (days) => {
      if (!Number.isSafeInteger(days) || days <= 0) {
        throw new Error(
          `Emergency-declaration duration in '${pack.packId}' must be a positive whole number of days.`,
        );
      }
    },
  );
  assertRuleValue(
    pack.emergencyDeclaration.extension,
    `emergency-declaration extension in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.emergencyDeclaration.legislativeTermination,
    `emergency-declaration termination in '${pack.packId}'`,
  );

  assertSourceRef(pack.clemency.source, `clemency in '${pack.packId}'`);
  assertRuleValue(
    pack.clemency.model,
    `clemency model in '${pack.packId}'`,
    withinDomain(CLEMENCY_MODELS),
  );
  assertRuleValue(pack.clemency.scope, `clemency scope in '${pack.packId}'`);

  assertSourceRef(
    pack.budgetSubmission.source,
    `budget submission in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.budgetSubmission.executiveMustSubmit,
    `budget-submission duty in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.budgetSubmission.submissionDeadline,
    `budget-submission deadline in '${pack.packId}'`,
  );

  assertSourceRef(
    pack.administrative.source,
    `administrative authority in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.administrative.faithfulExecutionDuty,
    `faithful-execution duty in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.administrative.supervisoryAuthority,
    `supervisory authority in '${pack.packId}'`,
  );

  const seenOffices = new Set<string>();
  for (const constraint of pack.pluralExecutive) {
    if (constraint.officeLabel.trim().length === 0) {
      throw new Error(
        `Executive pack '${pack.packId}' lists a plural-executive officer with no label.`,
      );
    }
    if (seenOffices.has(constraint.officeLabel)) {
      throw new Error(
        `Executive pack '${pack.packId}' repeats plural-executive officer '${constraint.officeLabel}'.`,
      );
    }
    seenOffices.add(constraint.officeLabel);
    assertSourceRef(
      constraint.source,
      `plural-executive officer '${constraint.officeLabel}' in '${pack.packId}'`,
    );
    assertRuleValue(
      constraint.independentlyElected,
      `plural-executive independence of '${constraint.officeLabel}' in '${pack.packId}'`,
    );
  }

  const structure = pack.office.branchStructure;
  if (structure.kind === "known") {
    if (structure.value === "plural" && pack.pluralExecutive.length === 0) {
      throw new Error(
        `Executive pack '${pack.packId}' is a plural executive but lists no independent officers.`,
      );
    }
    if (structure.value === "unitary" && pack.pluralExecutive.length > 0) {
      throw new Error(
        `Executive pack '${pack.packId}' is a unitary executive but lists independent officers.`,
      );
    }
  }

  assertSourceRef(pack.guard.source, `guard authority in '${pack.packId}'`);
  assertRuleValue(
    pack.guard.commandsMilitia,
    `militia command in '${pack.packId}'`,
  );
  assertRuleValue(
    pack.guard.scope,
    `militia command scope in '${pack.packId}'`,
  );

  if (pack.sources.length === 0) {
    throw new Error(`Executive pack '${pack.packId}' cites no sources.`);
  }
  for (const source of pack.sources) {
    assertSourceRef(source, `source in '${pack.packId}'`);
  }
}
