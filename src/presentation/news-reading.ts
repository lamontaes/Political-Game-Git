import { recordEventKnowledge, type EntityId, type World } from "../simulation";
import { projectNewsArticle } from "./news-front-page";

/** Reading an article records its claim as encountered, without verifying it. */
export function readNewsStory(
  world: World,
  playerPersonId: EntityId,
  publicationId: EntityId,
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== playerPersonId
  )
    throw new Error("Only the played person can read a story in this view.");
  const story = projectNewsArticle(world, publicationId);
  if (!story) throw new Error("That news story is not available to read.");
  const stableKey = `news:read:${playerPersonId}:${publicationId}`;
  if (world.history.knowledge.some((record) => record.stableKey === stableKey))
    return world;
  return recordEventKnowledge(world, {
    stableKey,
    personId: playerPersonId,
    eventId: story.sourceEventId,
    learnedAt: world.currentDate,
    believedSummary: story.headline,
    accuracy: "unknown",
    confidence: "medium",
    source: {
      kind: "media",
      outlet: story.outletName,
      reference: publicationId,
    },
  });
}
