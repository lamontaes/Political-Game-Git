import { recordedLawAt, recordNewsLawExposure } from "../law-exposure";
import {
  PRESS_STORY_LEAD_TAG,
  PRESS_STORY_EVENT_TYPE,
} from "../public-information-integrity";
import type {
  EntityId,
  LawExposureChannel,
  LawExposureRecord,
  World,
} from "../types";
import { LAW_EFFECT_MEASURE_TAG } from "./law-effect-news";
import { LAW_EFFECT_EVENT_TYPE } from "./shared";
import { pressRecordsOfKind } from "./store";

/**
 * HEARD FROM THE NEWS (slice 8).
 *
 * When a person learns of a published story about what a recorded law did,
 * they get one law exposure with the relation "news". Everything is read from
 * the records: the person from their knowledge of the story, the story from
 * the publication it names, the lead from the story, and the law, section and
 * channel from the law-effect event the lead reported. It carries no money and
 * no opinion weight (law-exposure.ts writes it without a reflection), and
 * keeps the knowledge, publication, story lead and basis event ids.
 *
 * Nothing is written when the records do not say what the law did in a way an
 * exposure can name: a story that is not about a law's effect, or one whose
 * effect names no exposure channel.
 */

const REACH_TAG = "law-effect:reach:";
const SOURCE_TAG = "law-effect:source:";
const SECTION_TAG = "law-effect:section:";

/** Reaches that are already exposure channels (law-effect-news.ts `Reach`). */
const CHANNEL_REACHES: ReadonlySet<string> = new Set<LawExposureChannel>([
  "paycheck",
  "tax-payment",
  "benefit",
  "job-rule",
  "election-rule",
  "business-rule",
  "public-service",
  "rent",
]);

function tagged(tags: readonly string[], prefix: string): readonly string[] {
  return tags
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length));
}

export function recordStoryHeardExposure(
  world: World,
  input: { readonly knowledgeId: EntityId; readonly basisEventId: EntityId },
): World {
  const knowledge = world.history.knowledge.find(
    (row) => row.id === input.knowledgeId,
  );
  if (!knowledge) throw new Error("No knowledge record with that id.");
  if (knowledge.source.kind !== "media" || !knowledge.source.reference)
    throw new Error("Only knowledge from a publication is heard in the news.");
  const publicationId = knowledge.source.reference;
  const publication = (world.history.publications ?? []).find(
    (row) => row.id === publicationId,
  );
  if (!publication) throw new Error("The knowledge names no publication.");
  const story = world.history.events.find(
    (event) => event.id === publication.sourceEventId,
  );
  if (
    !story ||
    story.type !== PRESS_STORY_EVENT_TYPE ||
    knowledge.eventId !== story.id
  )
    return world;
  const leadId = tagged(story.tags, PRESS_STORY_LEAD_TAG)[0];
  const lead = pressRecordsOfKind(world, "story-lead").find(
    (row) => row.id === leadId,
  );
  if (!lead || !lead.basisEventIds.includes(input.basisEventId)) return world;
  const basis = world.history.events.find(
    (event) => event.id === input.basisEventId,
  );
  if (!basis || basis.type !== LAW_EFFECT_EVENT_TYPE) return world;
  const measureId = tagged(basis.tags, LAW_EFFECT_MEASURE_TAG)[0];
  // Resolve the exact starting or enacted identity; a prefix alone is not law.
  if (
    !measureId ||
    !recordedLawAt(world, measureId as EntityId, world.currentDate)
  )
    return world;

  // How the law reached people: the reporter's own exposures the story was
  // drawn from, else the effect's reach where it is already a channel.
  const sources = new Set(tagged(basis.tags, SOURCE_TAG));
  const drawnFrom: LawExposureRecord | undefined = (
    world.history.lawExposures ?? []
  ).find((row) => sources.has(row.id) && row.measureId === measureId);
  const reach = tagged(basis.tags, REACH_TAG)[0];
  const channel =
    drawnFrom?.channel ??
    (reach && CHANNEL_REACHES.has(reach)
      ? (reach as LawExposureChannel)
      : null);
  if (!channel) return world;

  return recordNewsLawExposure(world, {
    stableKey: `news:${knowledge.id}:${basis.id}`,
    personId: knowledge.personId,
    measureId: measureId as EntityId,
    sectionKey:
      drawnFrom?.sectionKey ?? tagged(basis.tags, SECTION_TAG)[0] ?? null,
    channel,
    news: {
      knowledgeId: knowledge.id,
      publicationId: publication.id,
      storyLeadId: lead.id,
      basisEventId: basis.id,
    },
  });
}
