/**
 * 92G judicial gameplay kernels compiled onto accepted canonical primitives.
 *
 * This is an additive content compiler, not a court engine. A compiled plan is
 * only an ordered list of inputs to writers that already exist. It opens
 * administrative and chambers work without deciding a case, inventing legal
 * authority, selecting an outcome for the controlled person, or creating a
 * second calendar, relationship model, evidence store, or history.
 */

import { compareSimulationMoments, sameSimulationMoment } from "./dates";
import { recordEvidenceArtifact } from "./evidence";
import { createStableId } from "./ids";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
} from "./life-queries";
import { recordRelationshipInteraction } from "./records";
import { createScheduledActivity, createWorkItem } from "./time-work";
import type {
  CreateScheduledActivityInput,
  CreateWorkItemInput,
} from "./time-work";
import type { RecordEvidenceArtifactInput } from "./evidence";
import type {
  HistoricalEventInput,
  RelationshipInteractionInput,
} from "./history";
import type {
  AuthoredActivityLocation,
  CanonicalAccess,
  EntityId,
  EventType,
  EventVisibility,
  EvidenceAccess,
  EvidenceSemanticKey,
  RelationshipChange,
  RelationshipInteractionKind,
  RelationshipSignificance,
  ScheduledActivityKind,
  SimulationMoment,
  WorkPlayerRequirement,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import {
  JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS,
  JUDICIAL_GAMEPLAY_KERNEL_ROWS,
} from "./judicial-gameplay-kernel-bank";

export type JudicialKernelId = `SEED-${string}`;

export type JudicialKernelCategory =
  | "routine-judicial-work"
  | "consequential-decision"
  | "staff-and-relationship"
  | "career-selection-and-retention";

/** This status is this repository audit's finding, not a field from 92G. */
export type JudicialKernelStatus =
  "COMPILED_CURRENT_MECHANICS" | "MECHANIC_GATED";

export type JudicialKernelBlocker =
  | "court-case-record-family"
  | "court-motion-proceeding-record-family"
  | "judicial-disposition-record-family"
  | "effective-jurisdiction-court-rule"
  | "recusal-and-case-assignment-procedure"
  | "judicial-selection-and-tenure-authority"
  | "nomination-appointment-confirmation-record-family"
  | "campaign-and-election-gameplay"
  | "judicial-discipline-outcome-record-family"
  | "court-leadership-office-and-peer-vote"
  | "senior-status-pension-and-vacancy-rules"
  | "post-judicial-career-consequence-resolution";

export interface JudicialKernelRow {
  readonly id: JudicialKernelId;
  readonly category: JudicialKernelCategory;
  readonly title: string;
  readonly status: JudicialKernelStatus;
  readonly blockedBy: readonly JudicialKernelBlocker[];
}

export type JudicialRoleKey =
  | "principal"
  | "calendar-clerk"
  | "courtroom-deputy"
  | "public-defender"
  | "opposing-counsel"
  | "lead-counsel"
  | "junior-law-clerk"
  | "chief-judge"
  | "colleague-judge"
  | "judicial-assistant"
  | "complaining-lawyer"
  | "court-administrator"
  | "court-reporter"
  | "spouse"
  | "ethics-advisor"
  | "bar-liaison"
  | "commission-investigator"
  | "ethics-counsel";

export type JudicialRoleRequirementKind =
  "court-insider" | "external-participant" | "shared-household";

export interface JudicialRoleRequirement {
  readonly roleKey: JudicialRoleKey;
  readonly kind: JudicialRoleRequirementKind;
}

export interface JudicialRoleBinding {
  readonly roleKey: JudicialRoleKey;
  readonly personId: EntityId;
}

export type JudicialKernelPrimitive =
  | "organization"
  | "work-relationship"
  | "historical-event"
  | "evidence-artifact"
  | "scheduled-activity"
  | "work-item"
  | "relationship-interaction";

export type JudicialKernelStepSpec =
  | {
      readonly kind: "historical-event";
      readonly stepKey: string;
      readonly eventType: EventType;
      readonly visibility: EventVisibility;
      readonly roleKeys: readonly JudicialRoleKey[];
      readonly summary: string;
      readonly tags: readonly string[];
    }
  | {
      readonly kind: "evidence-artifact";
      readonly stepKey: string;
      readonly evidenceKind: EvidenceSemanticKey;
      readonly access: EvidenceAccess;
      readonly relatedEventStepKey: string;
      readonly description: string;
    }
  | {
      readonly kind: "scheduled-activity";
      readonly stepKey: string;
      readonly activityKind: ScheduledActivityKind;
      readonly roleKeys: readonly JudicialRoleKey[];
      readonly title: string;
      readonly summary: string;
      readonly access: "office" | "participants";
    }
  | {
      readonly kind: "work-item";
      readonly stepKey: string;
      readonly title: string;
      readonly summary: string;
      readonly assigneeRoleKeys: readonly JudicialRoleKey[];
      readonly playerRequirement: WorkPlayerRequirement;
      readonly activityStepKey: string;
      readonly access: "office" | "participants";
    }
  | {
      readonly kind: "relationship-interaction";
      readonly stepKey: string;
      readonly counterpartRoleKey: JudicialRoleKey;
      readonly eventStepKey: string;
      readonly interactionKind: RelationshipInteractionKind;
      readonly change: RelationshipChange;
      readonly significance: RelationshipSignificance;
      readonly summary: string;
      readonly tags: readonly string[];
    };

export type JudicialDownstreamOmission =
  | "legal-disposition-owned-by-future-court-system"
  | "personnel-discipline-result-not-compiled"
  | "judicial-conduct-result-not-compiled"
  | "case-transfer-or-docket-result-not-compiled"
  | "public-reputation-or-media-effect-not-compiled"
  | "financial-or-capacity-effect-not-compiled";

export interface JudicialKernelDefinition {
  readonly row: JudicialKernelRow;
  readonly sourceRefs: readonly string[];
  readonly primitives: readonly JudicialKernelPrimitive[];
  readonly roleRequirements: readonly JudicialRoleRequirement[];
  readonly triggerConditions: readonly string[];
  readonly playerDecisionPoints: readonly string[];
  readonly downstreamOmissions: readonly JudicialDownstreamOmission[];
  readonly steps: readonly JudicialKernelStepSpec[];
}

export interface JudicialKernelCompileContext {
  readonly instanceKey: string;
  readonly worldId: EntityId;
  readonly currentMoment: SimulationMoment;
  readonly jurisdictionId: EntityId;
  /** Existing canonical organization; this compiler creates no court entity. */
  readonly courtOrganizationId: EntityId;
  /** Existing canonical matter/event/person/org anchoring this authored setup. */
  readonly matterSourceEntityId: EntityId;
  readonly roleBindings: readonly JudicialRoleBinding[];
  readonly activityWindow: {
    readonly start: SimulationMoment;
    readonly end: SimulationMoment;
  };
  readonly location: AuthoredActivityLocation;
}

export type JudicialKernelPlanStep =
  | { readonly kind: "historical-event"; readonly input: HistoricalEventInput }
  | {
      readonly kind: "evidence-artifact";
      readonly input: RecordEvidenceArtifactInput;
    }
  | {
      readonly kind: "scheduled-activity";
      readonly input: CreateScheduledActivityInput;
    }
  | { readonly kind: "work-item"; readonly input: CreateWorkItemInput }
  | {
      readonly kind: "relationship-interaction";
      readonly input: RelationshipInteractionInput;
    };

export interface JudicialGameplayPlan {
  readonly kernelId: JudicialKernelId;
  readonly instanceKey: string;
  readonly worldId: EntityId;
  readonly compiledAt: SimulationMoment;
  readonly jurisdictionId: EntityId;
  readonly courtOrganizationId: EntityId;
  readonly matterSourceEntityId: EntityId;
  readonly roleRequirements: readonly JudicialRoleRequirement[];
  readonly roleBindings: readonly JudicialRoleBinding[];
  readonly playerDecisionPoints: readonly string[];
  readonly downstreamOmissions: readonly JudicialDownstreamOmission[];
  readonly sourceRefs: readonly string[];
  readonly steps: readonly JudicialKernelPlanStep[];
}

export interface JudicialKernelCoverageEntry {
  readonly id: JudicialKernelId;
  readonly title: string;
  readonly category: JudicialKernelCategory;
  readonly status: JudicialKernelStatus;
  readonly blockedBy: readonly JudicialKernelBlocker[];
}

export class JudicialKernelCompileError extends Error {
  readonly reason:
    | "kernel-not-found"
    | "kernel-mechanic-gated"
    | "invalid-instance-key"
    | "unbound-role"
    | "duplicate-role-binding"
    | "missing-activity-window"
    | "location-jurisdiction-mismatch";

  constructor(reason: JudicialKernelCompileError["reason"], message: string) {
    super(message);
    this.name = "JudicialKernelCompileError";
    this.reason = reason;
  }
}

export function judicialGameplayCoverageReport(): readonly JudicialKernelCoverageEntry[] {
  assertJudicialKernelBankIntegrity();
  return JUDICIAL_GAMEPLAY_KERNEL_ROWS.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    blockedBy: [...row.blockedBy],
  }));
}

