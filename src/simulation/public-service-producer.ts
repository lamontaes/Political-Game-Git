import {
  addDays,
  addSimulationMinutes,
  ageOnDate,
  simulationMomentAtLocalTime,
} from "./dates";
import {
  considerationScore,
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { scheduleFutureDueItem } from "./future-transitions";
import { hasStableKey, recordById, recordByStableKey } from "./history-index";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  careResponsibilityStateHistory,
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
  organizationProfileAt,
} from "./life-queries";
import {
  CONNECTION_GOAL_KEY,
  LEARNING_GOAL_KEY,
  LIVELIHOOD_GOAL_KEY,
  PRIVACY_GOAL_KEY,
} from "./people-goal-pursuit-content";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import {
  activeHealthEpisodes,
  latestHealthState,
} from "./crisis/health-queries";
import { publicProgramRecords } from "./public-program-integrity";
import {
  livesInServiceArea,
  requestPublicService,
  eligibleServiceOperator,
  serviceAuthorityForCommitment,
} from "./public-service-requests";
import {
  cancelScheduledActivity,
  completeResidentScheduledActivity,
  scheduledActivityState,
  scheduledConflictExists,
} from "./time-work";
import { writeWithWorldIntegrityOnce } from "./world";
import {
  SERVICE_REQUEST_FORMS,
  type ServiceRequestForm,
} from "./law-consequences/service-delivered-data";
import type {
  DecisionConsideration,
  DecisionContext,
  DecisionImportance,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  GoalStateRecord,
  MindSourceReference,
  PublicProgramCommitmentRecord,
  World,
} from "./types";

/**
 * Residents asking for a funded public service, on the day it is paid.
 *
 * A posted operating installment under a service law with a request form
 * puts one due item on the clock for the next day. On that day every adult
 * whose recorded home is in the served place weighs asking, through the
 * shared decision engine, from their own saved records only: a job or
 * classes to get to, children living at home, their own goals, the hours
 * their work already holds. Nothing is drawn. A person with no record that
 * bears on the service is not asked about it; a person whose reasons for and
 * against weigh exactly the same stays undecided; every weighed decision is
 * saved as a trace. A person who asks goes through `requestPublicService`,
 * the one request path, and a second due item settles the visit after its
 * end: a resident who is still alive and still lives in the served place
 * takes part, and the completion records delivery through the shared
 * completed-activity dispatch. Asking is not delivery, and neither is
 * payment.
 *
 * The scan of residents happens once per paid installment, never daily.
 */

export const PUBLIC_SERVICE_RESIDENT_REQUESTS =
  "public-service:resident-requests";
export const PUBLIC_SERVICE_ATTENDANCE = "public-service:attendance";
const REQUESTS_SUFFIX = ":resident-requests";
const ATTENDANCE_SUFFIX = ":attendance";
const ADULT_AGE = 18;

/** The request form of the service law behind this commitment, if any. */
export function serviceRequestFormForCommitment(
  world: World,
  commitment: PublicProgramCommitmentRecord,
): ServiceRequestForm | null {
  const operatorId = commitment.recipientOrganizationId;
  if (!operatorId) return null;
  const served = serviceAuthorityForCommitment(
    world,
    commitment,
    world.currentDate,
  );
  return served && eligibleServiceOperator(world, served, operatorId)
    ? (SERVICE_REQUEST_FORMS[served.questionKey] ?? null)
    : null;
}

/**
 * Called when an operating installment posts. Puts residents' requests on
 * the clock for the next day, once per installment, only for a service law
 * whose form a resident can ask for.
 */
export function scheduleResidentServiceRequests(
  world: World,
  commitment: PublicProgramCommitmentRecord,
  installmentIndex: number,
  accountOrganizationId: EntityId,
): World {
  if (commitment.installments[installmentIndex]?.purpose !== "operating")
    return world;
  const form = serviceRequestFormForCommitment(world, commitment);
  if (!form) return world;
  const stableKey = `${commitment.stableKey}:installment:${installmentIndex}${REQUESTS_SUFFIX}`;
  if (hasStableKey(world.history.futureDueItems, stableKey)) return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: PUBLIC_SERVICE_RESIDENT_REQUESTS,
    entityIds: [accountOrganizationId],
    jurisdictionId: commitment.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [commitment.eventId] },
  });
}

