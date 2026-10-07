import { newsStoryWorld } from "./news-story";
import { recordWorldEvent } from "../../src/simulation/world";
import { publishPublicEvent } from "../../src/simulation/public-information";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
  PRESS_STORY_OUTLET_TAG,
} from "../../src/simulation/public-information-integrity";
import { pressRecordsOfKind } from "../../src/simulation/press/store";

/**
 * Supplied-publication boundary. The shared fixture owns the authored law,
 * service effect and actual newsroom path. A second, explicitly authored
 * edition of that actual report is saved before any reader knowledge. From
 * that retained world onward, only the player's normal News controls write.
 * This is not proof of naturally produced new reporting or law effects.
 */
export function newsPublicationReadWorld(place: string, seed: string) {
  const fixture = newsStoryWorld(place, seed);
  let world = fixture.world;
  if (world.control.kind !== "person") throw new Error("No controlled reader.");
  const personId = world.control.personId;
  const heard = world.history.lawExposures?.find(
    (row) => row.relation === "news" && row.measureId === fixture.measureId,
  );
  if (!heard?.news)
    throw new Error("Shared fixture produced no news exposure.");
  const lead = pressRecordsOfKind(world, "story-lead").find(
    (row) => row.id === heard.news!.storyLeadId,
  );
  const outlet = pressRecordsOfKind(world, "media-outlet").find(
    (row) => row.id === lead?.outletId,
  );
  const publication = world.history.publications?.find(
    (row) => row.id === heard.news!.publicationId,
  );
  const story = world.history.events.find(
    (row) => row.id === publication?.sourceEventId,
  );
  if (!lead || !outlet || !story)
    throw new Error("Missing actual report sources.");
  world = recordWorldEvent(world, {
    stableKey: "news-player-read:supplied-edition",
    type: PRESS_STORY_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: story.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        ...story.involvedEntityIds,
        lead.id,
        outlet.organizationId,
        personId,
      ]),
    ],
    participants: story.participants,
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `${PRESS_STORY_LEAD_TAG}${lead.id}`,
      `${PRESS_STORY_OUTLET_TAG}${outlet.id}`,
    ],
    summary: story.summary,
    context: story.context,
  });
  const eventId = world.history.events.at(-1)!.id;
  world = publishPublicEvent(world, {
    stableKey: "news-player-read:supplied-publication",
    sourceEventId: eventId,
    outletId: outlet.id,
  });
  const publicationId = world.history.publications!.at(-1)!.id;
  return {
    world,
    personId,
    publicationId,
    eventId,
    leadId: lead.id,
    basisEventId: heard.news.basisEventId,
    measureId: fixture.measureId,
  };
}
