import { evaluateDecision } from "./decisions";
import { addDays, ageOnDate } from "./dates";
import { formatStatutoryDate } from "./legislation-content-contracts";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdLocationAt,
  householdMembershipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
} from "./life-queries";
import type { LifeRequestDetails } from "./life-request-details";
import { goalConsiderations } from "./people-goal-pursuit";
import { personName } from "./people";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import type {
  DecisionConsideration,
  EntityId,
  HouseholdLocationRecord,
  IsoDate,
  World,
} from "./types";

/**
 * Why somebody would ask somebody over, read from their own life.
 *
 * The owner's rule for ordinary dialogue (dialogue review, 2026-09-23): the
 * world decides what happened — who started it, what they want, why now,
 * where and when, and what each person knows — and a reusable conversation
 * pattern is assembled from that record. Selecting a prewritten incident is
 * not allowed to create the incident.
 *
 * So an invitation here starts with a fact about the person who issues it: a
 * birthday that is actually theirs, a home they actually moved into, or work
 * they actually started, each one read off a canonical record. Where their
 * life holds none of those this week, nobody is invited anywhere, and that is
 * the correct answer. The person then decides for themselves whether to ask,
 * from their own temperament and goals, through the same decision machinery
 * every other generated person uses. Only then is anything written.
 *
 * What comes out is the three facts the adult scene needs and nothing it
 * would have to invent: who is asking, the reason in their own words, and the
 * afternoon it is for. The recipient's knowledge is exactly what they were
 * told; the writer in `life-opportunities.ts` records it as told-by.
 */

/** The reasons this module can read. Bounded; each names its own record. */
export type InitiatorOccasionReason = "birthday" | "new-home" | "new-work";

export interface InitiatorOccasion {
  readonly reason: InitiatorOccasionReason;
  readonly hostPersonId: EntityId;
  /** The record the reason was read from (a person, a location, a job). */
  readonly sourceRecordId: EntityId;
  /** The afternoon the gathering is for, a Saturday. */
  readonly date: IsoDate;
  /** What the recipient is told, in the host's words. */
  readonly details: LifeRequestDetails;
  /** Where it is: the host's recorded home. */
  readonly homeLabel: string;
  /** One line for the canonical event, naming host and reason. */
  readonly summary: string;
  /** What the recipient now believes, in the second person. */
  readonly believed: string;
}

/**
 * How far ahead somebody asks, and how recent a move or a new job still counts.
 *
 * PLACEHOLDER(research: what-ordinary-invitations-are-for): these are pacing
 * windows, not researched rates. Filed with ChatGPT on 2026-09-23.
 */
export const OCCASION_NOTICE_MIN_DAYS = 2;
export const OCCASION_NOTICE_MAX_DAYS = 12;
export const NEW_HOME_RECENT_DAYS = 45;
export const NEW_WORK_RECENT_DAYS = 30;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function weekday(date: IsoDate): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

/** The Saturday on or after a date. */
function saturdayOnOrAfter(date: IsoDate): IsoDate {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, (6 - day + 7) % 7);
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/** This year's (or next year's) birthday on or after today. */
function nextBirthday(birthDate: IsoDate, today: IsoDate): IsoDate {
  const [, month, day] = birthDate.split("-");
  const year = Number(today.slice(0, 4));
  for (const candidateYear of [year, year + 1]) {
    // February 29 falls on March 1 in a common year; Date normalizes it.
    const candidate = new Date(
      Date.UTC(candidateYear, Number(month) - 1, Number(day)),
    )
      .toISOString()
      .slice(0, 10) as IsoDate;
    if (candidate >= today) return candidate;
  }
  return today;
}

function inNoticeWindow(today: IsoDate, date: IsoDate): boolean {
  const ahead = daysBetween(today, date);
  return ahead >= OCCASION_NOTICE_MIN_DAYS && ahead <= OCCASION_NOTICE_MAX_DAYS;
}

function spokenDate(today: IsoDate, date: IsoDate): string {
  const ahead = daysBetween(today, date);
  if (ahead <= 6) return weekday(date);
  return `${weekday(date)}, ${formatStatutoryDate(date).replace(/, \d{4}$/, "")}`;
}

function hostHome(
  world: World,
  hostPersonId: EntityId,
): {
  readonly location: HouseholdLocationRecord;
  readonly size: number;
} | null {
  const cutoff = currentLifeCutoff(world);
  for (const entry of householdMembershipsAt(world, hostPersonId, cutoff)) {
    const householdId = entry.membership.householdId;
    const location = householdLocationAt(world, householdId, cutoff);
    if (location) {
      return {
        location,
        size: peopleInHouseholdAt(world, householdId, cutoff).length,
      };
    }
  }
  return null;
}

/**
 * Every reason this host has, this week, to have people over.
 *
 * Pure: reads records and writes nothing. Ordered birthday, new home, new
 * work, which is only the order they are listed in, not a weight.
 */
