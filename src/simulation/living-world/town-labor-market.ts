/**
 * The town's jobs change hands as time passes.
 *
 * `town-employment.ts` fills the town's jobs once, at the opening. Without
 * this, the same people held the same jobs for the whole of a life: in five
 * watched years nobody near Belzoni started or left a job.
 *
 * The quarterly review ends jobs for recorded deaths, retirement, saved quit
 * decisions and the existing employer layoff rules. Hiring runs through the
 * weekly goal/application review, actual openings, offers and accepted starts.
 * This review no longer ranks unemployed residents into manufactured jobs.
 * A unique active employer manager selects a specific subordinate from saved
 * staffing goals and actual payroll-capacity failures; ties remain pending.
 */

import { recordJobEndedNews } from "../neighbor-news";
import { recordWorkStatus, type RecordWorkStatusInput } from "../life";
import {
  workRelationshipHistoryForPerson,
  workStatusHistory,
  activeWorkRelationshipsAt,
  workRoleAt,
} from "../life-queries";
import { scheduleLivedOutcomeReflection } from "../law-exposure";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { TOWN_BUSINESS_WORKPLACES } from "./town-business-books";
import {
  resourceFlowTermsAt,
  resourceTransferOutcomesForFlow,
} from "../resource-queries";
import { recordWorldEvent } from "../world";
import type { EntityId, WorkStatusRecord, World } from "../types";
import {
  TOWN_EMPLOYMENT_VERSION,
  WORKING_AGE_MAX,
  WORKING_AGE_MIN,
} from "./town-employment";
import { ageOnDate, dateAtAge } from "../dates";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { goalConsiderations, activeGoalFor } from "../people-goal-pursuit";
import { isLivelihoodGoalKey } from "../people-goal-pursuit-content";
import type { DecisionEvaluation } from "../types";

/** A saved wish to stop working is weighed against saved livelihood goals.
 * No wish on record means no proposed quit, rather than an evidence-free tie.
 * The shared goal reader supplies each goal's recorded priority. */
