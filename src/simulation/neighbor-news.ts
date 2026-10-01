import {
  hasStableKey,
  recordById,
  recordsByStringField,
} from "./history-index";
import { currentLifeCutoff, organizationProfileAt } from "./life-queries";
import { personName } from "./people";
import { recordEventKnowledge } from "./records";
import { familyAndFriendsNearby, householdmatesOf } from "./speech-reception";
import type { EntityId, World } from "./types";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";

/**
 * Who hears of a neighbor's news, from the ties the world already records.
 *
 * An event that happens to somebody (a birth, a move, a job lost) used to be
 * written and told to no one, so nobody could ever have heard of it. Here the
 * people who would know are the ones tied to them by a record: the people they
 * live with (household memberships), their recorded family (kinship and
 * partnership), and the friends whose recorded warmth is marked or strong
 * (relationship interactions). Each learns it through the one event-knowledge
 * writer, told by the person it happened to. Somebody with no recorded tie
 * learns nothing, and nothing here is a chance.
 */

/** The event a job ending is written as, beside the work status that records it. */
export const JOB_ENDED_EVENT = "work.job-ended";
export const JOB_ENDED_STATUS_TAG = "work-status:";

function alive(world: World, personId: EntityId): boolean {
  return (
    world.people[personId] !== undefined &&
    isPersonAliveAt(world, personId, currentLifeCutoff(world))
  );
}

/**
 * The people tied to any of these by a record, not including them: who they
 * live with, their family, and their close friends in the same place. Read it
 * before an event changes where anybody lives.
 */
export function peopleTiedTo(
  world: World,
  subjects: readonly EntityId[],
): readonly EntityId[] {
  const ties = new Set<EntityId>();
  for (const subject of subjects) {
    for (const id of householdmatesOf(world, subject)) ties.add(id);
    for (const id of familyAndFriendsNearby(world, subject)) ties.add(id);
  }
  for (const subject of subjects) ties.delete(subject);
  return [...ties].filter((id) => alive(world, id)).sort();
}

/**
 * Tells these people of an event, once each. `direct` are people the event
 * itself involves and who were there; everybody else is told by `teller`,
 * who must be somebody the event happened to.
 */
export function tellPeopleOf(
  world: World,
  eventId: EntityId,
  input: {
    readonly tied: readonly EntityId[];
    readonly direct?: readonly EntityId[];
    readonly teller: EntityId;
  },
): World {
  const event = recordById(world.history.events, eventId);
  if (!event) throw new Error(`No event ${eventId} to tell of.`);
  let next = world;
  const have = new Set(
    recordsByStringField(world.history.knowledge, "eventId", eventId).map(
      (row) => row.personId,
    ),
  );
  const write = (personId: EntityId, source: "direct" | "told") => {
    if (have.has(personId) || !alive(next, personId)) return;
    if (source === "told" && personId === input.teller) return;
    have.add(personId);
    next = recordEventKnowledge(next, {
      stableKey: `neighbor-news:${eventId}:${personId}`,
      personId,
      eventId,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source:
        source === "direct"
          ? { kind: "direct" }
          : { kind: "told-by", sourcePersonId: input.teller, claimId: null },
    });
  };
  for (const personId of input.direct ?? []) write(personId, "direct");
  for (const personId of input.tied) write(personId, "told");
  return next;
}

/**
 * Writes the work.job-ended event for a work status that ended a job, in the
 * same step that ends it, and tells the people tied to the one who lost it.
 * The work status stays the record of the loss; this event only carries it to
 * the people who would hear. `closedBusiness` is for a job lost because the
 * business shut.
 */
export function recordJobEndedNews(
  world: World,
  statusId: EntityId,
  options: { readonly closedBusiness: boolean },
): World {
  const status = recordById(world.history.workStatuses, statusId);
  if (!status || status.status !== "ended") return world;
  const job = recordById(
    world.history.workRelationships,
    status.workRelationshipId,
  );
  const person = job ? world.people[job.personId] : undefined;
  if (!job || !person) return world;
  const employer = job.organizationId
    ? organizationProfileAt(world, job.organizationId)?.name
    : undefined;
  const who = personName(person);
  const summary = options.closedBusiness
    ? `${who} lost a job when ${employer ?? "the business"} closed.`
    : `${who} was laid off${employer ? ` from ${employer}` : ""}.`;
  const eventKey = `${JOB_ENDED_STATUS_TAG}${status.id}:event`;
  // One event per ended job: asking again writes nothing.
  if (hasStableKey(world.history.events, eventKey)) return world;
  const tied = peopleTiedTo(world, [job.personId]);
  const next = recordWorldEvent(world, {
    stableKey: eventKey,
    type: JOB_ENDED_EVENT,
    occurredAt: status.effectiveAt,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [
      job.personId,
      ...(job.organizationId ? [job.organizationId] : []),
    ],
    participants: [
      { personId: job.personId, role: "focus:subject", detail: "Lost a job" },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      JOB_ENDED_EVENT,
      `${JOB_ENDED_STATUS_TAG}${status.id}`,
      ...(status.reason ? [`reason:${status.reason}`] : []),
    ],
    summary,
    context: {
      location: null,
      socialContext: "A job ended in town.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return tellPeopleOf(next, next.history.events.at(-1)!.id, {
    tied,
    direct: [job.personId],
    teller: job.personId,
  });
}
