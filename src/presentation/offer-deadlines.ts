import type { EntityId, IsoDate, World } from "../simulation";
import {
  careerExpectedStart,
  careerOfferAccepted,
  careerReplyBy,
} from "../simulation/career-path7";
import {
  applicationsFor,
  expectedStart,
  latestApplicationStep,
} from "../simulation/job-market";
import { addDays, daysBetween } from "../simulation/dates";
import {
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
} from "../simulation/life-queries";
import { proseDate } from "./prose-dates";

/**
 * Offers of work the player can still answer, each with its last day.
 *
 * An offer that lapses is the employer's answer to silence, so it must never
 * be the first the player hears of it. In Atlanta, Fulton County offered Sofia
 * a clerk job; a long skip carried her past the reply date, and the offer
 * lapsed having appeared only on the Jobs list. These deadlines are said on
 * the day overview and stop a skip on the last day to answer.
 */
export interface OfferDeadline {
  readonly key: string;
  readonly replyBy: IsoDate;
  readonly sentence: string;
}

export function offerDeadlines(
  world: World,
  personId: EntityId,
): readonly OfferDeadline[] {
  const deadlines: OfferDeadline[] = [];
  for (const application of applicationsFor(world, personId)) {
    const latest = latestApplicationStep(world, application.id);
    if (latest?.kind !== "offered" || !latest.replyBy) continue;
    if (world.currentDate > latest.replyBy) continue;
    const told = world.history.events.find(
      (event) => event.id === latest.eventId,
    );
    deadlines.push({
      key: `job-offer:${application.id}`,
      replyBy: latest.replyBy,
      sentence: `${told?.summary ?? `A job offer is waiting for your answer by ${proseDate(latest.replyBy)}.`} Answer it under Work.`,
    });
  }
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    const replyBy = careerReplyBy(world, relationship.id);
    if (!replyBy || world.currentDate > replyBy) continue;
    const title = workRoleAt(world, relationship.id)?.title ?? "work";
    deadlines.push({
      key: `career-offer:${relationship.id}`,
      replyBy,
      sentence: `${title}: answer the offer by ${proseDate(replyBy)}, or it lapses.`,
    });
  }
  return deadlines.sort((a, b) => a.replyBy.localeCompare(b.replyBy));
}

/** Accepted work that has not begun, including a revised start after a call. */
export interface AcceptedOfferStart {
  readonly key: string;
  readonly startOn: IsoDate;
}

export function acceptedOfferStarts(
  world: World,
  personId: EntityId,
): readonly AcceptedOfferStart[] {
  const starts: AcceptedOfferStart[] = [];
  for (const application of applicationsFor(world, personId)) {
    const latest = latestApplicationStep(world, application.id);
    if (latest?.kind !== "accepted" && latest?.kind !== "followed-up") continue;
    const startOn = expectedStart(world, application.id);
    if (!startOn) continue;
    starts.push({
      key: `job-start:${application.id}`,
      startOn,
    });
  }
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    if (!relationship.stableKey.startsWith("career-path7:")) continue;
    if (workStatusAt(world, relationship.id)?.status !== "expected") continue;
    if (!careerOfferAccepted(world, relationship.id)) continue;
    const startOn = careerExpectedStart(world, relationship.id);
    if (!startOn) continue;
    starts.push({
      key: `career-start:${relationship.id}`,
      startOn,
    });
  }
  return starts.sort((a, b) => a.startOn.localeCompare(b.startOn));
}

/** Whether an application is still waiting on the employer's decision. */
function decisionPending(world: World, personId: EntityId): boolean {
  return applicationsFor(world, personId).some(
    (application) => !latestApplicationStep(world, application.id),
  );
}

/**
 * A skip stops on the last day to answer an offer and the first morning
 * accepted work can begin. Neither date can be passed without handing the
 * decision back to the player. While an employer's answer is pending, or an
 * accepted start has been missed, the skip moves three days at a time so a
 * newly recorded offer or revised start cannot be crossed in the same jump.
 */
export function advanceStoppingForOfferDeadlines(
  world: World,
  personId: EntityId,
  days: number,
  advance: (current: World, days: number) => World,
): World {
  const target = addDays(world.currentDate, Math.max(1, Math.trunc(days)));
  let current = world;
  while (current.currentDate < target) {
    const due = offerDeadlines(current, personId).find(
      (deadline) => deadline.replyBy > current.currentDate,
    )?.replyBy;
    const starts = acceptedOfferStarts(current, personId);
    const start = starts.find(
      (entry) => entry.startOn > current.currentDate,
    )?.startOn;
    let stepTo = due && due < target ? due : target;
    if (start && start < stepTo) stepTo = start;
    if (
      decisionPending(current, personId) ||
      starts.some((entry) => entry.startOn <= current.currentDate)
    ) {
      const chunk = addDays(current.currentDate, 3);
      if (chunk < stepTo) stepTo = chunk;
    }
    const next = advance(current, daysBetween(current.currentDate, stepTo));
    if (next === current || next.currentDate < stepTo) return next;
    if (
      offerDeadlines(next, personId).some(
        (deadline) => deadline.replyBy === next.currentDate,
      ) ||
      acceptedOfferStarts(next, personId).some(
        (entry) => entry.startOn === next.currentDate,
      )
    )
      return next;
    current = next;
  }
  return current;
}