export function decideTownWorkerQuit(
  world: World,
  personId: EntityId,
  relationshipId: EntityId,
  stableKey: string,
): DecisionEvaluation | null {
  const decline = activeGoalFor(world, personId, "life-paths2:decline-work");
  if (!decline || decline.recordedAt > world.currentDate) return null;
  const livelihoodKeys = [
    ...new Set(
      world.history.goalStates
        .filter(
          (goal) =>
            goal.personId === personId && isLivelihoodGoalKey(goal.goalKey),
        )
        .map((goal) => goal.goalKey),
    ),
  ];
  return evaluateDecision(world, {
    stableKey,
    decisionType: "labor.worker-quit",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:employment",
      key: relationshipId,
      entityId: relationshipId,
    },
    options: [
      {
        key: "continue-work",
        label: "Keep working",
        description: "Keep the current job.",
      },
      { key: "quit", label: "Quit", description: "End the current job." },
    ],
    constraints: [],
    considerations: goalConsiderations(world, personId, stableKey, [
      {
        optionKey: "quit",
        goalKey: decline.goalKey,
        direction: "supports",
        explanation: decline.objective,
      },
      ...livelihoodKeys.map((goalKey) => ({
        optionKey: "continue-work",
        goalKey,
        direction: "supports" as const,
        explanation: "They are pursuing paid work.",
      })),
    ]),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

/**
 * How much of the town's work turns over in a quarter, before unemployment
 * is weighed. These set how many; the record decides who.
 *
 * MEASURED: quits were 2.0% and layoffs and discharges 1.1% of jobs a month
 * in 2025 (Bureau of Labor Statistics, Job Openings and Labor Turnover
 * Survey, series JTU000000000000000QUR and JTU000000000000000LDR, annual
 * averages), three months to the quarter.
 */
export const TOWN_JOB_TURNOVER = {
  quitPerQuarter: 3 * 0.02,
  layoffPerQuarter: 3 * 0.011,
  /**
   * GAME ASSUMPTION, not read from a source: the part of the town's job
   * seekers hired in a quarter.
   */
  hirePerQuarter: 0.55,
  /** Unemployment the rates above are set for, in percent. */
  referenceUnemploymentPct: 4.2,
} as const;

/** Why a town job ended, as the work-status record's reason. */
export const TOWN_JOB_END_REASONS = {
  quit: "labor:quit",
  laidOff: "labor:laid-off",
  /** The business closed, and everybody who worked there lost the job. */
  businessClosed: "labor:business-closed",
  retired: "labor:retired",
  died: "labor:died",
} as const;

/** A job the worker did not choose to leave: a layoff or a closed business. */
export const TOWN_JOB_LOSS_REASONS: ReadonlySet<string> = new Set([
  TOWN_JOB_END_REASONS.laidOff,
  TOWN_JOB_END_REASONS.businessClosed,
]);

/**
 * Ends a job the worker did not choose to leave, and schedules the worker's
 * reflection on the official who answers for it. Every layoff and closing
 * writes through here, so no lost job goes unweighed.
 */
export function recordTownJobLoss(
  world: World,
  input: RecordWorkStatusInput & { readonly reason: string },
): World {
  if (input.status !== "ended" || !TOWN_JOB_LOSS_REASONS.has(input.reason))
    throw new Error("A job loss ends a job by layoff or closing.");
  const next = recordWorkStatus(world, input);
  const status = next.history.workStatuses.find(
    (row) => row.stableKey === input.stableKey,
  )!;
  const personId = next.history.workRelationships.find(
    (row) => row.id === input.workRelationshipId,
  )?.personId;
  if (!personId) return next;
  // The same step carries the loss to the people tied to the worker: the
  // job-ended event is written and they are told (neighbor-news.ts). The work
  // status stays the one record of the loss; this event only carries it.
  return scheduleLivedOutcomeReflection(
    recordJobEndedNews(next, status.id, {
      closedBusiness: input.reason === TOWN_JOB_END_REASONS.businessClosed,
    }),
    personId,
    status.id,
  );
}

/**
 * The jobs a person lost, oldest first: each ended work status whose reason
 * is a layoff or a closing, in effect on or before `through`. The one reader
 * of a lost job, for the principles a life forms and for the view of the
 * official who answers for it.
 */
export function jobsLostBy(
  world: World,
  personId: EntityId,
  through = world.currentDate,
): readonly WorkStatusRecord[] {
  return workRelationshipHistoryForPerson(world, personId).flatMap(
    (relationship) =>
      workStatusHistory(world, relationship.id).filter(
        (status) =>
          status.status === "ended" &&
          status.reason !== null &&
          TOWN_JOB_LOSS_REASONS.has(status.reason) &&
          status.effectiveAt <= through,
      ),
  );
}

/** Reasons that are not a lost job for anyone deciding whether to move. */
export const TOWN_JOB_ENDS_NOT_LOST: ReadonlySet<string> = new Set([
  TOWN_JOB_END_REASONS.quit,
  TOWN_JOB_END_REASONS.retired,
  TOWN_JOB_END_REASONS.died,
]);

/**
 * How recorded unemployment weighs on layoffs and hiring: the town's own
 * month when the economy records one, else the nation's, against the rate
 * the turnover chances are set for. 1 when nothing is recorded.
 */
export function townUnemploymentPressure(world: World, town: EntityId): number {
  const local = macroConditionsAt(
    world,
    macroScopeForJurisdiction(town),
    world.currentDate,
  );
  const months = world.macroEconomy?.months ?? [];
  let national: number | null = null;
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const month = months[index]!;
    if (month.scope === "national" && month.recordedAt <= world.currentDate) {
      national = month.unemploymentPct;
      break;
    }
  }
  const rate = local?.unemploymentPct ?? national;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return 1;
  return Math.min(
    3,
    Math.max(0.5, rate / TOWN_JOB_TURNOVER.referenceUnemploymentPct),
  );
}

export interface TownJob {
  readonly relationshipId: EntityId;
  readonly personId: EntityId;
  readonly status: WorkStatusRecord;
}

/** The town employment's jobs active today, with their current status. */
export function activeTownJobs(
  world: World,
  town: EntityId,
): readonly TownJob[] {
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}:job:`;
  const ours = new Map<EntityId, EntityId>();
  for (const relationship of world.history.workRelationships)
    if (relationship.stableKey.startsWith(prefix))
      ours.set(relationship.id, relationship.personId);
  if (ours.size === 0) return [];
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (
      ours.has(status.workRelationshipId) &&
      status.effectiveAt <= world.currentDate
    )
      latest.set(status.workRelationshipId, status);
  const jobs: TownJob[] = [];
  for (const [relationshipId, status] of latest)
    if (status.status === "active")
      jobs.push({
        relationshipId,
        personId: ours.get(relationshipId)!,
        status,
      });
  return jobs;
}

/** The admitted staffing choices are explicit saved actor goals, never inferred
 * from a wish to quit or from another person's preferences. Their existing
 * goal priority supplies importance through goalConsiderations. */
export function decideTownEmployerLayoff(
  world: World,
  organizationId: EntityId,
  staff: readonly TownJob[],
  stableKey: string,
): { readonly world: World; readonly evaluation: DecisionEvaluation } | null {
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const managers = world.personOrder.flatMap((personId) =>
    dead.has(personId)
      ? []
      : activeWorkRelationshipsAt(world, personId).filter(
          (job) =>
            job.relationship.organizationId === organizationId &&
            job.relationship.authority === "directs-others",
        ),
  );
  if (managers.length !== 1) return null;
  const manager = managers[0]!;
  const candidates = staff.filter((job) => {
    const relationship = world.history.workRelationships.find(
      (row) => row.id === job.relationshipId,
    );
    return (
      relationship?.organizationId === organizationId &&
      relationship.authority !== "directs-others" &&
      job.personId !== manager.relationship.personId &&
      !dead.has(job.personId) &&
      workRoleAt(world, job.relationshipId) !== undefined
    );
  });
  if (candidates.length === 0) return null;
  // Only actual compensation outcomes establish payroll-capacity trouble.
  // A modeled annualRevenue/lastQuarterPay snapshot is not a cash receipt.
  const failures = world.history.resourceFlows.flatMap((flow) => {
    if (
      flow.basisKind !== "compensation:work" ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !== organizationId ||
      flow.basisReference.kind !== "work" ||
      !candidates.some(
        (job) =>
          flow.basisReference.kind === "work" &&
          job.relationshipId === flow.basisReference.workRelationshipId,
      )
    )
      return [];
    const terms = resourceFlowTermsAt(world, flow.id);
    if (terms?.status !== "active") return [];
    const outcome = resourceTransferOutcomesForFlow(world, flow.id).at(-1);
    return outcome &&
      outcome.reasonKind === "capacity:insufficient-funds" &&
      outcome.attemptedAmount.currency === outcome.transferredAmount.currency &&
      outcome.attemptedAmount.minorUnits > outcome.transferredAmount.minorUnits
      ? [outcome]
      : [];
  });
  if (failures.length === 0) return null;
  const actorPersonId = manager.relationship.personId;
  const endLeans = candidates.flatMap((job) => {
    const goalKey = `labor:end-work:${job.relationshipId}`;
    const goal = activeGoalFor(world, actorPersonId, goalKey);
    return goal?.targetEntityId === job.relationshipId &&
      goal.recordedAt <= world.currentDate
      ? [
          {
            optionKey: `end:${job.relationshipId}`,
            goalKey,
            direction: "supports" as const,
            explanation: goal.objective,
          },
        ]
      : [];
  });
  const retain = activeGoalFor(world, actorPersonId, "labor:retain-staff");
  const leans = [
    ...endLeans,
    ...(retain?.targetEntityId === organizationId &&
    retain.recordedAt <= world.currentDate
      ? [
          {
            optionKey: "retain-staff",
            goalKey: retain.goalKey,
            direction: "supports" as const,
            explanation: retain.objective,
          },
        ]
      : []),
  ];
  const reviewed = recordWorldEvent(world, {
    stableKey: `${stableKey}:payroll-review`,
    type: "labor.payroll-reviewed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[actorPersonId]!.homeJurisdictionId,
    involvedEntityIds: [actorPersonId, organizationId, manager.relationship.id],
    participants: [
      {
        personId: actorPersonId,
        role: "focus:reviewer",
        detail: "Reviewed the employer's recorded payroll capacity failures.",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "labor:payroll-review",
      ...failures.map((row) => `source:${row.id}`),
    ],
    summary:
      "The employer's manager reviewed recorded payroll capacity failures.",
    context: {
      location: null,
      socialContext: "An actual employer staffing review.",
      pressure: failures
        .map(
          (row) =>
            `${row.id}: ${row.transferredAmount.minorUnits} of ${row.attemptedAmount.minorUnits} ${row.attemptedAmount.currency} minor units transferred on ${row.occurredAt}; ${row.reasonKind}`,
        )
        .join("; "),
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = reviewed.history.events.at(-1)!.id;
  return {
    world: reviewed,
    evaluation: evaluateDecision(reviewed, {
      stableKey,
      decisionType: "labor.employer-staffing",
      actorPersonId,
      cutoff: {
        asOfDate: reviewed.currentDate,
        historySequenceExclusive: reviewed.history.nextSequence,
      },
      subject: {
        kind: "context:employment",
        key: organizationId,
        entityId: organizationId,
      },
      options: [
        {
          key: "retain-staff",
          label: "Retain staff",
          description: "Keep the actual current staff.",
        },
        ...candidates.map((job) => ({
          key: `end:${job.relationshipId}`,
          label: "End this job",
          description: `End the recorded work relationship ${job.relationshipId}.`,
        })),
      ],
      constraints: [],
      considerations: goalConsiderations(
        reviewed,
        actorPersonId,
        stableKey,
        leans,
      ).map((consideration) => ({
        ...consideration,
        sourceRefs: [
          ...consideration.sourceRefs,
          {
            kind: "life-history" as const,
            reference: {
              family: "work-role" as const,
              recordId: manager.role.id,
            },
          },
          {
            kind: "life-history" as const,
            reference: {
              family: "work-status" as const,
              recordId: manager.status.id,
            },
          },
          { kind: "historical-event" as const, eventId },
        ],
      })),
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    }),
  };
}

/**
 * One quarterly turn of the town's jobs, on the world's current date.
 * `round` names the review, so every draw and record is keyed by it and a
 * review run twice writes nothing new.
 */
export function reviewTownJobs(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): World {
  const today = world.currentDate;
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const reviewKey = `${TOWN_EMPLOYMENT_VERSION}:${town}:review:${round}`;
  // A review already run for this round writes nothing new.
  if (
    world.history.workRelationships.some(
      (row) =>
        row.stableKey.endsWith(`:${round}`) &&
        row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:${town}:job:`),
    ) ||
    world.history.workStatuses.some((row) =>
      row.stableKey.startsWith(reviewKey),
    ) ||
    world.history.decisionTraces.some((row) =>
      row.stableKey.startsWith(reviewKey),
    )
  )
    return world;

  // A business that keeps books lays people off by its books, below; every
  // other employer by the town's conditions.
  const employerOf = new Map<EntityId, EntityId>();
  for (const row of world.history.workRelationships)
    if (row.organizationId) employerOf.set(row.id, row.organizationId);
  const employerStem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`;
  const isBusiness = new Set(
    world.history.organizations
      .filter(
        (row) =>
          row.stableKey.startsWith(employerStem) &&
          TOWN_BUSINESS_WORKPLACES.has(
            row.stableKey.slice(employerStem.length).split(":")[0]!,
          ),
      )
      .map((row) => row.id),
  );
  // Whoever runs a business is its owner: whoever directs it, or its one
  // remaining worker. They do not quit it or lay themselves off; they leave
  // when they retire, die or move. The count falls as people leave, so two
  // workers never both walk out of a business in one quarter.
  const authorityOf = new Map<EntityId, string>();
  for (const row of world.history.workRelationships)
    authorityOf.set(row.id, row.authority);
  const staffAt = new Map<EntityId, number>();
  for (const job of activeTownJobs(world, town)) {
    const organizationId = employerOf.get(job.relationshipId);
    if (organizationId)
      staffAt.set(organizationId, (staffAt.get(organizationId) ?? 0) + 1);
  }
  const runsIt = (job: TownJob) => {
    const organizationId = employerOf.get(job.relationshipId);
    return (
      organizationId !== undefined &&
      isBusiness.has(organizationId) &&
      (authorityOf.get(job.relationshipId) === "directs-others" ||
        (staffAt.get(organizationId) ?? 0) <= 1)
    );
  };
  let next = world;
  const end = (job: TownJob, reason: string) => {
    const write = TOWN_JOB_LOSS_REASONS.has(reason)
      ? recordTownJobLoss
      : recordWorkStatus;
    next = write(next, {
      stableKey: `${reviewKey}:end:${job.relationshipId}`,
      workRelationshipId: job.relationshipId,
      effectiveAt: today,
      status: "ended",
      reason,
      supersedesStatusId: job.status.id,
      provenance: {
        kind: "generated",
        generatorKey: TOWN_EMPLOYMENT_VERSION,
      },
    });
    const organizationId = employerOf.get(job.relationshipId);
    if (organizationId)
      staffAt.set(organizationId, (staffAt.get(organizationId) ?? 1) - 1);
  };
  const staying: TownJob[] = [];
  for (const job of activeTownJobs(world, town)) {
    const person = world.people[job.personId];
    if (!person) continue;
    if (dead.has(job.personId)) {
      end(job, TOWN_JOB_END_REASONS.died);
      continue;
    }
    // Somebody who moved away left the job with the move (`relocate.ts`).
    if (person.homeJurisdictionId !== town) continue;
    if (ageOnDate(person.birthDate, today) > WORKING_AGE_MAX) {
      end(job, TOWN_JOB_END_REASONS.retired);
      continue;
    }
    staying.push(job);
  }

  // A worker's saved goals decide whether they quit. Whoever runs a business
  // and the controlled player retain their existing protection.
  for (const job of staying) {
    if (runsIt(job) || job.personId === playerPersonId) continue;
    const evaluation = decideTownWorkerQuit(
      next,
      job.personId,
      job.relationshipId,
      `${reviewKey}:quit:${job.relationshipId}`,
    );
    if (!evaluation) continue;
    next = recordDurableDecisionTrace(next, evaluation);
    if (
      !isSelectedDecision(evaluation) ||
      evaluation.selectedOptionKey !== "quit"
    )
      continue;
    end(job, TOWN_JOB_END_REASONS.quit);
  }

  // Every employer uses the same saved manager decision. Missing books,
  // town unemployment or tenure cannot substitute for payroll evidence.
  const staffOf = new Map<EntityId, TownJob[]>();
  for (const job of activeTownJobs(next, town)) {
    const organizationId = employerOf.get(job.relationshipId);
    if (organizationId)
      staffOf.set(organizationId, [
        ...(staffOf.get(organizationId) ?? []),
        job,
      ]);
  }
  for (const [organizationId, staff] of staffOf) {
    const decision = decideTownEmployerLayoff(
      next,
      organizationId,
      staff,
      `${reviewKey}:staff:${organizationId}`,
    );
    if (!decision) continue;
    next = recordDurableDecisionTrace(decision.world, decision.evaluation);
    if (!isSelectedDecision(decision.evaluation)) continue;
    const target = staff.find(
      (job) =>
        decision.evaluation.selectedOptionKey === `end:${job.relationshipId}`,
    );
    if (target) end(target, TOWN_JOB_END_REASONS.laidOff);
  }

  // Hiring is the existing weekly goal/application route: reviewPeopleGoals
  // submits to actual listed openings, weighs offers and calls startJobAsResident.
  // A quarterly unemployment-duration ranking cannot create a second hire.
  return next;
}

/**
 * The date each seeker has been out of work since: their last town job's
 * end, or, with no job on the record, the later of moving into their home
 * and turning 18.
 */
export function outOfWorkSince(
  world: World,
  seekers: readonly EntityId[],
): ReadonlyMap<EntityId, string> {
  const today = world.currentDate;
  const workerOf = new Map<EntityId, EntityId>();
  for (const relationship of world.history.workRelationships)
    workerOf.set(relationship.id, relationship.personId);
  const since = new Map<EntityId, string>();
  for (const row of world.history.workStatuses) {
    if (row.status !== "ended" || row.effectiveAt > today) continue;
    const worker = workerOf.get(row.workRelationshipId);
    if (worker === undefined) continue;
    const previous = since.get(worker);
    if (previous === undefined || row.effectiveAt > previous)
      since.set(worker, row.effectiveAt);
  }
  const seeking = new Set(seekers);
  const movedIn = new Map<EntityId, string>();
  for (const membership of world.history.householdMemberships) {
    if (!seeking.has(membership.personId) || membership.startedAt > today)
      continue;
    const previous = movedIn.get(membership.personId);
    if (previous === undefined || membership.startedAt > previous)
      movedIn.set(membership.personId, membership.startedAt);
  }
  for (const personId of seeking) {
    if (since.has(personId)) continue;
    const adult = dateAtAge(world.people[personId]!.birthDate, WORKING_AGE_MIN);
    const arrived = movedIn.get(personId) ?? "";
    since.set(personId, arrived > adult ? arrived : adult);
  }
  return since;
}
