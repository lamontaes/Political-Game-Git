import { currentHistoricalCutoff } from "../queries";
import { recordEventKnowledge } from "../records";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
} from "../public-information-integrity";
import { isPersonAliveAt } from "../vitality-integrity";
import type { EntityId, World } from "../types";
import { pressRecordsOfKind } from "./store";
import { recordStoryHeardExposure } from "./story-exposure";
import { formOfficialViewFromPublishedStory } from "../living-world/official-views";

/** An explicit player read, using the same saved knowledge and news writer as the desk. */
export function readPressPublication(
  world: World,
  personId: EntityId,
  publicationId: EntityId,
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !world.people[personId] ||
    !isPersonAliveAt(world, personId, currentHistoricalCutoff(world))
  )
    return world;
  const publication = world.history.publications?.find(
    (row) => row.id === publicationId,
  );
  if (
    !publication ||
    publication.publishedAt > world.currentDate ||
    publication.recordedAt > world.currentDate
  )
    return world;
  const story = world.history.events.find(
    (row) => row.id === publication.sourceEventId,
  );
  if (
    !story ||
    story.type !== PRESS_STORY_EVENT_TYPE ||
    story.visibility !== "public" ||
    story.recordedAt > world.currentDate ||
    story.occurredAt > world.currentDate
  )
    return world;
  const stableKey = `${publication.stableKey}:read:${personId}`;
  const prior = world.history.knowledge.find(
    (row) =>
      row.personId === personId &&
      row.eventId === story.id &&
      row.source.kind === "media" &&
      row.source.reference === publication.id &&
      row.learnedAt <= world.currentDate,
  );
  if (
    !prior &&
    world.history.knowledge.some((row) => row.stableKey === stableKey)
  )
    return world;
  let next = prior
    ? world
    : recordEventKnowledge(world, {
        stableKey,
        personId,
        eventId: story.id,
        learnedAt: world.currentDate,
        believedSummary: `${publication.outletName} reported: ${story.summary}`,
        accuracy: "accurate",
        confidence: "high",
        source: {
          kind: "media",
          outlet: publication.outletName,
          reference: publication.id,
        },
      });
  const knowledge =
    prior ?? next.history.knowledge.find((row) => row.stableKey === stableKey);
  if (!knowledge) return next;
  const leadTags = story.tags.filter((tag) =>
    tag.startsWith(PRESS_STORY_LEAD_TAG),
  );
  if (leadTags.length !== 1) return next;
  const leadId = leadTags[0]!.slice(PRESS_STORY_LEAD_TAG.length);
  const lead = pressRecordsOfKind(next, "story-lead").find(
    (row) => row.id === leadId,
  );
  if (!lead) return next;
  for (const basisEventId of lead.basisEventIds)
    next = formOfficialViewFromPublishedStory(next, knowledge.id, basisEventId);
  for (const basisEventId of lead.basisEventIds)
    next = recordStoryHeardExposure(next, {
      knowledgeId: knowledge.id,
      basisEventId,
    });
  return next;
}
