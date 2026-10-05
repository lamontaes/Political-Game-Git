import { addDays, ageOnDate, daysBetween } from "./dates";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { eventById } from "./event-index";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  activeEducationEnrollmentsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  organizationProfileAt,
  workStatusAt,
} from "./life-queries";
import {
  answerJobOfferAsResident,
  advanceApplications,
  applicationsFor,
  applyForJobAsResident,
  employerDisplayName,
  introducersFor,
  jobOpening,
  latestApplicationStep,
  openJobListings,
  expectedStart,
  residentApplicationBlocked,
  startJobAsResident,
} from "./job-market";
import {
  ORDINARY_LIFE_GOALS,
  establishLifePersonality,
} from "./life-personality";
import { createMindProvenance, recordGoalState } from "./mind";
import { personName } from "./people";
import {
  GOAL_BLOCKER_REASONS,
  GOAL_PURSUIT_PLACEHOLDER as PACE,
  GOAL_PURSUIT_VERSION,
  GOAL_REVIEW_TRANSITION_KEY,
  LIVELIHOOD_GOAL_DOMAIN,
  LIVELIHOOD_GOAL_KEY,
  PRIVACY_GOAL_KEY,
  CONNECTION_GOAL_KEY,
  TEACHING_CLASSIFICATION_PREFIXES,
  pursuitFamilyOf,
  type GoalBlockerKey,
} from "./people-goal-pursuit-content";
import {
  goalBlockerOf,
  goalConsiderations,
  recordGoalBlocked,
  recordGoalStepTaken,
  settleGoal,
} from "./people-goal-pursuit";
import { ensureOwnTies } from "./people-own-ties";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordEventKnowledge } from "./records";
import { recordRelationshipMoment } from "./relationship-integration";
import { readRelationshipStanding } from "./relationship-standing";
import { recordWorldEvent, writeWithWorldIntegrityOnce } from "./world";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  GoalStateRecord,
  IsoDate,
  World,
} from "./types";

/**
 * People pursue their own goals while time passes (living play, 1A).
 *
 * Once a week on the shared clock, everybody the played life can actually run
 * into — the residents written out in their town, and the people connected to
 * them wherever they live — may take zero or one real step toward a private
 * goal of theirs. A step goes through a writer the world already has: an
 * application to an opening the job market actually listed, a call to
 * somebody they actually know. It never creates the job, the person or the
 * answer. When no step is possible the reason is recorded, once, as a fact;
 * when a goal is finished or set aside that is recorded too, with the reason,
 * and its history stays.
 *
 * This is a review, not a second goal engine. Goals stay in the one
 * `GoalStateRecord` history; `people-goal-pursuit.ts` reads and writes them.
 * People nobody in the played life can meet are not reviewed, because nothing
 * about them is written out to act on; they resolve when they are.
 *
 * Nothing here runs on a read. The review is a due item on the clock, so a
 * screen opened twice, or a save reloaded, writes nothing.
 */

const REVIEW_KEY_PREFIX = "people-goal-review:";

/** Schedules the first weekly review for a played life. Idempotent. */
export function ensurePeopleGoalReview(world: World): World {
  if (world.control.kind !== "person") return world;
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === GOAL_REVIEW_TRANSITION_KEY,
    )
  ) {
    return world;
  }
  return scheduleFutureDueItem(world, {
    stableKey: `${REVIEW_KEY_PREFIX}0`,
    dueAt: addDays(world.currentDate, PACE.reviewIntervalDays),
    transitionKey: GOAL_REVIEW_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: GOAL_PURSUIT_VERSION },
  });
}

