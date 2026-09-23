import { createMindProvenance, recordGoalState } from "./mind";
import type {
  DecisionConsideration,
  DecisionDirection,
  DecisionImportance,
  EntityId,
  GoalStateRecord,
  IsoDate,
  MindSourceReference,
  World,
} from "./types";

/**
 * A private goal that shows in what somebody does (CRUNCH47, living play).
 *
 * Every generated person is given an ordinary-life goal at world build —
 * learning, connection or privacy, in `life-personality.ts` — and until now no
 * simulated person ever acted on one. The goals were read to decide what the
 * player could say in a scene, so the player was the only character in the
 * world with an agenda, which is the opposite of a world that acts on its own.
 *
 * This does not add an engine. The research return of 2026-09-22 on private
 * goals is explicit about the contract, and it is followed here:
 *
 *   "A goal proposes eligible actions; it does not directly mutate money,
 *   employment, relationships, credentials, health, office or world state."
 *
 * So what lives here is a reading — a person's active goal turned into
 * considerations the ordinary decision machinery already weighs, alongside
 * their temperament — and a writer that records a step against the event that
 * actually happened. Nothing schedules anything, nothing is mutated on a goal's
 * behalf, and no second goal engine exists to keep in step with the first.
 *
 * Two rules from that return are load-bearing and easy to lose:
 *
 *   Progress is evidence from actual canonical actions, never a hidden progress
 *   bar. `recordGoalStepTaken` refuses without the event that was its step.
 *
 *   "A private goal remains private until behavior, direct disclosure, evidence
 *   or an appropriate relationship/knowledge channel exposes it." Nothing here
 *   is rendered. The player infers an agenda from what somebody keeps doing.
 */

/** The domain `life-personality.ts` files an ordinary person's goal under. */
export const ORDINARY_LIFE_GOAL_DOMAIN = "life:ordinary";

/** One way an active goal leans on a choice somebody is about to make. */
export interface GoalLean {
  readonly optionKey: string;
  /** The goal key this lean is about, e.g. `opening-life:connection`. */
  readonly goalKey: string;
  readonly direction: DecisionDirection;
  /** Said in the person's terms, for the decision trace a reviewer reads. */
  readonly explanation: string;
}

/**
 * How much an active goal counts for, read from the priority already recorded.
 *
 * This maps one recorded vocabulary onto another rather than introducing a
 * weight. No number is chosen here, and the research return explicitly declines
 * to approve per-family selection probabilities or goal coefficients.
 */
const IMPORTANCE_BY_PRIORITY: Record<
  GoalStateRecord["priority"],
  DecisionImportance
> = {
  low: "slight",
  moderate: "moderate",
  high: "strong",
  critical: "decisive",
};

/**
 * The goal this person is currently pursuing under a key, if any.
 *
 * Goal states are append-only, so the standing answer is the last record for
 * that key, and it counts only while its status is active. An abandoned or
 * completed goal leans on nothing.
 */
export function activeGoalFor(
  world: World,
  personId: EntityId,
  goalKey: string,
): GoalStateRecord | null {
  const latest = world.history.goalStates
    .filter(
      (record) => record.personId === personId && record.goalKey === goalKey,
    )
    .at(-1);
  return latest?.status === "active" ? latest : null;
}

/** Every ordinary-life goal this person is currently pursuing. */
export function activeOrdinaryGoals(
  world: World,
  personId: EntityId,
): readonly GoalStateRecord[] {
  const byKey = new Map<string, GoalStateRecord>();
  for (const record of world.history.goalStates) {
    if (record.personId !== personId) continue;
    if (record.domain !== ORDINARY_LIFE_GOAL_DOMAIN) continue;
    byKey.set(record.goalKey, record);
  }
  return [...byKey.values()].filter((record) => record.status === "active");
}

/**
 * What this person's private goals say about a choice in front of them.
 *
 * Shaped deliberately like `traitConsiderations` in `people-traits.ts`, and
 * used beside it: temperament says who somebody is, a goal says what they are
 * currently trying to do, and the existing decision machinery weighs both
 * without either one deciding on its own. A person with no active goal for a
 * lean contributes nothing, which is why a caller can pass leans freely.
 */
export function goalConsiderations(
  world: World,
  actorPersonId: EntityId,
  keyPrefix: string,
  leans: readonly GoalLean[],
): readonly DecisionConsideration[] {
  return leans.flatMap((lean, index) => {
    const goal = activeGoalFor(world, actorPersonId, lean.goalKey);
    if (!goal) return [];
    const ref: MindSourceReference = {
      kind: "goal-state",
      goalStateId: goal.id,
    };
    return [
      {
        stableKey: `${keyPrefix}:goal:${lean.goalKey}:${lean.optionKey}:${index}`,
        optionKey: lean.optionKey,
        sourceType: "mind:goal",
        direction: lean.direction,
        importance: IMPORTANCE_BY_PRIORITY[goal.priority],
        confidence: "medium",
        explanation: lean.explanation,
        sourceRefs: [ref],
      },
    ];
  });
}

/**
 * Record that somebody took a real step toward a goal of theirs.
 *
 * The goal stays active: reaching out to one person is not finishing "make time
 * for people you know", and a status of completed would be a claim the world
 * cannot support. What the record carries is the event that was the step, as
 * the outcome and as the provenance note, so the goal's history reads as a
 * chain of things that actually happened.
 *
 * It refuses an event that does not exist or that this person had no part in,
 * because a step nobody took is the progress bar this design exists to avoid.
 */
export function recordGoalStepTaken(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly goalKey: string;
    readonly eventId: EntityId;
    readonly recordedAt?: IsoDate;
  },
): World {
  const goal = activeGoalFor(world, input.personId, input.goalKey);
  if (!goal) {
    throw new Error("A goal step requires an active goal.");
  }
  const event = world.history.events.find(
    (candidate) => candidate.id === input.eventId,
  );
  if (!event) {
    throw new Error("A goal step requires an event that happened.");
  }
  if (
    !event.involvedEntityIds.includes(input.personId) &&
    !event.participants.some(
      (participant) => participant.personId === input.personId,
    )
  ) {
    throw new Error("A goal step requires an event this person took part in.");
  }
  return recordGoalState(world, {
    stableKey: `goal-step:${goal.id}:${event.id}`,
    personId: input.personId,
    goalKey: goal.goalKey,
    createdAt: goal.createdAt,
    recordedAt: input.recordedAt ?? world.currentDate,
    objective: goal.objective,
    domain: goal.domain,
    scope: goal.scope,
    priority: goal.priority,
    status: "active",
    targetEntityId: goal.targetEntityId,
    deadline: goal.deadline,
    outcome: event.summary,
    provenance: createMindProvenance("reflection", {
      note: "A step taken toward this goal, in a recorded action.",
      sourceRefs: [{ kind: "historical-event", eventId: event.id }],
    }),
    replacesGoalId: null,
    supersedesGoalStateId: goal.id,
  });
}
