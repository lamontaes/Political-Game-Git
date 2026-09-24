import { eventById } from "./event-index";
import { projectPublicInformationDigest } from "./public-information";
import { recordOrdinaryDeathRead } from "./press/ordinary-readership";
import type { StoryLeadRecord } from "./press/records";
import { currentHistoricalCutoff } from "./queries";
import { recordEventKnowledge } from "./records";
import type { EntityId, World } from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

/** Selecting an article records the edition this person actually read. */
export function recordSelectedPublicationRead(
  world: World,
  input: { readonly personId: EntityId; readonly publicationId: EntityId },
): World {
  const person = world.people[input.personId];
  if (
    !person ||
    !isPersonAliveAt(world, input.personId, currentHistoricalCutoff(world))
  ) {
    throw new Error("A publication reader must be living at the read date.");
  }
  const item = projectPublicInformationDigest(world).items.find(
    (candidate) => candidate.publicationId === input.publicationId,
  );
  const root = world.history.publications?.find(
    (publication) => publication.id === input.publicationId,
  );
  if (!item || !root || root.publishedAt > world.currentDate) {
    throw new Error("A reader must select a published article.");
  }
  const editionId = item.corrections.at(-1)?.publicationId ?? root.id;
  const edition = world.history.publications?.find(
    (publication) => publication.id === editionId,
  );
  if (!edition || edition.publishedAt > world.currentDate) {
    throw new Error("A reader cannot open an unpublished edition.");
  }
  const stableKey = `${root.stableKey}:selected-read:${edition.id}:${person.id}`;
  let next = world.history.knowledge.some(
    (entry) => entry.stableKey === stableKey,
  )
    ? world
    : recordEventKnowledge(world, {
        stableKey,
        personId: person.id,
        eventId: root.sourceEventId,
        learnedAt: world.currentDate,
        believedSummary: edition.headline,
        // A press headline is a report, not proof that all its claims are true.
        accuracy: root.kind === "press-story" ? "unknown" : "accurate",
        confidence: root.kind === "press-story" ? "medium" : "high",
        source: {
          kind: "media",
          outlet: edition.outletName,
          reference: edition.id,
        },
      });

  // Only the uncorrected original's explicitly linked public death is learned
  // as a fact. A correction can change its claim without changing the source
  // event or the original lead, so reading one must not teach the old claim.
  if (edition.id !== root.id || root.kind !== "press-story") return next;
  const lead = root.sourceRecordIds
    .map((id) => world.history.pressRecords?.find((record) => record.id === id))
    .find((record): record is StoryLeadRecord => record?.kind === "story-lead");
  if (!lead) return next;
  for (const basisId of lead.basisEventIds) {
    const event = eventById(next, basisId);
    if (
      event?.type !== "crisis.officeholder-died" ||
      event.visibility !== "public"
    )
      continue;
    next = recordOrdinaryDeathRead(next, {
      personId: person.id,
      publicationId: root.id,
      deathEventId: event.id,
    });
  }
  return next;
}
