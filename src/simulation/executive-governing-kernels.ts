/**
 * 92H executive-governing workflow kernels, compiled onto the primitives that
 * already exist.
 *
 * The 92H lane researched how a governor's office actually disposes of work:
 * seventy kernels across twenty-two workflow families, each one a bounded
 * office practice with its roles, its triggers, its lawful alternatives and its
 * sources. Twenty-four of them were marked implementable with the mechanics
 * already on accepted `main`. This module compiles exactly those twenty-four
 * into plans, and refuses the rest.
 *
 * The important design choice is what a "plan" is. It is not a new executive
 * engine, and it is not a description of one. Every step a plan carries is
 * literally the input to a canonical creator that already exists —
 * `createWorkItem`, `createScheduledActivity`, `scheduleFutureDueItem`,
 * `recordWorldEvent`, `recordEvidenceArtifact`, `recordExecutiveAction` — so
 * `applyExecutiveGoverningPlan` is a switch over six calls and nothing else.
 * A second task list or a second calendar cannot hide in here, because there is
 * nowhere for one to live.
 *
 * The second design choice is that the compiler refuses rather than invents.
 * 92H's generic office-practice shell has nine stages; a jurisdiction's law,
 * a cadence, or a deadline that the research left UNKNOWN cannot be filled in
 * by this module. A stage a kernel cannot honestly reach is recorded as an
 * explicit omission with a reason from a closed vocabulary, and a fact the
 * caller has not supplied from canonical records fails the compile closed.
 *
 * The office practice in here is not legal authority. Where a kernel touches
 * one — the regular-veto presentment seam is the only one this wave carries —
 * the authority is resolved from the live legislative rule-pack registry by
 * pack id, never from a caller-supplied pack object and never from facts
 * copied into this file.
 */

