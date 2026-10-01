import { addDays, personName } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { organizationProfileAt } from "../simulation/life-queries";
import { TOWN_JOB_END_REASONS } from "../simulation/living-world/town-labor-market";
import { MIGRATION_MOVED_EVENT } from "../simulation/migration/contract";
import { strongestObservedTraitLabels } from "../simulation/people-traits";
import { FAMILY_MEMBER_ADDED_EVENT } from "../simulation/people-family";
import {
  upbringingFor,
  type CaregivingClimate,
  type FamilyMoney,
  type HomeStability,
  type SchoolExperience,
  type UpbringingEvent,
} from "../simulation/people-upbringing";
import { deathNewsBetween } from "./death-news";

/**
 * LIVES slice step 5: what the player can read about how they grew up and
 * about the lives around them, from facts the world already recorded.
 *
 * Read-only. Nothing is written, no time passes, and no sentence is composed
 * that a record does not carry: the upbringing lines are worded from the
 * upbringing record's own fields, the leanings are the traits that were
 * actually written down for this person, and the town lines are the events and
 * work statuses themselves.
 */

export interface LivesRecordLine {
  readonly key: string;
  readonly at: IsoDate;
  readonly kind: "birth" | "job-loss" | "move" | "death";
  readonly sentence: string;
}

export interface LivesRecord {
  /** How the person grew up, one sentence each; empty before an upbringing reads. */
  readonly upbringing: readonly string[];
  /** The leanings upbringing and later life actually left on record, strongest first. */
  readonly leanings: readonly string[];
  /** The last year around the person, newest first. */
  readonly around: readonly LivesRecordLine[];
}

/** How far back "around you" reaches. */
export const AROUND_YOU_DAYS = 365;
const AROUND_YOU_LIMIT = 12;

const MONEY: Record<FamilyMoney, string> = {
  secure: "money was not a worry at home",
  strained: "money was tight at home",
  "severe-scarcity": "there was often not enough money at home",
};
const STABILITY: Record<HomeStability, string> = {
  stable: "You stayed in one home.",
  "some-moves": "You moved a few times.",
  disrupted: "Home kept being upended.",
};
const CARE: Record<CaregivingClimate, string> = {
  "protective-reliable": "The adults who raised you were warm and reliable.",
  "consistent-firm": "The adults who raised you were firm and consistent.",
  inconsistent: "The adults who raised you were hard to predict.",
  "high-conflict": "There was a lot of conflict in the house.",
  harsh: "The adults who raised you were harsh.",
};
const EVENT: Record<UpbringingEvent, string> = {
  "parent-death": "A parent died while you were growing up.",
  "parent-separation": "Your parents separated.",
  "serious-illness": "You went through a serious illness.",
  "family-illness-care": "Someone in your family needed care for an illness.",
  "law-allegation": "Someone close to you was accused of breaking the law.",
  "adjudicated-law-trouble":
    "Someone close to you was found to have broken the law.",
  "harsh-authority-treatment":
    "You were treated harshly by someone in authority.",
};
const SCHOOL: Record<SchoolExperience, string> = {
  "reliable-support": "School had adults you could count on.",
  "earned-success": "You did well at school.",
  "supported-setbacks": "You had setbacks at school, with help.",
  "ridicule-or-exclusion": "You were left out or laughed at at school.",
  "peer-belonging": "You belonged among friends at school.",
  bullying: "You were bullied at school.",
};

function upbringingLines(world: World, personId: EntityId): readonly string[] {
  const record = upbringingFor(world, personId);
  const early = record.money.find((row) => row.period === "early-childhood");
  const later = record.money.find((row) => row.period === "adolescence");
  const lines: string[] = [];
  if (early && later)
    lines.push(
      early.level === later.level
        ? `Growing up, ${MONEY[early.level]}.`
        : `As a small child, ${MONEY[early.level]}; as a teenager, ${MONEY[later.level]}.`,
    );
  lines.push(STABILITY[record.homeStability], CARE[record.caregiving]);
  for (const event of record.events) lines.push(EVENT[event]);
  for (const experience of record.schooling) lines.push(SCHOOL[experience]);
  return lines;
}

export function projectLivesRecord(
  world: World,
  personId: EntityId,
): LivesRecord {
  const person = world.people[personId];
  if (!person) return { upbringing: [], leanings: [], around: [] };
  const since = addDays(world.currentDate, -AROUND_YOU_DAYS);
  const home = person.homeJurisdictionId;
  const near = (id: EntityId) => world.people[id]?.homeJurisdictionId === home;
  const around: LivesRecordLine[] = [];

  for (const event of world.history.events) {
    if (event.occurredAt <= since || event.occurredAt > world.currentDate)
      continue;
    if (
      event.type === FAMILY_MEMBER_ADDED_EVENT &&
      event.jurisdictionId === home
    )
      around.push({
        key: event.id,
        at: event.occurredAt,
        kind: "birth",
        sentence: event.summary,
      });
    else if (
      event.type === MIGRATION_MOVED_EVENT &&
      event.jurisdictionId === home
    )
      around.push({
        key: event.id,
        at: event.occurredAt,
        kind: "move",
        sentence: event.summary,
      });
  }
  for (const death of deathNewsBetween(
    world,
    personId,
    since,
    world.currentDate,
  ))
    around.push({
      key: death.eventId,
      at: death.learnedAt,
      kind: "death",
      sentence: death.sentence,
    });

  const ended = new Set<string>([
    TOWN_JOB_END_REASONS.laidOff,
    TOWN_JOB_END_REASONS.businessClosed,
  ]);
  const relationships = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  for (const status of world.history.workStatuses) {
    if (
      status.status !== "ended" ||
      status.reason === null ||
      !ended.has(status.reason) ||
      status.effectiveAt <= since ||
      status.effectiveAt > world.currentDate
    )
      continue;
    const job = relationships.get(status.workRelationshipId);
    if (!job || !near(job.personId)) continue;
    const employer = job.organizationId
      ? organizationProfileAt(world, job.organizationId)?.name
      : undefined;
    const who = personName(world.people[job.personId]!);
    around.push({
      key: status.id,
      at: status.effectiveAt,
      kind: "job-loss",
      sentence:
        status.reason === TOWN_JOB_END_REASONS.businessClosed
          ? `${who} lost a job when ${employer ?? "the business"} closed.`
          : `${who} was laid off${employer ? ` from ${employer}` : ""}.`,
    });
  }

  around.sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
  return {
    upbringing: upbringingLines(world, personId),
    leanings: strongestObservedTraitLabels(world, personId, 5),
    around: around.slice(0, AROUND_YOU_LIMIT),
  };
}
