import { eventById } from "./event-index";
import { createMindProvenance, recordGoalState } from "./mind";
import { pursuitFamilyOf } from "./people-goal-pursuit-content";
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
 * A goal of keeping time for oneself is one reason among many: it tips a close
 * answer toward no and never decides one alone, whatever its priority
 * (Lamontae, September 27, 2026, through Claude CTO). Every other goal counts
 * for its recorded priority.
 */
function goalLeanImportance(goal: GoalStateRecord): DecisionImportance {
  return pursuitFamilyOf(goal.goalKey) === "privacy"
    ? "slight"
    : IMPORTANCE_BY_PRIORITY[goal.priority];
}

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
        importance: goalLeanImportance(goal),
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
  const event = eventById(world, input.eventId);
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

/** The provenance note prefix a recorded blocker is filed under. */
const BLOCKER_NOTE_PREFIX = "goal-blocker:";
/** The provenance note prefix a set-aside or finished goal is filed under. */
const SETTLED_NOTE_PREFIX = "goal-settled:";

/**
 * The blocker a goal state records, if it records one.
 *
 * A blocker is not a separate store: it is a goal state that stays active and
 * says in its outcome why no step could be taken, filed with a note naming
 * the blocker's key. Reading it back is how a later review knows the blocker
 * is not news and writes nothing.
 */
export function goalBlockerOf(record: GoalStateRecord): string | null {
  const note = record.provenance.note;
  if (record.status !== "active" || !note?.startsWith(BLOCKER_NOTE_PREFIX)) {
    return null;
  }
  return note.slice(BLOCKER_NOTE_PREFIX.length).split(" ")[0] ?? null;
}

/** The record a later state of this goal must supersede. */
function latestGoalState(
  world: World,
  goal: GoalStateRecord,
): GoalStateRecord | null {
  return (
    world.history.goalStates
      .filter((record) => record.goalId === goal.goalId)
      .at(-1) ?? null
  );
}

/**
 * Record that a goal is blocked, and why, in plain words.
 *
 * Writes nothing when the goal's latest state already records this same
 * blocker: being blocked for the same reason next week is not a new fact.
 */
export function recordGoalBlocked(
  world: World,
  input: {
    readonly goal: GoalStateRecord;
    readonly blockerKey: string;
    readonly reason: string;
  },
): World {
  const latest = latestGoalState(world, input.goal);
  if (!latest || latest.status !== "active") return world;
  if (goalBlockerOf(latest) === input.blockerKey) return world;
  return recordGoalState(world, {
    stableKey: `goal-blocked:${latest.id}:${input.blockerKey}`,
    personId: latest.personId,
    goalKey: latest.goalKey,
    createdAt: latest.createdAt,
    recordedAt: world.currentDate,
    objective: latest.objective,
    domain: latest.domain,
    scope: latest.scope,
    priority: latest.priority,
    status: "active",
    targetEntityId: latest.targetEntityId,
    deadline: latest.deadline,
    outcome: `Blocked: ${input.reason}`,
    provenance: createMindProvenance("reflection", {
      note: `${BLOCKER_NOTE_PREFIX}${input.blockerKey} ${input.reason}`,
      sourceRefs: [{ kind: "goal-state", goalStateId: latest.id }],
    }),
    replacesGoalId: null,
    supersedesGoalStateId: latest.id,
  });
}

/**
 * Close a goal: finished, set aside, or given up for another.
 *
 * The goal's history stays; this appends its last state with the reason in
 * the person's terms. A step toward it that actually happened can be cited,
 * and a goal given up for another names nothing here — the replacement links
 * back to it when it is recorded.
 */
export function settleGoal(
  world: World,
  input: {
    readonly goal: GoalStateRecord;
    readonly status: "completed" | "abandoned" | "superseded" | "failed";
    readonly reasonKey: string;
    readonly reason: string;
    readonly eventId?: EntityId | null;
  },
): World {
  const latest = latestGoalState(world, input.goal);
  if (!latest || latest.status !== "active") return world;
  const sourceRefs: MindSourceReference[] = [
    { kind: "goal-state", goalStateId: latest.id },
  ];
  if (input.eventId) {
    sourceRefs.push({ kind: "historical-event", eventId: input.eventId });
  }
  return recordGoalState(world, {
    stableKey: `goal-settled:${latest.id}:${input.status}`,
    personId: latest.personId,
    goalKey: latest.goalKey,
    createdAt: latest.createdAt,
    recordedAt: world.currentDate,
    objective: latest.objective,
    domain: latest.domain,
    scope: latest.scope,
    priority: latest.priority,
    status: input.status,
    targetEntityId: latest.targetEntityId,
    deadline: latest.deadline,
    outcome: input.reason,
    provenance: createMindProvenance("reflection", {
      note: `${SETTLED_NOTE_PREFIX}${input.reasonKey} ${input.reason}`,
      sourceRefs,
    }),
    replacesGoalId: null,
    supersedesGoalStateId: latest.id,
  });
}
