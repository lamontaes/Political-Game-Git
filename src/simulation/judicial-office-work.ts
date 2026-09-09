/** Judicial office consumer. All durable facts use existing World stores. */
import { addSimulationMinutes } from "./dates";
import {
  hasPersonDiscoveredEvidence,
  recordEvidenceArtifact,
  recordEvidenceDiscovery,
} from "./evidence";
import { createStableId } from "./ids";
import {
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  organizationProfileAt,
} from "./life-queries";
import {
  recordClaim,
  recordEventKnowledge,
  recordRelationshipInteraction,
} from "./records";
import {
  createScheduledActivity,
  createWorkItem,
  performScheduledActivity,
  scheduledActivityState,
  workItemState,
} from "./time-work";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { isPersonAliveAt } from "./vitality-integrity";
import {
  applyJudicialGameplayPlan,
  compileJudicialGameplayKernel,
  judicialGameplayCoverageReport,
  judicialKernelDefinitionById,
  type JudicialKernelId,
  type JudicialRoleBinding,
  type JudicialRoleKey,
} from "./judicial-gameplay-kernels";
import {
  JUDICIAL_OFFICE_CONTEXT_GATES,
  judicialOfficeContent,
} from "./judicial-office-content";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  HistoricalEvent,
  SimulationMoment,
  World,
} from "./types";

export const JUDICIAL_OFFICE_CLASSIFICATION =
  "service:court-workplace" as const;
export const judicialOccupation = (role: JudicialRoleKey) =>
  `profession:judicial-office-${role}` as const;
export interface JudicialOfficeContext {
  readonly principalId: EntityId;
  readonly courtOrganizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly name: string;
}
export type JudicialOfficeResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };
const refuse = (world: World, reason: string): JudicialOfficeResult => ({
  ok: false,
  world,
  reason,
});
const alive = (world: World, id: EntityId) =>
  !!world.people[id] &&
  isPersonAliveAt(world, id, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });

