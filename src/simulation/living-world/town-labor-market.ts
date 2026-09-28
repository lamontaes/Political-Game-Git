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
 * - a worker may quit, and most who quit move straight to another job;
 * - a worker may be laid off, more often when the town's or the nation's
 *   recorded unemployment is high;
 * - a resident of working age who is looking (including somebody laid off,
 *   a newcomer to town or someone who has just turned 18) may be hired, less
 *   often when unemployment is high.
 *
 * Every change is a dated work-status record, with its reason, on the day of
 * the review. The rates are GAME ASSUMPTIONS near the national monthly rates
 * of the BLS Job Openings and Labor Turnover Survey (quits about 2%, layoffs
 * about 1% of jobs a month), not read from a source.
 */

import { recordWorkStatus } from "../life";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { SeededRng } from "../rng";
import type { EntityId, WorkStatusRecord, World } from "../types";
import {
  TOWN_EMPLOYMENT_VERSION,
  WORKING_AGE_MAX,
  fillTownJobs,
  laborStatus,
  townResidents,
} from "./town-employment";
import { ageOnDate } from "../dates";

/** GAME ASSUMPTION: chances per quarter, before unemployment is weighed. */
export const TOWN_JOB_TURNOVER = {
  quitPerQuarter: 0.06,
  /** Of those who quit, the share who start another job the same day. */
  quitToNewJob: 0.7,
  layoffPerQuarter: 0.03,
  /** A job seeker's chance of being hired in a quarter. */
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

interface TownJob {
  readonly relationshipId: EntityId;
  readonly personId: EntityId;
  readonly status: WorkStatusRecord;
}

/** The town employment's jobs active today, with their current status. */
function activeTownJobs(world: World, town: EntityId): readonly TownJob[] {
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
    const rng = new SeededRng(world.seed).fork(
      `${TOWN_EMPLOYMENT_VERSION}:turnover:${job.relationshipId}:${round}`,
    );
    if (
      rng.fork("layoff").next() <
      TOWN_JOB_TURNOVER.layoffPerQuarter * pressure
    ) {
      end(job, TOWN_JOB_END_REASONS.laidOff);
      continue;
    }
    if (rng.fork("quit").next() < TOWN_JOB_TURNOVER.quitPerQuarter / pressure) {
      end(job, TOWN_JOB_END_REASONS.quit);
      if (rng.fork("next-job").next() < TOWN_JOB_TURNOVER.quitToNewJob)
        rehire.add(job.personId);
    }
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
  const open = townResidents(next, town).filter((resident) => {
    if (resident.personId === playerPersonId) return false;
    if (working.has(resident.personId) || heldElsewhere.has(resident.personId))
      return false;
    if (rehire.has(resident.personId)) return true;
    const status = laborStatus(next, resident);
    if (status === "employed" || status === "looking-for-work")
      return (
        new SeededRng(next.seed)
          .fork(
            `${TOWN_EMPLOYMENT_VERSION}:hire-draw:${resident.personId}:${round}`,
          )
          .next() <
        TOWN_JOB_TURNOVER.hirePerQuarter / pressure
      );
    return false;
  });
  return fillTownJobs(next, town, open, { round });
}
