/**
 * What a first day at a new job may say, from the records behind the job a
 * player has just started (Story lead, Nov 17, the first day rewritten): each
 * fact is read from the one record that holds it and set only where that
 * record holds it, cited to that record, so a line that needs a fact the world
 * does not hold never plays (an effect is a read, not a record).
 *
 * The cause is the new job (a row of `core.jobs`), or, where the day's money
 * moment stands on a work record that named the worker, the job the player
 * holds that started today.
 * - `employer`: the job's organization, as `employerSaid` says it. Work out of
 *   town is kept against a stand-in for the outside market, not an employer
 *   anyone works beside: no employer, no scene.
 * - `job`: the job's title, where it is one a person is called.
 * - `hours`: the usual day on the newcomer's work calendar, as hours.
 * - `nights`: a shift on that calendar runs past midnight.
 * - `boss`: the business engine's owner of the organization, a living full
 *   person who is neither the newcomer nor the one showing them around;
 *   government employers name none.
 * - `before-you`, `left-how-*`: who held this job before, from the opening the
 *   hire filled (the jobs engine's position row), and how they left, from the
 *   engine's own change record (retired, moved, passed, quit). A worker who
 *   left in another way (a layoff) names no leaver.
 * - `coworkers`: how many people work at the employer now, the newcomer
 *   among them, as a count in words, only for a crew small enough that
 *   people say "there are eleven of us".
 * - `longest-there`: how long the one showing them around has held their
 *   job, said only where they have held it longer than every other full
 *   person on the staff whose start a record holds.
 * - `first-job`: no earlier job of the newcomer's is on record.
 * - `came-from`: the employer of the newcomer's last job, where that job
 *   ended within the director's recent window.
 * - `pay-low`: the newcomer's hourly pay is below the middle of what the
 *   others with the same title there earn; never the amount.
 */
import { ownerOf } from "../core2/modules/business";
import {
  JOBS_MODULE_ID,
  OUTSIDE_MARKET_KIND,
  currentJobs,
  howWorkerLeft,
  openingFilledFor,
  staffCount,
} from "../core2/modules/jobs";
import {
  PAST_WORK_SPELL,
  heldSinceRecord,
  pastWorkOf,
} from "../core2/past-module";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type {
  CoreState,
  JobInput,
  OrganizationInput,
  PersonId,
} from "../core2/types";
import { daysBetweenText } from "../core2/kernel/dates";
import { countSaid, hoursSaid } from "../english/count-words";
import { employerSaid, jobSaid } from "../english/journal-words";
import { sayableJobTitle } from "../english/said-as";
import type { Fact } from "../english/scene-talk-words";
import { spanSaid } from "../english/span-words";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { businessNameSaid } from "./words";

/** The situation type that reads these facts. */
export const FIRST_DAY_TYPE = "first-day";

export interface FirstDayInput {
  /** The cause record: the new job, or the work record that named the hire. */
  readonly causeId: string;
  /** The newcomer: the player. */
  readonly newcomerId: PersonId;
  /** The one who shows them around. */
  readonly authorityId: PersonId;
}

const fact = (text: string, ids: readonly string[]): Fact => ({
  text,
  sourceRecordIds: ids,
});

/** The work commitment that schedules a person's job. */
function commitmentOf(
  core: Readonly<CoreState>,
  personId: string,
  jobId: string,
) {
  for (const id of core.work.commitmentsByPerson.get(personId as PersonId) ??
    []) {
    const row = core.work.commitments.get(id);
    if (row?.jobId === jobId && !row.endsAt) return row;
  }
  return undefined;
}

/**
 * The day a person started a job, where a record holds it: a job of the
 * opening keeps it in the past record, a job taken in play in its work
 * commitment (the day it was first held, else the day it began).
 */
function startedOn(
  core: Readonly<CoreState>,
  personId: string,
  job: JobInput,
): { day: string; id: string } | undefined {
  const before = heldSinceRecord(
    core as CoreState,
    personId as PersonId,
    job.id,
  );
  if (before?.facts.startedAt)
    return { day: String(before.facts.startedAt), id: before.id };
  const commitment = commitmentOf(core, personId, job.id);
  const day = commitment?.heldSince ?? commitment?.startsAt;
  return commitment && day ? { day, id: commitment.id } : undefined;
}

