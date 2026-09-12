import { acceptedEducationPath } from "./education-study-terms";
import {
  bootstrapStudyPeriodProgression,
  cancelStudyPeriodDues,
  enrollmentStudyModel,
  registerStudyPathResolver,
  scheduleStudyPeriodDue,
  studyProgressSummary,
  studyUsesPeriodModel,
  completedStudyPeriods,
  educationStudyPeriodDueHandler,
  EDUCATION_STUDY_PERIOD_DUE_KEY,
  periodizedStudyPath,
} from "./education-study-progression";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { activeCampaignForCandidate } from "./campaign-queries";
import {
  addDays,
  addSimulationMinutes,
  ageOnDate,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import {
  createOrganization,
  createEducationEnrollment,
  createWorkRelationship,
  recordEducationEnrollmentState,
  recordWorkStatus,
  recordWorkRole,
} from "./life";
import {
  educationEnrollmentStateAt,
  workStatusAt,
  workRoleAt,
  activeWorkRelationshipsAt,
} from "./life-queries";
import {
  createResourceFlow,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
  recordResourceFlowTerms,
} from "./resources";
import { resourcePositionAt, resourceFlowTermsAt } from "./resource-queries";
import {
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
  createWorkItem,
  workItemState,
  cancelScheduledActivity,
} from "./time-work";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import { recordWorldEvent } from "./world";
import { evaluateLifeEligibility } from "./life-eligibility";
import { SeededRng } from "./rng";
import { lifePathDefinition, LIFE_PATHS2_CATALOG } from "./life-paths2-catalog";
import type { LifePathDefinition } from "./life-paths2-catalog";
import type {
  EntityId,
  World,
  SimulationMoment,
  FutureTransitionHandlerRegistry,
  LifeEligibilityProvider,
  RoutineTimeHook,
  RoutineWindow,
} from "./types";

const authored = {
  kind: "authored",
  note: "LIFE-PATHS2 v1: explicit fictional opportunity and represented player/NPC transition.",
} as const;
const prefix = "life-paths2.";
export type LifePathResult =
  | { readonly ok: true; readonly world: World; readonly message: string }
  | { readonly ok: false; readonly world: World; readonly message: string };
const fail = (world: World, message: string): LifePathResult => ({
  ok: false,
  world,
  message,
});
const done = (world: World, message: string): LifePathResult => ({
  ok: true,
  world,
  message,
});
function controlled(world: World): EntityId {
  if (world.control.kind !== "person")
    throw new Error("Choose a person before taking this action.");
  return world.control.personId;
}
function key(world: World, suffix: string): string {
  return `${prefix}${suffix}:${world.history.nextSequence}`;
}
function event(
  world: World,
  type: string,
  ids: readonly EntityId[],
  summary: string,
): World {
  const people = [...new Set(ids.filter((id) => !!world.people[id]))];
  return recordWorldEvent(world, {
    stableKey: key(world, type),
    type: `${prefix}${type}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [...new Set(ids)],
    participants: people.map((personId) => ({
      personId,
      role: "agency:participant",
      detail: summary,
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [prefix.slice(0, -1), `${prefix}${type}`],
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
}
function hasEvent(world: World, type: string, id: EntityId): boolean {
  return world.history.events.some(
    (e) => e.type === `${prefix}${type}` && e.involvedEntityIds.includes(id),
  );
}
export function completedStudySessions(world: World, id: EntityId): number {
  return world.history.events.filter(
    (e) =>
      e.type === `${prefix}study-session` && e.involvedEntityIds.includes(id),
  ).length;
}
export function hasLifePathCredential(
  world: World,
  personId: EntityId,
  program: string,
): boolean {
  return world.history.educationEnrollments.some(
    (e) =>
      e.personId === personId &&
      e.programKind === program &&
      educationEnrollmentStateAt(world, e.id)?.status === "completed",
  );
}
export function lifePathEntryReason(
  world: World,
  personId: EntityId,
  path: LifePathDefinition,
): string | null {
  const person = world.people[personId];
  if (
    !person ||
    ageOnDate(person.birthDate, world.currentDate) < path.minimumAge
  )
    return "This opportunity is for adults.";
  if (
    evaluateLifeEligibility(world, {
      actorPersonId: personId,
      actionKey: "work:life-path",
      asOfDate: world.currentDate,
      jurisdictionId: null,
      contextEntityIds: [],
    }).status === "blocked"
  )
    return "The person cannot take on this activity now.";
  if (
    path.prerequisiteProgram &&
    !hasLifePathCredential(world, personId, path.prerequisiteProgram)
  )
    return "The required training has not been completed.";
  if (path.scope === "public-office")
    return "Hiring authority and applicable employment restrictions are not established.";
  return null;
}
function ensureOrganization(
  world: World,
  path: LifePathDefinition,
): { world: World; id: EntityId } {
  const stableKey = `${prefix}organization:${path.organizationName}`;
  const existing = world.history.organizations.find(
    (o) => o.stableKey === stableKey,
  );
  if (existing) return { world, id: existing.id };
  const next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    provenance: authored,
    initialProfile: {
      name: path.organizationName,
      classification:
        path.kind === "study" ? "service:college" : "community:association",
      locationJurisdictionId: null,
    },
  });
  return { world: next, id: next.history.organizations.at(-1)!.id };
}
export function pathForRelationship(
  world: World,
  id: EntityId,
): LifePathDefinition | undefined {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === id,
  );
  if (enrollment?.programKind.startsWith("postsecondary:edu-path7-")) {
    const accepted = acceptedEducationPath(world, id);
    return accepted ? periodizedStudyPath(accepted) : undefined;
  }
  if (enrollment)
    return LIFE_PATHS2_CATALOG.find(
      (p) => p.kind === "study" && p.program === enrollment.programKind,
    );
  const work = world.history.workRelationships.find((w) => w.id === id);
  return work
    ? LIFE_PATHS2_CATALOG.find(
        (p) =>
          work.kind === `employment:life-paths2-${p.id}` ||
          work.kind === `volunteer:life-paths2-${p.id}`,
      )
    : undefined;
}
export function enterLifePath(world: World, pathId: string): LifePathResult {
  const actor = controlled(world),
    path = lifePathDefinition(pathId);
  const reason = lifePathEntryReason(world, actor, path);
  if (reason) return fail(world, reason);
  const existing =
    path.kind === "study"
      ? world.history.educationEnrollments.some(
          (e) =>
            e.personId === actor &&
            e.programKind === path.program &&
            ["active", "temporarily-inactive"].includes(
              educationEnrollmentStateAt(world, e.id)?.status ?? "",
            ),
        )
      : world.history.workRelationships.some(
          (w) =>
            w.personId === actor &&
            pathForRelationship(world, w.id)?.id === path.id &&
            workStatusAt(world, w.id)?.status !== "ended",
        );
  if (existing)
    return fail(
      world,
      "This path is already in your history. Continue or return to it.",
    );
  if (path.scope !== "personal")
    return fail(
      world,
      "This opportunity requires recruitment by the active campaign.",
    );
  const org = ensureOrganization(world, path);
  let next = org.world;
  let studyEnrollmentId: EntityId | null = null;
  if (path.kind === "study") {
    next = createEducationEnrollment(next, {
      stableKey: key(next, path.id),
      personId: actor,
      organizationId: org.id,
      startedAt: next.currentDate,
      programKind: path.program,
      contextKind: "program:life-paths2-v1",
      provenance: authored,
    });
    studyEnrollmentId = next.history.educationEnrollments.at(-1)!.id;
    next = event(
      next,
      "enrolled",
      [actor, studyEnrollmentId],
      `You enrolled in ${path.title}.`,
    );
    if (studyUsesPeriodModel(path))
      next = bootstrapStudyPeriodProgression(next, studyEnrollmentId, path);
  } else
    next = createPathWork(
      next,
      actor,
      org.id,
      path,
      path.sessionPayMinor,
      false,
    );
  const periodStudy =
    path.kind === "study" &&
    studyEnrollmentId &&
    studyUsesPeriodModel(path) &&
    enrollmentStudyModel(next, studyEnrollmentId, path) === "periods";
  return done(
    next,
    path.kind === "study"
      ? periodStudy
        ? "You enrolled. Study advances by academic period as time passes; tuition is due at each period end."
        : "You enrolled. Schedule a study session to begin."
      : path.sessionPayMinor > 0
        ? "You accepted the work. Pay follows completed shifts."
        : "You accepted the volunteer work. This engagement is unpaid.",
  );
}
function createPathWork(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  path: LifePathDefinition,
  pay: number,
  expected: boolean,
  payerPersonId?: EntityId,
): World {
  let next = createWorkRelationship(world, {
    stableKey: key(world, path.id),
    personId,
    organizationId,
    startedAt: expected ? addDays(world.currentDate, 1) : world.currentDate,
    initialStatus: expected ? "expected" : "active",
    kind: `${pay === 0 ? "volunteer" : "employment"}:life-paths2-${path.id}`,
    compensation: pay === 0 ? "unpaid" : "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: path.title,
      occupationClassification: `custom:${path.id}`,
      locationJurisdictionId: null,
      timeDemand: path.timeDemand,
    },
  });
  const work = next.history.workRelationships.at(-1)!;
  if (pay > 0)
    next = payerPersonId
      ? createResourceFlow(next, {
          stableKey: key(next, "pay"),
          source: { kind: "person", personId: payerPersonId },
          recipient: { kind: "person", personId },
          startsAt: work.startedAt,
          initialStatus: expected ? "expected" : "active",
          amount: money(pay, "USD"),
          cadenceKind: "work:completed-shift",
          basisKind: "compensation:work",
          basisReference: { kind: "work", workRelationshipId: work.id },
          restrictionKind: null,
          jurisdictionId: null,
          provenance: authored,
        })
      : createWorkCompensation(next, {
          stableKey: key(next, "pay"),
          workRelationshipId: work.id,
          startsAt: work.startedAt,
          initialStatus: expected ? "expected" : "active",
          amount: money(pay, "USD"),
          cadenceKind: "work:completed-shift",
          restrictionKind: null,
          jurisdictionId: null,
          provenance: authored,
        });
  return next;
}
function relationshipActor(world: World, id: EntityId): EntityId | undefined {
  return (
    world.history.educationEnrollments.find((e) => e.id === id)?.personId ??
    world.history.workRelationships.find((w) => w.id === id)?.personId
  );
}
function relationshipActive(world: World, id: EntityId): boolean {
  return (
    educationEnrollmentStateAt(world, id)?.status === "active" ||
    workStatusAt(world, id)?.status === "active"
  );
}
export function nextLifePathSession(
  world: World,
  id: EntityId,
): { start: SimulationMoment; end: SimulationMoment } {
  const path = pathForRelationship(world, id);
  if (!path) throw new Error("This path is unavailable.");
  const prior = world.history.scheduledActivities
    .filter(
      (a) => a.sourceEntityIds.includes(id) && a.stableKey.startsWith(prefix),
    )
    .map((a) => scheduledActivityState(world, a.id))
    .filter((s) => s.status === "completed")
    .at(-1);
  let date = prior
    ? addDays(prior.end.date, path.minimumGapDays)
    : world.currentDate;
  if (date < world.currentDate) date = world.currentDate;
  let start = simulationMomentAtLocalTime({
    ...world.currentMoment,
    date,
    minuteOfDay: path.sessionStartMinute,
  });
  if (compareSimulationMoments(start, world.currentMoment) < 0)
    start = simulationMomentAtLocalTime({
      ...world.currentMoment,
      date: addDays(date, 1),
      minuteOfDay: path.sessionStartMinute,
    });
  return { start, end: addSimulationMinutes(start, path.sessionMinutes) };
}
export function scheduleLifePathSession(
  world: World,
  id: EntityId,
): LifePathResult {
  const actor = controlled(world),
    path = pathForRelationship(world, id);
  if (
    !path ||
    relationshipActor(world, id) !== actor ||
    !relationshipActive(world, id)
  )
    return fail(world, "This path is not active for you.");
  if (path.kind === "study" && studyUsesPeriodModel(path))
    return fail(
      world,
      "This program advances by study period; there is no session to schedule.",
    );
  if (
    world.history.scheduledActivities.some(
      (a) =>
        a.sourceEntityIds.includes(id) &&
        scheduledActivityState(world, a.id).status === "scheduled",
    )
  )
    return fail(world, "A session is already scheduled.");
  const timing = nextLifePathSession(world, id);
  try {
    const next = createScheduledActivity(world, {
      stableKey: key(world, `session:${id}`),
      title: path.title,
      summary: path.responsibility,
      kind: "confirmed",
      ...timing,
      participantPersonIds: [actor],
      responsiblePersonId: actor,
      location: {
        locationKey: `life-paths2:${path.id}`,
        label: path.organizationName,
        jurisdictionId: null,
      },
      sourceEntityIds: [id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [actor] },
    });
    return done(next, "The session is on your calendar.");
  } catch (e) {
    if (e instanceof Error && e.message.includes("conflicts"))
      return fail(world, "You already have a commitment at that time.");
    throw e;
  }
}
function lifePathSessionAlreadyRecorded(
  world: World,
  activityId: EntityId,
): boolean {
  return world.history.events.some(
    (e) =>
      (e.type === `${prefix}work-session` ||
        e.type === `${prefix}study-session`) &&
      e.involvedEntityIds.includes(activityId),
  );
}

/** Canonical pay/history writers after a life-path session interval completes. */
export function applyLifePathSessionCompletion(
  world: World,
  activityId: EntityId,
): World {
  if (lifePathSessionAlreadyRecorded(world, activityId)) return world;
  const activity = world.history.scheduledActivities.find(
    (a) => a.id === activityId,
  );
  const id = activity?.sourceEntityIds.find(
    (ref) => !!pathForRelationship(world, ref),
  );
  const path = id ? pathForRelationship(world, id) : undefined;
  if (!activity || !id || !path) return world;
  const actor = relationshipActor(world, id);
  if (!actor) return world;
  let next = world;
  if (path.kind === "study") {
    if (path.sessionCostMinor > 0) {
      const enrollment = next.history.educationEnrollments.find(
        (e) => e.id === id,
      );
      if (!enrollment) return world;
      const funded = ensureLifePathPersonalPosition(
        next,
        actor,
        money(0, "USD").currency,
      );
      if (
        (resourcePositionAt(
          funded,
          { kind: "person", personId: actor },
          money(0, "USD").currency,
        )?.liquidBalance.minorUnits ?? 0) < path.sessionCostMinor
      )
        return world;
      next = funded;
      next = createResourceFlow(next, {
        stableKey: key(next, "tuition"),
        source: { kind: "person", personId: actor },
        recipient: {
          kind: "organization",
          organizationId: enrollment.organizationId,
        },
        startsAt: next.currentDate,
        amount: money(path.sessionCostMinor, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "obligation:tuition",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: authored,
      });
      next = recordResourceTransferOutcome(next, {
        stableKey: key(next, "tuition-paid"),
        resourceFlowId: next.history.resourceFlows.at(-1)!.id,
        periodStartsAt: next.currentDate,
        periodEndsAt: next.currentDate,
        occurredAt: next.currentDate,
        status: "completed",
        attemptedAmount: money(path.sessionCostMinor, "USD"),
        transferredAmount: money(path.sessionCostMinor, "USD"),
        reasonKind: null,
        note: path.title,
        provenance: authored,
      });
    }
    next = event(
      next,
      "study-session",
      [actor, id, activityId],
      `You completed a session of ${path.title}.`,
    );
    const enrollment = next.history.educationEnrollments.find(
      (e) => e.id === id,
    )!;
    if (
      completedStudySessions(next, id) >= (path.requiredSessions ?? Infinity) &&
      next.currentDate >= addDays(enrollment.startedAt, path.minimumElapsedDays)
    ) {
      const state = educationEnrollmentStateAt(next, id)!;
      next = recordEducationEnrollmentState(next, {
        stableKey: key(next, "credential"),
        enrollmentId: id,
        effectiveAt: next.currentDate,
        status: "completed",
        contextKind: "program:life-paths2-v1",
        reason: path.credential!,
        provenance: authored,
        supersedesStateId: state.id,
      });
      next = event(
        next,
        "credential",
        [actor, id],
        `You completed ${path.credential}.`,
      );
    }
    return next;
  }
  next = event(
    next,
    "work-session",
    [actor, id, activityId],
    `You completed a shift as ${path.title}.`,
  );
  const flow = next.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === id,
  );
  if (flow)
    next = scheduleFutureDueItem(next, {
      stableKey: key(next, "pay-due"),
      dueAt: addDays(next.currentDate, 1),
      transitionKey: "life-paths2:pay",
      entityIds: [id, flow.id, next.history.events.at(-1)!.id].sort(),
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Fictional employer pays the day after a completed shift.",
      },
    });
  const sessions = next.history.events.filter(
    (e) =>
      e.type === `${prefix}work-session` && e.involvedEntityIds.includes(id),
  ).length;
  if (sessions === 10) {
    const role = workRoleAt(next, id)!;
    next = recordWorkRole(next, {
      stableKey: key(next, "progression"),
      workRelationshipId: id,
      effectiveAt: next.currentDate,
      title: `Experienced ${path.title.toLowerCase()}`,
      occupationClassification: role.occupationClassification,
      locationJurisdictionId: role.locationJurisdictionId,
      timeDemand: role.timeDemand,
      provenance: authored,
      supersedesRoleId: role.id,
    });
  }
  return next;
}

export function performLifePathSession(
  world: World,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = LIFE_PATHS2_HANDLERS,
): LifePathResult {
  const activity = world.history.scheduledActivities.find(
    (a) => a.id === activityId,
  );
  const id = activity?.sourceEntityIds.find(
    (ref) => !!pathForRelationship(world, ref),
  );
  const path = id ? pathForRelationship(world, id) : undefined;
  if (
    !activity ||
    !id ||
    !path ||
    relationshipActor(world, id) !== controlled(world) ||
    !relationshipActive(world, id)
  )
    return fail(world, "This session is no longer available.");
  if (scheduledActivityState(world, activityId).status !== "scheduled")
    return fail(world, "This session has already ended.");
  const actor = controlled(world);
  const funded =
    path.sessionCostMinor > 0
      ? ensureLifePathPersonalPosition(world, actor, money(0, "USD").currency)
      : world;
  if (
    path.sessionCostMinor > 0 &&
    (resourcePositionAt(
      funded,
      { kind: "person", personId: actor },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits ?? 0) < path.sessionCostMinor
  )
    return fail(world, "You do not have enough money for this session.");
  let next = performScheduledActivity(funded, activityId, handlers);
  if (next === funded)
    return fail(world, "Another calendar commitment must be resolved first.");
  next = applyLifePathSessionCompletion(next, activityId);
  return done(next, "The session is complete.");
}
export function performLifePathWork(
  world: World,
  id: EntityId,
  handlers: FutureTransitionHandlerRegistry = LIFE_PATHS2_HANDLERS,
): LifePathResult {
  const path = pathForRelationship(world, id);
  if (
    !path ||
    path.kind !== "work" ||
    relationshipActor(world, id) !== controlled(world) ||
    !relationshipActive(world, id)
  )
    return fail(world, "This work is not active for you.");
  let next = world;
  const scheduled = next.history.scheduledActivities.find(
    (a) =>
      a.sourceEntityIds.includes(id) &&
      scheduledActivityState(next, a.id).status === "scheduled",
  );
  if (!scheduled) {
    const prepared = scheduleLifePathSession(next, id);
    if (!prepared.ok) return prepared;
    next = prepared.world;
  }
  const activity = next.history.scheduledActivities.find(
    (a) =>
      a.sourceEntityIds.includes(id) &&
      scheduledActivityState(next, a.id).status === "scheduled",
  );
  if (!activity) return fail(next, "This session is no longer available.");
  return performLifePathSession(next, activity.id, handlers);
}

function personalWorkWindow(
  world: World,
  id: EntityId,
): { start: SimulationMoment; end: SimulationMoment } | null {
  const path = pathForRelationship(world, id);
  if (
    !path ||
    path.kind !== "work" ||
    path.scope !== "personal" ||
    !relationshipActive(world, id)
  )
    return null;
  const completedToday = world.history.events.some(
    (e) =>
      e.type === `${prefix}work-session` &&
      e.involvedEntityIds.includes(id) &&
      e.occurredAt === world.currentDate,
  );
  const todayStart = simulationMomentAtLocalTime({
    ...world.currentMoment,
    date: world.currentDate,
    minuteOfDay: path.sessionStartMinute,
  });
  const todayEnd = addSimulationMinutes(todayStart, path.sessionMinutes);
  if (
    !completedToday &&
    compareSimulationMoments(world.currentMoment, todayEnd) < 0
  )
    return { start: todayStart, end: todayEnd };
  return nextLifePathSession(world, id);
}

function lifePathActivityRelationship(
  world: World,
  activityId: EntityId,
): EntityId | undefined {
  const activity = world.history.scheduledActivities.find(
    (a) => a.id === activityId,
  );
  return activity?.sourceEntityIds.find(
    (ref) => !!pathForRelationship(world, ref),
  );
}

function createLifePathRoutineHook(): RoutineTimeHook {
  return {
    isAutoResolvableActivity(world, activityId) {
      const id = lifePathActivityRelationship(world, activityId);
      const path = id ? pathForRelationship(world, id) : undefined;
      if (!id || !path || path.kind !== "work" || path.scope !== "personal")
        return false;
      if (world.control.kind !== "person") return false;
      return (
        relationshipActor(world, id) === world.control.personId &&
        relationshipActive(world, id)
      );
    },
    projectWindows(world, target) {
      if (world.control.kind !== "person") return [];
      const actor = world.control.personId;
      const windows: RoutineWindow[] = [];
      for (const work of world.history.workRelationships) {
        if (work.personId !== actor) continue;
        const timing = personalWorkWindow(world, work.id);
        const path = pathForRelationship(world, work.id);
        if (!timing || !path) continue;
        if (compareSimulationMoments(timing.end, world.currentMoment) <= 0)
          continue;
        if (compareSimulationMoments(timing.end, target) > 0) continue;
        windows.push({
          relationshipId: work.id,
          kind: "work",
          start: timing.start,
          end: timing.end,
          autoResolvable: true,
        });
      }
      return windows.sort(
        (left, right) =>
          compareSimulationMoments(left.end, right.end) ||
          left.relationshipId.localeCompare(right.relationshipId),
      );
    },
    ensureScheduled(world, slot) {
      const existing = world.history.scheduledActivities.find(
        (a) =>
          a.sourceEntityIds.includes(slot.relationshipId) &&
          scheduledActivityState(world, a.id).status === "scheduled",
      );
      if (existing) return world;
      const path = pathForRelationship(world, slot.relationshipId);
      const actor = relationshipActor(world, slot.relationshipId);
      if (!path || !actor) return world;
      const start =
        compareSimulationMoments(slot.start, world.currentMoment) < 0
          ? world.currentMoment
          : slot.start;
      if (compareSimulationMoments(start, slot.end) >= 0) return world;
      try {
        return createScheduledActivity(world, {
          stableKey: key(world, `session:${slot.relationshipId}`),
          title: path.title,
          summary: path.responsibility,
          kind: "confirmed",
          start,
          end: slot.end,
          participantPersonIds: [actor],
          responsiblePersonId: actor,
          location: {
            locationKey: `life-paths2:${path.id}`,
            label: path.organizationName,
            jurisdictionId: null,
          },
          sourceEntityIds: [slot.relationshipId],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [actor] },
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes("conflicts")) return world;
        throw e;
      }
    },
    afterActivityCompleted(world, activityId) {
      return applyLifePathSessionCompletion(world, activityId);
    },
  };
}

const LIFE_PATHS2_CORE_HANDLERS = createFutureTransitionHandlerRegistry(
  [
    [
      "life-paths2:delegated-pay",
      (world, due) => {
        const assignment = world.history.events.find(
          (e) =>
            due.entityIds.includes(e.id) &&
            e.type === `${prefix}delegated-assignment`,
        );
        const item = world.history.workItems.find((i) =>
          assignment?.involvedEntityIds.includes(i.id),
        );
        const work = world.history.workRelationships.find((w) =>
          due.entityIds.includes(w.id),
        );
        const flow = world.history.resourceFlows.find((f) =>
          due.entityIds.includes(f.id),
        );
        if (!item || !work || !flow)
          throw new Error("Delegated pay evidence is missing.");
        const state = workItemState(world, item.id);
        if (
          state.status !== "ready-for-review" &&
          workStatusAt(world, work.id)?.status !== "active"
        )
          return {
            world,
            status: "cancelled",
            reasonKey: "life-paths2:departure",
            context: "Unfinished work ended with the engagement.",
            outcomeEventId: null,
          };
        if (
          state.status !== "ready-for-review" ||
          state.recordedAt.date >= world.currentDate
        ) {
          const next = scheduleFutureDueItem(world, {
            stableKey: `${due.stableKey}:continue`,
            dueAt: addDays(world.currentDate, 1),
            transitionKey: due.transitionKey,
            entityIds: due.entityIds,
            jurisdictionId: null,
            provenance: due.provenance,
          });
          return {
            world: next,
            status: "resolved",
            reasonKey: null,
            context: "Pay awaits completion and the next pay date.",
            outcomeEventId: null,
          };
        }
        const terms = resourceFlowTermsAt(world, flow.id)!;
        const source = flow.source;
        let funded =
          source.kind === "person"
            ? ensureLifePathPersonalPosition(
                world,
                source.personId,
                terms.amount.currency,
              )
            : world;
        if (flow.recipient.kind === "person")
          funded = ensureLifePathPersonalPosition(
            funded,
            flow.recipient.personId,
            terms.amount.currency,
          );
        const funds =
          resourcePositionAt(funded, source, terms.amount.currency)
            ?.liquidBalance.minorUnits ?? 0;
        const paid = funds >= terms.amount.minorUnits;
        const next = recordResourceTransferOutcome(funded, {
          stableKey: `${due.stableKey}:settled`,
          resourceFlowId: flow.id,
          periodStartsAt: state.recordedAt.date,
          periodEndsAt: state.recordedAt.date,
          occurredAt: world.currentDate,
          status: paid ? "completed" : "missed",
          attemptedAmount: terms.amount,
          transferredAmount: paid
            ? terms.amount
            : money(0, terms.amount.currency),
          reasonKind: paid ? null : "custom:insufficient-funds",
          note: "Completed delegated assignment, paid from the actual hiring account.",
          provenance: authored,
        });
        return {
          world: next,
          status: "resolved",
          reasonKey: null,
          context: paid
            ? "Assignment paid."
            : "Payment missed: insufficient funds.",
          outcomeEventId: null,
        };
      },
    ],
    [
      "life-paths2:pay",
      (world, due) => {
        const flow = world.history.resourceFlows.find((f) =>
          due.entityIds.includes(f.id),
        );
        const worked = world.history.events.find(
          (e) =>
            due.entityIds.includes(e.id) && e.type === `${prefix}work-session`,
        );
        if (!flow || !worked)
          throw new Error("Payable work evidence is missing.");
        const terms = resourceFlowTermsAt(world, flow.id, {
          asOfDate: worked.occurredAt,
          historySequenceExclusive: worked.sequence + 1,
        });
        if (!terms) throw new Error("Earned pay terms are missing.");
        const funded =
          flow.recipient.kind === "person"
            ? ensureLifePathPersonalPosition(
                world,
                flow.recipient.personId,
                terms.amount.currency,
              )
            : world;
        const next = recordResourceTransferOutcome(funded, {
          stableKey: `${due.stableKey}:paid`,
          resourceFlowId: flow.id,
          periodStartsAt: worked.occurredAt,
          periodEndsAt: worked.occurredAt,
          occurredAt: world.currentDate,
          status: "completed",
          attemptedAmount: terms.amount,
          transferredAmount: terms.amount,
          reasonKind: null,
          note: "Payment for the completed shift; advertised pay alone never posts money.",
          provenance: authored,
        });
        return {
          world: next,
          status: "resolved",
          reasonKey: null,
          context: "Completed shift paid.",
          outcomeEventId: null,
        };
      },
    ],
  ],
  createLifePathRoutineHook(),
);

export const LIFE_PATHS2_HANDLERS = composeFutureTransitionHandlerRegistries(
  createFutureTransitionHandlerRegistry([
    [EDUCATION_STUDY_PERIOD_DUE_KEY, educationStudyPeriodDueHandler],
  ]),
  LIFE_PATHS2_CORE_HANDLERS,
);

registerStudyPathResolver((world, enrollmentId) =>
  pathForRelationship(world, enrollmentId),
);

export { enrollmentStudyModel, studyProgressSummary, completedStudyPeriods };
export function changeLifePathStatus(
  world: World,
  id: EntityId,
  action: "pause" | "return" | "leave",
): LifePathResult {
  const actor = controlled(world);
  if (relationshipActor(world, id) !== actor)
    return fail(world, "This is not your path.");
  const path = pathForRelationship(world, id);
  if (!path) return fail(world, "This path is unavailable.");
  const status =
    path.kind === "study"
      ? educationEnrollmentStateAt(world, id)?.status
      : workStatusAt(world, id)?.status;
  if (action === "return" && status !== "temporarily-inactive")
    return fail(world, "Only an interrupted path can be resumed.");
  if (
    action !== "return" &&
    status !== "active" &&
    status !== "temporarily-inactive"
  )
    return fail(world, "This path has already ended.");
  if (action === "pause" && status === "temporarily-inactive")
    return fail(world, "This path is already interrupted.");
  let next = world;
  for (const a of next.history.scheduledActivities.filter((a) =>
    a.sourceEntityIds.includes(id),
  ))
    if (scheduledActivityState(next, a.id).status === "scheduled")
      next = cancelScheduledActivity(next, a.id);
  if (path.kind === "study") {
    if (
      enrollmentStudyModel(next, id, path) === "periods" &&
      studyUsesPeriodModel(path)
    ) {
      if (action === "pause" || action === "leave")
        next = cancelStudyPeriodDues(next, id);
      if (action === "return") {
        const completed = completedStudyPeriods(next, id);
        const total = (path.academicYears ?? 0) * (path.periodsPerYear ?? 2);
        if (completed < total)
          next = scheduleStudyPeriodDue(next, id, path, completed + 1);
      }
    }
    const previous = educationEnrollmentStateAt(next, id)!;
    next = recordEducationEnrollmentState(next, {
      stableKey: key(next, action),
      enrollmentId: id,
      effectiveAt: next.currentDate,
      status:
        action === "return"
          ? "active"
          : action === "pause"
            ? "temporarily-inactive"
            : "withdrawn",
      contextKind: "program:life-paths2-v1",
      reason: action,
      provenance: authored,
      supersedesStateId: previous.id,
    });
  } else {
    const previous = workStatusAt(next, id)!;
    next = recordWorkStatus(next, {
      stableKey: key(next, action),
      workRelationshipId: id,
      effectiveAt: next.currentDate,
      status:
        action === "return"
          ? "active"
          : action === "pause"
            ? "temporarily-inactive"
            : "ended",
      reason: action,
      provenance: authored,
      supersedesStatusId: previous.id,
    });
  }
  return done(
    next,
    action === "return"
      ? "You returned to the path."
      : action === "pause"
        ? "You interrupted the path. Your progress is preserved."
        : "You left the path. Your history is preserved.",
  );
}

/** Known identity is a relationship/history fact; displaying a directory is not acquaintance. */
export function knownLifePathPeople(
  world: World,
  actor: EntityId,
): readonly EntityId[] {
  const ids = new Set<EntityId>();
  for (const r of world.history.relationshipInteractions)
    if (r.personIds.includes(actor))
      for (const id of r.personIds) if (id !== actor) ids.add(id);
  for (const r of world.history.kinshipRelationships)
    if (r.personIds.includes(actor))
      for (const id of r.personIds) if (id !== actor) ids.add(id);
  return [...ids].sort();
}
export function recruitLifePathPerson(
  world: World,
  personId: EntityId,
  pathId: string,
  proposedPay: number,
): LifePathResult {
  const actor = controlled(world),
    path = lifePathDefinition(pathId);
  if (path.kind !== "work" || path.scope === "public-office")
    return fail(world, "This hiring context is not supported.");
  const campaign =
    path.scope === "campaign" ? activeCampaignForCandidate(world, actor) : null;
  if (path.scope === "campaign" && !campaign)
    return fail(world, "You do not have an active campaign.");
  if (!knownLifePathPeople(world, actor).includes(personId))
    return fail(world, "You have no established contact with this person.");
  if (
    !Number.isSafeInteger(proposedPay) ||
    proposedPay < 0 ||
    (proposedPay === 0 && !path.volunteerSupported)
  )
    return fail(world, "These compensation terms are not supported.");
  const reason = lifePathEntryReason(world, personId, path);
  if (reason) return fail(world, reason);
  const previousOffer = world.history.workRelationships.find(
    (w) =>
      w.personId === personId &&
      pathForRelationship(world, w.id)?.id === pathId &&
      workStatusAt(world, w.id)?.status !== "ended",
  );
  if (previousOffer)
    return fail(world, "This person already has an engagement on this path.");
  let contextWorld = world;
  let organizationId = campaign?.organizationId;
  if (!organizationId) {
    const stableKey = `${prefix}personal-project:${actor}`;
    organizationId = world.history.organizations.find(
      (o) => o.stableKey === stableKey,
    )?.id;
    if (!organizationId) {
      contextWorld = createOrganization(world, {
        stableKey,
        formedAt: world.currentDate,
        provenance: authored,
        initialProfile: {
          name: "Personal work project (fictional)",
          classification: "community:personal-project",
          locationJurisdictionId: null,
        },
      });
      organizationId = contextWorld.history.organizations.at(-1)!.id;
    }
  }
  let next = createPathWork(
    contextWorld,
    personId,
    organizationId,
    path,
    proposedPay,
    true,
    campaign ? undefined : actor,
  );
  const work = next.history.workRelationships.at(-1)!;
  next = event(
    next,
    "offer",
    [actor, personId, work.id],
    `You proposed ${proposedPay === 0 ? "volunteer work" : `$${(proposedPay / 100).toFixed(2)} per completed shift`} as ${path.title}.`,
  );
  // Repeated offers never reroll consent. Existing commitments and an expressed
  // refusal to seek work outrank the bounded fictional response variation.
  const latestGoals = new Map<
    string,
    (typeof world.history.goalStates)[number]
  >();
  for (const g of world.history.goalStates.filter(
    (g) => g.personId === personId,
  ))
    latestGoals.set(g.goalKey, g);
  const unwilling = [...latestGoals.values()].some(
    (g) => g.status === "active" && g.goalKey === "life-paths2:decline-work",
  );
  const seeking = [...latestGoals.values()].some(
    (g) => g.status === "active" && g.goalKey === "life-paths2:seek-work",
  );
  const busy = activeWorkRelationshipsAt(world, personId).some(
    (w) => w.role.timeDemand.scheduleRigidity === "rigid",
  );
  const response =
    unwilling || busy
      ? "refused"
      : seeking
        ? proposedPay < path.sessionPayMinor
          ? "negotiated"
          : "accepted"
        : new SeededRng(
            `${world.seed}:${personId}:${pathId}:work-response-v1`,
          ).pick(
            path.sessionPayMinor === 0
              ? (["accepted", "refused"] as const)
              : (["accepted", "refused", "negotiated"] as const),
          );
  if (response === "refused") {
    const status = workStatusAt(next, work.id)!;
    next = recordWorkStatus(next, {
      stableKey: key(next, "refused"),
      workRelationshipId: work.id,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: busy ? "Unavailable for this work." : "Declined the offer.",
      provenance: authored,
      supersedesStatusId: status.id,
    });
  }
  next = event(
    next,
    `offer-${response}`,
    [actor, personId, work.id],
    response === "accepted"
      ? "The offer was accepted. Work can start tomorrow."
      : response === "refused"
        ? "The offer was declined."
        : "The person asked to discuss the compensation before agreeing.",
  );
  return done(
    next,
    response === "accepted"
      ? "Accepted; start the engagement tomorrow."
      : response === "refused"
        ? "Declined. No work was assigned."
        : "Compensation discussion requested. No work was assigned.",
  );
}
export function activateLifePathRecruit(
  world: World,
  id: EntityId,
): LifePathResult {
  const actor = controlled(world),
    work = world.history.workRelationships.find((w) => w.id === id);
  if (
    !work ||
    !world.history.events.some(
      (e) =>
        e.type === `${prefix}offer` &&
        e.involvedEntityIds.includes(id) &&
        e.involvedEntityIds.includes(actor),
    ) ||
    !hasEvent(world, "offer-accepted", id) ||
    workStatusAt(world, id)?.status !== "expected"
  )
    return fail(world, "No accepted offer is ready to start.");
  if (world.currentDate < work.startedAt)
    return fail(world, "The agreed start date has not arrived.");
  const path = pathForRelationship(world, id)!;
  if (
    path.scope === "campaign" &&
    activeCampaignForCandidate(world, actor)?.organizationId !==
      work.organizationId
  )
    return fail(
      world,
      "This campaign engagement no longer has active campaign authority.",
    );
  const reason = lifePathEntryReason(world, work.personId, path);
  if (reason) return fail(world, reason);
  let next = recordWorkStatus(world, {
    stableKey: key(world, "start-recruit"),
    workRelationshipId: id,
    effectiveAt: world.currentDate,
    status: "active",
    reason: "Started accepted engagement.",
    provenance: authored,
    supersedesStatusId: workStatusAt(world, id)!.id,
  });
  const flow = next.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === id,
  );
  if (flow) {
    const terms = resourceFlowTermsAt(next, flow.id)!;
    next = recordResourceFlowTerms(next, {
      stableKey: key(next, "activate-pay"),
      resourceFlowId: flow.id,
      effectiveAt: next.currentDate,
      status: "active",
      amount: terms.amount,
      cadenceKind: terms.cadenceKind,
      reason: null,
      provenance: authored,
      supersedesTermsId: terms.id,
    });
  }
  return done(next, "The engagement has started.");
}
export function delegateLifePathWork(
  world: World,
  id: EntityId,
): LifePathResult {
  const actor = controlled(world),
    work = world.history.workRelationships.find((w) => w.id === id),
    path = pathForRelationship(world, id);
  if (
    !work ||
    !path ||
    work.personId === actor ||
    workStatusAt(world, id)?.status !== "active" ||
    !hasEvent(world, "offer-accepted", id) ||
    !world.history.events.some(
      (e) =>
        e.type === `${prefix}offer` &&
        e.involvedEntityIds.includes(id) &&
        e.involvedEntityIds.includes(actor),
    )
  )
    return fail(
      world,
      "This person is not working for you under an accepted offer.",
    );
  if (
    path.scope === "campaign" &&
    activeCampaignForCandidate(world, actor)?.organizationId !==
      work.organizationId
  )
    return fail(
      world,
      "This campaign engagement no longer has active campaign authority.",
    );
  const restriction = lifePathEntryReason(world, work.personId, path);
  if (restriction) return fail(world, restriction);
  if (
    world.history.workItems.some(
      (i) =>
        i.sourceEntityIds.includes(id) &&
        (workItemState(world, i.id).status === "active" ||
          workItemState(world, i.id).recordedAt.date === world.currentDate),
    )
  )
    return fail(world, "This person already has an unfinished assignment.");
  let next = createWorkItem(world, {
    stableKey: key(world, "delegation"),
    title: path.title,
    summary: path.responsibility,
    jurisdictionId: null,
    sourceEntityIds: [id],
    focus: { kind: "person", personId: work.personId },
    effort: { kind: "authored-duration", requiredMinutes: path.sessionMinutes },
    access: { kind: "private", personIds: [actor, work.personId] },
    assignedPersonIds: [work.personId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  next = event(
    next,
    "delegated-assignment",
    [actor, work.personId, id, next.history.workItems.at(-1)!.id],
    "You assigned the agreed work.",
  );
  const flow = next.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === id,
  );
  if (flow)
    next = scheduleFutureDueItem(next, {
      stableKey: key(next, "delegated-pay-due"),
      dueAt: addDays(next.currentDate, 1),
      transitionKey: "life-paths2:delegated-pay",
      entityIds: [id, flow.id, next.history.events.at(-1)!.id].sort(),
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Pay the day after completion, from the actual hiring account.",
      },
    });
  return done(
    next,
    "The assignment is with them. It progresses while they are available.",
  );
}
export function departLifePathRecruit(
  world: World,
  id: EntityId,
): LifePathResult {
  const actor = controlled(world),
    work = world.history.workRelationships.find((w) => w.id === id);
  if (
    !work ||
    workStatusAt(world, id)?.status !== "active" ||
    !world.history.events.some(
      (e) =>
        e.type === `${prefix}offer` &&
        e.involvedEntityIds.includes(actor) &&
        e.involvedEntityIds.includes(id),
    )
  )
    return fail(world, "This engagement is not active.");
  const next = recordWorkStatus(world, {
    stableKey: key(world, "departure"),
    workRelationshipId: id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: "The engagement ended.",
    provenance: authored,
    supersedesStatusId: workStatusAt(world, id)!.id,
  });
  return done(
    event(
      next,
      "departure",
      [actor, work.personId, id],
      "The engagement ended.",
    ),
    "The engagement ended. No further delegated work will progress.",
  );
}

export interface EducationOpportunityProvider {
  /** Only explicit program capabilities belong here; directory identities do not. */
  opportunities(
    world: World,
    personId: EntityId,
  ): readonly {
    readonly organizationId: EntityId;
    readonly program: LifePathDefinition;
    readonly capabilityEvidence: string;
  }[];
}
export type PublicEmploymentPermissionProvider = LifeEligibilityProvider;

export { activeLifePathWorkers } from "./life-paths2-workers";

export function acceptLifePathCounteroffer(
  world: World,
  id: EntityId,
): LifePathResult {
  const actor = controlled(world),
    work = world.history.workRelationships.find((w) => w.id === id),
    path = pathForRelationship(world, id);
  if (
    !work ||
    !path ||
    workStatusAt(world, id)?.status !== "expected" ||
    !hasEvent(world, "offer-negotiated", id) ||
    hasEvent(world, "offer-accepted", id) ||
    !world.history.events.some(
      (e) =>
        e.type === `${prefix}offer` &&
        e.involvedEntityIds.includes(actor) &&
        e.involvedEntityIds.includes(id),
    )
  )
    return fail(world, "There is no outstanding counteroffer.");
  const flow = world.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === id,
  );
  if (!flow) return fail(world, "No monetary counteroffer was proposed.");
  if (world.currentDate < work.startedAt)
    return fail(
      world,
      "The revised agreement can begin on the proposed start date.",
    );
  const terms = resourceFlowTermsAt(world, flow.id)!;
  const amount = money(
    Math.max(terms.amount.minorUnits, Math.ceil(path.sessionPayMinor * 1.25)),
    "USD",
  );
  let next = recordResourceFlowTerms(world, {
    stableKey: key(world, "counteroffer"),
    resourceFlowId: flow.id,
    effectiveAt: world.currentDate,
    status: "active",
    amount,
    cadenceKind: terms.cadenceKind,
    reason: "Agreed fictional counteroffer.",
    provenance: authored,
    supersedesTermsId: terms.id,
  });
  next = event(
    next,
    "offer-accepted",
    [actor, work.personId, id],
    `You agreed to $${(amount.minorUnits / 100).toFixed(2)} per completed assignment.`,
  );
  return done(next, "The revised terms were accepted.");
}

/** Authored progression changes actual compensation, without inventing experience on reads. */
export function progressLifePathWork(
  world: World,
  id: EntityId,
): LifePathResult {
  const actor = controlled(world);
  const work = world.history.workRelationships.find((w) => w.id === id);
  const path = pathForRelationship(world, id);
  if (
    !work ||
    !path ||
    work.personId !== actor ||
    workStatusAt(world, id)?.status !== "active"
  )
    return fail(world, "This work is not active for you.");
  const shifts = world.history.events.filter(
    (e) =>
      e.type === `${prefix}work-session` && e.involvedEntityIds.includes(id),
  );
  if (
    shifts.length < 10 ||
    shifts.some((e) => e.occurredAt === world.currentDate) ||
    hasEvent(world, "work-progression", id)
  )
    return fail(
      world,
      "Progression is available after ten completed shifts, beginning on a later day.",
    );
  const flow = world.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === id,
  );
  if (!flow)
    return fail(world, "This volunteer engagement has no paid progression.");
  const terms = resourceFlowTermsAt(world, flow.id)!;
  let next = recordResourceFlowTerms(world, {
    stableKey: key(world, "raise"),
    resourceFlowId: flow.id,
    effectiveAt: world.currentDate,
    status: "active",
    amount: money(
      terms.amount.minorUnits + Math.ceil(terms.amount.minorUnits / 10),
      "USD",
    ),
    cadenceKind: terms.cadenceKind,
    reason: "Authored progression after ten completed shifts.",
    provenance: authored,
    supersedesTermsId: terms.id,
  });
  next = event(
    next,
    "work-progression",
    [actor, id],
    "You accepted the next pay step for future shifts.",
  );
  return done(
    next,
    "Your future shifts use the higher pay rate. Earlier earnings are unchanged.",
  );
}