export function judicialKernelDefinitionById(
  kernelId: JudicialKernelId,
): JudicialKernelDefinition | null {
  return (
    JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS.find(
      (definition) => definition.row.id === kernelId,
    ) ?? null
  );
}

export function compileJudicialGameplayKernel(
  kernelId: JudicialKernelId,
  context: JudicialKernelCompileContext,
): JudicialGameplayPlan {
  assertJudicialKernelBankIntegrity();
  const row = JUDICIAL_GAMEPLAY_KERNEL_ROWS.find(
    (candidate) => candidate.id === kernelId,
  );
  if (!row) {
    throw new JudicialKernelCompileError(
      "kernel-not-found",
      `Unknown 92G judicial kernel: ${kernelId}`,
    );
  }
  const definition = judicialKernelDefinitionById(kernelId);
  if (!definition) {
    throw new JudicialKernelCompileError(
      "kernel-mechanic-gated",
      `${kernelId} is mechanic-gated: ${row.blockedBy.join(", ")}.`,
    );
  }
  if (!/^[a-z0-9]+(?:[.:_-][a-z0-9]+)*$/.test(context.instanceKey)) {
    throw new JudicialKernelCompileError(
      "invalid-instance-key",
      "Judicial kernel instance keys must be stable lowercase tokens.",
    );
  }
  if (
    compareSimulationMoments(
      context.activityWindow.start,
      context.currentMoment,
    ) < 0 ||
    compareSimulationMoments(
      context.activityWindow.start,
      context.activityWindow.end,
    ) >= 0
  ) {
    throw new JudicialKernelCompileError(
      "missing-activity-window",
      "A compiled judicial activity requires a positive future interval.",
    );
  }
  if (context.location.jurisdictionId !== context.jurisdictionId) {
    throw new JudicialKernelCompileError(
      "location-jurisdiction-mismatch",
      "The compiled activity location must use the supplied jurisdiction.",
    );
  }

  const roleMap = bindingMap(context.roleBindings);
  for (const requirement of definition.roleRequirements) {
    if (!roleMap.has(requirement.roleKey)) {
      throw new JudicialKernelCompileError(
        "unbound-role",
        `${kernelId} requires role '${requirement.roleKey}'.`,
      );
    }
  }

  const prefix = `judicial:${kernelId.toLowerCase()}:${context.instanceKey}`;
  const eventIds = new Map<string, EntityId>();
  const activityIds = new Map<string, EntityId>();
  for (const step of definition.steps) {
    if (step.kind === "historical-event") {
      eventIds.set(
        step.stepKey,
        createStableId("event", `${context.worldId}:${prefix}:${step.stepKey}`),
      );
    } else if (step.kind === "scheduled-activity") {
      activityIds.set(
        step.stepKey,
        createStableId(
          "scheduled-activity",
          `${context.worldId}:${prefix}:${step.stepKey}`,
        ),
      );
    }
  }

  const accessFor = (
    access: "office" | "participants",
    roleKeys: readonly JudicialRoleKey[],
  ): CanonicalAccess =>
    access === "office"
      ? { kind: "office" }
      : {
          kind: "private",
          personIds: canonicalIds(
            roleKeys.map((roleKey) => bound(roleMap, roleKey)),
          ),
        };

  const steps: JudicialKernelPlanStep[] = definition.steps.map((step) => {
    const stableKey = `${prefix}:${step.stepKey}`;
    switch (step.kind) {
      case "historical-event": {
        const people = canonicalIds(
          step.roleKeys.map((roleKey) => bound(roleMap, roleKey)),
        );
        return {
          kind: "historical-event",
          input: {
            stableKey,
            type: step.eventType,
            occurredAt: context.currentMoment.date,
            recordedAt: context.currentMoment.date,
            jurisdictionId: context.jurisdictionId,
            involvedEntityIds: canonicalIds([
              context.jurisdictionId,
              context.courtOrganizationId,
              context.matterSourceEntityId,
              ...people,
            ]),
            participants: step.roleKeys.map((roleKey) => ({
              personId: bound(roleMap, roleKey),
              role:
                roleKey === "principal"
                  ? "agency:judicial-work"
                  : "presence:workflow-participant",
              detail: `Bound 92G role: ${roleKey}`,
            })),
            personFactConstraints: [],
            visibility: step.visibility,
            tags: [...step.tags],
            summary: step.summary,
            context: {
              location: {
                jurisdictionId: context.jurisdictionId,
                label: context.location.label,
                setting: "Judicial workflow intake",
              },
              socialContext: "A researched 92G workflow reached chambers.",
              pressure: null,
              choice: null,
              motivation: null,
              immediateReaction: null,
            },
          },
        };
      }
      case "evidence-artifact": {
        const eventId = requiredStepId(
          eventIds,
          step.relatedEventStepKey,
          "event",
        );
        return {
          kind: "evidence-artifact",
          input: {
            stableKey,
            evidenceKind: step.evidenceKind,
            createdAt: context.currentMoment.date,
            recordedAt: context.currentMoment.date,
            relatedEntityIds: [eventId],
            access: step.access,
            description: step.description,
            provenance: { kind: "simulated", sourceEntityIds: [eventId] },
          },
        };
      }
      case "scheduled-activity": {
        const participants = canonicalIds(
          step.roleKeys.map((roleKey) => bound(roleMap, roleKey)),
        );
        const intakeId = requiredStepId(eventIds, "intake", "event");
        return {
          kind: "scheduled-activity",
          input: {
            stableKey,
            title: step.title,
            summary: step.summary,
            kind: step.activityKind,
            start: { ...context.activityWindow.start },
            end: { ...context.activityWindow.end },
            participantPersonIds: participants,
            responsiblePersonId: bound(roleMap, "principal"),
            location: { ...context.location },
            sourceEntityIds: [intakeId],
            flexibility:
              step.activityKind === "flexible"
                ? {
                    kind: "movable",
                    earliestStart: { ...context.activityWindow.start },
                    latestEnd: { ...context.activityWindow.end },
                  }
                : { kind: "fixed" },
            access: accessFor(step.access, step.roleKeys),
          },
        };
      }
      case "work-item": {
        const intakeId = requiredStepId(eventIds, "intake", "event");
        const activityId = requiredStepId(
          activityIds,
          step.activityStepKey,
          "activity",
        );
        const assignees = canonicalIds(
          step.assigneeRoleKeys.map((roleKey) => bound(roleMap, roleKey)),
        );
        return {
          kind: "work-item",
          input: {
            stableKey,
            title: step.title,
            summary: step.summary,
            jurisdictionId: context.jurisdictionId,
            sourceEntityIds: [intakeId],
            focus: { kind: "calendar-item", scheduledActivityId: activityId },
            effort: null,
            access: accessFor(step.access, step.assigneeRoleKeys),
            assignedPersonIds: assignees,
            playerRequirement: step.playerRequirement,
            waitingOnPersonIds: [],
            blocker: null,
            scheduledActivityId: activityId,
          },
        };
      }
      case "relationship-interaction": {
        const eventId = requiredStepId(eventIds, step.eventStepKey, "event");
        return {
          kind: "relationship-interaction",
          input: {
            stableKey,
            personIds: [
              bound(roleMap, "principal"),
              bound(roleMap, step.counterpartRoleKey),
            ],
            eventId,
            occurredAt: context.currentMoment.date,
            kind: step.interactionKind,
            change: step.change,
            significance: step.significance,
            summary: step.summary,
            tags: [...step.tags],
          },
        };
      }
    }
  });

  return {
    kernelId,
    instanceKey: context.instanceKey,
    worldId: context.worldId,
    compiledAt: { ...context.currentMoment },
    jurisdictionId: context.jurisdictionId,
    courtOrganizationId: context.courtOrganizationId,
    matterSourceEntityId: context.matterSourceEntityId,
    roleRequirements: definition.roleRequirements.map((item) => ({ ...item })),
    roleBindings: context.roleBindings.map((item) => ({ ...item })),
    playerDecisionPoints: [...definition.playerDecisionPoints],
    downstreamOmissions: [...definition.downstreamOmissions],
    sourceRefs: [...definition.sourceRefs],
    steps,
  };
}

