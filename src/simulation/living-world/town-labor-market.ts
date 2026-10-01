/**
 * The town's jobs change hands as time passes.
 *
 * `town-employment.ts` fills the town's jobs once, at the opening. Without
 * this, the same people held the same jobs for the whole of a life: in five
 * watched years nobody near Belzoni started or left a job.
 *
 * Four times a year, on the town's quarterly review (`migration/review.ts`),
 * each job the town employment wrote can end, and each resident who should
 * be working and is not can be hired:
 *
 * - a worker who died, or reached 67, leaves the job;
 * - some workers quit, and a quitter who knows somebody working for another
 *   employer in town moves straight to a job;
 * - some workers are laid off, more when the town's or the nation's recorded
 *   unemployment is high;
 * - some residents of working age who are looking (including somebody laid
 *   off, a newcomer to town or someone who has just turned 18) are hired,
 *   fewer when unemployment is high.
 *
 * Nothing is drawn. The national rates set how many leave or are hired in the
 * town each quarter; who it is comes from the record: the most recently hired
 * are laid off first, the youngest and newest quit first, and the seekers out
 * of work the shortest time are hired first. Every change is a dated
 * work-status record, with its reason, on the day of the review.
 */

import { recordJobEndedNews } from "../neighbor-news";
import { recordWorkStatus, type RecordWorkStatusInput } from "../life";
import {
  workRelationshipHistoryForPerson,
  workStatusHistory,
} from "../life-queries";
import { scheduleLivedOutcomeReflection } from "../law-exposure";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { sharedPlaceAcquaintances } from "../shared-places";
import {
  TOWN_BUSINESS_WORKPLACES,
  townBusinessLaysOff,
} from "./town-business-books";
import type { EntityId, WorkStatusRecord, World } from "../types";
import {
  TOWN_EMPLOYMENT_VERSION,
  WORKING_AGE_MAX,
  WORKING_AGE_MIN,
  fillTownJobs,
  laborStatus,
  townResidents,
} from "./town-employment";
import { ageOnDate, dateAtAge } from "../dates";

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
  const pressure = townUnemploymentPressure(world, town);
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
  const booksOf = (job: TownJob) => {
    const organizationId = employerOf.get(job.relationshipId);
    return organizationId
      ? world.townFinances?.businesses[organizationId]
      : undefined;
  };
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
  const rehire = new Set<EntityId>();
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
  const startedAt = new Map<EntityId, string>();
  for (const relationship of world.history.workRelationships)
    startedAt.set(relationship.id, relationship.startedAt);
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

  // HARDWIRED: last hired, first let go, the usual order of a layoff. The
  // town's conditions set how many of the jobs at employers without books
  // end; a business that keeps books lays off by its books, below. Whoever
  // runs a business is never laid off from it.
  const byLatestHire = [...staying].sort(
    (a, b) =>
      startedAt
        .get(b.relationshipId)!
        .localeCompare(startedAt.get(a.relationshipId)!) ||
      a.relationshipId.localeCompare(b.relationshipId),
  );
  const byConditions = byLatestHire.filter(
    (job) => booksOf(job)?.lastQuarterPay === undefined,
  );
  let layoffs = Math.round(
    byConditions.length * TOWN_JOB_TURNOVER.layoffPerQuarter * pressure,
  );
  const laidOff = new Set<EntityId>();
  for (const job of byConditions) {
    if (layoffs <= 0) break;
    if (runsIt(job)) continue;
    end(job, TOWN_JOB_END_REASONS.laidOff);
    laidOff.add(job.relationshipId);
    layoffs -= 1;
  }

  // HARDWIRED: the youngest quit first, then the newest in the job. Young
  // workers change jobs most (Topel and Ward, "Job Mobility and the Careers
  // of Young Men", Quarterly Journal of Economics, 1992). Whoever runs a
  // business does not quit it.
  const remaining = staying.filter((job) => !laidOff.has(job.relationshipId));
  const byYouth = [...remaining].sort(
    (a, b) =>
      world.people[b.personId]!.birthDate.localeCompare(
        world.people[a.personId]!.birthDate,
      ) ||
      startedAt
        .get(b.relationshipId)!
        .localeCompare(startedAt.get(a.relationshipId)!) ||
      a.relationshipId.localeCompare(b.relationshipId),
  );
  let quits = Math.round(
    (remaining.length * TOWN_JOB_TURNOVER.quitPerQuarter) / pressure,
  );
  const employerByPerson = new Map<EntityId, EntityId | null>(
    remaining.map((job) => [
      job.personId,
      employerOf.get(job.relationshipId) ?? null,
    ]),
  );
  for (const job of byYouth) {
    if (quits <= 0) break;
    if (runsIt(job)) continue;
    end(job, TOWN_JOB_END_REASONS.quit);
    quits -= 1;
    // A quitter walks into another job when somebody they know from a shared
    // room works for another employer in town.
    const own = employerOf.get(job.relationshipId) ?? null;
    const lead = sharedPlaceAcquaintances(world, job.personId).some(
      (other) =>
        employerByPerson.has(other) && employerByPerson.get(other) !== own,
    );
    if (lead) rehire.add(job.personId);
  }

  // A business whose sales no longer cover its pay lets its most recent
  // hire go, never whoever runs it.
  const staffOf = new Map<EntityId, TownJob[]>();
  for (const job of activeTownJobs(next, town)) {
    const organizationId = employerOf.get(job.relationshipId);
    if (!organizationId || !booksOf(job)) continue;
    staffOf.set(organizationId, [...(staffOf.get(organizationId) ?? []), job]);
  }
  const relationships = new Map(
    next.history.workRelationships.map((row) => [row.id, row]),
  );
  for (const [organizationId, staff] of [...staffOf].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (
      !townBusinessLaysOff(
        next.townFinances?.businesses[organizationId],
        staff.length,
      )
    )
      continue;
    const [last] = staff
      .filter(
        (job) =>
          relationships.get(job.relationshipId)?.authority !== "directs-others",
      )
      .sort(
        (a, b) =>
          (relationships.get(b.relationshipId)?.startedAt ?? "").localeCompare(
            relationships.get(a.relationshipId)?.startedAt ?? "",
          ) || a.relationshipId.localeCompare(b.relationshipId),
      );
    if (last) end(last, TOWN_JOB_END_REASONS.laidOff);
  }

  // Everyone of working age who should be working and holds no job today:
  // somebody laid off, a newcomer, someone just turned 18, a student who has
  // finished. Those who quit for another job are hired without a draw.
  const working = new Set(
    activeTownJobs(next, town).map((job) => job.personId),
  );
  const heldElsewhere = new Set<EntityId>();
  const latest = new Map<EntityId, string>();
  for (const row of next.history.workStatuses)
    if (row.effectiveAt <= today)
      latest.set(row.workRelationshipId, row.status);
  for (const relationship of next.history.workRelationships)
    if (latest.get(relationship.id) === "active")
      heldElsewhere.add(relationship.personId);
  const seekers = townResidents(next, town).filter((resident) => {
    if (resident.personId === playerPersonId) return false;
    if (working.has(resident.personId) || heldElsewhere.has(resident.personId))
      return false;
    if (rehire.has(resident.personId)) return false;
    const status = laborStatus(next, resident);
    return status === "employed" || status === "looking-for-work";
  });
  // HARDWIRED: employers call back the seekers out of work the shortest time
  // first (Kroft, Lange and Notowidigdo, "Duration Dependence and Labor
  // Market Conditions", Quarterly Journal of Economics, 2013). Somebody with
  // no job on the record has been out of work here since the later of moving
  // into their home and turning 18: a newcomer's last job elsewhere is not
  // known, so it is not read as never having worked.
  const lastWorked = outOfWorkSince(
    next,
    seekers.map((resident) => resident.personId),
  );
  const hiredSeekers = [...seekers]
    .sort(
      (a, b) =>
        (lastWorked.get(b.personId) ?? "").localeCompare(
          lastWorked.get(a.personId) ?? "",
        ) || a.personId.localeCompare(b.personId),
    )
    .slice(
      0,
      Math.round(
        (seekers.length * TOWN_JOB_TURNOVER.hirePerQuarter) / pressure,
      ),
    );
  const open = [
    ...townResidents(next, town).filter((resident) =>
      rehire.has(resident.personId),
    ),
    ...hiredSeekers,
  ];
  return fillTownJobs(next, town, open, { round });
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