export interface ResidentServiceRequestTally {
  readonly asked: readonly EntityId[];
  readonly declined: readonly EntityId[];
  readonly undecided: readonly EntityId[];
  /** Residents with no record that bears on this service. */
  readonly noReason: number;
}

/** Everybody who lives in the served place weighs asking, once, today. */
export function produceResidentServiceRequests(
  world: World,
  commitmentId: EntityId,
  installmentIndex: number,
): { world: World; tally: ResidentServiceRequestTally } {
  const empty = {
    world,
    tally: { asked: [], declined: [], undecided: [], noReason: 0 },
  };
  const commitment = recordById(publicProgramRecords(world), commitmentId);
  if (!commitment || commitment.kind !== "commitment") return empty;
  const operatorId = commitment.recipientOrganizationId;
  const form = serviceRequestFormForCommitment(world, commitment);
  if (!operatorId || !form) return empty;
  const asked: EntityId[] = [];
  const declined: EntityId[] = [];
  const undecided: EntityId[] = [];
  let noReason = 0;
  const next = writeWithWorldIntegrityOnce(world, () => {
    let current = world;
    const records = residentRecordIndex(world);
    const start = simulationMomentAtLocalTime({
      date: world.currentDate,
      minuteOfDay: form.visit.startMinuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
    const end = addSimulationMinutes(start, form.visit.minutes);
    for (const personId of residentsOf(world, commitment.jurisdictionId)) {
      if (records.dead.has(personId)) continue;
      if (scheduledConflictExists(current, [personId], start, end)) continue;
      const considerations = needConsiderations(
        current,
        records,
        personId,
        form,
        commitment.jurisdictionId,
      );
      if (considerations.length === 0) {
        noReason += 1;
        continue;
      }
      const context: DecisionContext = {
        stableKey: `public-service-request:${commitment.id}:${installmentIndex}:${personId}`,
        decisionType: "public-service:request",
        actorPersonId: personId,
        cutoff: currentLifeCutoff(current),
        subject: {
          kind: "context:public-service",
          key: form.asked,
          entityId: operatorId,
        },
        options: [
          {
            key: "ask",
            label: `Ask for ${form.asked}`,
            description: `Ask the funded service for ${form.asked}.`,
          },
          {
            key: "wait",
            label: "Not now",
            description: "Leave the service alone for now.",
          },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      };
      const evaluated = evaluateDecision(current, context);
      current = recordDurableDecisionTrace(current, evaluated);
      const score = (key: string) =>
        considerations
          .filter((c) => c.optionKey === key)
          .reduce((sum, c) => sum + considerationScore(c), 0);
      // The engine orders an exact tie by option key; that order is not the
      // person's choice, so a tie asks for nothing.
      if (!isSelectedDecision(evaluated) || score("ask") === score("wait")) {
        undecided.push(personId);
        continue;
      }
      if (evaluated.selectedOptionKey !== "ask") {
        declined.push(personId);
        continue;
      }
      const request = requestPublicService(current, {
        personId,
        commitmentId: commitment.id,
        start,
        end,
      });
      if (request.kind !== "scheduled") {
        undecided.push(personId);
        continue;
      }
      current = request.world;
      const activity = recordById(
        current.history.scheduledActivities,
        request.activityId,
      )!;
      current = scheduleFutureDueItem(current, {
        stableKey: `${activity.stableKey}${ATTENDANCE_SUFFIX}`,
        dueAt: addDays(end.date, 1),
        transitionKey: PUBLIC_SERVICE_ATTENDANCE,
        entityIds: [personId],
        jurisdictionId: commitment.jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [request.requestEventId],
        },
      });
      asked.push(personId);
    }
    return current;
  });
  return { world: next, tally: { asked, declined, undecided, noReason } };
}

/** Adults whose recorded home is in the served place, in id order. */
function residentsOf(world: World, jurisdictionId: EntityId): EntityId[] {
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  return (Object.keys(world.people) as EntityId[])
    .filter(
      (id) =>
        id !== controlled &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >=
          ADULT_AGE &&
        livesInServiceArea(world, id, jurisdictionId),
    )
    .sort();
}

interface ResidentRecordIndex {
  readonly dead: ReadonlySet<EntityId>;
  /** Latest goal state per person and goal key. */
  readonly goals: ReadonlyMap<EntityId, ReadonlyMap<string, GoalStateRecord>>;
  /** Parent-child kinship records per person. */
  readonly kin: ReadonlyMap<
    EntityId,
    readonly World["history"]["kinshipRelationships"][number][]
  >;
}

/** One pass over each history list the decisions read, per paid installment. */
function residentRecordIndex(world: World): ResidentRecordIndex {
  const dead = new Set(
    world.history.personDeaths
      .filter((death) => death.diedAt <= world.currentDate)
      .map((death) => death.personId),
  );
  const goals = new Map<EntityId, Map<string, GoalStateRecord>>();
  for (const goal of world.history.goalStates) {
    if (goal.recordedAt > world.currentDate) continue;
    let own = goals.get(goal.personId);
    if (!own) goals.set(goal.personId, (own = new Map()));
    own.set(goal.goalKey, goal);
  }
  const kin = new Map<
    EntityId,
    World["history"]["kinshipRelationships"][number][]
  >();
  for (const relationship of world.history.kinshipRelationships) {
    if (
      relationship.kind !== "lineal:parent-child" ||
      relationship.establishedAt > world.currentDate
    )
      continue;
    for (const id of relationship.personIds) {
      const list = kin.get(id) ?? [];
      list.push(relationship);
      kin.set(id, list);
    }
  }
  return { dead, goals, kin };
}

function lifeRef(
  family:
    "work-role" | "education-enrollment" | "kinship" | "care-responsibility",
  recordId: EntityId,
): MindSourceReference {
  return { kind: "life-history", reference: { family, recordId } };
}

function consideration(
  personId: EntityId,
  key: string,
  optionKey: "ask" | "wait",
  importance: DecisionImportance,
  confidence: "medium" | "high",
  explanation: string,
  sourceRefs: readonly MindSourceReference[],
  sourceType: DecisionConsideration["sourceType"],
): DecisionConsideration {
  return {
    stableKey: `public-service:${personId}:${key}`,
    optionKey,
    sourceType,
    direction: "supports",
    importance,
    confidence,
    explanation,
    sourceRefs,
  };
}

/**
 * The person's own records that bear on wanting this service. Each record is
 * one consideration and every one is cited; the weights are the engine's.
 */
function needConsiderations(
  world: World,
  records: ResidentRecordIndex,
  personId: EntityId,
  form: ServiceRequestForm,
  servedJurisdictionId: EntityId,
): DecisionConsideration[] {
  const person = world.people[personId]!;
  const out: DecisionConsideration[] = [];
  const work = activeWorkRelationshipsAt(world, personId);
  const classes = activeEducationEnrollmentsAt(world, personId);
  const goal = (prefix: string) =>
    [...(records.goals.get(personId)?.values() ?? [])].find(
      (record) =>
        record.status === "active" &&
        (record.goalKey === prefix || record.goalKey.startsWith(`${prefix}:`)),
    ) ?? null;
  const goalRef = (record: GoalStateRecord): MindSourceReference => ({
    kind: "goal-state",
    goalStateId: record.id,
  });
  // The same reach as the rider's home: the served place itself, or any
  // place in the state when a state runs the service.
  const served = world.jurisdictions[servedJurisdictionId];
  const servedState = served ? stateKeyForJurisdiction(served) : null;
  const inServedPlace = (jurisdictionId: EntityId | null | undefined) => {
    if (!jurisdictionId) return false;
    if (jurisdictionId === servedJurisdictionId) return true;
    const place = world.jurisdictions[jurisdictionId];
    const state =
      lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ??
      (place ? stateKeyForJurisdiction(place) : null);
    return !!servedState && state === servedState;
  };

  if (form.need === "on-call") {
    // A crisis team is asked for from the person's own health record: an
    // episode that is acute or serious today. The episode names no condition (no
    // researched condition pack is installed), so it is weighed as being
    // unwell, never as a diagnosis.
    for (const episode of activeHealthEpisodes(world, personId)) {
      const state =
        latestHealthState(world, episode.id)?.state ?? episode.severity;
      if ((state !== "acute" && state !== "serious") || !episode.eventId)
        continue;
      out.push(
        consideration(
          personId,
          `health:${episode.id}`,
          "ask",
          state === "acute" ? "strong" : "moderate",
          "high",
          state === "acute"
            ? "Is acutely unwell right now."
            : "Is seriously unwell right now.",
          [{ kind: "historical-event", eventId: episode.eventId }],
          "context:health",
        ),
      );
    }
    if (out.length === 0) return out;
    // Help at home counts only when a saved care record says someone living
    // there looks after this person; sharing a house alone is not support.
    const home = new Set(
      householdMembershipsAt(world, personId).flatMap((entry) =>
        peopleInHouseholdAt(world, entry.household.id),
      ),
    );
    for (const care of world.history.careResponsibilities) {
      if (
        care.recipientPersonId !== personId ||
        care.startedAt > world.currentDate ||
        records.dead.has(care.caregiverPersonId) ||
        !home.has(care.caregiverPersonId) ||
        careResponsibilityStateHistory(world, care.id).at(-1)?.status !==
          "active"
      )
        continue;
      out.push(
        consideration(
          personId,
          `care:${care.id}`,
          "wait",
          "slight",
          "high",
          "Someone at home looks after them.",
          [lifeRef("care-responsibility", care.id)],
          "social:family",
        ),
      );
    }
    return out;
  }

  if (form.need === "travel") {
    for (const { relationship, role } of work) {
      const inside = inServedPlace(role.locationJurisdictionId);
      out.push(
        consideration(
          personId,
          `work:${relationship.id}`,
          inside ? "ask" : "wait",
          "moderate",
          "high",
          inside
            ? `Has work as ${role.title} to get to where the service runs.`
            : `Works as ${role.title} somewhere the service does not run.`,
          [lifeRef("work-role", role.id)],
          "context:work",
        ),
      );
    }
    for (const { enrollment } of classes) {
      const at = organizationProfileAt(
        world,
        enrollment.organizationId,
      )?.locationJurisdictionId;
      const inside = inServedPlace(at);
      out.push(
        consideration(
          personId,
          `classes:${enrollment.id}`,
          inside ? "ask" : "wait",
          "moderate",
          "high",
          inside
            ? "Has classes to get to where the service runs."
            : "Has classes somewhere the service does not run.",
          [lifeRef("education-enrollment", enrollment.id)],
          "context:education",
        ),
      );
    }
    return out;
  }

  // Outdoors and reading both weigh children living at home.
  const homes = new Set(
    householdMembershipsAt(world, personId).map((entry) => entry.household.id),
  );
  for (const relationship of records.kin.get(personId) ?? []) {
    const childId = relationship.personIds.find((id) => id !== personId);
    const child = childId ? world.people[childId] : undefined;
    if (
      !child ||
      records.dead.has(child.id) ||
      child.birthDate <= person.birthDate ||
      ageOnDate(child.birthDate, world.currentDate) >= ADULT_AGE ||
      !householdMembershipsAt(world, child.id).some((entry) =>
        homes.has(entry.household.id),
      )
    )
      continue;
    out.push(
      consideration(
        personId,
        `child:${child.id}`,
        "ask",
        form.need === "outdoors" ? "moderate" : "slight",
        "high",
        form.need === "outdoors"
          ? "Has a child at home who could use the program."
          : "Has a child at home who could use the library.",
        [lifeRef("kinship", relationship.id)],
        "social:family",
      ),
    );
  }
  for (const { relationship, role } of work) {
    const weekly = role.timeDemand.expectedWeekly?.maximumHours ?? null;
    out.push(
      consideration(
        personId,
        `work-hours:${relationship.id}`,
        "wait",
        weekly !== null && weekly >= 40 ? "moderate" : "slight",
        "high",
        `Hours already go to work as ${role.title}.`,
        [lifeRef("work-role", role.id)],
        "context:work",
      ),
    );
  }
  if (form.need === "outdoors") {
    const own = goal(PRIVACY_GOAL_KEY);
    if (own)
      out.push(
        consideration(
          personId,
          `goal:${own.id}`,
          "ask",
          "moderate",
          "medium",
          "Wants to make some time for themselves.",
          [goalRef(own)],
          "mind:goal",
        ),
      );
    const people = goal(CONNECTION_GOAL_KEY);
    if (people)
      out.push(
        consideration(
          personId,
          `goal:${people.id}`,
          "ask",
          "slight",
          "medium",
          "Wants to make time for people they know.",
          [goalRef(people)],
          "mind:goal",
        ),
      );
    const search = goal(LIVELIHOOD_GOAL_KEY);
    if (search)
      out.push(
        consideration(
          personId,
          `goal:${search.id}`,
          "wait",
          "moderate",
          "medium",
          "Looking for work comes first.",
          [goalRef(search)],
          "mind:goal",
        ),
      );
    return out;
  }
  for (const { enrollment } of classes)
    out.push(
      consideration(
        personId,
        `classes:${enrollment.id}`,
        "ask",
        "moderate",
        "high",
        "Has classes to study for.",
        [lifeRef("education-enrollment", enrollment.id)],
        "context:education",
      ),
    );
  const learning = goal(LEARNING_GOAL_KEY);
  if (learning)
    out.push(
      consideration(
        personId,
        `goal:${learning.id}`,
        "ask",
        "moderate",
        "medium",
        "Wants to make time to learn something.",
        [goalRef(learning)],
        "mind:goal",
      ),
    );
  return out;
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

export function residentServiceRequestsHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = new RegExp(`^(.*):installment:(\\d+)${REQUESTS_SUFFIX}$`).exec(
    due.stableKey,
  );
  const commitment = match
    ? publicProgramRecords(world).find(
        (record): record is PublicProgramCommitmentRecord =>
          record.kind === "commitment" && record.stableKey === match[1],
      )
    : undefined;
  if (!match || !commitment)
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "No program commitment matches.",
      outcomeEventId: null,
    };
  const produced = produceResidentServiceRequests(
    world,
    commitment.id,
    Number(match[2]),
  );
  const { asked, declined, undecided, noReason } = produced.tally;
  return {
    world: produced.world,
    status: "resolved",
    reasonKey: null,
    context: `${asked.length} asked, ${declined.length} decided not to, ${undecided.length} undecided, ${noReason} had no reason on record.`,
    outcomeEventId: null,
  };
}

export function serviceAttendanceHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const done = (
    next: World,
    context: string,
    outcomeEventId: EntityId | null = null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  });
  const activity = due.stableKey.endsWith(ATTENDANCE_SUFFIX)
    ? recordByStableKey(
        world.history.scheduledActivities,
        due.stableKey.slice(0, -ATTENDANCE_SUFFIX.length),
      )
    : undefined;
  if (!activity) return done(world, "No requested visit matches.");
  const state = scheduledActivityState(world, activity.id);
  if (state.status !== "scheduled")
    return done(world, "The visit was already settled.");
  const personId = activity.participantPersonIds[0]!;
  const commitment = activity.sourceEntityIds
    .map((id) =>
      publicProgramRecords(world).find(
        (record): record is PublicProgramCommitmentRecord =>
          record.kind === "commitment" && record.eventId === id,
      ),
    )
    .find(Boolean);
  const died = world.history.personDeaths.find(
    (death) => death.personId === personId,
  );
  if (died && died.diedAt <= state.end.date)
    return done(
      cancelScheduledActivity(world, activity.id),
      "The person died before the visit.",
    );
  if (
    !commitment ||
    !livesInServiceArea(world, personId, commitment.jurisdictionId)
  )
    return done(
      cancelScheduledActivity(world, activity.id),
      "The person no longer lives where the service runs.",
    );
  // The completion event is dated at the visit's own end, the day before
  // this due item, so it is the activity's outcome, not the due item's.
  return done(
    completeResidentScheduledActivity(world, activity.id),
    `${activity.title} took place.`,
  );
}

export const PUBLIC_SERVICE_HANDLERS = [
  [PUBLIC_SERVICE_RESIDENT_REQUESTS, residentServiceRequestsHandler],
  [PUBLIC_SERVICE_ATTENDANCE, serviceAttendanceHandler],
] as const;