export function applyJudicialGameplayPlan(
  world: World,
  plan: JudicialGameplayPlan,
): World {
  assertWorldIntegrity(world);
  if (
    world.id !== plan.worldId ||
    !sameSimulationMoment(world.currentMoment, plan.compiledAt)
  ) {
    throw new Error(
      "A judicial plan may only apply to the world and moment it was compiled for.",
    );
  }
  if (!world.jurisdictions[plan.jurisdictionId]) {
    throw new Error("Judicial plan jurisdiction is missing from the world.");
  }
  if (
    !world.history.organizations.some(
      (organization) => organization.id === plan.courtOrganizationId,
    )
  ) {
    throw new Error("Judicial plan court organization is missing.");
  }

  const roles = bindingMap(plan.roleBindings);
  const principalId = bound(roles, "principal");
  if (
    world.control.kind !== "person" ||
    world.control.personId !== principalId
  ) {
    throw new Error(
      "The principal judicial role must be the controlled person.",
    );
  }
  for (const requirement of plan.roleRequirements) {
    const personId = bound(roles, requirement.roleKey);
    if (!world.people[personId]) {
      throw new Error(
        `Judicial role references missing person: ${requirement.roleKey}`,
      );
    }
    if (
      requirement.kind === "court-insider" &&
      !activeWorkRelationshipsAt(world, personId).some(
        ({ relationship }) =>
          relationship.organizationId === plan.courtOrganizationId,
      )
    ) {
      throw new Error(
        `Judicial role '${requirement.roleKey}' lacks active canonical court work.`,
      );
    }
    if (
      requirement.kind === "shared-household" &&
      !shareHousehold(world, principalId, personId)
    ) {
      throw new Error(
        `Judicial role '${requirement.roleKey}' lacks a canonical shared household.`,
      );
    }
  }

  let next = world;
  for (const step of plan.steps) {
    switch (step.kind) {
      case "historical-event":
        next = recordWorldEvent(next, step.input);
        break;
      case "evidence-artifact":
        next = recordEvidenceArtifact(next, step.input);
        break;
      case "scheduled-activity":
        next = createScheduledActivity(next, step.input);
        break;
      case "work-item":
        next = createWorkItem(next, step.input);
        break;
      case "relationship-interaction":
        next = recordRelationshipInteraction(next, step.input);
        break;
    }
  }
  assertWorldIntegrity(next);
  return next;
}

