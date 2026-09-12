import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { recordEducationEnrollmentState } from "./life";
import { recordWorldEvent } from "./world";
import type { FutureDueItem } from "./types";
import type { FutureTransitionHandler } from "./types";
import { educationEnrollmentStateAt } from "./life-queries";
import {
  scheduleFutureDueItem,
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { cancelScheduledActivity, scheduledActivityState } from "./time-work";
import { addDays } from "./dates";
import type { LifePathDefinition } from "./life-paths2-catalog";
import type { EntityId, IsoDate, World } from "./types";

const prefix = "life-paths2.";
const periodDueKey = "education:study-period-due" as const;
const authored = {
  kind: "authored" as const,
  note: "WEEKEND19-F period study progression.",
};

export function studyUsesPeriodModel(path: LifePathDefinition): boolean {
  return path.progressionModel === "periods";
}

/**
 * Reads accepted legacy session terms as one period without rewriting their
 * evidence artifact. The original duration, session count, unit price and
 * credential remain in the saved terms; only the future interaction changes.
 */
export function periodizedStudyPath(
  path: LifePathDefinition,
): LifePathDefinition {
  if (studyUsesPeriodModel(path) || path.kind !== "study") return path;
  const requiredSessions = path.requiredSessions ?? 0;
  if (requiredSessions <= 0) return path;
  return {
    ...path,
    progressionModel: "periods",
    academicYears: 1,
    periodsPerYear: 1,
    daysPerPeriod: Math.max(1, path.minimumElapsedDays),
    periodCostMinor: requiredSessions * path.sessionCostMinor,
  };
}

export function totalStudyPeriods(path: LifePathDefinition): number {
  if (!studyUsesPeriodModel(path)) return 0;
  return (path.academicYears ?? 0) * (path.periodsPerYear ?? 2);
}

export function minimumStudyElapsedDays(path: LifePathDefinition): number {
  if (!studyUsesPeriodModel(path)) return path.minimumElapsedDays;
  if (path.minimumElapsedDays > 0) return path.minimumElapsedDays;
  return totalStudyPeriods(path) * (path.daysPerPeriod ?? 182);
}

export function completedStudyPeriods(
  world: World,
  enrollmentId: EntityId,
  path?: LifePathDefinition,
): number {
  const recorded = world.history.events.filter(
    (e) =>
      e.type === `${prefix}study-period` &&
      e.involvedEntityIds.includes(enrollmentId),
  ).length;
  if (!path || !studyUsesPeriodModel(path) || !path.requiredSessions)
    return recorded;
  const legacySessions = completedStudySessions(world, enrollmentId);
  const credited = Math.floor(
    (legacySessions * totalStudyPeriods(path)) / path.requiredSessions,
  );
  return Math.min(totalStudyPeriods(path), credited + recorded);
}

function completedStudySessions(world: World, enrollmentId: EntityId): number {
  return world.history.events.filter(
    (event) =>
      event.type === `${prefix}study-session` &&
      event.involvedEntityIds.includes(enrollmentId),
  ).length;
}

function paidPeriodTuitionMinor(world: World, enrollmentId: EntityId): number {
  const flowIds = new Set(
    world.history.resourceFlows
      .filter(
        (flow) =>
          flow.basisKind === "obligation:tuition" &&
          flow.stableKey.includes(`study-period:${enrollmentId}:`),
      )
      .map((flow) => flow.id),
  );
  return world.history.resourceTransferOutcomes
    .filter(
      (outcome) =>
        flowIds.has(outcome.resourceFlowId) && outcome.status === "completed",
    )
    .reduce(
      (total, outcome) => total + outcome.transferredAmount.minorUnits,
      0,
    );
}

export function paidStudyPeriods(world: World, enrollmentId: EntityId): number {
  return world.history.resourceTransferOutcomes.filter((o) =>
    world.history.resourceFlows.some(
      (f) =>
        f.id === o.resourceFlowId &&
        f.basisKind === "obligation:tuition" &&
        f.stableKey.includes(`study-period:${enrollmentId}:`),
    ),
  ).length;
}

export function enrollmentStudyModel(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): "sessions" | "periods" {
  return studyUsesPeriodModel(path) ? "periods" : "sessions";
}

export function studyPeriodDueDate(
  startedAt: IsoDate,
  path: LifePathDefinition,
  periodNumber: number,
): IsoDate {
  const intervalDue = addDays(
    startedAt,
    periodNumber * (path.daysPerPeriod ?? 182),
  );
  return periodNumber >= totalStudyPeriods(path)
    ? ([intervalDue, addDays(startedAt, minimumStudyElapsedDays(path))]
        .sort()
        .at(-1) as IsoDate)
    : intervalDue;
}

export function studyProgressSummary(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): {
  model: "sessions" | "periods";
  completed: number;
  total: number;
  academicYear: number;
  periodInYear: number;
  nextDueDate: IsoDate | null;
  periodCostMinor: number;
  totalCostMinor: number;
} {
  const model = enrollmentStudyModel(world, enrollmentId, path);
  if (model === "sessions") {
    const completed = world.history.events.filter(
      (e) =>
        e.type === `${prefix}study-session` &&
        e.involvedEntityIds.includes(enrollmentId),
    ).length;
    return {
      model: "sessions",
      completed,
      total: path.requiredSessions ?? 0,
      academicYear: 0,
      periodInYear: 0,
      nextDueDate: null,
      periodCostMinor: path.sessionCostMinor,
      totalCostMinor: (path.requiredSessions ?? 0) * path.sessionCostMinor,
    };
  }
  const total = totalStudyPeriods(path);
  const completed = completedStudyPeriods(world, enrollmentId, path);
  const periodsPerYear = path.periodsPerYear ?? 2;
  const academicYear =
    completed < total
      ? Math.floor(completed / periodsPerYear) + 1
      : Math.ceil(total / periodsPerYear);
  const periodInYear =
    completed < total ? (completed % periodsPerYear) + 1 : periodsPerYear;
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  const nextDueDate =
    enrollment && completed < total
      ? studyPeriodDueDate(enrollment.startedAt, path, completed + 1)
      : null;
  const periodCost = path.periodCostMinor ?? 0;
  return {
    model: "periods",
    completed,
    total,
    academicYear,
    periodInYear,
    nextDueDate,
    periodCostMinor: periodCost,
    totalCostMinor: total * periodCost,
  };
}

function periodDueStableKey(
  enrollmentId: EntityId,
  period: number,
  sequence: number,
): string {
  return `${prefix}study-period-due:${enrollmentId}:${period}:${sequence}`;
}

function hasScheduledStudyPeriodDue(
  world: World,
  enrollmentId: EntityId,
  periodNumber: number,
): boolean {
  return world.history.futureDueItems.some((due) => {
    if (
      due.transitionKey !== periodDueKey ||
      !due.entityIds.includes(enrollmentId) ||
      !due.stableKey.includes(`:${periodNumber}:`)
    )
      return false;
    return (
      futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled"
    );
  });
}

export function scheduleStudyPeriodDue(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
  periodNumber: number,
): World {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment) throw new Error("Missing enrollment");
  if (hasScheduledStudyPeriodDue(world, enrollmentId, periodNumber))
    return world;
  let dueAt = studyPeriodDueDate(enrollment.startedAt, path, periodNumber);
  if (dueAt <= world.currentDate) dueAt = addDays(world.currentDate, 1);
  return scheduleFutureDueItem(world, {
    stableKey: periodDueStableKey(
      enrollmentId,
      periodNumber,
      world.history.nextSequence,
    ),
    dueAt,
    transitionKey: periodDueKey,
    entityIds: [enrollmentId],
    jurisdictionId: null,
    provenance: authored,
  });
}

