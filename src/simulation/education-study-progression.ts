import { financeStudentTuitionWithSavedAidFacts } from "./student-aid-facts";
import type { RecordedStudentFinancingInput } from "./student-debt";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { resourcePositionAt, resourceFlowTermsAt } from "./resource-queries";
import { recordEducationEnrollmentState } from "./life";
import { recordWorldEvent } from "./world";
import type { FutureDueItem } from "./types";
import type { FutureTransitionHandler } from "./types";
import { educationEnrollmentStateAt, assessLifeLoadAt } from "./life-queries";
import {
  scheduleFutureDueItem,
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { cancelScheduledActivity, scheduledActivityState } from "./time-work";
import { addDays, daysBetween, spokenDate } from "./dates";
import type { LifePathDefinition } from "./life-paths2-catalog";
import type { EntityId, IsoDate, World } from "./types";
import {
  recordedTuitionFreezePrice,
  recordedStudyPeriodTuitionPrice,
} from "../education/tuition-prices";
import { TUITION_FREEZE_ROW } from "./law-consequences/tuition-freeze-row";
import {
  resolvePriceCostConsequences,
  applyPriceCostConsequence,
} from "./law-consequences/price-cost";
import { settleTuitionFreezeBackfill } from "./public-budgets/tuition-freeze-backfill";
import { organizationProfileAt } from "./life-queries";
import { stateJurisdictionOf } from "./governing/law-in-force";

const prefix = "life-paths2.";

/**
 * What the journal and the day report say when a period's tuition goes
 * unpaid. Plain words and a spoken date: this is a sentence the player reads,
 * not a note about how the grace was configured.
 */
export function tuitionGraceSentence(deadline: IsoDate | string): string {
  return `Your tuition is unpaid. You have until ${spokenDate(deadline)} to pay it before your studies pause.`;
}
export const TUITION_PAUSED_SENTENCE =
  "Your tuition was still unpaid at the deadline, so your studies are paused. Your work and pay carry on.";

/**
 * The same two sentences for a save written before they were plain. The
 * recorded summary stays as it was; only what the player reads is new.
 */
export function readableTuitionSummary(summary: string): string {
  const grace =
    /^Tuition is unpaid\. Your accepted authored grace deadline is (\d{4}-\d{2}-\d{2});/.exec(
      summary,
    );
  if (grace) return tuitionGraceSentence(grace[1]!);
  if (
    summary ===
    "Tuition remained unfunded at its deadline. Study paused; work, pay and the World continue."
  )
    return TUITION_PAUSED_SENTENCE;
  return summary;
}
const periodDueKey = "education:study-period-due" as const;

/*
 * CREDITS (A141). Finishing paid study time does not by itself grant a
 * credential: each period records the credits the student attempted and the
 * credits they earned, and the credential is granted only once the credits
 * earned reach the program's requirement.
 *
 * - Requirements are the usual credit totals: 30 for a one-year certificate,
 *   60 for an associate degree, 120 for a bachelor's degree, 36 for a
 *   master's degree, and 83 for a J.D., the American Bar Association's floor
 *   (Standard 311(a)). A term saved before this reads thirty credits an
 *   academic year, the on-time pace of a 120-credit bachelor's degree.
 * - A student attempts the program's on-time share each period, or what is
 *   left once past the planned periods.
 * - How much of that they earn slides with the hours they already owe
 *   elsewhere each week (work and care, from the life-load record): no draw
 *   and no cutoff. Students working long hours complete fewer of the credits
 *   they attempt (NCES, The Condition of Education, college student
 *   employment); the curve's size follows the recorded study-load rule, research question
 *   `credits-earned-and-outside-hours`.
 * - A student short of credits after the planned periods keeps studying, and
 *   paying, one period at a time, up to one and a half times the planned
 *   length: the federal maximum timeframe for satisfactory academic progress
 *   (34 CFR 668.34(b)). Past that, the enrollment ends without the
 *   credential.
 */
export const STUDY_CREDIT_PACE = {
  basis: "recorded study-load rule",
  researchQuestionId: "credits-earned-and-outside-hours",
  /** Credits an academic year when a saved term carries no requirement. */
  creditsPerAcademicYear: 30,
  /** Weekly hours owed elsewhere that cost a student no credits. */
  outsideHoursWithoutStrain: 15,
  /** Further weekly hours over which the credits earned fall by half. */
  outsideHoursToHalve: 30,
} as const;

/** The federal maximum timeframe: 150% of the program's planned length. */
const MAXIMUM_TIMEFRAME_MULTIPLE = 1.5;

/** The credits the credential requires. */
export function studyCreditsRequired(path: LifePathDefinition): number {
  return (
    path.creditsRequired ??
    (path.academicYears ?? 0) * STUDY_CREDIT_PACE.creditsPerAcademicYear
  );
}

const ATTEMPTED_TAG = "credits-attempted:";
const EARNED_TAG = "credits-earned:";

function studyPeriodEvents(world: World, enrollmentId: EntityId) {
  return world.history.events.filter(
    (e) =>
      e.type === `${prefix}study-period` &&
      e.involvedEntityIds.includes(enrollmentId),
  );
}

/**
 * The credits a student has earned in this enrollment. A period recorded
 * before credits were (and legacy sessions credited as periods) earned the
 * on-time share it was planned to carry.
 */
export function studyCreditsEarned(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): number {
  const perPeriod = onTimeCreditsPerPeriod(path);
  let earned = 0;
  let recordedPeriods = 0;
  for (const row of studyPeriodEvents(world, enrollmentId)) {
    recordedPeriods += 1;
    const tag = row.tags.find((t) => t.startsWith(EARNED_TAG));
    earned += tag ? Number(tag.slice(EARNED_TAG.length)) : perPeriod;
  }
  const legacyPeriods =
    completedStudyPeriods(world, enrollmentId, path) - recordedPeriods;
  return earned + Math.max(0, legacyPeriods) * perPeriod;
}

function onTimeCreditsPerPeriod(path: LifePathDefinition): number {
  const total = totalStudyPeriods(path);
  return total > 0 ? studyCreditsRequired(path) / total : 0;
}

/**
 * The share of attempted credits a student earns, from the weekly hours they
 * owe elsewhere. Slides from 1 with no strain down toward 0.
 */
export function creditsEarnedShare(outsideWeeklyHours: number): number {
  const excess = Math.max(
    0,
    outsideWeeklyHours - STUDY_CREDIT_PACE.outsideHoursWithoutStrain,
  );
  return 1 / (1 + excess / STUDY_CREDIT_PACE.outsideHoursToHalve);
}

/**
 * How many periods this enrollment runs for now: the planned number, or, for
 * a student still short of credits at the end of it, one more at a time up
 * to the maximum timeframe.
 */
export function studyPeriodsPlanned(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): number {
  const total = totalStudyPeriods(path);
  const completed = completedStudyPeriods(world, enrollmentId, path);
  if (completed < total) return total;
  if (
    studyCreditsEarned(world, enrollmentId, path) >= studyCreditsRequired(path)
  )
    return completed;
  return Math.min(completed + 1, Math.ceil(total * MAXIMUM_TIMEFRAME_MULTIPLE));
}
const graceDuePrefix = `${prefix}study-grace-deadline:`;
const authored = {
  kind: "authored" as const,
  note: "WEEKEND19-F period study progression.",
};

export function studyUsesPeriodModel(path: LifePathDefinition): boolean {
  return path.progressionModel === "periods";
}

/** Add accepted active study to canonical work/care ranges, not a capacity score. */
export function routineWeeklyLoad(world: World, personId: EntityId) {
  const load = assessLifeLoadAt(world, personId);
  let minimumHours = load.expectedWeekly.minimumHours,
    maximumHours = load.expectedWeekly.maximumHours,
    commitments = load.contributors.length;
  for (const enrollment of world.history.educationEnrollments) {
    if (
      enrollment.personId !== personId ||
      educationEnrollmentStateAt(world, enrollment.id)?.status !== "active"
    )
      continue;
    const path = resolveStudyPath(world, enrollment.id);
    if (!path) continue;
    minimumHours += path.timeDemand.expectedWeekly.minimumHours;
    maximumHours += path.timeDemand.expectedWeekly.maximumHours;
    commitments += 1;
  }
  return { minimumHours, maximumHours, commitments };
}

/** Paused dates are preserved evidence, not attended study time. */
function studyInactiveDays(world: World, enrollmentId: EntityId): number {
  const states = world.history.educationEnrollmentStates.filter(
    (s) => s.enrollmentId === enrollmentId,
  );
  let inactive = 0;
  for (let i = 0; i < states.length; i += 1) {
    const state = states[i]!;
    if (state.status === "temporarily-inactive")
      inactive += Math.max(
        0,
        daysBetween(
          state.effectiveAt,
          states[i + 1]?.effectiveAt ?? world.currentDate,
        ),
      );
  }
  return inactive;
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
  return Math.min(totalStudyPeriods(path), credited) + recorded;
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
  return world.history.resourceTransferOutcomes.filter(
    (o) =>
      o.status === "completed" &&
      world.history.resourceFlows.some(
        (f) =>
          f.id === o.resourceFlowId &&
          f.basisKind === "obligation:tuition" &&
          f.stableKey.includes(`study-period:${enrollmentId}:`),
      ),
  ).length;
}

export function studyPeriodTuitionOutstanding(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): number {
  const period = completedStudyPeriods(world, enrollmentId, path) + 1;
  if (period > studyPeriodsPlanned(world, enrollmentId, path)) return 0;
  const price = recordedStudyPeriodTuitionPrice(world, enrollmentId, period);
  if (price) {
    const charge = world.history.resourceFlows.find(
      (flow) =>
        flow.stableKey === `${prefix}study-period:${enrollmentId}:${period}`,
    );
    const terms = charge && resourceFlowTermsAt(world, charge.id);
    const paid = charge
      ? world.history.resourceTransferOutcomes
          .filter(
            (outcome) =>
              outcome.resourceFlowId === charge.id &&
              (outcome.status === "completed" || outcome.status === "partial"),
          )
          .reduce(
            (total, outcome) => total + outcome.transferredAmount.minorUnits,
            0,
          )
      : 0;
    const amount = terms
      ? price.cap === null
        ? terms.amount.minorUnits
        : Math.min(terms.amount.minorUnits, price.cap)
      : price.amountMinor;
    return Math.max(0, amount - paid);
  }
  const frozen = recordedTuitionFreezePrice(world, enrollmentId);
  if (frozen.status === "frozen") {
    const charge = world.history.resourceFlows.find(
      (flow) =>
        flow.stableKey === `${prefix}study-period:${enrollmentId}:${period}`,
    );
    if (charge) {
      const terms = resourceFlowTermsAt(world, charge.id);
      if (terms) {
        const paid = world.history.resourceTransferOutcomes
          .filter(
            (outcome) =>
              outcome.resourceFlowId === charge.id &&
              (outcome.status === "completed" || outcome.status === "partial"),
          )
          .reduce(
            (total, outcome) => total + outcome.transferredAmount.minorUnits,
            0,
          );
        return Math.max(
          0,
          Math.min(terms.amount.minorUnits, frozen.amountMinor) - paid,
        );
      }
    }
    const periodCost = path.periodCostMinor ?? 0;
    const remainingLegacyCredit = Math.max(
      0,
      completedStudySessions(world, enrollmentId) * path.sessionCostMinor -
        (period - 1) * periodCost,
    );
    return Math.max(
      0,
      Math.min(periodCost, frozen.amountMinor) - remainingLegacyCredit,
    );
  }
  return Math.max(
    0,
    period * (path.periodCostMinor ?? 0) -
      completedStudySessions(world, enrollmentId) * path.sessionCostMinor -
      paidPeriodTuitionMinor(world, enrollmentId),
  );
}

function gracePeriod(
  due: FutureDueItem,
  enrollmentId: EntityId,
): number | null {
  const start = `${graceDuePrefix}${enrollmentId}:`;
  if (!due.stableKey.startsWith(start)) return null;
  const number = Number(due.stableKey.slice(start.length).split(":")[0]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/** Actual pending tuition/deadline records, not a guessed penalty or debt. */
export function studyTuitionStatus(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
) {
  const completed = completedStudyPeriods(world, enrollmentId, path);
  const state = educationEnrollmentStateAt(world, enrollmentId);
  const deadline = world.history.futureDueItems.find(
    (due) =>
      due.transitionKey === periodDueKey &&
      due.entityIds.includes(enrollmentId) &&
      gracePeriod(due, enrollmentId) === completed + 1 &&
      futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
  const paused =
    state?.status === "temporarily-inactive" &&
    world.history.events.some(
      (e) =>
        e.type === `${prefix}tuition-paused` &&
        e.involvedEntityIds.includes(enrollmentId) &&
        e.tags.includes(`tuition-pause-state:${state.id}`),
    );
  const blocked = world.history.futureDueItems.some(
    (due) =>
      due.transitionKey === periodDueKey &&
      due.entityIds.includes(enrollmentId) &&
      due.stableKey.startsWith(
        `${prefix}study-period-due:${enrollmentId}:${completed + 1}:`,
      ) &&
      futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.reasonKey === "education:insufficient-tuition",
  );
  if (
    completed >= studyPeriodsPlanned(world, enrollmentId, path) ||
    (!deadline && !paused && (!blocked || state?.status !== "active"))
  )
    return null;
  const amountMinor = studyPeriodTuitionOutstanding(world, enrollmentId, path);
  if (amountMinor <= 0) return null;
  return {
    deadline: deadline?.dueAt ?? null,
    paused: !!paused,
    period: completed + 1,
    amountMinor,
  };
}

export function cancelStudyGraceDeadlines(
  world: World,
  enrollmentId: EntityId,
): World {
  let next = world;
  for (const due of world.history.futureDueItems.filter((d) =>
    d.stableKey.startsWith(`${graceDuePrefix}${enrollmentId}:`),
  )) {
    if (
      futureDueItemStateAt(next, due.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      })?.status === "scheduled"
    ) {
      next = cancelFutureDueItem(next, {
        stableKey: `cancel:${due.stableKey}`,
        dueItemId: due.id,
        effectiveAt: next.currentDate,
        reasonKey: "education:tuition-settled",
        context:
          "Tuition was settled explicitly; no second payment at the deadline.",
      });
    }
  }
  return next;
}

function pauseUnfundedStudy(world: World, enrollmentId: EntityId): World {
  const state = educationEnrollmentStateAt(world, enrollmentId);
  if (state?.status !== "active") return world;
  let next = recordEducationEnrollmentState(world, {
    stableKey: `${prefix}tuition-pause:${enrollmentId}:${world.history.nextSequence}`,
    enrollmentId,
    effectiveAt: world.currentDate,
    status: "temporarily-inactive",
    contextKind: state.contextKind,
    reason:
      "Tuition remained unfunded at its disclosed deadline. Study is paused; ordinary life continues.",
    provenance: authored,
    supersedesStateId: state.id,
  });
  next = event(
    next,
    "tuition-paused",
    [enrollmentId],
    TUITION_PAUSED_SENTENCE,
    [
      `tuition-pause-state:${next.history.educationEnrollmentStates.at(-1)!.id}`,
    ],
  );
  return next;
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
  const total = studyPeriodsPlanned(world, enrollmentId, path);
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
      ? addDays(
          studyPeriodDueDate(enrollment.startedAt, path, completed + 1),
          studyInactiveDays(world, enrollmentId),
        )
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
      !(
        due.stableKey.startsWith(
          `${prefix}study-period-due:${enrollmentId}:${periodNumber}:`,
        ) ||
        due.stableKey.startsWith(
          `${graceDuePrefix}${enrollmentId}:${periodNumber}:`,
        )
      )
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
  let dueAt = addDays(
    studyPeriodDueDate(enrollment.startedAt, path, periodNumber),
    studyInactiveDays(world, enrollmentId),
  );
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
        context: "Study interrupted; period due canceled.",
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
  if (completed >= studyPeriodsPlanned(world, enrollmentId, path)) return world;
  return scheduleStudyPeriodDue(world, enrollmentId, path, completed + 1);
}

function event(
  world: World,
  type: string,
  ids: EntityId[],
  summary: string,
  extraTags: readonly string[] = [],
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
    tags: ["education", "study-period", ...extraTags],
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
  financing?: Omit<
    RecordedStudentFinancingInput,
    "enrollmentId" | "tuitionFlowId"
  >,
): World {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment) throw new Error("Missing enrollment");
  const status = educationEnrollmentStateAt(world, enrollmentId)?.status;
  if (status !== "active") return world;
  const periodNumber = completedStudyPeriods(world, enrollmentId, path) + 1;
  const total = totalStudyPeriods(path);
  if (periodNumber > studyPeriodsPlanned(world, enrollmentId, path))
    return world;
  if (
    world.currentDate <
    addDays(
      studyPeriodDueDate(enrollment.startedAt, path, periodNumber),
      studyInactiveDays(world, enrollmentId),
    )
  )
    return world;
  const actor = enrollment.personId;
  let next = world;
  const chargeKey = `${prefix}study-period:${enrollmentId}:${periodNumber}`;
  let charge = next.history.resourceFlows.find(
    (record) => record.stableKey === chargeKey,
  );
  let cost = charge
    ? resourceFlowTermsAt(next, charge.id)!.amount.minorUnits
    : (recordedStudyPeriodTuitionPrice(world, enrollmentId, periodNumber)
        ?.currentAmountMinor ??
      studyPeriodTuitionOutstanding(world, enrollmentId, path));
  if (cost > 0 && !charge) {
    next = createResourceFlow(next, {
      stableKey: chargeKey,
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
      jurisdictionId: organizationProfileAt(next, enrollment.organizationId)
        ?.locationJurisdictionId
        ? stateJurisdictionOf(
            organizationProfileAt(next, enrollment.organizationId)!
              .locationJurisdictionId!,
          )
        : null,
      provenance: authored,
    });
    charge = next.history.resourceFlows.at(-1)!;
  }
  if (charge) {
    const terms = resourceFlowTermsAt(next, charge.id)!;
    const alreadyPaid = next.history.resourceTransferOutcomes.some(
      (outcome) =>
        outcome.resourceFlowId === charge.id && outcome.status === "completed",
    );
    if (terms.status === "active" && !alreadyPaid) {
      for (const resolved of resolvePriceCostConsequences(
        next,
        TUITION_FREEZE_ROW,
        {
          onDate: next.currentDate,
          activity: "payment",
          activityId: terms.id,
          subjectIds: [actor],
        },
      ))
        next = applyPriceCostConsequence(next, resolved);
    }
    cost = resourceFlowTermsAt(next, charge.id)!.amount.minorUnits;
  }
  if (cost > 0 && charge && financing)
    next = financeStudentTuitionWithSavedAidFacts(
      next,
      { ...financing, enrollmentId, tuitionFlowId: charge.id },
      path,
    );
  const cash = resourcePositionAt(
    next,
    { kind: "person", personId: actor },
    money(0, "USD").currency,
  );
  if (cost > 0 && (!cash || cash.liquidBalance.minorUnits < cost)) return next;
  if (cost > 0 && charge) {
    next = recordResourceTransferOutcome(next, {
      stableKey: `${prefix}study-period-paid:${enrollmentId}:${periodNumber}`,
      resourceFlowId: charge.id,
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
  // The credits attempted and earned this period, from the hours the student
  // owes elsewhere this week (work and care, not this study).
  const required = studyCreditsRequired(path);
  const earnedBefore = studyCreditsEarned(next, enrollmentId, path);
  const attempted = Math.max(
    0,
    Math.min(onTimeCreditsPerPeriod(path), required - earnedBefore),
  );
  const outside = assessLifeLoadAt(next, actor).expectedWeekly;
  const earned = Math.round(
    attempted *
      creditsEarnedShare((outside.minimumHours + outside.maximumHours) / 2),
  );
  next = event(
    next,
    "study-period",
    [enrollmentId],
    required > 0
      ? `You completed study period ${periodNumber} of ${total} for ${path.title}, earning ${earned} of the ${Math.round(attempted)} credits you took.`
      : `You completed study period ${periodNumber} of ${total} for ${path.title}.`,
    [`${ATTEMPTED_TAG}${Math.round(attempted)}`, `${EARNED_TAG}${earned}`],
  );
  if (charge) next = settleTuitionFreezeBackfill(next, charge.id);
  const creditsMet = earnedBefore + earned >= required;
  if (periodNumber >= total && !creditsMet) {
    // Short of credits: another period, or, past the maximum timeframe, the
    // enrollment ends without the credential.
    if (periodNumber < Math.ceil(total * MAXIMUM_TIMEFRAME_MULTIPLE))
      return scheduleStudyPeriodDue(next, enrollmentId, path, periodNumber + 1);
    const state = educationEnrollmentStateAt(next, enrollmentId)!;
    next = recordEducationEnrollmentState(next, {
      stableKey: `${prefix}short-of-credits:${enrollmentId}`,
      enrollmentId,
      effectiveAt: next.currentDate,
      status: "ended",
      contextKind: state.contextKind,
      reason: `Reached the most time allowed for ${path.title} short of credits: ${earnedBefore + earned} of ${required}.`,
      provenance: authored,
      supersedesStateId: state.id,
    });
    return event(
      next,
      "short-of-credits",
      [enrollmentId],
      `You reached the most time allowed for ${path.title} with ${earnedBefore + earned} of the ${required} credits it requires, so your studies end without ${path.credential ?? "the credential"}.`,
    );
  }
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

/**
 * A college place accepted before its first term waits, at status
 * `expected`, until the day classes start. That day is an ordinary future due
 * item: it makes the place active and starts the period clock, so no study
 * period runs and no tuition falls due before it.
 */
export const EDUCATION_STUDY_BEGINS_KEY = "education:study-begins" as const;

export function scheduleStudyStart(
  world: World,
  enrollmentId: EntityId,
): World {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment) throw new Error("Missing enrollment");
  return scheduleFutureDueItem(world, {
    stableKey: `${prefix}study-begins:${enrollmentId}`,
    dueAt: enrollment.startedAt,
    transitionKey: EDUCATION_STUDY_BEGINS_KEY,
    entityIds: [enrollmentId],
    jurisdictionId: null,
    provenance: authored,
  });
}

export const educationStudyBeginsHandler: FutureTransitionHandler = (
  world,
  due: FutureDueItem,
) => {
  const resolved = (next: World, context: string) => ({
    world: next,
    status: "resolved" as const,
    reasonKey: null,
    context,
    outcomeEventId: null,
  });
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === due.entityIds[0],
  );
  if (!enrollment)
    throw new Error("A study start references a missing enrollment.");
  const state = educationEnrollmentStateAt(world, enrollment.id);
  if (state?.status !== "expected")
    return resolved(world, "The place was no longer waiting to start.");
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === enrollment.personId && death.diedAt <= due.dueAt,
    )
  )
    return resolved(world, "They died before classes started.");
  let next = recordEducationEnrollmentState(world, {
    stableKey: `${enrollment.stableKey}:state:begins`,
    enrollmentId: enrollment.id,
    effectiveAt: due.dueAt,
    status: "active",
    contextKind: state.contextKind,
    reason: null,
    provenance: authored,
    supersedesStateId: state.id,
  });
  next = event(next, "study-began", [enrollment.id], "Your classes started.");
  const path = resolveStudyPath(next, enrollment.id);
  if (path && studyUsesPeriodModel(path))
    next = bootstrapStudyPeriodProgression(next, enrollment.id, path);
  return resolved(next, "Classes started.");
};

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
      status: "blocked",
      reasonKey: "education:unsupported-saved-terms",
      context:
        "Saved study terms are unavailable; no current offer replaces them.",
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
  const deadlinePeriod = gracePeriod(due, enrollmentId);
  const ordinaryPrefix = `${prefix}study-period-due:${enrollmentId}:`;
  const duePeriod =
    deadlinePeriod ??
    (due.stableKey.startsWith(ordinaryPrefix)
      ? Number(due.stableKey.slice(ordinaryPrefix.length).split(":")[0])
      : null);
  if (duePeriod !== null && before >= duePeriod)
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context:
        "This tuition period was already settled; no later period is charged at its old deadline.",
      outcomeEventId: null,
    };
  const next = completeStudyPeriod(world, enrollmentId, path);
  const after = completedStudyPeriods(next, enrollmentId, path);
  if (after === before) {
    if (deadlinePeriod !== null || path.tuitionGraceDays === 0) {
      const paused = pauseUnfundedStudy(next, enrollmentId);
      return {
        world: paused,
        status: "resolved",
        reasonKey: null,
        context: "Unfunded tuition deadline reached; study only is paused.",
        outcomeEventId: paused.history.events.at(-1)?.id ?? null,
      };
    }
    let graceWorld = next;
    if (path.tuitionGraceDays !== undefined) {
      if (
        world.history.futureDueItems.some(
          (d) =>
            d.id !== due.id &&
            gracePeriod(d, enrollmentId) === before + 1 &&
            futureDueItemStateAt(world, d.id, {
              asOfDate: world.currentDate,
              historySequenceExclusive: world.history.nextSequence,
            })?.status === "scheduled",
        )
      )
        return {
          world: next,
          status: "blocked",
          reasonKey: "education:insufficient-tuition",
          context:
            "Tuition remains unfunded; its existing disclosed deadline is retained.",
          outcomeEventId: null,
        };
      const previousDeadline = world.history.futureDueItems
        .filter((d) => gracePeriod(d, enrollmentId) === before + 1)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
      const deadline =
        previousDeadline?.dueAt ??
        addDays(world.currentDate, path.tuitionGraceDays);
      if (deadline <= world.currentDate) {
        const paused = pauseUnfundedStudy(next, enrollmentId);
        return {
          world: paused,
          status: "resolved",
          reasonKey: null,
          context:
            "The original disclosed deadline is exhausted; study only is paused.",
          outcomeEventId: paused.history.events.at(-1)?.id ?? null,
        };
      }
      graceWorld = scheduleFutureDueItem(next, {
        stableKey: `${graceDuePrefix}${enrollmentId}:${before + 1}:${world.history.nextSequence}`,
        dueAt: deadline,
        transitionKey: periodDueKey,
        entityIds: [enrollmentId],
        jurisdictionId: null,
        provenance: authored,
      });
      graceWorld = event(
        graceWorld,
        "tuition-grace-opened",
        [enrollmentId, graceWorld.history.futureDueItems.at(-1)!.id],
        tuitionGraceSentence(deadline),
      );
    }
    return {
      world: graceWorld,
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
 * an obsolete open session is canceled, and one canonical future due item is
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