export function assertJudicialKernelBankIntegrity(): void {
  const rowIds = new Set<JudicialKernelId>();
  for (const row of JUDICIAL_GAMEPLAY_KERNEL_ROWS) {
    if (rowIds.has(row.id))
      throw new Error(`Duplicate judicial kernel row: ${row.id}`);
    rowIds.add(row.id);
    const isCompiled = row.status === "COMPILED_CURRENT_MECHANICS";
    if (isCompiled !== (row.blockedBy.length === 0)) {
      throw new Error(`Judicial kernel status/blockers disagree: ${row.id}`);
    }
  }

  const definitionIds = new Set<JudicialKernelId>();
  for (const definition of JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS) {
    const id = definition.row.id;
    if (definitionIds.has(id)) {
      throw new Error(`Duplicate judicial kernel definition: ${id}`);
    }
    definitionIds.add(id);
    const row = JUDICIAL_GAMEPLAY_KERNEL_ROWS.find(
      (candidate) => candidate.id === id,
    );
    if (!row || row.status !== "COMPILED_CURRENT_MECHANICS") {
      throw new Error(
        `Judicial definition is not backed by a compiled row: ${id}`,
      );
    }
    if (definition.row !== row) {
      throw new Error(
        `Judicial definition must reference its canonical row: ${id}`,
      );
    }
    assertDefinition(definition);
  }

  for (const row of JUDICIAL_GAMEPLAY_KERNEL_ROWS) {
    const hasDefinition = definitionIds.has(row.id);
    if ((row.status === "COMPILED_CURRENT_MECHANICS") !== hasDefinition) {
      throw new Error(
        `Judicial kernel definition gate disagrees with row: ${row.id}`,
      );
    }
  }
}