export function cancelStudyPeriodDues(
  world: World,
  enrollmentId: EntityId,
): World {
  let next = world;
  for (const due of world.history.futureDueItems.filter(
    (d) =>
      d.transitionKey === periodDueKey && d.entityIds.includes(enrollmentId),
  )) {
    if (
      futureDueItemStateAt(next, due.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      })?.status === "scheduled"
    )
      next = cancelFutureDueItem(next, {
        stableKey: `cancel:${due.stableKey}`,
        dueItemId: due.id,
        effectiveAt: next.currentDate,
        reasonKey: "education:study-interrupted",
        context: "Study interrupted; period due cancelled.",
      });
  }
  return next;
}

export function bootstrapStudyPeriodProgression(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): World {
  if (!studyUsesPeriodModel(path)) return world;
  const completed = completedStudyPeriods(world, enrollmentId, path);
  const total = totalStudyPeriods(path);
  if (completed >= total) return world;
  return scheduleStudyPeriodDue(world, enrollmentId, path, completed + 1);
}

function event(
  world: World,
  type: string,
  ids: EntityId[],
  summary: string,
): World {
  const personId =
    world.history.educationEnrollments.find((e) => ids.includes(e.id))
      ?.personId ?? null;
  if (!personId) throw new Error("Missing study actor");
  return recordWorldEvent(world, {
    stableKey: `${prefix}${type}:${world.history.nextSequence}`,
    type: `${prefix}${type}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId, ...ids],
    participants: [{ personId, role: "agency:student", detail: summary }],
    personFactConstraints: [],
    visibility: "private",
    tags: ["education", "study-period"],
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

export function completeStudyPeriod(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): World {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment) throw new Error("Missing enrollment");
  const status = educationEnrollmentStateAt(world, enrollmentId)?.status;
  if (status !== "active") return world;
  const periodNumber = completedStudyPeriods(world, enrollmentId, path) + 1;
  const total = totalStudyPeriods(path);
  if (periodNumber > total) return world;
  const legacyPaid =
    completedStudySessions(world, enrollmentId) * path.sessionCostMinor;
  const cost = Math.max(
    0,
    periodNumber * (path.periodCostMinor ?? 0) -
      legacyPaid -
      paidPeriodTuitionMinor(world, enrollmentId),
  );
  const actor = enrollment.personId;
  let next =
    cost > 0
      ? ensureLifePathPersonalPosition(world, actor, money(0, "USD").currency)
      : world;
  if (
    cost > 0 &&
    (resourcePositionAt(
      next,
      { kind: "person", personId: actor },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits ?? 0) < cost
  ) {
    // Looking for carried transfer evidence must not itself invent a zeroed
    // account when the period cannot be paid. A refusal preserves the incoming
    // world exactly; the due-item resolver records the structured blocker.
    return world;
  }
  if (cost > 0) {
    next = createResourceFlow(next, {
      stableKey: `${prefix}study-period:${enrollmentId}:${periodNumber}`,
      source: { kind: "person", personId: actor },
      recipient: {
        kind: "organization",
        organizationId: enrollment.organizationId,
      },
      startsAt: next.currentDate,
      amount: money(cost, "USD"),
      cadenceKind: "schedule:one-time",
      basisKind: "obligation:tuition",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: authored,
    });
    next = recordResourceTransferOutcome(next, {
      stableKey: `${prefix}study-period-paid:${enrollmentId}:${periodNumber}`,
      resourceFlowId: next.history.resourceFlows.at(-1)!.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      status: "completed",
      attemptedAmount: money(cost, "USD"),
      transferredAmount: money(cost, "USD"),
      reasonKind: null,
      note: `${path.title} — period ${periodNumber} of ${total}`,
      provenance: authored,
    });
  }
  next = event(
    next,
    "study-period",
    [enrollmentId],
    `You completed study period ${periodNumber} of ${total} for ${path.title}.`,
  );
  if (periodNumber >= total) {
    const state = educationEnrollmentStateAt(next, enrollmentId)!;
    next = recordEducationEnrollmentState(next, {
      stableKey: `${prefix}credential:${enrollmentId}`,
      enrollmentId,
      effectiveAt: next.currentDate,
      status: "completed",
      contextKind:
        educationEnrollmentStateAt(next, enrollmentId)?.contextKind ??
        "program:life-paths2-v1",
      reason: path.credential!,
      provenance: authored,
      supersedesStateId: state.id,
    });
    next = event(
      next,
      "credential",
      [actor, enrollmentId],
      `You completed ${path.credential}.`,
    );
    return next;
  }
  if (periodNumber < total)
    next = scheduleStudyPeriodDue(next, enrollmentId, path, periodNumber + 1);
  return next;
}

export const EDUCATION_STUDY_PERIOD_DUE_KEY = periodDueKey;

export type StudyPathResolver = (
  world: World,
  enrollmentId: EntityId,
) => LifePathDefinition | undefined;

export const educationStudyPeriodDueHandler: FutureTransitionHandler = (
  world,
  due: FutureDueItem,
) => {
  const enrollmentId = due.entityIds[0];
  if (!enrollmentId)
    throw new Error("Missing enrollment for study period due.");
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment)
    throw new Error("Study period due references a missing enrollment.");
  const path = resolveStudyPath(world, enrollmentId);
  if (!path || !studyUsesPeriodModel(path)) {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "Study period due ignored for unsupported saved terms.",
      outcomeEventId: null,
    };
  }
  const status = educationEnrollmentStateAt(world, enrollmentId)?.status;
  if (status !== "active") {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "Enrollment no longer active.",
      outcomeEventId: null,
    };
  }
  const before = completedStudyPeriods(world, enrollmentId, path);
  const next = completeStudyPeriod(world, enrollmentId, path);
  const after = completedStudyPeriods(next, enrollmentId, path);
  if (after === before) {
    return {
      world: next,
      status: "blocked",
      reasonKey: "education:insufficient-tuition",
      context: "Tuition due but liquid funds are insufficient.",
      outcomeEventId: null,
    };
  }
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Study period ${after} completed.`,
    outcomeEventId: null,
  };
};

let studyPathResolver: StudyPathResolver | null = null;

export function registerStudyPathResolver(resolver: StudyPathResolver): void {
  studyPathResolver = resolver;
}

function resolveStudyPath(
  world: World,
  enrollmentId: EntityId,
): LifePathDefinition | undefined {
  if (!studyPathResolver)
    throw new Error("Study path resolver is not registered.");
  return studyPathResolver(world, enrollmentId);
}

/**
 * Import/normal-play migration seam for active studies created before period
 * progression. It is append-only: old sessions and payments remain evidence,
 * an obsolete open session is cancelled, and one canonical future due item is
 * scheduled for the remaining period work.
 */
export function migrateLegacyStudyProgression(world: World): World {
  let next = world;
  for (const enrollment of world.history.educationEnrollments) {
    if (educationEnrollmentStateAt(next, enrollment.id)?.status !== "active")
      continue;
    const raw = resolveStudyPath(next, enrollment.id);
    if (!raw) continue;
    const path = periodizedStudyPath(raw);
    if (!studyUsesPeriodModel(path)) continue;
    for (const activity of next.history.scheduledActivities.filter(
      (candidate) => candidate.sourceEntityIds.includes(enrollment.id),
    )) {
      if (scheduledActivityState(next, activity.id).status === "scheduled")
        next = cancelScheduledActivity(next, activity.id);
    }
    next = bootstrapStudyPeriodProgression(next, enrollment.id, path);
  }
  return next;
}
