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
 * As in the legislature contract, three epistemic states stay distinct and
 * never collapse into one another:
 * - `known`           the rule is resolved from an official source;
 * - `unknown`         no source resolved it (NOT zero, NOT none, NOT absent);
 * - `not-applicable`  the concept does not exist for this office.
 *
 * A rule that genuinely says "there is none" is a `known` value carrying the
 * negative fact (for example, a governor who commands no militia at all).
 *
 * Nothing here models political behaviour, and nothing here scores an office.
 * There is deliberately no veto-deterrence, legal-risk, morale, competence,
 * loyalty, confirmability or "strong executive" number: those were product
 * ideas in the 92H research, not accepted canonical primitives, and encoding
 * one would turn a rule contract into a rating engine.
 */

import {
  assertSourceRef,
  type LegislativeRulePack,
  type ExecutiveRule,
  type RuleSourceRef,
  type RuleValue,
} from "./legislature-rules";

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
  readonly branchStructure: RuleValue<ExecutiveBranchStructure>;
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
   * carries presentment and veto for this jurisdiction, where one exists;
   * `unknown` where no legislative pack has been compiled yet (the federal
   * executive is packed here before Congress is), and `not-applicable` only if
   * the office never receives bills at all.
   */
  readonly legislativeRulePackId: RuleValue<string>;
}

// ---------------------------------------------------------------------------
// Appointment and removal
// ---------------------------------------------------------------------------

/** The executive's authority to appoint principal officers. */
export interface AppointmentAuthorityRule {
  /** Whether the executive appoints principal officers of the branch. */
  readonly executiveAppoints: RuleValue<boolean>;
  /** Whether a legislative body must confirm those appointments. */
  readonly legislativeConfirmationRequired: RuleValue<boolean>;
  /** Which body confirms, where one does (e.g. "the Senate"). */
  readonly confirmingBody: RuleValue<string>;
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
  readonly mode: RuleValue<RemovalMode>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Special session
// ---------------------------------------------------------------------------

export interface SpecialSessionAuthorityRule {
  /** Whether the executive may convene an extraordinary/special session. */
  readonly executiveMayConvene: RuleValue<boolean>;
  /**
   * Whether the legislature, once convened, may act only on the subjects the
   * executive named in the call. This is the substantive lever: a call whose
   * agenda the legislature can expand is a much weaker power than one it cannot.
   */
  readonly agendaLimitedToCall: RuleValue<boolean>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Executive directives / orders
// ---------------------------------------------------------------------------

export interface ExecutiveDirectiveAuthorityRule {
  /** Whether the office issues binding executive orders/directives. */
  readonly hasDirectiveAuthority: RuleValue<boolean>;
  /**
   * What the authority rests on, in the research's words — a constitutional
   * vesting/execution clause, a general statute, or a narrower grant.
   */
  readonly authorityBasis: RuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Reorganization
// ---------------------------------------------------------------------------

export interface ReorganizationAuthorityRule {
  /** Whether the executive may reorganize executive-branch agencies. */
  readonly executiveMayReorganize: RuleValue<boolean>;
  /**
   * Whether a reorganization takes effect unless the legislature disapproves it
   * within a window — the legislative-veto pattern many reorganization statutes
   * use.
   */
  readonly legislativeDisapprovalAvailable: RuleValue<boolean>;
  /** Whether the grant of authority itself expires, and when. */
  readonly sunset: RuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Emergency declaration
// ---------------------------------------------------------------------------

export interface EmergencyDeclarationAuthorityRule {
  /** Whether the executive may declare a state of emergency/disaster. */
  readonly executiveMayDeclare: RuleValue<boolean>;
  /** How long the declaration stands before it must be renewed, in days. */
  readonly initialDurationDays: RuleValue<number>;
  /** How, and by whom, a declaration is extended past its initial term. */
  readonly extension: RuleValue<string>;
  /** Whether and how the legislature may terminate a declaration. */
  readonly legislativeTermination: RuleValue<string>;
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
  readonly model: RuleValue<ClemencyModel>;
  /** What the power reaches and what it excludes (e.g. impeachment). */
  readonly scope: RuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Budget submission
// ---------------------------------------------------------------------------

export interface BudgetSubmissionRule {
  /** Whether the executive is required to submit a budget to the legislature. */
  readonly executiveMustSubmit: RuleValue<boolean>;
  /** When the budget is due, in the research's words. */
  readonly submissionDeadline: RuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Administrative authority
// ---------------------------------------------------------------------------

export interface AdministrativeAuthorityRule {
  /** Whether a faithful-execution / "take care" duty binds the office. */
  readonly faithfulExecutionDuty: RuleValue<boolean>;
  /** The general supervisory authority the office holds over the branch. */
  readonly supervisoryAuthority: RuleValue<string>;
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
  readonly independentlyElected: RuleValue<boolean>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// Guard / militia authority
// ---------------------------------------------------------------------------

export interface GuardAuthorityRule {
  /** Whether the office commands the state militia / National Guard. */
  readonly commandsMilitia: RuleValue<boolean>;
  /** What the command reaches, and any limit on it, in the research's words. */
  readonly scope: RuleValue<string>;
  readonly source: RuleSourceRef;
}

// ---------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------

/**
 * A complete runtime rule pack for one executive office. Packs are data
 * compiled from sourced research; the engine holds no jurisdiction knowledge of
 * its own. Every field the research did not resolve stays `unknown`; every
 * concept the office does not have stays `not-applicable`.
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
  if (ref.value !== legislativePack.packId) {
    throw new Error(
      `Executive pack '${executivePack.packId}' references legislative pack '${ref.value}', not '${legislativePack.packId}'.`,
    );
  }
  if (executivePack.jurisdictionKey !== legislativePack.jurisdictionKey) {
    throw new Error(
      `Executive pack '${executivePack.packId}' (${executivePack.jurisdictionKey}) and legislative pack '${legislativePack.packId}' (${legislativePack.jurisdictionKey}) describe different jurisdictions.`,
    );
  }
  return legislativePack.executive;
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

function assertRuleValue<T>(
  value: RuleValue<T>,
  label: string,
  validate?: (resolved: T) => void,
): void {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} must be a rule value.`);
  }
  if (value.kind === "known") {
    assertSourceRef(value.source, label);
    validate?.(value.value);
    return;
  }
  if (value.kind === "unknown" || value.kind === "not-applicable") {
    if (value.note.trim().length === 0) {
      throw new Error(`${label} must explain its ${value.kind} state.`);
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
  assertRuleValue(pack.removal.mode, `removal mode in '${pack.packId}'`);

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
  assertRuleValue(pack.clemency.model, `clemency model in '${pack.packId}'`);
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