function assertDefinition(definition: JudicialKernelDefinition): void {
  const roles = new Set<JudicialRoleKey>();
  for (const requirement of definition.roleRequirements) {
    if (roles.has(requirement.roleKey)) {
      throw new Error(
        `Duplicate judicial role requirement: ${definition.row.id}`,
      );
    }
    roles.add(requirement.roleKey);
  }
  if (!roles.has("principal")) {
    throw new Error(
      `Judicial kernel lacks principal role: ${definition.row.id}`,
    );
  }
  const stepKeys = new Set<string>();
  for (const step of definition.steps) {
    if (stepKeys.has(step.stepKey)) {
      throw new Error(`Duplicate judicial step key: ${definition.row.id}`);
    }
    stepKeys.add(step.stepKey);
  }
  const requiredKinds = new Set(definition.steps.map((step) => step.kind));
  for (const kind of [
    "historical-event",
    "evidence-artifact",
    "scheduled-activity",
    "work-item",
    "relationship-interaction",
  ] as const) {
    if (!requiredKinds.has(kind)) {
      throw new Error(
        `Judicial kernel lacks canonical step '${kind}': ${definition.row.id}`,
      );
    }
  }
  for (const step of definition.steps) {
    const referencedRoles =
      step.kind === "historical-event" || step.kind === "scheduled-activity"
        ? step.roleKeys
        : step.kind === "work-item"
          ? step.assigneeRoleKeys
          : step.kind === "relationship-interaction"
            ? ["principal" as const, step.counterpartRoleKey]
            : [];
    for (const roleKey of referencedRoles) {
      if (!roles.has(roleKey)) {
        throw new Error(
          `Judicial step references undeclared role '${roleKey}': ${definition.row.id}`,
        );
      }
    }
  }
}