import { recordEvidenceArtifact } from "./evidence";
import { createStableId } from "./ids";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  recordExecutiveAction,
  requireMeasure,
  measurePosition,
  type ExecutiveActionInput,
} from "./legislation";
import { rulePackById } from "./legislature-rule-packs";
import { isKnown, type LegislativeRulePack } from "./legislature-rules";
import {
  createScheduledActivity,
  createWorkItem,
  type CreateScheduledActivityInput,
  type CreateWorkItemInput,
} from "./time-work";
import type { ScheduleFutureDueItemInput } from "./future-transitions";
import type { RecordEvidenceArtifactInput } from "./evidence";
import type { HistoricalEventInput } from "./history";
import type {
  AuthoredActivityLocation,
  EntityId,
  EventType,
  EventVisibility,
  EvidenceAccess,
  EvidenceSemanticKey,
  FutureDueItem,
  FutureTransitionHandlerResult,
  FutureTransitionKey,
  IsoDate,
  ScheduledActivityKind,
  SimulationMoment,
  WorkPlayerRequirement,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/* ------------------------------------------------------------------ *
 * Research identity
 * ------------------------------------------------------------------ */

export type ExecutiveKernelId = `92H-K-${string}`;
export type ExecutiveWorkflowFamilyId = `WF-${string}`;

/**
 * The three states the 92H machine inventory assigns to a kernel.
 *
 * Only the first is this wave's business. The other two are carried so the
 * gate is executable: a caller can ask for kernel 92H-K-090 and be told that
 * declaring an emergency needs a mechanic nobody has built, rather than
 * getting a plan that quietly pretends otherwise.
 */
export type ExecutiveKernelStatus =
  "IMPLEMENTABLE_WITH_CURRENT_MECHANICS" | "NEEDS_MECHANIC" | "RESEARCH_GAP";

export type ExecutiveKernelScope = "GENERIC" | "JURISDICTION-SPECIFIC";
export type ExecutiveKernelTier = "ordinary" | "medium" | "high";

/**
 * The primitive vocabulary 92H used to classify what a kernel consumes, kept
 * verbatim so a plan can be checked against the research that produced it.
 */
export type CanonicalPrimitiveKey =
  | "activity"
  | "commitment"
  | "control"
  | "decision"
  | "due"
  | "eligibility"
  | "event"
  | "evidence"
  | "fiscal"
  | "incident"
  | "juris"
  | "knowledge"
  | "measure"
  | "moment"
  | "org"
  | "person"
  | "policy"
  | "relationship"
  | "resource"
  | "rulepack"
  | "work";

/* ------------------------------------------------------------------ *
 * The invariant office-practice shell
 * ------------------------------------------------------------------ */

/**
 * 92H's generic shell, in order: intake, staff analysis, counsel and fiscal
 * review, decision memorandum, the chief-of-staff gate, the player's decision
 * slot, communication, implementation work, follow-up.
 *
 * Every kernel is measured against all nine. A kernel that has no counsel
 * review says so; it does not silently have one fewer stage than the research
 * describes.
 */
export const EXECUTIVE_WORKFLOW_SHELL_STAGES = [
  "intake",
  "staff-analysis",
  "counsel-fiscal-review",
  "decision-memorandum",
  "chief-of-staff-gate",
  "player-decision-slot",
  "communication",
  "implementation-work",
  "follow-up",
] as const;

export type ExecutiveWorkflowShellStage =
  (typeof EXECUTIVE_WORKFLOW_SHELL_STAGES)[number];

/**
 * Why a stage produces no record.
 *
 * A closed vocabulary on purpose. "This kernel has no counsel review" and
 * "Kentucky has not told us how long the Governor has" are different claims,
 * and a free-text note would let them blur into each other the first time
 * somebody was in a hurry.
 */
export type ExecutiveShellOmissionReason =
  /** The kernel's own practice does not include this stage at all. */
  | "kernel-carries-no-such-stage"
  /** No record family on accepted main can carry it. */
  | "no-record-family-on-accepted-main"
  /** A jurisdiction rule input the research left unresolved. */
  | "jurisdiction-rule-input-unresolved"
  /** A recurrence the research did not source; a caller must supply it. */
  | "cadence-not-in-canonical-records"
  /** A deadline nobody sourced. Inventing one here would be fabricating law. */
  | "deadline-not-sourced"
  /** Real, but written by a system this additive wave does not own. */
  | "downstream-record-owned-by-another-system";

export type ExecutiveRoleKey =
  | "principal"
  | "chief-of-staff"
  | "policy-director"
  | "legal-counsel"
  | "budget-office"
  | "agency-head"
  | "second-agency-head"
  | "legislative-director"
  | "communications"
  | "constituent-relations"
  | "scheduling-director"
  | "intergovernmental-staff"
  | "auditor"
  | "emergency-management-director"
  | "family-member";

/* ------------------------------------------------------------------ *
 * Step specifications
 * ------------------------------------------------------------------ */

/**
 * What a kernel's step is, before it knows which world it will run in.
 *
 * Each variant names one canonical creator. There is no seventh variant, and
 * adding one would mean naming a seventh creator that already exists.
 */
export type ExecutiveKernelStepSpec =
  | {
      readonly kind: "work-item";
      readonly stepKey: string;
      readonly roleKeys: readonly ExecutiveRoleKey[];
      readonly playerRequirement: WorkPlayerRequirement;
      readonly focus: ExecutiveKernelFocusSpec;
    }
  | {
      readonly kind: "scheduled-activity";
      readonly stepKey: string;
      readonly roleKeys: readonly ExecutiveRoleKey[];
      readonly activityKind: ScheduledActivityKind;
    }
  | {
      readonly kind: "future-due-item";
      readonly stepKey: string;
      readonly roleKeys: readonly ExecutiveRoleKey[];
      readonly transitionKey: FutureTransitionKey;
    }
  | {
      readonly kind: "historical-event";
      readonly stepKey: string;
      readonly roleKeys: readonly ExecutiveRoleKey[];
      readonly eventType: EventType;
      readonly visibility: EventVisibility;
    }
  | {
      readonly kind: "evidence-artifact";
      readonly stepKey: string;
      readonly evidenceKind: EvidenceSemanticKey;
      readonly access: EvidenceAccess;
      /**
       * The `historical-event` step, earlier in the same shell, that this
       * artifact documents. Evidence on accepted main must relate to an event
       * or an incident, which is the right constraint: a document that records
       * nothing that happened is not evidence of anything.
       */
      readonly relatedEventStepKey: string;
    }
  | {
      readonly kind: "executive-disposition";
      readonly stepKey: string;
    };

/**
 * What the work is about. `matter` points at whatever canonical record the
 * caller says this office matter concerns; `measure` points at the bill in the
 * D-056 spine and is only legal for the presentment kernels.
 */
export type ExecutiveKernelFocusSpec =
  | { readonly kind: "matter" }
  | { readonly kind: "measure" }
  | { readonly kind: "calendar-item"; readonly activityStepKey: string }
  | { readonly kind: "person"; readonly roleKey: ExecutiveRoleKey };

export type ExecutiveShellBinding =
  | {
      readonly stage: ExecutiveWorkflowShellStage;
      readonly kind: "compiled";
      readonly primitive: CanonicalPrimitiveKey;
      readonly step: ExecutiveKernelStepSpec;
    }
  | {
      readonly stage: ExecutiveWorkflowShellStage;
      readonly kind: "deferred";
      readonly toKernelId: ExecutiveKernelId;
      readonly note: string;
    }
  | {
      readonly stage: ExecutiveWorkflowShellStage;
      readonly kind: "omitted";
      readonly reason: ExecutiveShellOmissionReason;
      readonly note: string;
    };

/* ------------------------------------------------------------------ *
 * Jurisdiction authority
 * ------------------------------------------------------------------ */

/**
 * What a kernel needs from law, kept apart from what it needs from office
 * practice.
 *
 * 92H's shell is practice research. Practice is portable; authority is not.
 * A kernel that only describes how an office handles paper carries `none` and
 * runs anywhere there is an office. A kernel that touches a legal act names
 * the authority it needs, and the compiler resolves that from the live
 * registry or refuses.
 */
export type ExecutiveKernelAuthority =
  | { readonly kind: "none" }
  /** Resolved from the live legislative rule-pack registry, by pack id. */
  | { readonly kind: "legislative-rule-pack" }
  /**
   * The practice exists only where a jurisdiction requires it, and no rule
   * pack on main carries that requirement. The caller must assert it from
   * canonical records under this fact key, or the kernel does not compile.
   */
  | { readonly kind: "supplied-canonical-fact"; readonly factKey: string };

export type ExecutiveDispositionOptionKey =
  | "sign"
  | "veto-with-message"
  | "let-become-law-without-signature"
  | "pocket-veto"
  | "item-veto"
  | "amendatory-veto";

export type ExecutiveDispositionWithholdingReason =
  /** The live rule pack does not resolve the rule that would permit it. */
  | "rule-unknown"
  /** The rule pack positively says the jurisdiction has no such path. */
  | "rule-not-applicable"
  /**
   * The rule is resolved, but no disposition record on accepted main can carry
   * the act. 92H marks these kernels NEEDS_MECHANIC for exactly this reason.
   */
  | "record-family-absent";

export interface WithheldExecutiveDispositionOption {
  readonly option: ExecutiveDispositionOptionKey;
  readonly reason: ExecutiveDispositionWithholdingReason;
  readonly note: string;
}

export interface ExecutiveDispositionOptions {
  readonly rulePackId: string;
  readonly available: readonly ExecutiveDispositionOptionKey[];
  readonly withheld: readonly WithheldExecutiveDispositionOption[];
}

/* ------------------------------------------------------------------ *
 * Kernel definitions
 * ------------------------------------------------------------------ */

/** One row of the 92H machine inventory, whatever its status. */
export interface ExecutiveKernelRow {
  readonly id: ExecutiveKernelId;
  readonly family: ExecutiveWorkflowFamilyId;
  readonly familyName: string;
  readonly title: string;
  readonly status: ExecutiveKernelStatus;
  readonly scope: ExecutiveKernelScope;
  readonly tier: ExecutiveKernelTier;
  /**
   * For a kernel this wave does not compile: what 92H says is missing. Empty
   * for the twenty-four that do compile, whose limitations travel on the
   * definition instead.
   */
  readonly blockedBy: readonly string[];
}

/** A row this wave can actually build a plan from. */
export interface ExecutiveKernelDefinition {
  readonly row: ExecutiveKernelRow;
  /** 92H source ids, carried into every record the plan writes. */
  readonly sourceRefs: readonly string[];
  readonly primitives: readonly CanonicalPrimitiveKey[];
  readonly roles: readonly ExecutiveRoleKey[];
  readonly triggerConditions: readonly string[];
  readonly playerDecisionPoints: readonly string[];
  /** The research's own phrasing, kept for provenance. */
  readonly canonicalFactsRequired: readonly string[];
  /** The machine keys a caller must bind from canonical records. */
  readonly requiredFactKeys: readonly string[];
  readonly authority: ExecutiveKernelAuthority;
  readonly shell: readonly ExecutiveShellBinding[];
  /** 92H's own explicit unknowns and implementation dependencies. */
  readonly declaredLimitations: readonly string[];
}

/* ------------------------------------------------------------------ *
 * Compile context and results
 * ------------------------------------------------------------------ */

export interface ExecutiveActivityWindow {
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
}

export interface ExecutiveMeasureContext {
  readonly measureId: EntityId;
  readonly rulePackId: string;
  /**
   * The canonical event that put the bill on the desk. Work focus has to name
   * a record the world can vouch for, and a measure is not one of those; the
   * presentment event is.
   */
  readonly presentmentEventId: EntityId;
  /** Which lawful disposition the office chose. Never chosen by this module. */
  readonly chosenOption: ExecutiveDispositionOptionKey;
  readonly rationale: string;
}

/**
 * Everything the caller must already know from canonical records.
 *
 * There is no world here on purpose. A plan is compiled from facts the caller
 * has read out of the world and is applied to the world afterwards, which is
 * what makes the same kernel plus the same context produce the same plan every
 * time. Nothing in here is read from the clock or from entropy.
 */
export interface ExecutiveGoverningContext {
  /** Namespaces every stable key this plan writes. */
  readonly planKey: string;
  /**
   * The world the plan is for. Canonical ids are derived from it, so a plan
   * compiled against one save cannot be applied to another.
   */
  readonly worldId: string;
  readonly officeJurisdictionId: EntityId;
  /** The canonical minute the caller is compiling for. */
  readonly moment: SimulationMoment;
  readonly roles: Readonly<Partial<Record<ExecutiveRoleKey, EntityId>>>;
  /** Canonical facts, by the kernel's required fact keys. */
  readonly facts: Readonly<Record<string, string>>;
  /** Calendar windows for compiled activity steps, by step key. */
  readonly activityWindows: Readonly<Record<string, ExecutiveActivityWindow>>;
  /** Due dates for compiled due-item steps, by step key. */
  readonly dueDates: Readonly<Record<string, IsoDate>>;
  readonly location: AuthoredActivityLocation;
  /** The canonical record this office matter is about. */
  readonly matterEntityId: EntityId;
  readonly measure: ExecutiveMeasureContext | null;
}

export type ExecutiveGoverningPlanStep =
  | {
      readonly kind: "work-item";
      readonly stepKey: string;
      readonly stage: ExecutiveWorkflowShellStage;
      readonly input: CreateWorkItemInput;
    }
  | {
      readonly kind: "scheduled-activity";
      readonly stepKey: string;
      readonly stage: ExecutiveWorkflowShellStage;
      readonly input: CreateScheduledActivityInput;
    }
  | {
      readonly kind: "future-due-item";
      readonly stepKey: string;
      readonly stage: ExecutiveWorkflowShellStage;
      readonly input: ScheduleFutureDueItemInput;
    }
  | {
      readonly kind: "historical-event";
      readonly stepKey: string;
      readonly stage: ExecutiveWorkflowShellStage;
      readonly input: HistoricalEventInput;
    }
  | {
      readonly kind: "evidence-artifact";
      readonly stepKey: string;
      readonly stage: ExecutiveWorkflowShellStage;
      readonly input: RecordEvidenceArtifactInput;
    }
  | {
      readonly kind: "executive-disposition";
      readonly stepKey: string;
      readonly stage: ExecutiveWorkflowShellStage;
      readonly input: ExecutiveActionInput;
    };

export interface ExecutiveShellOmissionRecord {
  readonly stage: ExecutiveWorkflowShellStage;
  readonly reason: ExecutiveShellOmissionReason;
  readonly note: string;
}

export interface ExecutiveShellDeferralRecord {
  readonly stage: ExecutiveWorkflowShellStage;
  readonly toKernelId: ExecutiveKernelId;
  readonly note: string;
}

export interface ExecutiveGoverningPlan {
  readonly kernelId: ExecutiveKernelId;
  readonly family: ExecutiveWorkflowFamilyId;
  readonly planKey: string;
  readonly worldId: string;
  /** The date this plan was compiled for; applying it on another day fails. */
  readonly momentDate: IsoDate;
  readonly sourceRefs: readonly string[];
  readonly primitives: readonly CanonicalPrimitiveKey[];
  readonly steps: readonly ExecutiveGoverningPlanStep[];
  readonly omissions: readonly ExecutiveShellOmissionRecord[];
  readonly deferrals: readonly ExecutiveShellDeferralRecord[];
  /** Present only for kernels whose authority came from a live rule pack. */
  readonly dispositionOptions: ExecutiveDispositionOptions | null;
  readonly declaredLimitations: readonly string[];
}

export type ExecutiveCompileRefusalReason =
  | "kernel-not-implementable-with-current-mechanics"
  | "missing-canonical-fact"
  | "unbound-role"
  | "missing-activity-window"
  | "missing-due-date"
  | "measure-context-missing"
  | "missing-event-anchor"
  | "jurisdiction-authority-unavailable"
  | "jurisdiction-authority-unresolved"
  | "disposition-option-unavailable";

export type CompileExecutiveGoverningPlanResult =
  | { readonly ok: true; readonly plan: ExecutiveGoverningPlan }
  | {
      readonly ok: false;
      readonly reason: ExecutiveCompileRefusalReason;
      readonly detail: readonly string[];
    };

/* ------------------------------------------------------------------ *
 * Developer labels
 * ------------------------------------------------------------------ */

/**
 * Nothing this module writes is prose a player reads.
 *
 * PR #99's civic-prose system is the thing that will eventually render a
 * governor's day into English, and it is still awaiting acceptance. Writing
 * sentences here would be freestyling game copy in a headless compiler. So
 * every title and summary the plan produces is a structured developer label
 * with a grammar narrow enough to check, and the tests check it.
 */
export const DEVELOPER_LABEL_PATTERN =
  /^92H-K-[0-9]{3} · [a-z][a-z0-9-]*(?: · [a-z][a-z0-9-]*)?$/;

export const DEVELOPER_SUMMARY_PATTERN =
  /^92H kernel 92H-K-[0-9]{3} \(WF-[0-9]{2}\); shell stage [a-z-]+; primitive [a-z-]+; sources [A-Z0-9-]+(?:, [A-Z0-9-]+)*\.$/;

function developerLabel(
  kernelId: ExecutiveKernelId,
  stepKey: string,
  qualifier?: string,
): string {
  return qualifier
    ? `${kernelId} · ${stepKey} · ${qualifier}`
    : `${kernelId} · ${stepKey}`;
}

function developerSummary(
  definition: ExecutiveKernelDefinition,
  stage: ExecutiveWorkflowShellStage,
  primitive: CanonicalPrimitiveKey,
): string {
  return (
    `92H kernel ${definition.row.id} (${definition.row.family}); ` +
    `shell stage ${stage}; primitive ${primitive}; ` +
    `sources ${[...definition.sourceRefs].sort().join(", ")}.`
  );
}

/* ------------------------------------------------------------------ *
 * Authority resolution
 * ------------------------------------------------------------------ */

/**
 * Which dispositions the live rule pack actually permits, and why the others
 * are not on offer.
 *
 * Resolution goes through `rulePackById` against the registry compiled into
 * main. A caller cannot hand in a pack: a fabricated pack with a plausible id
 * would otherwise be able to grant a Governor a power the jurisdiction has
 * never had.
 *
 * Two of the withheld reasons are worth separating. Kentucky does not tell us
 * what happens to a bill the Governor neither signs nor returns, so letting one
 * become law without signature is withheld as unknown. Nebraska does tell us —
 * and it is still withheld, because no disposition record on accepted main can
 * record that act. The first is missing law; the second is a missing mechanic,
 * which is what 92H says about kernels K-031 and K-032 as well.
 */
export function resolveExecutiveDispositionOptions(
  pack: LegislativeRulePack,
): ExecutiveDispositionOptions {
  const available: ExecutiveDispositionOptionKey[] = [];
  const withheld: WithheldExecutiveDispositionOption[] = [];
  const executive = pack.executive;

  if (
    isKnown(executive.presentmentRequired) &&
    executive.presentmentRequired.value
  ) {
    available.push("sign", "veto-with-message");
  }

  const inaction = executive.inactionOutcomeInSession;
  if (inaction.kind === "known") {
    if (inaction.value === "becomes-law-without-signature") {
      withheld.push({
        option: "let-become-law-without-signature",
        reason: "record-family-absent",
        note: `${pack.displayName} resolves inaction as becoming law without signature, but no executive-disposition record on accepted main accepts that act.`,
      });
    } else {
      withheld.push({
        option: "let-become-law-without-signature",
        reason: "rule-not-applicable",
        note: `${pack.displayName} resolves inaction as a pocket veto, not as becoming law.`,
      });
    }
    if (inaction.value === "pocket-veto") {
      withheld.push({
        option: "pocket-veto",
        reason: "record-family-absent",
        note: `${pack.displayName} resolves a pocket veto, but no executive-disposition record on accepted main accepts that act.`,
      });
    } else {
      withheld.push({
        option: "pocket-veto",
        reason: "rule-not-applicable",
        note: `${pack.displayName} does not resolve inaction as a pocket veto.`,
      });
    }
  } else {
    withheld.push(
      {
        option: "let-become-law-without-signature",
        reason: "rule-unknown",
        note: `${pack.displayName} has not resolved what becomes of a bill the ${executive.titleLabel} neither signs nor returns.`,
      },
      {
        option: "pocket-veto",
        reason: "rule-unknown",
        note: `${pack.displayName} has not resolved whether inaction after adjournment kills a bill.`,
      },
    );
  }

  withheld.push(
    {
      option: "item-veto",
      reason: "record-family-absent",
      note: "92H kernel 92H-K-031 is NEEDS_MECHANIC: appropriation-item disposition records do not exist on accepted main.",
    },
    {
      option: "amendatory-veto",
      reason: "record-family-absent",
      note: "92H kernel 92H-K-032 is NEEDS_MECHANIC: amendatory-recommendation records do not exist on accepted main.",
    },
  );

  return {
    rulePackId: pack.packId,
    available,
    withheld: [...withheld].sort((left, right) =>
      left.option.localeCompare(right.option),
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Compilation
 * ------------------------------------------------------------------ */

function requireRole(
  context: ExecutiveGoverningContext,
  roleKey: ExecutiveRoleKey,
  missing: string[],
): EntityId | null {
  const personId = context.roles[roleKey];
  if (!personId) {
    missing.push(roleKey);
    return null;
  }
  return personId;
}

function resolveRoleIds(
  context: ExecutiveGoverningContext,
  roleKeys: readonly ExecutiveRoleKey[],
  missing: string[],
): EntityId[] {
  const ids: EntityId[] = [];
  for (const roleKey of roleKeys) {
    const id = requireRole(context, roleKey, missing);
    if (id) ids.push(id);
  }
  return [...new Set(ids)].sort();
}

function stableKeyFor(
  context: ExecutiveGoverningContext,
  definition: ExecutiveKernelDefinition,
  stepKey: string,
): string {
  return `${context.planKey}:${definition.row.id}:${stepKey}`;
}

/**
 * Turns one 92H kernel into a plan built out of canonical creator inputs.
 *
 * Refuses, rather than improvises, on every path where the research or the
 * caller has not supplied something: a kernel 92H did not mark implementable,
 * an unbound role, a fact the kernel says it needs, a calendar window for an
 * activity, a due date for a cadence, or a legal option the live rule pack
 * does not grant.
 */
export function compileExecutiveGoverningPlan(
  definition: ExecutiveKernelDefinition,
  context: ExecutiveGoverningContext,
): CompileExecutiveGoverningPlanResult {
  if (definition.row.status !== "IMPLEMENTABLE_WITH_CURRENT_MECHANICS") {
    return {
      ok: false,
      reason: "kernel-not-implementable-with-current-mechanics",
      detail: [
        `${definition.row.id} is ${definition.row.status}.`,
        ...definition.row.blockedBy,
      ],
    };
  }

  const missingFacts = definition.requiredFactKeys.filter(
    (key) => (context.facts[key] ?? "").trim().length === 0,
  );
  if (missingFacts.length > 0) {
    return {
      ok: false,
      reason: "missing-canonical-fact",
      detail: missingFacts,
    };
  }

  let dispositionOptions: ExecutiveDispositionOptions | null = null;
  if (definition.authority.kind === "supplied-canonical-fact") {
    const factKey = definition.authority.factKey;
    if ((context.facts[factKey] ?? "").trim().length === 0) {
      return {
        ok: false,
        reason: "jurisdiction-authority-unresolved",
        detail: [
          `${definition.row.id} needs canonical fact '${factKey}': the jurisdiction requirement it describes is not carried by any rule pack on accepted main.`,
        ],
      };
    }
  }
  if (definition.authority.kind === "legislative-rule-pack") {
    if (!context.measure) {
      return {
        ok: false,
        reason: "measure-context-missing",
        detail: [`${definition.row.id} needs a measure and a rule-pack id.`],
      };
    }
    let pack: LegislativeRulePack;
    try {
      pack = rulePackById(context.measure.rulePackId);
    } catch {
      return {
        ok: false,
        reason: "jurisdiction-authority-unavailable",
        detail: [
          `No legislative rule pack named '${context.measure.rulePackId}' is registered on accepted main.`,
        ],
      };
    }
    dispositionOptions = resolveExecutiveDispositionOptions(pack);
    if (dispositionOptions.available.length === 0) {
      return {
        ok: false,
        reason: "jurisdiction-authority-unresolved",
        detail: [
          `${pack.displayName} has not resolved whether measures are presented to the ${pack.executive.titleLabel}.`,
        ],
      };
    }
    if (!dispositionOptions.available.includes(context.measure.chosenOption)) {
      const withheld = dispositionOptions.withheld.find(
        (candidate) => candidate.option === context.measure?.chosenOption,
      );
      return {
        ok: false,
        reason: "disposition-option-unavailable",
        detail: [
          withheld?.note ??
            `${pack.displayName} does not offer '${context.measure.chosenOption}'.`,
        ],
      };
    }
  }

  const steps: ExecutiveGoverningPlanStep[] = [];
  const omissions: ExecutiveShellOmissionRecord[] = [];
  const deferrals: ExecutiveShellDeferralRecord[] = [];
  const unboundRoles: string[] = [];
  const missingWindows: string[] = [];
  const missingDueDates: string[] = [];
  const activityStableKeys = new Map<string, string>();
  const eventStableKeys = new Map<string, string>();
  const missingEventAnchors: string[] = [];

  for (const binding of definition.shell) {
    if (binding.kind === "omitted") {
      omissions.push({
        stage: binding.stage,
        reason: binding.reason,
        note: binding.note,
      });
      continue;
    }
    if (binding.kind === "deferred") {
      deferrals.push({
        stage: binding.stage,
        toKernelId: binding.toKernelId,
        note: binding.note,
      });
      continue;
    }

    const spec = binding.step;
    const stableKey = stableKeyFor(context, definition, spec.stepKey);
    const summary = developerSummary(
      definition,
      binding.stage,
      binding.primitive,
    );

    switch (spec.kind) {
      case "work-item": {
        const assigned = resolveRoleIds(context, spec.roleKeys, unboundRoles);
        const focus = compileFocus(
          spec.focus,
          context,
          activityStableKeys,
          unboundRoles,
        );
        if (!focus) break;
        steps.push({
          kind: "work-item",
          stepKey: spec.stepKey,
          stage: binding.stage,
          input: {
            stableKey,
            title: developerLabel(definition.row.id, spec.stepKey),
            summary,
            jurisdictionId: context.officeJurisdictionId,
            sourceEntityIds: [context.officeJurisdictionId],
            focus,
            effort: null,
            access: { kind: "office" },
            assignedPersonIds: assigned,
            playerRequirement: spec.playerRequirement,
            waitingOnPersonIds: [],
            blocker: null,
            scheduledActivityId: null,
          },
        });
        break;
      }
      case "scheduled-activity": {
        const participants = resolveRoleIds(
          context,
          spec.roleKeys,
          unboundRoles,
        );
        const window = context.activityWindows[spec.stepKey];
        if (!window) {
          missingWindows.push(spec.stepKey);
          break;
        }
        activityStableKeys.set(spec.stepKey, stableKey);
        steps.push({
          kind: "scheduled-activity",
          stepKey: spec.stepKey,
          stage: binding.stage,
          input: {
            stableKey,
            title: developerLabel(definition.row.id, spec.stepKey),
            summary,
            kind: spec.activityKind,
            start: window.start,
            end: window.end,
            participantPersonIds: participants,
            responsiblePersonId: participants[0] ?? null,
            location: context.location,
            sourceEntityIds: [context.officeJurisdictionId],
            flexibility: { kind: "fixed" },
            access: { kind: "office" },
          },
        });
        break;
      }
      case "future-due-item": {
        const responsible = resolveRoleIds(
          context,
          spec.roleKeys,
          unboundRoles,
        );
        const dueAt = context.dueDates[spec.stepKey];
        if (!dueAt) {
          missingDueDates.push(spec.stepKey);
          break;
        }
        steps.push({
          kind: "future-due-item",
          stepKey: spec.stepKey,
          stage: binding.stage,
          input: {
            stableKey,
            dueAt,
            transitionKey: spec.transitionKey,
            entityIds: [context.officeJurisdictionId, ...responsible],
            jurisdictionId: context.officeJurisdictionId,
            provenance: { kind: "authored", note: summary },
          },
        });
        break;
      }
      case "historical-event": {
        const participants = resolveRoleIds(
          context,
          spec.roleKeys,
          unboundRoles,
        );
        eventStableKeys.set(spec.stepKey, stableKey);
        steps.push({
          kind: "historical-event",
          stepKey: spec.stepKey,
          stage: binding.stage,
          input: {
            stableKey,
            type: spec.eventType,
            occurredAt: context.moment.date,
            recordedAt: context.moment.date,
            jurisdictionId: context.officeJurisdictionId,
            involvedEntityIds: participants,
            participants: participants.map((personId) => ({
              personId,
              role: "agency:executive-office" as const,
              detail: null,
            })),
            personFactConstraints: [],
            visibility: spec.visibility,
            tags: [`executive-governing.${definition.row.id.toLowerCase()}`],
            summary,
            context: {
              location: null,
              socialContext: null,
              pressure: null,
              choice: null,
              motivation: null,
              immediateReaction: null,
            },
          },
        });
        break;
      }
      case "evidence-artifact": {
        const eventStableKey = eventStableKeys.get(spec.relatedEventStepKey);
        if (!eventStableKey) {
          missingEventAnchors.push(spec.stepKey);
          break;
        }
        steps.push({
          kind: "evidence-artifact",
          stepKey: spec.stepKey,
          stage: binding.stage,
          input: {
            stableKey,
            evidenceKind: spec.evidenceKind,
            createdAt: context.moment.date,
            recordedAt: context.moment.date,
            relatedEntityIds: [
              createStableId("event", `${context.worldId}:${eventStableKey}`),
            ],
            access: spec.access,
            description: summary,
            provenance: { kind: "authored", note: summary },
          },
        });
        break;
      }
      case "executive-disposition": {
        if (!context.measure) {
          return {
            ok: false,
            reason: "measure-context-missing",
            detail: [`${definition.row.id} needs a measure context.`],
          };
        }
        steps.push({
          kind: "executive-disposition",
          stepKey: spec.stepKey,
          stage: binding.stage,
          input: {
            stableKey,
            measureId: context.measure.measureId,
            action:
              context.measure.chosenOption === "sign" ? "signed" : "vetoed",
            rationale: context.measure.rationale,
          },
        });
        break;
      }
    }
  }

  if (unboundRoles.length > 0) {
    return {
      ok: false,
      reason: "unbound-role",
      detail: [...new Set(unboundRoles)].sort(),
    };
  }
  if (missingWindows.length > 0) {
    return {
      ok: false,
      reason: "missing-activity-window",
      detail: missingWindows,
    };
  }
  if (missingDueDates.length > 0) {
    return { ok: false, reason: "missing-due-date", detail: missingDueDates };
  }
  if (missingEventAnchors.length > 0) {
    return {
      ok: false,
      reason: "missing-event-anchor",
      detail: missingEventAnchors,
    };
  }

  return {
    ok: true,
    plan: {
      kernelId: definition.row.id,
      family: definition.row.family,
      planKey: context.planKey,
      worldId: context.worldId,
      momentDate: context.moment.date,
      sourceRefs: [...definition.sourceRefs].sort(),
      primitives: [...definition.primitives].sort(),
      steps,
      omissions,
      deferrals,
      dispositionOptions,
      declaredLimitations: definition.declaredLimitations,
    },
  };
}

function compileFocus(
  spec: ExecutiveKernelFocusSpec,
  context: ExecutiveGoverningContext,
  activityStableKeys: Map<string, string>,
  unboundRoles: string[],
): CreateWorkItemInput["focus"] | null {
  switch (spec.kind) {
    case "matter":
      return {
        kind: "other",
        targetKey: "executive-governing:matter",
        sourceEntityId: context.matterEntityId,
      };
    case "measure":
      return context.measure
        ? {
            kind: "legislative-material",
            targetKey: `executive-governing:measure:${context.measure.measureId}`,
            sourceEntityId: context.measure.presentmentEventId,
          }
        : null;
    case "person": {
      const personId = requireRole(context, spec.roleKey, unboundRoles);
      return personId ? { kind: "person", personId } : null;
    }
    case "calendar-item": {
      // The activity does not exist yet, but its id does: canonical ids are a
      // pure function of the world and the stable key, so the focus can name
      // the activity the plan is about to create rather than pointing sideways
      // at something vaguer.
      const activityStableKey = activityStableKeys.get(spec.activityStepKey);
      if (!activityStableKey) return null;
      return {
        kind: "calendar-item",
        scheduledActivityId: createStableId(
          "scheduled-activity",
          `${context.worldId}:${activityStableKey}`,
        ),
      };
    }
  }
}

/* ------------------------------------------------------------------ *
 * Application
 * ------------------------------------------------------------------ */

export type ApplyExecutiveGoverningPlanResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly reason: string };

/**
 * Runs a compiled plan through the canonical creators, in order.
 *
 * This is the whole of the runtime. Everything above decides *what* the office
 * does; this decides nothing and calls six functions that already existed.
 */
export function applyExecutiveGoverningPlan(
  world: World,
  plan: ExecutiveGoverningPlan,
): ApplyExecutiveGoverningPlanResult {
  if (world.id !== plan.worldId) {
    return {
      ok: false,
      reason: `Plan ${plan.kernelId} was compiled for world ${plan.worldId} and this world is ${world.id}.`,
    };
  }
  if (world.currentDate !== plan.momentDate) {
    return {
      ok: false,
      reason: `Plan ${plan.kernelId} was compiled for ${plan.momentDate} and the world is on ${world.currentDate}.`,
    };
  }
  let next = world;
  for (const step of plan.steps) {
    switch (step.kind) {
      case "work-item":
        next = createWorkItem(next, step.input);
        break;
      case "scheduled-activity":
        next = createScheduledActivity(next, step.input);
        break;
      case "future-due-item":
        next = scheduleFutureDueItem(next, step.input);
        break;
      case "historical-event":
        next = recordWorldEvent(next, step.input);
        break;
      case "evidence-artifact":
        next = recordEvidenceArtifact(next, step.input);
        break;
      case "executive-disposition": {
        const measure = requireMeasure(next, step.input.measureId);
        const position = measurePosition(next, measure.id);
        if (position.phase !== "awaiting-executive") {
          return {
            ok: false,
            reason: `Measure ${measure.designation} is ${position.phase}, not awaiting-executive.`,
          };
        }
        next = recordExecutiveAction(next, step.input);
        break;
      }
    }
  }
  return { ok: true, world: next };
}

/* ------------------------------------------------------------------ *
 * The recurring-cycle transition
 * ------------------------------------------------------------------ */

/**
 * The one transition key this wave schedules against.
 *
 * 92H's recurring office cycles — cabinet meetings, agency reporting, the
 * annual federal-grant report — are all the same shape: a date arrives and a
 * piece of work appears. That is `FutureDueItem` plus `WorkItem`, which both
 * exist, so there is one handler rather than a per-kernel scheduler.
 */
export const EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY =
  "executive-governing:recurring-office-cycle" as FutureTransitionKey;

/**
 * Turns a due recurring cycle into the work item it was always going to be.
 *
 * Deliberately creates nothing else. The due item said a report was expected;
 * it did not say the report was good, late, or even that it arrived, and this
 * handler must not decide any of that.
 */
export function executiveGoverningCycleTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY) {
    throw new Error(
      "Executive-governing cycle handler received another transition.",
    );
  }
  const responsible = dueItem.entityIds.filter((id) => world.people[id]);
  if (responsible.length === 0) {
    return {
      world,
      status: "blocked",
      reasonKey: "executive-governing:no-responsible-person",
      context: "The recurring cycle names nobody who still exists.",
      outcomeEventId: null,
    };
  }
  const kernelId = /92H-K-[0-9]{3}/.exec(dueItem.stableKey)?.[0] ?? null;
  if (!kernelId) {
    return {
      world,
      status: "blocked",
      reasonKey: "executive-governing:unnamed-kernel",
      context: "The recurring cycle does not name a 92H kernel.",
      outcomeEventId: null,
    };
  }
  const next = createWorkItem(world, {
    stableKey: `${dueItem.stableKey}:arrived`,
    title: `${kernelId} · cycle-arrived`,
    summary: `92H recurring office cycle ${kernelId} came due on ${dueItem.dueAt}.`,
    jurisdictionId: dueItem.jurisdictionId,
    sourceEntityIds: [dueItem.jurisdictionId ?? responsible[0]!],
    focus: {
      kind: "other",
      targetKey: "executive-governing:recurring-cycle",
      sourceEntityId: responsible[0]!,
    },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: responsible,
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Recurring office cycle ${kernelId} produced its work item.`,
    outcomeEventId: null,
  };
}
