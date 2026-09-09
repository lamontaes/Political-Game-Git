import { activeLifePathWorkers } from "./life-paths2-workers";
/** Explicit executive consumer actions. Every successful action uses the 92H
 * compiler and canonical record writers; no serialized workflow engine. */
import {
  addDays,
  addSimulationMinutes,
  simulationMomentAtLocalTime,
} from "./dates";
import { createStableId } from "./ids";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import {
  createWorkItem,
  advanceWorldMinutes,
  createScheduledActivity,
  workItemState,
  scheduledActivityState,
  performScheduledActivity,
} from "./time-work";
import { recordEvidenceDiscovery } from "./evidence";
import {
  bindExecutiveWork,
  resolveExecutiveOffice,
  executiveStaffRoles,
} from "./executive-work-context";
import { EXECUTIVE_TERM_HANDLERS } from "./executive-work-entry";
import {
  applyExecutiveGoverningPlan,
  EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY,
  executiveGoverningCycleTransitionHandler,
  type ExecutiveKernelId,
  type ExecutiveDispositionOptionKey,
  type ExecutiveGoverningPlanStep,
} from "./executive-governing-kernels";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
} from "./future-transitions";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
  WorkItemRecord,
} from "./types";

export type ExecutiveWorkResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };
const refused = (world: World, reason: string): ExecutiveWorkResult => ({
  ok: false,
  world,
  reason,
});

/** Route an existing, known event into this office's inbox. Read/render never
 * invokes this writer. Source producers call it when actual work arrives. */