function bindingMap(
  bindings: readonly JudicialRoleBinding[],
): Map<JudicialRoleKey, EntityId> {
  const result = new Map<JudicialRoleKey, EntityId>();
  for (const binding of bindings) {
    if (result.has(binding.roleKey)) {
      throw new JudicialKernelCompileError(
        "duplicate-role-binding",
        `Duplicate judicial role binding: ${binding.roleKey}`,
      );
    }
    result.set(binding.roleKey, binding.personId);
  }
  return result;
}

function bound(
  bindings: ReadonlyMap<JudicialRoleKey, EntityId>,
  roleKey: JudicialRoleKey,
): EntityId {
  const personId = bindings.get(roleKey);
  if (!personId) {
    throw new JudicialKernelCompileError(
      "unbound-role",
      `Judicial role '${roleKey}' is not bound.`,
    );
  }
  return personId;
}

function requiredStepId(
  ids: ReadonlyMap<string, EntityId>,
  stepKey: string,
  label: string,
): EntityId {
  const id = ids.get(stepKey);
  if (!id)
    throw new Error(`Judicial ${label} step '${stepKey}' is not defined.`);
  return id;
}

function canonicalIds(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort();
}

function shareHousehold(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
): boolean {
  const first = new Set(
    householdMembershipsAt(world, firstPersonId).map(
      ({ membership }) => membership.householdId,
    ),
  );
  return householdMembershipsAt(world, secondPersonId).some(({ membership }) =>
    first.has(membership.householdId),
  );
}