/** Titles cannot grant access. Dated occupation and organization records must agree. */
export function judicialOfficeContexts(
  world: World,
): readonly JudicialOfficeContext[] {
  if (world.control.kind !== "person" || !alive(world, world.control.personId))
    return [];
  const principalId = world.control.personId;
  return activeWorkRelationshipsAt(world, principalId).flatMap(
    ({ relationship, role }) => {
      if (
        !relationship.organizationId ||
        role.occupationClassification !== judicialOccupation("principal")
      )
        return [];
      const profile = organizationProfileAt(world, relationship.organizationId);
      if (
        profile?.classification !== JUDICIAL_OFFICE_CLASSIFICATION ||
        !profile.locationJurisdictionId ||
        role.locationJurisdictionId !== profile.locationJurisdictionId
      )
        return [];
      return [
        {
          principalId,
          courtOrganizationId: relationship.organizationId,
          jurisdictionId: profile.locationJurisdictionId,
          workRelationshipId: relationship.id,
          name: profile.name,
        },
      ];
    },
  );
}
function rolesFor(
  world: World,
  office: JudicialOfficeContext,
  kernelId: JudicialKernelId,
  event?: HistoricalEvent,
): readonly JudicialRoleBinding[] | string {
  const definition = judicialKernelDefinitionById(kernelId);
  if (!definition) return "This workflow requires additional court mechanics.";
  const used = new Set<EntityId>();
  const bindings: JudicialRoleBinding[] = [];
  for (const requirement of definition.roleRequirements) {
    const candidates =
      requirement.roleKey === "principal"
        ? [office.principalId]
        : world.personOrder;
    const id = candidates.find((personId) => {
      if (used.has(personId) || !alive(world, personId)) return false;
      if (
        event &&
        !event.participants.some(
          (p) =>
            p.personId === personId &&
            p.role === `coordination:judicial-office-${requirement.roleKey}`,
        )
      )
        return false;
      if (requirement.kind === "shared-household") {
        const spouse = activePartnershipsAt(world, office.principalId).some(
          (p) => p.kind === "legal:marriage" && p.personIds.includes(personId),
        );
        const homes = new Set(
          householdMembershipsAt(world, office.principalId).map(
            (m) => m.membership.householdId,
          ),
        );
        return (
          spouse &&
          householdMembershipsAt(world, personId).some((m) =>
            homes.has(m.membership.householdId),
          )
        );
      }
      return activeWorkRelationshipsAt(world, personId).some(
        ({ relationship, role }) =>
          role.occupationClassification ===
            judicialOccupation(requirement.roleKey) &&
          role.locationJurisdictionId === office.jurisdictionId &&
          (requirement.kind !== "court-insider" ||
            relationship.organizationId === office.courtOrganizationId),
      );
    });
    if (!id)
      return `Missing active ${requirement.roleKey} relationship${requirement.kind === "shared-household" ? " and shared marital household" : ""}.`;
    used.add(id);
    bindings.push({ roleKey: requirement.roleKey, personId: id });
  }
  return bindings;
}
function sourceKey(office: JudicialOfficeContext, id: JudicialKernelId) {
  return `judicial-office:premise:${office.workRelationshipId}:${id.toLowerCase()}`;
}
function instanceKey(eventId: EntityId) {
  return `office-${eventId}`;
}
function kernelPrefix(event: HistoricalEvent, id: JudicialKernelId) {
  return `judicial:${id.toLowerCase()}:${instanceKey(event.id)}`;
}
function sourceFor(
  world: World,
  office: JudicialOfficeContext,
  id: JudicialKernelId,
) {
  return world.history.events.find(
    (event) =>
      event.stableKey === sourceKey(office, id) &&
      event.type === "judicial.office-practice-received" &&
      event.occurredAt <= world.currentDate &&
      event.involvedEntityIds.includes(office.courtOrganizationId) &&
      event.jurisdictionId === office.jurisdictionId,
  );
}

export function judicialOfficeCoverage(
  world: World,
  courtOrganizationId: EntityId,
) {
  const office = judicialOfficeContexts(world).find(
    (o) => o.courtOrganizationId === courtOrganizationId,
  );
  return judicialGameplayCoverageReport().map((row) => {
    const contextGates = JUDICIAL_OFFICE_CONTEXT_GATES[row.id] ?? [];
    const roles =
      office &&
      row.status === "COMPILED_CURRENT_MECHANICS" &&
      !contextGates.length
        ? rolesFor(world, office, row.id)
        : null;
    const blockers = [
      ...row.blockedBy,
      ...contextGates,
      ...(!office ? ["active-judicial-office-role"] : []),
      ...(typeof roles === "string" ? [roles] : []),
    ];
    return {
      ...row,
      consumerStatus: blockers.length
        ? ("blocked" as const)
        : ("supported-office-practice" as const),
      blockers,
    };
  });
}

