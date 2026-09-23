import type { EntityId, IsoDate, World } from "../simulation";
import { careerReplyBy } from "../simulation/career-path7";
import {
  applicationsFor,
  latestApplicationStep,
} from "../simulation/job-market";
import { addDays, daysBetween } from "../simulation/dates";
import {
  workRelationshipHistoryForPerson,
  workRoleAt,
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

/** Whether an application is still waiting on the employer's decision. */
function decisionPending(world: World, personId: EntityId): boolean {
  return applicationsFor(world, personId).some(
    (application) => !latestApplicationStep(world, application.id),
  );
}

/**
 * A skip stops on the last day to answer an offer. This is not a preference:
 * an offer with a reply date is a decision that needs the player. While an
 * application is still waiting on the employer, the skip moves three days at
 * a time, the shortest reply window, so an offer made during it is stopped
 * for too.
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
    let stepTo = due && due < target ? due : target;
    if (decisionPending(current, personId)) {
      const chunk = addDays(current.currentDate, 3);
      if (chunk < stepTo) stepTo = chunk;
    }
    const next = advance(current, daysBetween(current.currentDate, stepTo));
    if (next === current || next.currentDate < stepTo) return next;
    if (
      offerDeadlines(next, personId).some(
        (deadline) => deadline.replyBy === next.currentDate,
      )
    )
      return next;
    current = next;
  }
  return current;
}
