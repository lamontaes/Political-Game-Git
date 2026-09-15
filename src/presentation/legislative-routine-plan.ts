import {
  availableMeasureSteps,
  createStableId,
  currentMeasureProvisions,
  measurePosition,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../simulation";
import { canonicalJson } from "../simulation/canonical-json";
import { draftLineageForMeasure } from "../simulation/legislation-draft-lineage";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import {
  applyLegislativeCommand,
  recordedInstitutionalStepRequiresWait,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";

/** An explicit routine list never supplies a vote or an executive decision. */
export const LEGISLATIVE_ROUTINE_STEPS = [
  "request-referral",
  "request-committee-hearing",
  "request-calendar-placement",
  "await-next-legislative-day",
  "transmit-to-second-chamber",
  "request-enrollment",
  "present-to-executive",
  "record-enactment",
] as const;
export type LegislativeRoutineStep = (typeof LEGISLATIVE_ROUTINE_STEPS)[number];
const PLAN_EVENT = "legislation.routine-plan-admitted";
const RECEIPT_EVENT = "legislation.routine-plan-step-executed";

interface RoutinePlan {
  readonly worldId: EntityId;
  readonly playerPersonId: EntityId;
  readonly measureId: EntityId;
  readonly memberSeatStableKey: string;
  readonly signature: EntityId;
  readonly steps: readonly LegislativeRoutineStep[];
}

function planStableKey(plan: RoutinePlan): string {
  return `legislative-routine-plan:${createStableId("event", canonicalJson(plan))}`;
}

function planSignature(
  world: World,
  input: Pick<
    RoutinePlan,
    "playerPersonId" | "measureId" | "memberSeatStableKey"
  >,
) {
  const seat = resolveActiveMemberSeat(world, input.playerPersonId, {
    relationshipStableKey: input.memberSeatStableKey,
  });
  const measure = world.history.legislativeMeasures?.find(
    (record) => record.id === input.measureId,
  );
  if (seat.kind !== "seated" || !measure) return null;
  return createStableId(
    "event",
    canonicalJson({
      worldId: world.id,
      seat: seat.seat,
      measure,
      provisions: currentMeasureProvisions(world, measure.id),
      lineage: draftLineageForMeasure(world, measure.id),
    }),
  );
}

/** A deliberate player action. Opening/orienting a docket never calls this. */
export function authorizeLegislativeRoutinePlan(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly measureId: EntityId;
    readonly memberSeatStableKey?: string;
    readonly steps: readonly LegislativeRoutineStep[];
  },
): { readonly world: World; readonly planId: EntityId } {
  if (
    !Array.isArray(input.steps) ||
    input.steps.length === 0 ||
    input.steps.some((step) => !LEGISLATIVE_ROUTINE_STEPS.includes(step))
  )
    throw new Error(
      "Choose supported routine steps; a routine plan cannot supply a vote or substantive decision.",
    );
  const entry = resolveLegislativeAssignmentForMeasure(world, input);
  if (entry.kind !== "available") throw new Error(entry.reason);
  const base = {
    worldId: world.id,
    playerPersonId: input.playerPersonId,
    measureId: input.measureId,
    memberSeatStableKey: entry.assignment.memberSeatStableKey!,
  };
  const signature = planSignature(world, base)!;
  const plan: RoutinePlan = { ...base, signature, steps: [...input.steps] };
  const stableKey = planStableKey(plan);
  const prior = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (prior) {
    if (
      prior.type !== PLAN_EVENT ||
      prior.context.choice !== canonicalJson(plan)
    )
      throw new Error(
        "This plan identity belongs to a different recorded definition.",
      );
    return { world, planId: prior.id };
  }
  const next = recordWorldEvent(world, {
    stableKey,
    type: PLAN_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.history.legislativeMeasures!.find(
      (record) => record.id === input.measureId,
    )!.jurisdictionId,
    involvedEntityIds: [input.playerPersonId, input.measureId],
    participants: [
      {
        personId: input.playerPersonId,
        role: "agency:planner",
        detail:
          "Explicitly authorized non-voting routine commands for this exact bill and office.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["legislation", "legislation.routine-plan"],
    summary:
      "Authorized an explicit legislative routine plan; meaningful choices require separate authority and instructions.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: canonicalJson(plan),
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world: next,
    planId: next.history.events.find((event) => event.stableKey === stableKey)!
      .id,
  };
}

function readPlan(world: World, planId: EntityId): RoutinePlan | null {
  const event = world.history.events.find(
    (record) => record.id === planId && record.type === PLAN_EVENT,
  );
  if (!event?.context.choice) return null;
  try {
    const value: unknown = JSON.parse(event.context.choice);
    if (typeof value !== "object" || value === null) return null;
    const plan = value as RoutinePlan;
    if (
      typeof plan.worldId !== "string" ||
      typeof plan.playerPersonId !== "string" ||
      typeof plan.measureId !== "string" ||
      typeof plan.memberSeatStableKey !== "string" ||
      typeof plan.signature !== "string" ||
      !Array.isArray(plan.steps) ||
      plan.steps.length === 0 ||
      plan.steps.some((step) => !LEGISLATIVE_ROUTINE_STEPS.includes(step)) ||
      !event.involvedEntityIds.includes(plan.playerPersonId) ||
      !event.involvedEntityIds.includes(plan.measureId) ||
      event.stableKey !== planStableKey(plan) ||
      !event.participants.some(
        (participant) =>
          participant.personId === plan.playerPersonId &&
          participant.role === "agency:planner",
      )
    )
      return null;
    return plan;
  } catch {
    return null;
  }
}

export interface LegislativeRoutinePlanResult {
  readonly world: World;
  readonly status:
    "completed" | "decision-required" | "clock-stopped" | "refused";
  readonly completedSteps: readonly LegislativeRoutineStep[];
  readonly reason: string;
}

/** Resume only this saved list; existing commands own all records and time. */
export function executeLegislativeRoutinePlan(
  world: World,
  planId: EntityId,
): LegislativeRoutinePlanResult {
  const plan = readPlan(world, planId);
  const stopped = (
    status: LegislativeRoutinePlanResult["status"],
    reason: string,
    current = world,
    completedSteps: readonly LegislativeRoutineStep[] = [],
  ): LegislativeRoutinePlanResult => ({
    world: current,
    status,
    reason,
    completedSteps,
  });
  if (!plan || plan.worldId !== world.id)
    return stopped(
      "refused",
      "This World has no supported saved legislative routine plan with that identity.",
    );
  if (
    world.control.kind !== "person" ||
    world.control.personId !== plan.playerPersonId
  )
    return stopped(
      "refused",
      "Only the current controlled member may execute this plan.",
    );
  if (planSignature(world, plan) !== plan.signature)
    return stopped(
      "refused",
      "The exact bill/version or selected office changed. Review and authorize a new plan; no routine action was taken.",
    );
  let current = world;
  const completed: LegislativeRoutineStep[] = [];
  for (const [index, step] of plan.steps.entries()) {
    const stableKey = `legislative-routine-plan:${planId}:step:${index}`;
    const receipt = current.history.events.find(
      (event) => event.stableKey === stableKey,
    );
    if (receipt) {
      if (
        receipt.type !== RECEIPT_EVENT ||
        receipt.context.choice !== canonicalJson({ planId }) ||
        !receipt.involvedEntityIds.includes(plan.measureId) ||
        !receipt.involvedEntityIds.includes(plan.playerPersonId) ||
        receipt.context.socialContext !== step
      )
        return stopped(
          "refused",
          "This routine receipt identity belongs to a different recorded action.",
          current,
          completed,
        );
      completed.push(step);
      continue;
    }
    if (planSignature(current, plan) !== plan.signature)
      return stopped(
        "refused",
        "The exact bill/version or selected office changed before the next routine action.",
        current,
        completed,
      );
    if (!availableMeasureSteps(current, plan.measureId).includes(step))
      return stopped(
        "decision-required",
        "The next planned routine step is not available. Complete the current meaningful choice or resolve its exact missing input first.",
        current,
        completed,
      );
    const entry = resolveLegislativeAssignmentForMeasure(current, plan);
    if (entry.kind !== "available")
      return stopped("refused", entry.reason, current, completed);
    const requiresWait = recordedInstitutionalStepRequiresWait(
      current,
      entry.assignment,
      step,
    );
    const member = resolveActiveMemberSeat(current, plan.playerPersonId, {
      relationshipStableKey: plan.memberSeatStableKey,
    });
    if (member.kind !== "seated")
      return stopped("refused", member.reason, current, completed);
    const position = measurePosition(current, plan.measureId);
    if (
      position.chamberKey !== null &&
      position.chamberKey !== member.seat.chamberKey &&
      [
        "request-referral",
        "request-committee-hearing",
        "request-calendar-placement",
        "await-next-legislative-day",
      ].includes(step) &&
      !requiresWait
    )
      return stopped(
        "refused",
        "This office cannot take the other chamber's routine action without its supported institutional record.",
        current,
        completed,
      );
    let result: ReturnType<typeof applyLegislativeCommand>;
    try {
      result = applyLegislativeCommand(current, entry.assignment, {
        kind: requiresWait ? "await-institutional-record" : "take-step",
        step,
      });
    } catch (error) {
      return stopped(
        "refused",
        error instanceof Error
          ? error.message
          : "The current procedure refused this routine action.",
        current,
        completed,
      );
    }
    current = result.world;
    if (
      (step === "request-committee-hearing" &&
        !measurePosition(current, plan.measureId).hearingHeld) ||
      (step === "await-next-legislative-day" &&
        availableMeasureSteps(current, plan.measureId).includes(step))
    )
      return stopped("clock-stopped", result.message, current, completed);
    current = recordWorldEvent(current, {
      stableKey,
      type: RECEIPT_EVENT,
      occurredAt: current.currentDate,
      recordedAt: current.currentDate,
      jurisdictionId: current.history.legislativeMeasures!.find(
        (record) => record.id === plan.measureId,
      )!.jurisdictionId,
      involvedEntityIds: [plan.playerPersonId, plan.measureId],
      participants: [
        {
          personId: plan.playerPersonId,
          role: "agency:planner",
          detail:
            "Completed one explicitly authorized non-voting routine step through the existing command boundary.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["legislation", "legislation.routine-plan"],
      summary: result.message,
      context: {
        location: null,
        socialContext: step,
        pressure: null,
        choice: canonicalJson({ planId }),
        motivation: null,
        immediateReaction: null,
      },
    });
    completed.push(step);
  }
  return stopped(
    "completed",
    "The explicitly authorized routine steps are complete; no vote or substantive decision was supplied by this plan.",
    current,
    completed,
  );
}