/** Explicit gameplay introduction, never called by a selector/render. One authored episode per role tenure. */
export function receiveJudicialOfficeWork(
  world: World,
  courtOrganizationId: EntityId,
  kernelId: JudicialKernelId,
  start: SimulationMoment,
): JudicialOfficeResult {
  const office = judicialOfficeContexts(world).find(
    (o) => o.courtOrganizationId === courtOrganizationId,
  );
  if (!office)
    return refuse(world, "No active judicial office role at this court.");
  const coverage = judicialOfficeCoverage(world, courtOrganizationId).find(
    (r) => r.id === kernelId,
  );
  if (!coverage || coverage.blockers.length)
    return refuse(world, coverage?.blockers.join("; ") ?? "Unknown workflow.");
  const content = judicialOfficeContent(kernelId);
  if (!content)
    return refuse(world, "This workflow has no supported office response.");
  const bindings = rolesFor(world, office, kernelId);
  if (typeof bindings === "string") return refuse(world, bindings);
  if (sourceFor(world, office, kernelId)) return { ok: true, world };
  try {
    let next = recordWorldEvent(world, {
      stableKey: sourceKey(office, kernelId),
      type: "judicial.office-practice-received",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [
        office.courtOrganizationId,
        office.workRelationshipId,
        ...bindings.map((b) => b.personId),
      ],
      participants: bindings.map((b) => ({
        personId: b.personId,
        role: `coordination:judicial-office-${b.roleKey}`,
        detail: null,
      })),
      personFactConstraints: [],
      visibility: "private",
      tags: [
        "judicial.office-practice",
        "authored-fiction",
        kernelId.toLowerCase(),
      ],
      summary: content.brief,
      context: {
        location: {
          jurisdictionId: office.jurisdictionId,
          label: office.name,
          setting: "Office correspondence",
        },
        socialContext:
          "Authored fictional office-practice episode; no legal finding or selection authority.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const source = next.history.events.at(-1)!;
    const plan = compileJudicialGameplayKernel(kernelId, {
      instanceKey: instanceKey(source.id),
      worldId: world.id,
      currentMoment: world.currentMoment,
      jurisdictionId: office.jurisdictionId,
      courtOrganizationId,
      matterSourceEntityId: office.workRelationshipId,
      roleBindings: bindings,
      activityWindow: { start, end: addSimulationMinutes(start, 30) },
      location: {
        jurisdictionId: office.jurisdictionId,
        locationKey: `judicial-office:${courtOrganizationId}`,
        label: office.name,
      },
    });
    // The bank supplies the five-step topology. The office adaptation supplies
    // its actual authored facts; the research's case/score premises are not copied.
    const participantIds = bindings.map((b) => b.personId);
    const adapted = {
      ...plan,
      steps: plan.steps.map((step) => {
        switch (step.kind) {
          case "historical-event":
            return {
              ...step,
              input: {
                ...step.input,
                summary: content.brief,
                context: source.context,
              },
            };
          case "evidence-artifact":
            return {
              ...step,
              input: {
                ...step.input,
                description: content.brief,
                relatedEntityIds: [...step.input.relatedEntityIds, source.id],
              },
            };
          case "scheduled-activity":
            return {
              ...step,
              input: {
                ...step.input,
                title: content.title,
                summary: content.brief,
                access: { kind: "private" as const, personIds: participantIds },
              },
            };
          case "work-item":
            return {
              ...step,
              input: {
                ...step.input,
                title: content.title,
                summary: content.brief,
                access: {
                  kind: "private" as const,
                  personIds: [office.principalId],
                },
              },
            };
          case "relationship-interaction":
            return {
              ...step,
              input: {
                ...step.input,
                change: "maintained" as const,
                summary: `The participants opened an office review: ${content.title}.`,
              },
            };
        }
      }),
    };
    next = applyJudicialGameplayPlan(next, adapted);
    const evidence = next.history.evidenceArtifacts.at(-1)!;
    for (const binding of bindings)
      next = recordEvidenceDiscovery(next, {
        stableKey: `${kernelPrefix(source, kernelId)}:discovery:${binding.personId}`,
        personId: binding.personId,
        evidenceArtifactId: evidence.id,
        discoveredAt: world.currentDate,
        recordedAt: world.currentDate,
        methodKey: "office:received-record",
        provenance: {
          kind: "simulated",
          sourceEntityIds: [source.id, evidence.id],
        },
      });
    return { ok: true, world: next };
  } catch (error) {
    return refuse(
      world,
      error instanceof Error
        ? error.message
        : "Office intake could not be recorded.",
    );
  }
}

export function judicialOfficeAssignments(
  world: World,
  courtOrganizationId: EntityId,
) {
  const office = judicialOfficeContexts(world).find(
    (o) => o.courtOrganizationId === courtOrganizationId,
  );
  if (!office) return [];
  return judicialGameplayCoverageReport().flatMap((row) => {
    const content = judicialOfficeContent(row.id);
    const source = sourceFor(world, office, row.id);
    if (!content || !source) return [];
    const prefix = kernelPrefix(source, row.id);
    const item = world.history.workItems.find(
      (i) => i.stableKey === `${prefix}:decision`,
    );
    const evidence = world.history.evidenceArtifacts.find(
      (e) => e.stableKey === `${prefix}:record`,
    );
    if (
      !item ||
      !evidence ||
      !hasPersonDiscoveredEvidence(world, office.principalId, evidence.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })
    )
      return [];
    const state = workItemState(world, item.id);
    const activityId = state.scheduledActivityId;
    if (!activityId) return [];
    const bindings = rolesFor(world, office, row.id, source);
    const response = world.history.events.find(
      (e) => e.stableKey === `${prefix}:response`,
    );
    return [
      {
        kernelId: row.id,
        content,
        source,
        item,
        evidence,
        state,
        activityId,
        activityState: scheduledActivityState(world, activityId),
        response,
        blocker: typeof bindings === "string" ? bindings : null,
      },
    ];
  });
}

/** Explicit player communication, followed by real calendar/work/history writes. */
export function respondToJudicialOfficeWork(
  world: World,
  courtOrganizationId: EntityId,
  workItemId: EntityId,
  responseKey: string,
  handlers?: FutureTransitionHandlerRegistry,
): JudicialOfficeResult {
  const office = judicialOfficeContexts(world).find(
    (o) => o.courtOrganizationId === courtOrganizationId,
  );
  if (!office)
    return refuse(world, "No active judicial office role at this court.");
  const assignment = judicialOfficeAssignments(world, courtOrganizationId).find(
    (a) => a.item.id === workItemId,
  );
  if (!assignment)
    return refuse(world, "This office work is not available to you.");
  if (assignment.blocker) return refuse(world, assignment.blocker);
  if (assignment.response || assignment.state.status !== "active")
    return refuse(world, "This office review already has a response.");
  const response = assignment.content.responses.find(
    (r) => r.key === responseKey,
  );
  if (!response) return refuse(world, "That response is not available.");
  const roles = rolesFor(world, office, assignment.kernelId, assignment.source);
  if (typeof roles === "string") return refuse(world, roles);
  const recipient = roles.find(
    (r) => r.roleKey === response.recipient,
  )!.personId;
  const prefix = kernelPrefix(assignment.source, assignment.kernelId);
  try {
    let next = world;
    if (assignment.activityState.status === "scheduled") {
      next = performScheduledActivity(next, assignment.activityId, handlers);
      if (next === world)
        return refuse(world, "An earlier commitment must be handled first.");
    } else if (assignment.activityState.status !== "completed")
      return refuse(world, "The review activity is unavailable.");
    // A due transition may end employment while the conference interval elapses.
    const currentOffice = judicialOfficeContexts(next).find(
      (o) => o.workRelationshipId === office.workRelationshipId,
    );
    if (
      !currentOffice ||
      typeof rolesFor(
        next,
        currentOffice,
        assignment.kernelId,
        assignment.source,
      ) === "string"
    )
      return refuse(
        world,
        "Office participants are no longer available at the response time.",
      );
    next = recordWorldEvent(next, {
      stableKey: `${prefix}:response`,
      type: "judicial.office-response-recorded",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [
        ...new Set([
          office.principalId,
          recipient,
          office.courtOrganizationId,
          assignment.item.id,
          assignment.evidence.id,
          assignment.activityId,
        ]),
      ],
      participants: [
        {
          personId: office.principalId,
          role: "agency:office-response",
          detail: response.key,
        },
        ...(recipient === office.principalId
          ? []
          : [
              {
                personId: recipient,
                role: "presence:recipient" as const,
                detail: null,
              },
            ]),
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        "judicial.office-response",
        assignment.kernelId.toLowerCase(),
        `response:${response.key}`,
      ],
      summary: response.statement,
      context: {
        location: {
          jurisdictionId: office.jurisdictionId,
          label: office.name,
          setting: "Office review",
        },
        socialContext: assignment.content.title,
        pressure: null,
        choice: response.label,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = next.history.events.at(-1)!;
    next = recordClaim(next, {
      stableKey: `${prefix}:response-claim`,
      speakerPersonId: office.principalId,
      eventId: event.id,
      madeAt: next.currentDate,
      audience: "private",
      statement: response.statement,
      relationshipToTruth: "consistent",
      provenance: { kind: "direct-record" },
    });
    for (const personId of [...new Set([office.principalId, recipient])])
      next = recordEventKnowledge(next, {
        stableKey: `${prefix}:response-known:${personId}`,
        personId,
        eventId: event.id,
        learnedAt: next.currentDate,
        believedSummary: response.statement,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      });
    if (recipient !== office.principalId)
      next = recordRelationshipInteraction(next, {
        stableKey: `${prefix}:response-contact`,
        personIds: [office.principalId, recipient],
        eventId: event.id,
        occurredAt: next.currentDate,
        kind: "work:judicial-office-response",
        change: "maintained",
        significance: "meaningful",
        summary: response.statement,
        tags: ["judicial.office-response"],
      });
    next = finishOfficeWork(
      next,
      assignment.item.id,
      event.id,
      `${prefix}:finished`,
    );
    if (response.followUp) {
      const key = `${prefix}:follow-up`;
      next = createScheduledActivity(next, {
        stableKey: key,
        title: response.followUp,
        summary: response.statement,
        kind: "confirmed",
        start: next.currentMoment,
        end: addSimulationMinutes(next.currentMoment, 20),
        participantPersonIds: [office.principalId],
        responsiblePersonId: office.principalId,
        location: {
          jurisdictionId: office.jurisdictionId,
          label: office.name,
          locationKey: `judicial-office:${courtOrganizationId}`,
        },
        sourceEntityIds: [event.id],
        flexibility: { kind: "fixed" },
        access: {
          kind: "private",
          personIds: [office.principalId],
        },
      });
      const activityId = next.history.scheduledActivities.at(-1)!.id;
      next = createWorkItem(next, {
        stableKey: `${key}:work`,
        title: response.followUp,
        summary: response.statement,
        jurisdictionId: office.jurisdictionId,
        sourceEntityIds: [event.id],
        focus: { kind: "calendar-item", scheduledActivityId: activityId },
        effort: null,
        access: { kind: "private", personIds: [office.principalId] },
        assignedPersonIds: [office.principalId],
        playerRequirement: "action",
        waitingOnPersonIds: [],
        blocker: null,
        scheduledActivityId: activityId,
      });
    }
    return { ok: true, world: next };
  } catch (error) {
    return refuse(
      world,
      error instanceof Error
        ? error.message
        : "The response could not be recorded.",
    );
  }
}

/** Existing work-state family lacks a public player-completion writer. No new store. */
function finishOfficeWork(
  world: World,
  workItemId: EntityId,
  outcomeEventId: EntityId,
  stableKey: string,
): World {
  const previous = workItemState(world, workItemId);
  if (previous.status !== "active")
    throw new Error("Only active office work can complete.");
  const state = {
    ...previous,
    id: createStableId("work-item-state", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentMoment,
    status: "completed" as const,
    playerRequirement: "none" as const,
    waitingOnPersonIds: [],
    blocker: null,
    outcomeEventId,
    supersedesStateId: previous.id,
  };
  const next = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [...world.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function judicialOfficeFollowUps(
  world: World,
  courtOrganizationId: EntityId,
) {
  const assignments = judicialOfficeAssignments(world, courtOrganizationId);
  return assignments.flatMap((assignment) => {
    if (!assignment.response) return [];
    return world.history.workItems
      .filter(
        (item) =>
          item.sourceEntityIds.includes(assignment.response!.id) &&
          item.stableKey.endsWith(":follow-up:work"),
      )
      .map((item) => ({
        item,
        state: workItemState(world, item.id),
        assignment,
      }));
  });
}

export function completeJudicialOfficeFollowUp(
  world: World,
  courtOrganizationId: EntityId,
  workItemId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): JudicialOfficeResult {
  const followUp = judicialOfficeFollowUps(world, courtOrganizationId).find(
    (f) => f.item.id === workItemId,
  );
  if (
    !followUp ||
    followUp.assignment.blocker ||
    followUp.state.status !== "active" ||
    !followUp.state.scheduledActivityId
  )
    return refuse(
      world,
      followUp?.assignment.blocker ?? "This follow-up is unavailable.",
    );
  try {
    const activityId = followUp.state.scheduledActivityId;
    let next =
      scheduledActivityState(world, activityId).status === "completed"
        ? world
        : performScheduledActivity(world, activityId, handlers);
    if (scheduledActivityState(next, activityId).status !== "completed")
      return refuse(world, "An earlier commitment must be handled first.");
    const current = judicialOfficeFollowUps(next, courtOrganizationId).find(
      (f) => f.item.id === workItemId,
    );
    if (!current || current.assignment.blocker)
      return refuse(world, "Office participants are no longer available.");
    const office = judicialOfficeContexts(next).find(
      (o) => o.courtOrganizationId === courtOrganizationId,
    )!;
    next = recordWorldEvent(next, {
      stableKey: `${followUp.item.stableKey}:completed`,
      type: "judicial.office-follow-up-completed",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [workItemId, activityId, office.principalId],
      participants: [
        {
          personId: office.principalId,
          role: "agency:office-follow-up",
          detail: null,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["judicial.office-follow-up"],
      summary: `Prepared a private follow-up note: ${followUp.item.summary}`,
      context: {
        location: {
          jurisdictionId: office.jurisdictionId,
          label: office.name,
          setting: "Office preparation",
        },
        socialContext: followUp.item.summary,
        pressure: null,
        choice: "Prepare a follow-up note",
        motivation: null,
        immediateReaction: null,
      },
    });
    const noteEvent = next.history.events.at(-1)!;
    const noteEventId = noteEvent.id;
    next = recordEventKnowledge(next, {
      stableKey: `${followUp.item.stableKey}:preparation-known`,
      personId: office.principalId,
      eventId: noteEventId,
      learnedAt: next.currentDate,
      believedSummary: noteEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    next = recordEvidenceArtifact(next, {
      stableKey: `${followUp.item.stableKey}:note`,
      evidenceKind: "record:office-preparation-note",
      createdAt: next.currentDate,
      recordedAt: next.currentDate,
      relatedEntityIds: [noteEventId, followUp.assignment.source.id],
      access: "private",
      description: followUp.item.summary,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [noteEventId, followUp.assignment.source.id],
      },
    });
    const note = next.history.evidenceArtifacts.at(-1)!;
    next = recordEvidenceDiscovery(next, {
      stableKey: `${followUp.item.stableKey}:note-known`,
      personId: office.principalId,
      evidenceArtifactId: note.id,
      discoveredAt: next.currentDate,
      recordedAt: next.currentDate,
      methodKey: "office:authored-note",
      provenance: {
        kind: "simulated",
        sourceEntityIds: [note.id, noteEventId],
      },
    });
    next = finishOfficeWork(
      next,
      workItemId,
      noteEventId,
      `${followUp.item.stableKey}:finished`,
    );
    return { ok: true, world: next };
  } catch (error) {
    return refuse(
      world,
      error instanceof Error
        ? error.message
        : "The follow-up could not be completed.",
    );
  }
}
