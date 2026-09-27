/** Publish only recorded public judiciary milestones to the canonical News ledger. */

import { publishPublicEvent } from "../public-information";
import type { EntityId, World } from "../types";

const NEWS_MILESTONE_TYPES = new Set([
  "judicial.nomination",
  "judicial.confirmation-hearing",
  "judicial.committee-report-result",
  "judicial.senate-result",
  "judicial.commission-issued",
]);

export function publishJudiciaryMilestone(
  world: World,
  eventId: EntityId,
): World {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (
    !event ||
    event.visibility !== "public" ||
    !NEWS_MILESTONE_TYPES.has(event.type)
  )
    throw new Error("News requires an actual public judicial milestone.");
  if (
    (world.history.publications ?? []).some(
      (publication) =>
        publication.sourceEventId === eventId &&
        publication.correctsPublicationId === null,
    )
  )
    return world;
  return publishPublicEvent(world, {
    stableKey: `judiciary-news:${eventId}`,
    sourceEventId: eventId,
  });
}