export function initiatorOccasions(
  world: World,
  hostPersonId: EntityId,
): readonly InitiatorOccasion[] {
  const host = world.people[hostPersonId];
  if (!host) return [];
  const today = world.currentDate;
  if (ageOnDate(host.birthDate, today) < 18) return [];
  const household = hostHome(world, hostPersonId);
  if (!household) return [];
  const home = household.location;
  const name = personName(host);
  const homeLabel = `${name}'s home`;
  const found: InitiatorOccasion[] = [];

  const birthday = nextBirthday(host.birthDate, today);
  const birthdayGathering = saturdayOnOrAfter(birthday);
  if (inNoticeWindow(today, birthdayGathering)) {
    const turning = ageOnDate(host.birthDate, birthday);
    const when =
      birthday === birthdayGathering
        ? `I turn ${turning} on Saturday`
        : `I turn ${turning} on ${spokenDate(today, birthday)}`;
    found.push({
      reason: "birthday",
      hostPersonId,
      sourceRecordId: host.id,
      date: birthdayGathering,
      homeLabel,
      details: {
        version: 1,
        task: `go to ${name}'s birthday on Saturday afternoon`,
        opening: `${when}, and I am having a few people over that Saturday afternoon. Would you come?`,
        condition: null,
        minutes: 180,
      },
      summary: `${name}, who turns ${turning} on ${formatStatutoryDate(birthday)}, asked you over for the afternoon of ${formatStatutoryDate(birthdayGathering)}.`,
      believed: `${name} turns ${turning} on ${formatStatutoryDate(birthday)} and asked you over on the afternoon of ${formatStatutoryDate(birthdayGathering)}. Going is optional.`,
    });
  }

  // A move is a location that replaced an earlier one, recorded recently.
  if (
    home.supersedesLocationId !== null &&
    daysBetween(home.effectiveAt, today) >= 0 &&
    daysBetween(home.effectiveAt, today) <= NEW_HOME_RECENT_DAYS
  ) {
    const gathering = saturdayOnOrAfter(
      addDays(today, OCCASION_NOTICE_MIN_DAYS),
    );
    if (inNoticeWindow(today, gathering)) {
      found.push({
        reason: "new-home",
        hostPersonId,
        sourceRecordId: home.id,
        date: gathering,
        homeLabel,
        details: {
          version: 1,
          task: `see ${name}'s new place on Saturday afternoon`,
          opening: `${household.size > 1 ? "We" : "I"} moved on ${formatStatutoryDate(home.effectiveAt)} and the boxes are mostly gone. Come see the place on Saturday afternoon?`,
          condition: null,
          minutes: 180,
        },
        summary: `${name}, who moved on ${formatStatutoryDate(home.effectiveAt)}, asked you over to see the new place on ${formatStatutoryDate(gathering)}.`,
        believed: `${name} moved on ${formatStatutoryDate(home.effectiveAt)} and asked you over to see the place on the afternoon of ${formatStatutoryDate(gathering)}. Going is optional.`,
      });
    }
  }

  const cutoff = currentLifeCutoff(world);
  for (const entry of activeWorkRelationshipsAt(world, hostPersonId, cutoff)) {
    const started = entry.relationship.startedAt;
    const since = daysBetween(started, today);
    if (since < 0 || since > NEW_WORK_RECENT_DAYS) continue;
    const organizationId = entry.relationship.organizationId;
    const employer = organizationId
      ? organizationProfileAt(world, organizationId, cutoff)?.name
      : undefined;
    if (!employer) continue;
    const gathering = saturdayOnOrAfter(
      addDays(today, OCCASION_NOTICE_MIN_DAYS),
    );
    if (!inNoticeWindow(today, gathering)) continue;
    found.push({
      reason: "new-work",
      hostPersonId,
      sourceRecordId: entry.relationship.id,
      date: gathering,
      homeLabel,
      details: {
        version: 1,
        task: `go to ${name}'s on Saturday afternoon`,
        opening: `I started at ${employer} on ${formatStatutoryDate(started)}, and I would like to mark it. A few people are coming over Saturday afternoon. Will you?`,
        condition: null,
        minutes: 180,
      },
      summary: `${name}, who started at ${employer} on ${formatStatutoryDate(started)}, asked you over on ${formatStatutoryDate(gathering)}.`,
      believed: `${name} started at ${employer} on ${formatStatutoryDate(started)} and asked you over on the afternoon of ${formatStatutoryDate(gathering)}. Going is optional.`,
    });
    break;
  }

  return found;
}

/**
 * Whether this host, having a reason, actually asks this person.
 *
 * Their decision, not the selector's: the same `evaluateDecision` path an old
 * friend uses to decide whether to call, weighed from the host's recorded
 * temperament and their own connection goal. A host with nothing on record
 * that leans either way does not ask; nobody is made to throw a party.
 * Returns the world with any trait records the decision needed, or null.
 */
export function hostDecidesToAsk(
  world: World,
  hostPersonId: EntityId,
  recipientPersonId: EntityId,
  occasion: InitiatorOccasion,
): World | null {
  const withTraits = ensurePeopleTraits(world, [hostPersonId]);
  const keyPrefix = `occasion:${occasion.reason}:${hostPersonId}:${recipientPersonId}:${occasion.date}`;
  const considerations: DecisionConsideration[] = [
    ...goalConsiderations(withTraits, hostPersonId, keyPrefix, [
      {
        optionKey: "ask",
        goalKey: "opening-life:connection",
        direction: "supports",
        explanation: "They have been meaning to keep up with people.",
      },
    ]),
    ...traitConsiderations(withTraits, hostPersonId, keyPrefix, [
      {
        optionKey: "ask",
        trait: "sociability",
        pole: "high",
        explanation: "They like a full room.",
      },
      {
        optionKey: "keep-it-small",
        trait: "sociability",
        pole: "low",
        explanation: "They would rather keep it to themselves.",
      },
    ]),
  ];
  if (considerations.length === 0) return null;
  const evaluation = evaluateDecision(withTraits, {
    stableKey: keyPrefix,
    decisionType: "people.invite-over",
    actorPersonId: hostPersonId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: occasion.reason, entityId: null },
    options: [
      {
        key: "ask",
        label: "Ask them over",
        description: "Invite them for the afternoon.",
      },
      {
        key: "keep-it-small",
        label: "Keep it small",
        description: "Leave them off this time.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey === "ask" ? withTraits : null;
}