export function firstDayFacts(
  core: Readonly<CoreState>,
  input: FirstDayInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const { newcomerId, authorityId } = input;
  const newcomer = core.people.get(newcomerId);
  // The job the cause names, else the one the newcomer holds that began today.
  const named = core.jobs.get(input.causeId);
  const held = newcomer?.jobId ? core.jobs.get(newcomer.jobId) : undefined;
  const job =
    named && named.personId === newcomerId
      ? named
      : held && held.personId === newcomerId
        ? held
        : undefined;
  if (!job || job.endsAt) return facts;
  const org = core.organizations.get(job.organizationId);
  if (!org || org.kind === OUTSIDE_MARKET_KIND) return facts;
  const api = coreAPI(core as CoreState);
  const cited = [input.causeId, job.id, org.id];
  facts.employer = fact(employerSaid(businessNameSaid(org), org), cited);
  if (sayableJobTitle(job.title))
    facts.job = fact(jobSaid(job.title), [job.id]);

  // The usual day and a shift past midnight, from the work calendar.
  const calendar = commitmentOf(core, newcomerId, job.id);
  if (calendar) {
    const byDay = new Map<number, number>();
    for (const slot of calendar.slots)
      byDay.set(
        slot.offsetDays,
        (byDay.get(slot.offsetDays) ?? P.zero) + slot.minutes,
      );
    const counts = new Map<number, number>();
    for (const minutes of byDay.values())
      counts.set(minutes, (counts.get(minutes) ?? P.zero) + P.one);
    const usual = [...counts]
      .sort((a, b) => b[P.one] - a[P.one] || b[P.zero] - a[P.zero])
      .map(([minutes]) => minutes)[P.zero];
    if (usual && usual > P.zero)
      facts.hours = fact(hoursSaid(usual), [job.id, calendar.id]);
    const day = P.hoursPerDay * P.minutesPerHour;
    if (calendar.slots.some((slot) => slot.startMinute + slot.minutes > day))
      facts.nights = fact("yes", [job.id, calendar.id]);
  }

  // The owner of the business, a living full person other than the two in the
  // scene.
  const ownerId = ownerOf(api, org.id);
  const owner = ownerId ? core.people.get(ownerId as PersonId) : undefined;
  if (owner?.alive && owner.id !== newcomerId && owner.id !== authorityId)
    facts.boss = fact(`${owner.givenName} ${owner.familyName}`, [
      org.id,
      owner.id,
    ]);

  // Who had the job before, and how they left.
  const opening = core.modules.has(JOBS_MODULE_ID)
    ? openingFilledFor(api, newcomerId, org.id)
    : undefined;
  const before = opening?.replacesPersonId
    ? core.people.get(opening.replacesPersonId as PersonId)
    : undefined;
  if (opening && before && before.id !== newcomerId) {
    facts["before-you"] = fact(`${before.givenName} ${before.familyName}`, [
      opening.id,
      before.id,
    ]);
    const left = opening.replacesJobId
      ? howWorkerLeft(api, before.id, opening.replacesJobId)
      : undefined;
    if (left)
      facts[`left-${left.how}`] = fact("yes", [opening.id, left.id, before.id]);
  }

  // The crew, the newcomer among them, said where a crew is small.
  const crew = Math.round(staffCount(api, org.id));
  if (
    crew > P.one &&
    crew <= DEFAULT_DIRECTOR_DATA.parameters.directorFirstDaySmallCrew!.value
  )
    facts.coworkers = fact(countSaid(crew, crew), [org.id]);

  // How long the one showing them around has been there, where it is longer
  // than anyone else's on a record.
  const mine = core.jobs.get(core.people.get(authorityId)?.jobId ?? "");
  if (mine && mine.organizationId === org.id && !mine.endsAt) {
    const theirs = startedOn(core, authorityId, mine);
    const days = theirs ? daysBetweenText(theirs.day, core.date) : P.zero;
    const others = currentJobs(api, org.id)
      .filter(
        (row) =>
          row.id !== mine.id &&
          row.id !== job.id &&
          core.jobs.has(row.id) &&
          !row.endsAt,
      )
      .map((row) => startedOn(core, row.personId, row))
      .filter((row): row is { day: string; id: string } => !!row);
    if (
      theirs &&
      days >=
        DEFAULT_DIRECTOR_DATA.parameters.directorFirstDayLongestDays!.value &&
      others.every((row) => theirs.day < row.day)
    )
      facts["longest-there"] = fact(spanSaid(days), [
        input.causeId,
        mine.id,
        theirs.id,
      ]);
  }

  // The newcomer's own work before this job: none on record, or the last
  // employer where it ended lately.
  Object.assign(facts, earlierWork(core, newcomerId, job));

  // Paid below the middle of what the others with the same title there earn.
  const hourly = (row: JobInput) =>
    row.hourlyMinor ??
    row.wageDailyMinor / Math.max(row.hoursDaily, Number.EPSILON);
  const others = currentJobs(api, org.id)
    .filter((row) => row.id !== job.id && row.title === job.title)
    .map(hourly)
    .sort((a, b) => a - b);
  const middle = others.length
    ? others[Math.floor(others.length / P.two)]!
    : null;
  if (middle !== null && hourly(job) < middle)
    facts["pay-low"] = fact("yes", [job.id, org.id]);
  return facts;
}

/**
 * `first-job` (no other job of theirs on record, before the start or since)
 * or `came-from` (the employer of the last one, if it ended within the
 * director's recent window).
 */
function earlierWork(
  core: Readonly<CoreState>,
  personId: PersonId,
  job: JobInput,
): Record<string, Fact> {
  const earlier: {
    id: string;
    orgId: string | undefined;
    endedAt: string | undefined;
  }[] = [];
  for (const row of core.jobs.values())
    if (row.personId === personId && row.id !== job.id)
      earlier.push({
        id: row.id,
        orgId: row.organizationId,
        endedAt: row.endsAt,
      });
  for (const row of pastWorkOf(core as CoreState, personId))
    if (row.kind === PAST_WORK_SPELL && row.facts.jobId !== job.id)
      earlier.push({
        id: row.id,
        orgId: row.facts.organizationId
          ? String(row.facts.organizationId)
          : undefined,
        endedAt: row.facts.endedAt ? String(row.facts.endedAt) : undefined,
      });
  if (!earlier.length) return { "first-job": fact("yes", [personId]) };
  const last = earlier
    .filter((row) => row.endedAt)
    .sort((a, b) => b.endedAt!.localeCompare(a.endedAt!))[P.zero];
  const window =
    DEFAULT_DIRECTOR_DATA.parameters.directorFirstDayRecentDays!.value;
  const org: OrganizationInput | undefined = last?.orgId
    ? core.organizations.get(last.orgId)
    : undefined;
  if (
    !last ||
    !org ||
    org.kind === OUTSIDE_MARKET_KIND ||
    org.id === job.organizationId ||
    daysBetweenText(last.endedAt!, core.date) > window
  )
    return {};
  return {
    "came-from": fact(employerSaid(businessNameSaid(org), org), [
      last.id,
      org.id,
    ]),
  };
}