export function peopleGoalReviewHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== GOAL_REVIEW_TRANSITION_KEY) {
    throw new Error("The goal review received another transition.");
  }
  const index = Number(dueItem.stableKey.slice(REVIEW_KEY_PREFIX.length));
  const reviewed = reviewPeopleGoals(world);
  const next = scheduleFutureDueItem(reviewed.world, {
    stableKey: `${REVIEW_KEY_PREFIX}${index + 1}`,
    dueAt: reviewed.nextReviewAt,
    transitionKey: GOAL_REVIEW_TRANSITION_KEY,
    entityIds: [reviewed.world.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [reviewed.world.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "people:goals-reviewed",
    context: null,
    outcomeEventId: null,
  };
}

// Built without createFutureTransitionHandlerRegistry, for the same import
// cycle reason as PEOPLE_CONTACT_HANDLERS.
export const PEOPLE_GOAL_HANDLERS: FutureTransitionHandlerRegistry = {
  get: (transitionKey) =>
    transitionKey === GOAL_REVIEW_TRANSITION_KEY
      ? peopleGoalReviewHandler
      : undefined,
};

/* -------------------------------------------------------------------------- */
/* Who is reviewed                                                            */
/* -------------------------------------------------------------------------- */

function adultAlive(world: World, personId: EntityId, dead: Set<EntityId>) {
  const person = world.people[personId];
  return (
    !!person &&
    !dead.has(personId) &&
    ageOnDate(person.birthDate, world.currentDate) >= 18
  );
}

/**
 * Everybody the played life can run into: residents written out in the
 * played person's town, and anybody connected to the played person by home,
 * family or a recorded interaction. Sorted, so the week's order is the same
 * on every load. The played person is never reviewed; their goals are theirs.
 */
export function pursuitCandidates(world: World): readonly EntityId[] {
  if (world.control.kind !== "person") return [];
  const anchorId = world.control.personId;
  const anchor = world.people[anchorId];
  if (!anchor) return [];
  const dead = new Set(
    world.history.personDeaths
      .filter((death) => death.diedAt <= world.currentDate)
      .map((death) => death.personId),
  );
  const connected = connectedTo(world, anchorId);
  return (Object.keys(world.people) as EntityId[])
    .filter(
      (id) =>
        id !== anchorId &&
        adultAlive(world, id, dead) &&
        (world.people[id]!.homeJurisdictionId === anchor.homeJurisdictionId ||
          connected.has(id)),
    )
    .sort();
}

function connectedTo(world: World, personId: EntityId): Set<EntityId> {
  const cutoff = currentLifeCutoff(world);
  const found = new Set<EntityId>();
  const homes = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  for (const record of world.history.householdMemberships) {
    if (homes.has(record.householdId)) found.add(record.personId);
  }
  for (const kin of kinshipRelationshipsAt(world, personId, cutoff)) {
    for (const id of kin.personIds) found.add(id);
  }
  for (const interaction of world.history.relationshipInteractions) {
    const [a, b] = interaction.personIds;
    if (a === personId && b) found.add(b);
    else if (b === personId && a) found.add(a);
  }
  found.delete(personId);
  return found;
}

/** The latest state of every goal each candidate holds, in one pass. */
function goalsByPerson(
  world: World,
  candidates: ReadonlySet<EntityId>,
): Map<EntityId, Map<EntityId, GoalStateRecord>> {
  const byPerson = new Map<EntityId, Map<EntityId, GoalStateRecord>>();
  for (const record of world.history.goalStates) {
    if (!candidates.has(record.personId)) continue;
    const goals = byPerson.get(record.personId) ?? new Map();
    goals.set(record.goalId, record);
    byPerson.set(record.personId, goals);
  }
  return byPerson;
}

/* -------------------------------------------------------------------------- */
/* The review                                                                 */
/* -------------------------------------------------------------------------- */

const PRIORITY_ORDER: Readonly<Record<GoalStateRecord["priority"], number>> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

export interface GoalReviewResult {
  readonly world: World;
  /** When the next review is due: a week on, or sooner for a waiting answer. */
  readonly nextReviewAt: IsoDate;
}

/**
 * One week's review. For each candidate, in a fixed order: a livelihood goal
 * forms if their work has just ended; then their active goals are looked at,
 * most pressing first, until one of them takes a step. A goal that cannot is
 * blocked for its recorded reason. At most one step per person.
 */
export function reviewPeopleGoals(world: World): GoalReviewResult {
  // A cold review initializes several histories for each candidate. Batch the
  // canonical writers, then validate their complete result before returning it.
  let nextReviewAt = addDays(world.currentDate, PACE.reviewIntervalDays);
  const reviewedWorld = writeWithWorldIntegrityOnce(world, () => {
    const result = reviewPeopleGoalsUnchecked(world);
    nextReviewAt = result.nextReviewAt;
    return result.world;
  });
  return { world: reviewedWorld, nextReviewAt };
}

function reviewPeopleGoalsUnchecked(world: World): GoalReviewResult {
  const weekOn = addDays(world.currentDate, PACE.reviewIntervalDays);
  let nextReviewAt = weekOn;
  const soonest = (date: IsoDate | null) => {
    if (date && date > world.currentDate && date < nextReviewAt) {
      nextReviewAt = date;
    }
  };
  const candidates = pursuitCandidates(world);
  let next = world;
  // People in the played life who were written out after the world was built
  // never received the ordinary-life preferences and goal every generated
  // person is given (`life-personality.ts`). They resolve here, once, the first
  // time the played life reaches them. Residents the played life has no tie
  // to stay light: they act only on circumstances, such as losing work.
  if (next.control.kind === "person") {
    const anchorId = next.control.personId;
    const tied = new Set([
      ...connectedTo(next, anchorId),
      ...coworkersOf(next, anchorId),
    ]);
    for (const personId of candidates) {
      if (!tied.has(personId)) continue;
      try {
        next = establishLifePersonality(next, personId);
      } catch {
        // Somebody who cannot hold the records yet is left as they are.
      }
      // And, once, a few people of their own to keep up with besides the
      // played person.
      try {
        next = ensureOwnTies(next, personId, anchorId);
      } catch {
        // Somebody whose town cannot be read keeps the ties they had.
      }
    }
  }
  for (const personId of candidates) {
    try {
      next = formLivelihoodGoal(next, personId);
    } catch {
      // A circumstance that cannot be read writes nothing; the week goes on.
    }
  }
  const index = goalsByPerson(next, new Set(candidates));
  for (const personId of candidates) {
    const goals = [...(index.get(personId)?.values() ?? [])]
      .filter(
        (goal) =>
          goal.status === "active" && pursuitFamilyOf(goal.goalKey) !== null,
      )
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.goalKey.localeCompare(b.goalKey),
      );
    for (const goal of goals) {
      let outcome: PursuitOutcome;
      try {
        outcome = pursue(next, goal);
      } catch {
        continue;
      }
      next = outcome.world;
      soonest(outcome.dueAgainAt ?? null);
      if (outcome.kind === "step") break;
    }
  }
  return { world: next, nextReviewAt };
}

type PursuitOutcome = {
  readonly kind: "step" | "blocked" | "waiting" | "settled";
  readonly world: World;
  readonly dueAgainAt?: IsoDate | null;
};

function pursue(world: World, goal: GoalStateRecord): PursuitOutcome {
  switch (pursuitFamilyOf(goal.goalKey)) {
    case "livelihood":
      return pursueLivelihood(world, goal);
    case "connection":
      return pursueCall(world, goal, "connection");
    case "learning":
      return pursueCall(world, goal, "learning");
    default:
      // Privacy is pursued by protecting time: it weighs on answers others
      // ask for (see `answerCall` and `npcContactAnswer`), never as an
      // action of its own.
      return { kind: "waiting", world };
  }
}

function blocked(
  world: World,
  goal: GoalStateRecord,
  key: GoalBlockerKey,
): PursuitOutcome {
  return {
    kind: "blocked",
    world: recordGoalBlocked(world, {
      goal,
      blockerKey: key,
      reason: GOAL_BLOCKER_REASONS[key],
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Livelihood: an actual opening, the employer's answer, a start              */
/* -------------------------------------------------------------------------- */

function paidWork(world: World, personId: EntityId) {
  return world.history.workRelationships.filter(
    (relationship) =>
      relationship.personId === personId &&
      relationship.compensation === "paid",
  );
}

/**
 * Somebody whose paid work has just ended, who is of working age, holds no
 * other paid work and is not studying, starts looking for work. Their own
 * circumstance is the only reason; nobody is assigned a search.
 */
function formLivelihoodGoal(world: World, personId: EntityId): World {
  const person = world.people[personId]!;
  const age = ageOnDate(person.birthDate, world.currentDate);
  if (age < PACE.workingAge.minimum || age > PACE.workingAge.maximum) {
    return world;
  }
  const work = paidWork(world, personId);
  if (work.length === 0) return world;
  const cutoff = currentLifeCutoff(world);
  let ended: {
    statusId: EntityId;
    effectiveAt: IsoDate;
    reason: string;
  } | null = null;
  for (const relationship of work) {
    const status = workStatusAt(world, relationship.id, cutoff);
    if (!status) continue;
    if (status.status === "active") return world;
    if (status.status !== "ended") continue;
    if (
      daysBetween(status.effectiveAt, world.currentDate) >
      PACE.workEndedWithinDays
    ) {
      continue;
    }
    if (!ended || status.effectiveAt > ended.effectiveAt) {
      ended = {
        statusId: status.id,
        effectiveAt: status.effectiveAt,
        reason: status.reason ?? "Their work ended.",
      };
    }
  }
  if (!ended) return world;
  if (activeEducationEnrollmentsAt(world, personId, cutoff).length > 0) {
    return world;
  }
  const searches = world.history.goalStates.filter(
    (record) =>
      record.personId === personId &&
      pursuitFamilyOf(record.goalKey) === "livelihood",
  );
  // One search per ending: a search already begun after this ending, active
  // or finished, is the answer to it.
  if (searches.some((record) => record.createdAt >= ended!.effectiveAt)) {
    return world;
  }
  if (searches.some((record) => record.status === "active")) return world;
  const goalKey =
    searches.length === 0
      ? LIVELIHOOD_GOAL_KEY
      : `${LIVELIHOOD_GOAL_KEY}:${ended.effectiveAt}`;
  return recordGoalState(world, {
    stableKey: `${GOAL_PURSUIT_VERSION}:livelihood:${personId}:${ended.statusId}`,
    personId,
    goalKey,
    recordedAt: world.currentDate,
    objective: "Find paid work",
    domain: LIVELIHOOD_GOAL_DOMAIN,
    scope: "personal",
    priority: "high",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("reflection", {
      note: `Their work ended on ${ended.effectiveAt}: ${ended.reason}`,
      sourceRefs: [
        {
          kind: "life-history",
          reference: { family: "work-status", recordId: ended.statusId },
        },
      ],
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

function pursueLivelihood(world: World, goal: GoalStateRecord): PursuitOutcome {
  const personId = goal.personId;
  const cutoff = currentLifeCutoff(world);
  // Work found by any route finishes the search.
  const holding = paidWork(world, personId).find(
    (relationship) =>
      relationship.startedAt >= goal.createdAt &&
      workStatusAt(world, relationship.id, cutoff)?.status === "active",
  );
  if (holding) {
    const employer = holding.organizationId
      ? employerDisplayName(world, holding.organizationId)
      : "new work";
    return {
      kind: "settled",
      world: settleGoal(world, {
        goal,
        status: "completed",
        reasonKey: "found-work",
        reason: `Started work at ${employer}.`,
      }),
    };
  }

  // The employer's side of anything already sent, as the player's is.
  let next = advanceApplications(world, personId);
  const pending = applicationsFor(next, personId).filter((application) => {
    const latest = latestApplicationStep(next, application.id)?.kind;
    return (
      latest === undefined ||
      latest === "offered" ||
      latest === "accepted" ||
      latest === "followed-up"
    );
  });
  for (const application of pending) {
    const latest = latestApplicationStep(next, application.id);
    if (!latest) {
      return {
        kind: "waiting",
        world: next,
        dueAgainAt: application.decisionAt,
      };
    }
    if (latest.kind === "offered") {
      const decided = decideOnOffer(next, goal, application.id);
      if (decided.accept === null)
        return { kind: "waiting", world: decided.world };
      const answered = answerJobOfferAsResident(
        decided.world,
        application.id,
        decided.accept,
        decided.world.history.decisionTraces.at(-1)?.id,
      );
      if (!answered.ok) continue;
      next = answered.world;
      const step = latestApplicationStep(next, application.id)!;
      if (!step.eventId) return { kind: "waiting", world: next };
      next = stepTaken(next, goal, step.eventId);
      next = tellHousehold(
        next,
        personId,
        step.eventId,
        step.kind === "accepted"
          ? `${personName(next.people[personId]!)} said they took a job at ${employerDisplayName(next, jobOpening(next, application.openingId)!.organizationId)}.`
          : null,
      );
      return {
        kind: "step",
        world: next,
        dueAgainAt: expectedStart(next, application.id),
      };
    }
    // Accepted, or asked to come in again: start on the day.
    const startAt = expectedStart(next, application.id);
    if (startAt && next.currentDate >= startAt) {
      const started = startJobAsResident(next, application.id);
      if (!started.ok) continue;
      const step = latestApplicationStep(started.world, application.id)!;
      next = settleGoal(started.world, {
        goal,
        status: "completed",
        reasonKey: "found-work",
        reason:
          (step.eventId && eventById(started.world, step.eventId)?.summary) ??
          "Started work.",
        eventId: step.eventId,
      });
      return { kind: "step", world: next };
    }
    return { kind: "waiting", world: next, dueAgainAt: startAt };
  }

  // Nothing waiting on an answer: look at what is actually listed.
  const listed = openJobListings(next, personId);
  if (listed.length === 0) return blocked(next, goal, "no-listed-opening");
  const open = listed.filter(
    (opening) =>
      residentApplicationBlocked(next, personId, opening.id) === null,
  );
  if (open.length === 0) return blocked(next, goal, "applied-to-every-opening");
  // Somebody they know who works there can put them forward; otherwise the
  // opening that closes soonest. An explicit rule, not a list position.
  const withIntroducer = open
    .map((opening) => ({
      opening,
      introducer: introducersFor(next, personId, opening.id)[0] ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.introducer !== null) - Number(a.introducer !== null) ||
        a.opening.closesAt.localeCompare(b.opening.closesAt) ||
        a.opening.id.localeCompare(b.opening.id),
    );
  const choice = withIntroducer[0]!;
  const applied = applyForJobAsResident(
    next,
    personId,
    choice.opening.id,
    choice.introducer,
  );
  if (!applied.ok) return blocked(next, goal, "applied-to-every-opening");
  next = applied.world;
  const application = applicationsFor(next, personId).at(-1)!;
  const eventId = next.history.events.at(-1)!.id;
  next = stepTaken(next, goal, eventId);
  next = tellHousehold(
    next,
    personId,
    eventId,
    `${personName(next.people[personId]!)} said they applied to ${employerDisplayName(next, choice.opening.organizationId)} for the ${choice.opening.title.toLowerCase()} opening.`,
  );
  return { kind: "step", world: next, dueAgainAt: application.decisionAt };
}

function decideOnOffer(
  world: World,
  goal: GoalStateRecord,
  applicationId: EntityId,
): { world: World; accept: boolean | null } {
  const personId = goal.personId;
  const withTraits = ensurePeopleTraits(world, [personId]);
  const key = `goal-offer:${applicationId}`;
  const considerations: DecisionConsideration[] = [
    ...goalConsiderations(withTraits, personId, key, [
      {
        optionKey: "accept",
        goalKey: goal.goalKey,
        direction: "supports",
        explanation: "They have been looking for work.",
      },
    ]),
    ...traitConsiderations(withTraits, personId, key, [
      {
        optionKey: "hold-out",
        trait: "risk",
        pole: "high",
        explanation: "They would chance waiting for something better.",
      },
    ]),
  ];
  const evaluation = evaluateDecision(withTraits, {
    stableKey: key,
    decisionType: "people.job-offer-answer",
    actorPersonId: personId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "job-offer",
      entityId: applicationId,
    },
    options: [
      { key: "accept", label: "Take it", description: "Accept the offer." },
      {
        key: "hold-out",
        label: "Turn it down",
        description: "Keep looking instead.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return {
    world: isSelectedDecision(evaluation)
      ? recordDurableDecisionTrace(withTraits, evaluation)
      : withTraits,
    accept:
      evaluation.outcomeKind === "selected" &&
      evaluation.selectedOptionKey !== null
        ? evaluation.selectedOptionKey === "accept"
        : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Connection and learning: a call to somebody they actually know             */
/* -------------------------------------------------------------------------- */

const CALL_EVENT = "life.goal-call";
const CALL_DECLINED_EVENT = "life.goal-call-declined";
const CALL_TAG = "goal-call.v1";

interface KnownPerson {
  readonly personId: EntityId;
  readonly lastContactOn: IsoDate | null;
}

/**
 * The people this person actually knows: home, family, and anybody they have
 * a recorded interaction with. The played person is left out: somebody
 * getting back in touch with the player already happens through
 * `produceReachingOut`, which the player answers themselves.
 */
function peopleTheyKnow(
  world: World,
  personId: EntityId,
  anchorId: EntityId,
): readonly KnownPerson[] {
  const dead = new Set(
    world.history.personDeaths
      .filter((death) => death.diedAt <= world.currentDate)
      .map((death) => death.personId),
  );
  const known = new Map<EntityId, IsoDate | null>();
  for (const id of connectedTo(world, personId)) known.set(id, null);
  for (const id of coworkersOf(world, personId)) known.set(id, null);
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    const other = interaction.personIds.find((id) => id !== personId);
    if (!other) continue;
    const seen = known.get(other) ?? null;
    if (!seen || seen < interaction.occurredAt) {
      known.set(other, interaction.occurredAt);
    }
  }
  // Nobody phones the person they live with to keep up with them.
  const cutoff = currentLifeCutoff(world);
  const homes = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  const housemates = new Set(
    world.history.householdMemberships
      .filter((record) => homes.has(record.householdId))
      .map((record) => record.personId),
  );
  return [...known.entries()]
    .filter(
      ([id]) =>
        id !== anchorId && !housemates.has(id) && adultAlive(world, id, dead),
    )
    .map(([id, lastContactOn]) => ({ personId: id, lastContactOn }))
    .sort((a, b) => a.personId.localeCompare(b.personId));
}

/** People who work where this person works now. */
function coworkersOf(world: World, personId: EntityId): readonly EntityId[] {
  const cutoff = currentLifeCutoff(world);
  const active = (relationshipId: EntityId) =>
    workStatusAt(world, relationshipId, cutoff)?.status === "active";
  const employers = new Set(
    world.history.workRelationships
      .filter(
        (relationship) =>
          relationship.personId === personId &&
          relationship.organizationId !== null &&
          active(relationship.id),
      )
      .map((relationship) => relationship.organizationId),
  );
  if (employers.size === 0) return [];
  return world.history.workRelationships
    .filter(
      (relationship) =>
        relationship.personId !== personId &&
        employers.has(relationship.organizationId) &&
        active(relationship.id),
    )
    .map((relationship) => relationship.personId);
}

function callsBetween(world: World, from: EntityId, to: EntityId) {
  return world.history.events.filter(
    (event) =>
      (event.type === CALL_EVENT || event.type === CALL_DECLINED_EVENT) &&
      event.tags.includes(CALL_TAG) &&
      event.participants.some(
        (entry) =>
          entry.personId === from && entry.role === "agency:participant",
      ) &&
      event.involvedEntityIds.includes(to),
  );
}

function lastStepAt(world: World, goal: GoalStateRecord): IsoDate | null {
  return (
    world.history.goalStates
      .filter(
        (record) =>
          record.goalId === goal.goalId &&
          record.stableKey.startsWith("goal-step:"),
      )
      .at(-1)?.recordedAt ?? null
  );
}

function teaches(world: World, personId: EntityId): boolean {
  const cutoff = currentLifeCutoff(world);
  return world.history.workRelationships.some((relationship) => {
    if (relationship.personId !== personId || !relationship.organizationId) {
      return false;
    }
    if (workStatusAt(world, relationship.id, cutoff)?.status !== "active") {
      return false;
    }
    const classification =
      organizationProfileAt(world, relationship.organizationId, cutoff)
        ?.classification ?? "";
    return TEACHING_CLASSIFICATION_PREFIXES.some((prefix) =>
      classification.startsWith(prefix),
    );
  });
}

function pursueCall(
  world: World,
  goal: GoalStateRecord,
  purpose: "connection" | "learning",
): PursuitOutcome {
  if (world.control.kind !== "person") return { kind: "waiting", world };
  const personId = goal.personId;
  const last = lastStepAt(world, goal);
  if (
    last &&
    daysBetween(last, world.currentDate) < PACE.daysBetweenDiscretionarySteps
  ) {
    return { kind: "waiting", world };
  }
  const known = peopleTheyKnow(world, personId, world.control.personId);
  const reachable = known.filter((entry) => {
    if (purpose === "learning" && !teaches(world, entry.personId)) return false;
    const calls = callsBetween(world, personId, entry.personId);
    const declines = calls.filter(
      (event) => event.type === CALL_DECLINED_EVENT,
    ).length;
    if (declines >= PACE.declinesBeforeTheyStopCalling) return false;
    const lastCall = calls.at(-1)?.occurredAt;
    return (
      !lastCall ||
      daysBetween(lastCall, world.currentDate) >= PACE.samePersonCallSpacingDays
    );
  });
  if (reachable.length === 0) {
    const everyone = known.filter(
      (entry) => purpose !== "learning" || teaches(world, entry.personId),
    );
    if (everyone.length > 0) return { kind: "waiting", world };
    if (purpose === "learning") return learningHasNoRoute(world, goal);
    return blocked(world, goal, "knows-nobody-to-call");
  }
  // Whether to do it this week is theirs to decide.
  const withTraits = ensurePeopleTraits(world, [personId]);
  if (!decidesToAct(withTraits, goal, purpose)) {
    return { kind: "waiting", world: withTraits };
  }
  // Keeping up with people means the one they have gone longest without.
  const target = [...reachable].sort(
    (a, b) =>
      (a.lastContactOn ?? "").localeCompare(b.lastContactOn ?? "") ||
      a.personId.localeCompare(b.personId),
  )[0]!;
  const call = placeCall(withTraits, personId, target.personId, purpose);
  if (call.eventId === null) return { kind: "waiting", world: call.world };
  return {
    kind: "step",
    world: stepTaken(call.world, goal, call.eventId),
  };
}

/**
 * A learning goal with no route at all is set aside once it has been blocked
 * for that reason long enough. That blocker is the "impossible prerequisite
 * under the current plan" the research names; nothing else is abandoned on a
 * count, and the goal's history stays.
 */
function learningHasNoRoute(
  world: World,
  goal: GoalStateRecord,
): PursuitOutcome {
  const latest = world.history.goalStates
    .filter((record) => record.goalId === goal.goalId)
    .at(-1)!;
  if (goalBlockerOf(latest) === "no-route-to-learn") {
    if (
      daysBetween(latest.recordedAt, world.currentDate) >=
      PACE.learningBlockedDaysBeforeSettingAside
    ) {
      return setLearningAside(world, goal);
    }
    return { kind: "blocked", world };
  }
  return blocked(world, goal, "no-route-to-learn");
}

/**
 * Setting learning aside. The research on disengagement is that letting go of
 * an unreachable goal usually goes with taking up another; the one adjacent
 * aim a person here can act on is the people around them, since that is also
 * how somebody finds a teacher. Somebody already keeping up with people just
 * lets learning go. Either way the learning goal's history stays, and a
 * replacement names the goal it replaced.
 */
function setLearningAside(world: World, goal: GoalStateRecord): PursuitOutcome {
  const reason =
    "Set it aside: no class was open to them, and nobody they knew taught.";
  const holdsConnection = world.history.goalStates.some(
    (record) =>
      record.personId === goal.personId &&
      record.goalKey === CONNECTION_GOAL_KEY,
  );
  if (holdsConnection) {
    return {
      kind: "settled",
      world: settleGoal(world, {
        goal,
        status: "abandoned",
        reasonKey: "no-route-to-learn",
        reason,
      }),
    };
  }
  const superseded = settleGoal(world, {
    goal,
    status: "superseded",
    reasonKey: "no-route-to-learn",
    reason: `${reason} They turned to the people around them instead.`,
  });
  return {
    kind: "settled",
    world: recordGoalState(superseded, {
      stableKey: `${GOAL_PURSUIT_VERSION}:replaces:${goal.goalId}`,
      personId: goal.personId,
      goalKey: CONNECTION_GOAL_KEY,
      recordedAt: superseded.currentDate,
      objective: ORDINARY_LIFE_GOALS.connection,
      domain: goal.domain,
      scope: goal.scope,
      priority: goal.priority,
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: createMindProvenance("reflection", {
        note: "Took up in place of a learning goal that had no route.",
        sourceRefs: [
          {
            kind: "goal-state",
            goalStateId: superseded.history.goalStates.at(-1)!.id,
          },
        ],
      }),
      replacesGoalId: goal.goalId,
      supersedesGoalStateId: null,
    }),
  };
}

function decidesToAct(
  world: World,
  goal: GoalStateRecord,
  purpose: "connection" | "learning",
): boolean {
  const personId = goal.personId;
  const key = `goal-act:${goal.goalId}:${world.currentDate}`;
  const considerations: DecisionConsideration[] = [
    ...goalConsiderations(world, personId, key, [
      {
        optionKey: "act",
        goalKey: goal.goalKey,
        direction: "supports",
        explanation:
          purpose === "connection"
            ? "They have been meaning to keep up with people."
            : "They have been meaning to learn something.",
      },
    ]),
    ...traitConsiderations(world, personId, key, [
      purpose === "connection"
        ? {
            optionKey: "act",
            trait: "sociability",
            pole: "high",
            explanation: "They are the one who picks up the phone.",
          }
        : {
            optionKey: "act",
            trait: "reliability",
            pole: "high",
            explanation: "They follow through on what they meant to do.",
          },
      purpose === "connection"
        ? {
            optionKey: "not-this-week",
            trait: "sociability",
            pole: "low",
            explanation: "They wait to be called.",
          }
        : {
            optionKey: "not-this-week",
            trait: "reliability",
            pole: "low",
            explanation: "They let it slide another week.",
          },
    ]),
    {
      stableKey: `${key}:quiet-week`,
      optionKey: "not-this-week",
      sourceType: "context:quiet-week",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "Nothing presses this week.",
      sourceRefs: [],
    },
  ];
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "people.goal-step",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: goal.goalKey, entityId: null },
    options: [
      { key: "act", label: "Do it now", description: "Take a step this week." },
      {
        key: "not-this-week",
        label: "Not this week",
        description: "Leave it for now.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return (
    isSelectedDecision(evaluation) && evaluation.selectedOptionKey === "act"
  );
}

const BAND_IMPORTANCE: Readonly<Record<string, DecisionImportance>> = {
  slight: "slight",
  marked: "moderate",
  strong: "strong",
};

/**
 * Whether the person called picks up and talks, decided from their side:
 * how they stand with the caller, their own goals, and who they are.
 */
function answerCall(
  world: World,
  callerId: EntityId,
  calledId: EntityId,
  key: string,
): { world: World; talk: boolean | null } {
  const withTraits = ensurePeopleTraits(world, [calledId]);
  const considerations: DecisionConsideration[] = [
    {
      stableKey: `${key}:known`,
      optionKey: "talk",
      sourceType: "context:known-caller",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "It is somebody they know.",
      sourceRefs: [],
    },
  ];
  const standing = readRelationshipStanding(withTraits, calledId, callerId);
  const warmth = standing.readings.warmth;
  if (warmth.band !== "none") {
    considerations.push({
      stableKey: `${key}:warmth`,
      optionKey: warmth.adverse ? "not-now" : "talk",
      sourceType: "social:warmth",
      direction: "supports",
      importance: BAND_IMPORTANCE[warmth.band] ?? "slight",
      confidence: "high",
      explanation: warmth.adverse
        ? "They have not much wanted this person's company."
        : "They are glad of this person's company.",
      sourceRefs: warmth.basis.slice(-2).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  }
  const tension = standing.readings.tension;
  if (tension.band !== "none") {
    considerations.push({
      stableKey: `${key}:tension`,
      optionKey: "not-now",
      sourceType: "social:tension",
      direction: "supports",
      importance: BAND_IMPORTANCE[tension.band] ?? "slight",
      confidence: "high",
      explanation: "Something between them has not been settled.",
      sourceRefs: tension.basis.slice(-2).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  }
  considerations.push(
    ...goalConsiderations(withTraits, calledId, key, [
      {
        optionKey: "not-now",
        goalKey: PRIVACY_GOAL_KEY,
        direction: "supports",
        explanation: "They have been keeping time for themselves.",
      },
      {
        optionKey: "talk",
        goalKey: CONNECTION_GOAL_KEY,
        direction: "supports",
        explanation: "They have been meaning to keep up with people.",
      },
    ]),
    ...traitConsiderations(withTraits, calledId, key, [
      {
        optionKey: "talk",
        trait: "sociability",
        pole: "high",
        explanation: "They are glad of a call.",
      },
      {
        optionKey: "not-now",
        trait: "sociability",
        pole: "low",
        explanation: "They let calls go.",
      },
    ]),
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `${key}:answer`,
    decisionType: "people.call-answer",
    actorPersonId: calledId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "call", entityId: null },
    options: [
      { key: "talk", label: "Talk", description: "Pick up and talk." },
      {
        key: "not-now",
        label: "Not now",
        description: "Say it is not a good time.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return {
    world: withTraits,
    talk: isSelectedDecision(evaluation)
      ? evaluation.selectedOptionKey === "talk"
      : null,
  };
}

function placeCall(
  world: World,
  callerId: EntityId,
  calledId: EntityId,
  purpose: "connection" | "learning",
): { world: World; eventId: EntityId | null } {
  const key = `goal-call:${callerId}:${calledId}:${world.currentDate}`;
  const caller = world.people[callerId]!;
  const called = world.people[calledId]!;
  const callerName = personName(caller);
  const calledName = personName(called);
  const answered = answerCall(world, callerId, calledId, key);
  if (answered.talk === null) return { world: answered.world, eventId: null };
  const about =
    purpose === "learning" ? "to ask about learning something" : "to catch up";
  if (!answered.talk) {
    const next = recordWorldEvent(answered.world, {
      stableKey: `${key}:declined`,
      type: CALL_DECLINED_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: caller.homeJurisdictionId,
      involvedEntityIds: [callerId, calledId],
      participants: [
        { personId: callerId, role: "agency:participant", detail: "Called" },
        { personId: calledId, role: "focus:asked-of", detail: "Was called" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [CALL_TAG, `goal-call.purpose:${purpose}`],
      summary: `${callerName} called ${calledName} ${about}; ${called.givenName} said it was not a good time.`,
      context: {
        location: null,
        socialContext: "A phone call.",
        pressure: null,
        choice: null,
        motivation: about,
        immediateReaction: null,
      },
    });
    return { world: next, eventId: next.history.events.at(-1)!.id };
  }
  const moment = recordRelationshipMoment(answered.world, {
    stableKey: key,
    personIds: [callerId, calledId],
    occurredAt: world.currentDate,
    eventType: CALL_EVENT,
    jurisdictionId: caller.homeJurisdictionId,
    visibility: "private",
    interactionKind:
      purpose === "learning"
        ? "contact:asked-about-learning"
        : "contact:catch-up-call",
    // Routine contact keeps a relationship up and builds nothing by itself.
    change: "maintained",
    significance: "minor",
    summary:
      purpose === "learning"
        ? `${callerName} called ${calledName} to ask about learning something.`
        : `${callerName} called ${calledName} to catch up.`,
    tags: [CALL_TAG, `goal-call.purpose:${purpose}`],
    context: {
      location: null,
      socialContext: "A phone call.",
      pressure: null,
      choice: null,
      motivation: about,
      immediateReaction: null,
    },
    subjective: [],
    timeUse: null,
  });
  return { world: moment.world, eventId: moment.eventId };
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

function stepTaken(
  world: World,
  goal: GoalStateRecord,
  eventId: EntityId,
): World {
  return recordGoalStepTaken(world, {
    personId: goal.personId,
    goalKey: goal.goalKey,
    eventId,
  });
}

/**
 * What somebody tells the people at home or in the family, the ordinary way
 * the played person learns what a relative or housemate is up to. Only the
 * step is told — "they applied there" — never the goal behind it.
 */
function tellHousehold(
  world: World,
  personId: EntityId,
  eventId: EntityId,
  said: string | null,
): World {
  if (!said || world.control.kind !== "person") return world;
  const anchorId = world.control.personId;
  if (!connectedByHomeOrFamily(world, anchorId, personId)) return world;
  return recordEventKnowledge(world, {
    stableKey: `goal-told:${eventId}:${anchorId}`,
    personId: anchorId,
    eventId,
    learnedAt: world.currentDate,
    believedSummary: said,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: personId, claimId: null },
  });
}

function connectedByHomeOrFamily(
  world: World,
  anchorId: EntityId,
  personId: EntityId,
): boolean {
  const cutoff = currentLifeCutoff(world);
  const homes = new Set(
    householdMembershipsAt(world, anchorId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  if (
    householdMembershipsAt(world, personId, cutoff).some((entry) =>
      homes.has(entry.household.id),
    )
  ) {
    return true;
  }
  return kinshipRelationshipsAt(world, anchorId, cutoff).some((kin) =>
    kin.personIds.includes(personId),
  );
}