export function receiveExecutiveWork(
  world: World,
  sourceEventId: EntityId,
  title: string,
  summary: string,
  measureId: EntityId | null = null,
): World {
  const office = resolveExecutiveOffice(world);
  if (!office) throw new Error("No current executive office.");
  const event = world.history.events.find(
    (e) =>
      e.id === sourceEventId &&
      e.recordedAt <= world.currentDate &&
      e.jurisdictionId === office.jurisdictionId,
  );
  if (!event)
    throw new Error("No existing event in this governing jurisdiction.");
  if (
    event.visibility !== "public" &&
    !event.participants.some((p) => p.personId === office.personId) &&
    !world.history.knowledge.some(
      (k) =>
        k.personId === office.personId &&
        k.eventId === event.id &&
        k.learnedAt <= world.currentDate,
    )
  )
    throw new Error("The character has not learned of this event.");
  const key = `executive-inbox:${office.relationship.id}:${sourceEventId}`;
  if (world.history.workItems.some((w) => w.stableKey === key)) return world;
  const measure = measureId
    ? (world.history.legislativeMeasures ?? []).find(
        (m) =>
          m.id === measureId &&
          m.jurisdictionId === office.jurisdictionId &&
          event.involvedEntityIds.includes(m.id),
      )
    : null;
  if (measureId && !measure)
    throw new Error("The event does not establish the referenced measure.");
  return createWorkItem(world, {
    stableKey: key,
    title,
    summary,
    jurisdictionId: office.jurisdictionId,
    sourceEntityIds: [office.entry.id, event.id]
      .filter((id, i, a) => a.indexOf(id) === i)
      .sort(),
    focus: measure
      ? {
          kind: "legislative-material",
          targetKey: `executive-work:measure:${measure.id}`,
          sourceEntityId: event.id,
        }
      : {
          kind: "other",
          targetKey: "executive-work:inbox",
          sourceEntityId: event.id,
        },
    effort: null,
    access: { kind: "private", personIds: [office.personId] },
    assignedPersonIds: [office.personId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
}

function recordExists(world: World, step: ExecutiveGoverningPlanStep): boolean {
  const key = step.input.stableKey;
  switch (step.kind) {
    case "work-item":
      return world.history.workItems.some((x) => x.stableKey === key);
    case "scheduled-activity":
      return world.history.scheduledActivities.some((x) => x.stableKey === key);
    case "future-due-item":
      return world.history.futureDueItems.some((x) => x.stableKey === key);
    case "historical-event":
      return world.history.events.some((x) => x.stableKey === key);
    case "evidence-artifact":
      return world.history.evidenceArtifacts.some((x) => x.stableKey === key);
    case "executive-disposition":
      return (world.history.executiveDispositions ?? []).some(
        (x) => x.stableKey === key,
      );
  }
}

/** Canonical step roots are the progress markers. Reopening/reloading merely
 * projects them, and cannot replay a decision or a staff response. */
export function executiveNextStep(
  world: World,
  workItemId: EntityId,
  kernelId: ExecutiveKernelId,
  option: ExecutiveDispositionOptionKey = "sign",
) {
  const bound = bindExecutiveWork(world, workItemId, kernelId, option);
  if (!bound.ok) return bound;
  for (const step of bound.plan.steps) {
    if (!recordExists(world, step)) return { ...bound, step };
    if (step.kind === "work-item") {
      const work = world.history.workItems.find(
        (w) => w.stableKey === step.input.stableKey,
      )!;
      if (
        !["completed", "ready-for-review"].includes(
          workItemState(world, work.id).status,
        )
      )
        return { ...bound, step };
    }
    if (step.kind === "scheduled-activity") {
      const activity = world.history.scheduledActivities.find(
        (a) => a.stableKey === step.input.stableKey,
      )!;
      if (scheduledActivityState(world, activity.id).status !== "completed")
        return { ...bound, step };
    }
  }
  return { ...bound, step: null };
}

function finishWork(world: World, item: WorkItemRecord, choice: string): World {
  const previous = workItemState(world, item.id);
  const stableKey = `${item.stableKey}:executive-completed`;
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type: "executive.work-response",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: item.jurisdictionId,
    involvedEntityIds: [item.id, ...previous.assignedPersonIds],
    participants: previous.assignedPersonIds.map((personId) => ({
      personId,
      role: "agency:office-work",
      detail: choice,
    })),
    personFactConstraints: [],
    visibility: "limited",
    tags: ["executive.work-response"],
    summary: choice,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice,
      motivation: null,
      immediateReaction: null,
    },
  });
  const outcomeEventId = next.history.events.at(-1)!.id;
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      workItemStates: [
        ...next.history.workItemStates,
        {
          ...previous,
          id: createStableId("work-item-state", `${next.id}:${stableKey}`),
          stableKey,
          sequence: next.history.nextSequence,
          recordedAt: next.currentMoment,
          status: "completed",
          playerRequirement: "none",
          waitingOnPersonIds: [],
          blocker: null,
          outcomeEventId,
          supersedesStateId: previous.id,
        },
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function recordWorkInstruction(
  world: World,
  item: WorkItemRecord,
  summary: string,
  waitingOnPersonIds: EntityId[],
  scheduledActivityId: EntityId | null,
): World {
  const previous = workItemState(world, item.id);
  const stableKey = `${item.stableKey}:instruction:${world.history.nextSequence}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: "executive.work-instruction",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: item.jurisdictionId,
    involvedEntityIds: [item.id, ...previous.assignedPersonIds],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["executive.work-instruction"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: summary,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      workItemStates: [
        ...next.history.workItemStates,
        {
          ...previous,
          id: createStableId(
            "work-item-state",
            `${next.id}:${stableKey}:state`,
          ),
          stableKey: `${stableKey}:state`,
          sequence: next.history.nextSequence,
          recordedAt: next.currentMoment,
          waitingOnPersonIds,
          scheduledActivityId,
          blocker: summary,
          outcomeEventId: event.id,
          supersedesStateId: previous.id,
        },
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export type ExecutiveWorkAction =
  "continue" | "return-for-work" | "defer" | "sign" | "veto-with-message";
export function actOnExecutiveWork(
  world: World,
  workItemId: EntityId,
  kernelId: ExecutiveKernelId,
  action: ExecutiveWorkAction,
  handlers?: FutureTransitionHandlerRegistry,
  statement?: string,
): ExecutiveWorkResult {
  const bound = executiveNextStep(
    world,
    workItemId,
    kernelId,
    action === "veto-with-message" ? "veto-with-message" : "sign",
  );
  if (!bound.ok) return refused(world, bound.reason);
  if (!bound.step) return { ok: true, world };
  const step = bound.step;
  try {
    if (
      step.kind === "executive-disposition" &&
      action !== "sign" &&
      action !== "veto-with-message"
    )
      return refused(world, "Choose a represented disposition explicitly.");
    if (
      step.kind !== "executive-disposition" &&
      (action === "sign" || action === "veto-with-message")
    )
      return refused(
        world,
        "The work has not reached the disposition decision.",
      );
    if (action === "return-for-work" || action === "defer") {
      if (step.kind !== "work-item" || step.input.playerRequirement === "none")
        return refused(world, "This step does not request a player decision.");
      let next = world;
      if (!recordExists(next, step)) {
        const created = actOnExecutiveWork(
          next,
          workItemId,
          kernelId,
          "continue",
          handlers,
        );
        if (!created.ok) return created;
        next = created.world;
      }
      const work = next.history.workItems.find(
        (w) => w.stableKey === step.input.stableKey,
      )!;
      const previous = workItemState(next, work.id);
      if (previous.waitingOnPersonIds.length || previous.scheduledActivityId)
        return refused(world, "A prior review request is still pending.");
      const key = `${work.stableKey}:${action}:${next.history.nextSequence}`;
      let waiting: EntityId[] = [];
      let activityId: EntityId | null = null;
      if (action === "defer") {
        const date = addDays(next.currentDate, 7);
        if (date >= bound.office.endsAt)
          return refused(
            world,
            "The review would fall outside this office term.",
          );
        const start = simulationMomentAtLocalTime({
          ...next.currentMoment,
          date,
          preferredUtcOffsetMinutes: next.currentMoment.utcOffsetMinutes,
        });
        next = createScheduledActivity(next, {
          stableKey: key,
          title: "Review deferred work",
          summary: bound.item.summary,
          kind: "confirmed",
          start,
          end: addSimulationMinutes(start, 30),
          participantPersonIds: [bound.office.personId],
          responsiblePersonId: bound.office.personId,
          location: bound.context.location,
          sourceEntityIds: [work.id],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [bound.office.personId] },
        });
        activityId = next.history.scheduledActivities.at(-1)!.id;
      } else {
        const personId =
          bound.context.roles["policy-director"] ??
          bound.context.roles["chief-of-staff"];
        if (!personId)
          return refused(
            world,
            "No available staff member is bound to further review.",
          );
        const worker = activeLifePathWorkers(
          next,
          bound.office.organizationId,
        ).find((w) => w.personId === personId);
        if (!worker)
          return refused(world, "The staff engagement is no longer active.");
        next = createWorkItem(next, {
          ...step.input,
          stableKey: key,
          title: "Further staff review",
          summary: statement?.trim() || bound.item.summary,
          sourceEntityIds: [
            work.id,
            worker.relationship.id,
            bound.office.relationship.id,
          ].sort(),
          effort: { kind: "authored-duration", requiredMinutes: 30 },
          assignedPersonIds: [personId],
          playerRequirement: "none",
          access: {
            kind: "private",
            personIds: [bound.office.personId, personId].sort(),
          },
        });
        waiting = [personId];
      }
      next = recordWorkInstruction(
        next,
        work,
        action === "defer"
          ? "Deferred review for seven days."
          : "Requested further staff review.",
        waiting,
        activityId,
      );
      return { ok: true, world: next };
    }
    if (step.kind === "work-item" && recordExists(world, step)) {
      const work = world.history.workItems.find(
        (w) => w.stableKey === step.input.stableKey,
      )!;
      const state = workItemState(world, work.id);
      if (state.waitingOnPersonIds.length) {
        const pending = world.history.workItems.filter((w) =>
          w.sourceEntityIds.includes(work.id),
        );
        if (
          !pending.length ||
          pending.some(
            (w) =>
              !["ready-for-review", "completed"].includes(
                workItemState(world, w.id).status,
              ),
          )
        )
          return refused(world, "Further staff review is not ready.");
      }
      if (
        state.scheduledActivityId &&
        scheduledActivityState(world, state.scheduledActivityId).status ===
          "scheduled"
      ) {
        const next = performScheduledActivity(
          world,
          state.scheduledActivityId,
          composeExecutiveWorkHandlers(handlers),
        );
        return next === world
          ? refused(world, "An earlier commitment prevents this review.")
          : { ok: true, world: next };
      }
      if (state.playerRequirement === "decision" && !statement?.trim())
        return refused(
          world,
          "Record an instruction before completing this decision.",
        );
      if (
        state.playerRequirement === "none" &&
        state.status !== "ready-for-review"
      )
        return refused(
          world,
          "The assigned staff work is not ready for review.",
        );
      return {
        ok: true,
        world: finishWork(
          world,
          work,
          statement?.trim() || "Reviewed the office work.",
        ),
      };
    }
    if (step.kind === "scheduled-activity" && recordExists(world, step)) {
      const activity = world.history.scheduledActivities.find(
        (a) => a.stableKey === step.input.stableKey,
      )!;
      const next = performScheduledActivity(
        world,
        activity.id,
        composeExecutiveWorkHandlers(handlers),
      );
      return next === world
        ? refused(world, "An earlier commitment prevents this meeting.")
        : { ok: true, world: next };
    }
    // Static memo/status copy is supplied from the grounded intake. No analysis,
    // recommendation, agency outcome or communication delivery is synthesized.
    let prepared: ExecutiveGoverningPlanStep = step;
    if (step.kind === "executive-disposition") {
      if (action === "veto-with-message" && !statement?.trim())
        return refused(world, "Write a message before returning the measure.");
      prepared = {
        ...step,
        input: {
          ...step.input,
          rationale: statement?.trim() || "Signed by explicit player choice.",
        },
      };
    }

    if (step.kind === "work-item")
      prepared = {
        ...step,
        input: {
          ...step.input,
          title: bound.item.title,
          summary: bound.item.summary,
          sourceEntityIds: [
            bound.item.id,
            bound.office.entry.id,
            bound.office.relationship.id,
            ...activeLifePathWorkers(world, bound.office.organizationId)
              .filter((w) => step.input.assignedPersonIds.includes(w.personId))
              .map((w) => w.relationship.id),
          ]
            .filter((id, i, a) => a.indexOf(id) === i)
            .sort(),
          effort:
            step.input.playerRequirement === "none"
              ? { kind: "authored-duration", requiredMinutes: 30 }
              : null,
          access: {
            kind: "private",
            personIds: [bound.office.personId, ...step.input.assignedPersonIds]
              .filter((id, i, a) => a.indexOf(id) === i)
              .sort(),
          },
        },
      };
    if (step.kind === "scheduled-activity")
      prepared = {
        ...step,
        input: {
          ...step.input,
          title: bound.item.title,
          summary: bound.item.summary,
          responsiblePersonId: bound.office.personId,
          participantPersonIds: [
            bound.office.personId,
            ...step.input.participantPersonIds,
          ]
            .filter((id, i, a) => a.indexOf(id) === i)
            .sort(),
          sourceEntityIds: [bound.item.id],
          access: { kind: "private", personIds: [bound.office.personId] },
        },
      };
    if (step.kind === "future-due-item")
      prepared = {
        ...step,
        input: {
          ...step.input,
          entityIds: [...step.input.entityIds, bound.office.relationship.id]
            .filter((id, i, a) => a.indexOf(id) === i)
            .sort(),
        },
      };
    if (step.kind === "historical-event")
      prepared = {
        ...step,
        input: {
          ...step.input,
          summary: bound.item.summary,
          involvedEntityIds: [...step.input.involvedEntityIds, bound.item.id]
            .filter((id, i, a) => a.indexOf(id) === i)
            .sort(),
        },
      };
    if (step.kind === "evidence-artifact")
      prepared = {
        ...step,
        input: { ...step.input, description: bound.item.summary },
      };
    const applied = applyExecutiveGoverningPlan(world, {
      ...bound.plan,
      steps: [prepared],
    });
    if (!applied.ok) return refused(world, applied.reason);
    let next = applied.world;
    if (step.kind === "executive-disposition") {
      const event = next.history.events.at(-1)!;
      const measure = next.history.legislativeMeasures!.find(
        (m) => m.id === step.input.measureId,
      )!;
      next = receiveExecutiveWork(
        next,
        event.id,
        measure.designation,
        event.summary,
        measure.id,
      );
    }

    if (step.kind === "evidence-artifact") {
      const evidence = next.history.evidenceArtifacts.at(-1)!;
      next = recordEvidenceDiscovery(next, {
        stableKey: `${evidence.stableKey}:read`,
        personId: bound.office.personId,
        evidenceArtifactId: evidence.id,
        discoveredAt: next.currentDate,
        recordedAt: next.currentDate,
        methodKey: "executive-work:review",
        provenance: { kind: "simulated", sourceEntityIds: [evidence.id] },
      });
    }
    return { ok: true, world: next };
  } catch (error) {
    return refused(
      world,
      error instanceof Error
        ? error.message
        : "Office action could not be completed.",
    );
  }
}

const cycleHandlers = createFutureTransitionHandlerRegistry([
  [
    EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY,
    (world, item) => {
      const office = resolveExecutiveOffice(world);
      if (!office || !item.entityIds.includes(office.relationship.id))
        return {
          world,
          status: "blocked",
          reasonKey: "executive-work:expired-office",
          context: "The originating office term is no longer active.",
          outcomeEventId: null,
        };
      const active = new Set(Object.values(executiveStaffRoles(world, office)));
      if (item.entityIds.some((id) => world.people[id] && !active.has(id)))
        return {
          world,
          status: "blocked",
          reasonKey: "executive-work:staff-unavailable",
          context:
            "An assigned person no longer holds the required office role.",
          outcomeEventId: null,
        };
      const result = executiveGoverningCycleTransitionHandler(world, item);
      if (result.world === world) return result;
      const origin = world.history.workItems.find((w) =>
        item.stableKey.startsWith(`exec-work:${w.id}:`),
      );
      if (!origin)
        return {
          world,
          status: "blocked",
          reasonKey: "executive-work:missing-origin",
          context: "The originating office work is unavailable.",
          outcomeEventId: null,
        };
      const created = result.world.history.workItems.at(-1)!;
      const next = {
        ...result.world,
        history: {
          ...result.world.history,
          workItems: [
            ...world.history.workItems,
            {
              ...created,
              title: "Office follow-up",
              summary: origin.summary,
              sourceEntityIds: [
                office.entry.id,
                origin.id,
                ...origin.sourceEntityIds,
              ]
                .filter((id, i, a) => a.indexOf(id) === i)
                .sort(),
              focus: {
                kind: "other" as const,
                targetKey: "executive-work:follow-up",
                sourceEntityId: origin.id,
              },
              access: {
                kind: "private" as const,
                personIds: [office.personId],
              },
            },
          ],
        },
      };
      assertWorldIntegrity(next);
      return { ...result, world: next };
    },
  ],
]);
export function composeExecutiveWorkHandlers(
  existing?: FutureTransitionHandlerRegistry,
) {
  return composeFutureTransitionHandlerRegistries(
    EXECUTIVE_TERM_HANDLERS,
    cycleHandlers,
    ...(existing ? [existing] : []),
  );
}

export function spendExecutiveWorkTime(
  world: World,
  handlers?: FutureTransitionHandlerRegistry,
): ExecutiveWorkResult {
  const office = resolveExecutiveOffice(world);
  if (!office) return refused(world, "No current executive office.");
  if (addSimulationMinutes(world.currentMoment, 30).date >= office.endsAt)
    return refused(
      world,
      "This work interval would extend beyond the office term.",
    );
  try {
    const next = advanceWorldMinutes(
      world,
      30,
      composeExecutiveWorkHandlers(handlers),
    );
    return next === world
      ? refused(world, "A scheduled commitment prevents this work interval.")
      : { ok: true, world: next };
  } catch (error) {
    return refused(
      world,
      error instanceof Error ? error.message : "Work time could not advance.",
    );
  }
}

/** Explicit producer hook after legislative/time actions. Pure projections never
 * invoke this. Presentment and disposition remain the legislature's records. */
export function synchronizeExecutiveInbox(world: World): World {
  const office = resolveExecutiveOffice(world);
  if (!office) return world;
  let next = world;
  for (const action of world.history.legislativeActions ?? []) {
    if (!["presented-to-executive", "signed", "vetoed"].includes(action.kind))
      continue;
    const measure = world.history.legislativeMeasures?.find(
      (m) =>
        m.id === action.measureId && m.jurisdictionId === office.jurisdictionId,
    );
    if (!measure) continue;
    const authority = office.pack.presentment.legislativeRulePackId;
    if (authority.kind !== "known" || authority.value !== measure.rulePackId)
      continue;
    const event = world.history.events.find((e) => e.id === action.eventId)!;
    next = receiveExecutiveWork(
      next,
      event.id,
      measure.designation,
      event.summary,
      measure.id,
    );
  }
  return next;
}
