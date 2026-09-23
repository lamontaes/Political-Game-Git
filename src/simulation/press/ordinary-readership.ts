import { eventById } from "../event-index";
import { stableHash } from "../ids";
import { currentHistoricalCutoff } from "../queries";
import { recordEventKnowledge } from "../records";
import type {
  EntityId,
  HistoricalEvent,
  PublicationRecord,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { stateOfJurisdiction } from "./outlets";
import type { MediaOutletRecord, StoryLeadRecord } from "./records";
import { requirePressRecord } from "./store";

/** An explicit read of an edition, tied to the death notice it actually printed. */
export function recordOrdinaryDeathRead(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly publicationId: EntityId;
    readonly deathEventId: EntityId;
  },
): World {
  const publication = (world.history.publications ?? []).find(
    (item) => item.id === input.publicationId,
  );
  if (
    !publication ||
    publication.kind !== "press-story" ||
    publication.correctsPublicationId !== null
  )
    throw new Error("An ordinary media read needs a published press edition.");
  if (publication.publishedAt > world.currentDate)
    throw new Error("A person cannot read an edition before publication.");
  const person = world.people[input.personId];
  if (
    !person ||
    !isPersonAliveAt(world, input.personId, currentHistoricalCutoff(world))
  )
    throw new Error("An ordinary reader must be living at the read date.");
  const death = eventById(world, input.deathEventId);
  const source = eventById(world, publication.sourceEventId);
  const lead = publication.sourceRecordIds
    .map((id) => world.history.pressRecords?.find((record) => record.id === id))
    .find((record): record is StoryLeadRecord => record?.kind === "story-lead");
  const outletId = publication.outletKey.startsWith("media:")
    ? (publication.outletKey.slice("media:".length) as EntityId)
    : null;
  if (
    death?.type !== "crisis.officeholder-died" ||
    death.visibility !== "public" ||
    !source ||
    source.type !== "press.story-published" ||
    !lead?.basisEventIds.includes(death.id) ||
    !outletId ||
    lead.outletId !== outletId ||
    !source.tags.includes(`press.outlet:${outletId}`) ||
    !source.tags.includes(`press.lead:${lead.id}`)
  ) {
    throw new Error(
      "This edition does not report that public officeholder death.",
    );
  }
  // The desk composes each original edition from every public basis event.
  // Knowledge stores only the public death fact; the immutable publication
  // reference carries the edition's exact words, date and attribution. Other
  // claims in that article do not become accurate death-event knowledge.
  const stableKey = `${publication.stableKey}:ordinary-death-read:${death.id}:${person.id}`;
  if (world.history.knowledge.some((item) => item.stableKey === stableKey))
    return world;
  return recordEventKnowledge(world, {
    stableKey,
    personId: person.id,
    eventId: death.id,
    learnedAt: world.currentDate,
    believedSummary: death.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "media",
      outlet: publication.outletName,
      reference: publication.id,
    },
  });
}

/**
 * Authored reach for a major public death: each represented living resident is
 * independently selected from this edition by a stable world/person/edition
 * draw. Residents in the outlet's market get two of four slots; a national
 * product gives residents outside the event's state one of four. A state or
 * local outlet has no out-of-market route. These are game rates, not measured
 * audience statistics; only a successful read writes knowledge.
 */
export function recordBackgroundDeathReaders(
  world: World,
  lead: StoryLeadRecord,
  publication: PublicationRecord,
): World {
  const outlet = requirePressRecord(world, "media-outlet", lead.outletId);
  const deaths = lead.basisEventIds
    .map((id) => eventById(world, id))
    .filter(
      (event): event is HistoricalEvent =>
        event?.type === "crisis.officeholder-died" &&
        event.visibility === "public",
    );
  if (deaths.length === 0) return world;
  let next = world;
  for (const death of deaths) {
    for (const personId of world.personOrder) {
      const person = world.people[personId];
      if (
        !person ||
        person.birthDate > world.currentDate ||
        world.history.personDeaths.some(
          (item) =>
            item.personId === personId && item.diedAt <= world.currentDate,
        )
      )
        continue;
      const slots = readerSlots(
        world,
        outlet,
        death,
        person.homeJurisdictionId,
      );
      if (slots === 0) continue;
      const draw =
        Number.parseInt(
          stableHash(`${world.id}:${publication.id}:${personId}`).slice(0, 8),
          16,
        ) % 4;
      if (draw >= slots) continue;
      next = recordOrdinaryDeathRead(next, {
        personId,
        publicationId: publication.id,
        deathEventId: death.id,
      });
    }
  }
  return next;
}

function readerSlots(
  world: World,
  outlet: MediaOutletRecord,
  event: HistoricalEvent,
  homeId: EntityId,
): number {
  if (outlet.scope === "local")
    return outlet.primaryJurisdictionIds.includes(homeId) ? 2 : 0;
  const homeState = stateOfJurisdiction(world, homeId);
  const eventState = stateOfJurisdiction(world, event.jurisdictionId);
  if (outlet.scope === "state")
    return homeState && outlet.primaryJurisdictionIds.includes(homeState)
      ? 2
      : 0;
  return homeState && eventState && homeState === eventState ? 2 : 1;
}
