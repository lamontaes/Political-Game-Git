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

import { recordWorkStatus } from "../life";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { sharedPlaceAcquaintances } from "../shared-places";
import type { EntityId, WorkStatusRecord, World } from "../types";
import {
  TOWN_EMPLOYMENT_VERSION,
  WORKING_AGE_MAX,
  fillTownJobs,
  laborStatus,
  townResidents,
} from "./town-employment";
import { ageOnDate } from "../dates";

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

  let next = world;
  const rehire = new Set<EntityId>();
  const end = (job: TownJob, reason: string) => {
    next = recordWorkStatus(next, {
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
  };
  const startedAt = new Map<EntityId, string>();
  const employerOf = new Map<EntityId, EntityId | null>();
  for (const relationship of world.history.workRelationships) {
    startedAt.set(relationship.id, relationship.startedAt);
    employerOf.set(relationship.id, relationship.organizationId);
  }
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

  // HARDWIRED: last hired, first let go, the usual order of a layoff.
  const byLatestHire = [...staying].sort(
    (a, b) =>
      startedAt
        .get(b.relationshipId)!
        .localeCompare(startedAt.get(a.relationshipId)!) ||
      a.relationshipId.localeCompare(b.relationshipId),
  );
  const laidOff = new Set(
    byLatestHire
      .slice(
        0,
        Math.round(
          staying.length * TOWN_JOB_TURNOVER.layoffPerQuarter * pressure,
        ),
      )
      .map((job) => job.relationshipId),
  );
  for (const job of byLatestHire)
    if (laidOff.has(job.relationshipId)) end(job, TOWN_JOB_END_REASONS.laidOff);

  // HARDWIRED: the youngest quit first, then the newest in the job. Young
  // workers change jobs most (Topel and Ward, "Job Mobility and the Careers
  // of Young Men", Quarterly Journal of Economics, 1992).
  const remaining = staying.filter((job) => !laidOff.has(job.relationshipId));
  const quitters = [...remaining]
    .sort(
      (a, b) =>
        world.people[b.personId]!.birthDate.localeCompare(
          world.people[a.personId]!.birthDate,
        ) ||
        startedAt
          .get(b.relationshipId)!
          .localeCompare(startedAt.get(a.relationshipId)!) ||
        a.relationshipId.localeCompare(b.relationshipId),
    )
    .slice(
      0,
      Math.round(
        (remaining.length * TOWN_JOB_TURNOVER.quitPerQuarter) / pressure,
      ),
    );
  const employerByPerson = new Map<EntityId, EntityId | null>(
    remaining.map((job) => [job.personId, employerOf.get(job.relationshipId)!]),
  );
  for (const job of quitters) {
    end(job, TOWN_JOB_END_REASONS.quit);
    // A quitter walks into another job when somebody they know from a shared
    // room works for another employer in town.
    const own = employerOf.get(job.relationshipId) ?? null;
    const lead = sharedPlaceAcquaintances(world, job.personId).some(
      (other) =>
        employerByPerson.has(other) && employerByPerson.get(other) !== own,
    );
    if (lead) rehire.add(job.personId);
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
  // Market Conditions", Quarterly Journal of Economics, 2013); somebody who
  // never held a job comes last.
  const workerOf = new Map<EntityId, EntityId>();
  for (const relationship of next.history.workRelationships)
    workerOf.set(relationship.id, relationship.personId);
  const lastWorked = new Map<EntityId, string>();
  for (const row of next.history.workStatuses) {
    if (row.status !== "ended" || row.effectiveAt > today) continue;
    const worker = workerOf.get(row.workRelationshipId);
    if (worker === undefined) continue;
    const previous = lastWorked.get(worker);
    if (previous === undefined || row.effectiveAt > previous)
      lastWorked.set(worker, row.effectiveAt);
  }
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
