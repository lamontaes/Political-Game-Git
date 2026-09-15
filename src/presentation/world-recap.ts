import {
  personName,
  projectPublicInformationDigest,
  type EntityId,
  type EventKnowledgeRecord,
  type HistoricalEvent,
  type IsoDate,
  type World,
} from "../simulation";
import { isWorldMachineryEvent } from "./world39-news";

/**
 * What changed since the player last caught up, read from the saved World.
 *
 * A recap is a READ. It never publishes, never grants knowledge and never
 * records that it was shown; the shell's frontier moves only when the player
 * dismisses it. Everything listed is either a published news item (public
 * record anyone could read) or something this player actually learned, and
 * each learned item keeps the way it reached them, so a secondhand account is
 * presented as one rather than as a fact.
 *
 * Grouping is by shared record identity only. A news item and the player's
 * knowledge of the same event are one entry; two events that merely happened
 * in the same week are two entries, because adjacency is not a causal link.
 */

export interface RecapPerson {
  readonly personId: EntityId;
  readonly label: string;
}

export interface RecapEntry {
  /** Stable for the underlying record, so reopening shows the same rows. */
  readonly key: string;
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly at: IsoDate;
  readonly headline: string;
  /** How this reached the player, when that matters to how it is read. */
  readonly attribution: string | null;
  readonly inNews: boolean;
  readonly people: readonly RecapPerson[];
}

export interface WorldRecap {
  /** The frontier this recap was read from. */
  readonly since: number;
  /** Dismissing this recap catches the player up through this sequence. */
  readonly throughSequence: number;
  readonly entries: readonly RecapEntry[];
  /** Entries beyond the shown ones; News and People still carry them. */
  readonly more: number;
}

export const RECAP_ENTRY_LIMIT = 3;

/**
 * Meaningful public or known change after `frontier`, or null for a quiet
 * interval. Null is an ordinary answer: no recap is shown and nothing else is
 * invented to fill the space.
 */
export function projectWorldRecap(
  world: World,
  playerPersonId: EntityId,
  frontier: number,
  limit: number = RECAP_ENTRY_LIMIT,
): WorldRecap | null {
  const entries = new Map<EntityId, RecapEntry>();

  for (const item of newsSince(world, frontier)) {
    entries.set(item.eventId, item);
  }
  for (const item of learnedSince(world, playerPersonId, frontier)) {
    const published = entries.get(item.eventId);
    // The published copy is the shared public wording; keep it, and keep the
    // later of the two sequences so the entry sorts by when it reached them.
    entries.set(
      item.eventId,
      published
        ? {
            ...published,
            sequence: Math.max(published.sequence, item.sequence),
          }
        : item,
    );
  }

  const ordered = [...entries.values()].sort(
    (left, right) =>
      right.sequence - left.sequence || left.key.localeCompare(right.key),
  );
  if (ordered.length === 0) return null;
  return {
    since: frontier,
    throughSequence: world.history.nextSequence,
    entries: ordered.slice(0, limit),
    more: Math.max(0, ordered.length - limit),
  };
}

function newsSince(world: World, frontier: number): RecapEntry[] {
  const publications = world.history.publications ?? [];
  const digest = projectPublicInformationDigest(world);
  const latestSequence = new Map<EntityId, number>();
  for (const publication of publications) {
    if (publication.publishedAt > world.currentDate) continue;
    const root = rootPublicationId(publications, publication.id);
    latestSequence.set(
      root,
      Math.max(latestSequence.get(root) ?? -1, publication.sequence),
    );
  }
  return digest.items
    .filter(
      (item) => (latestSequence.get(item.publicationId) ?? -1) >= frontier,
    )
    .map((item) => ({
      key: `news:${item.publicationId}`,
      eventId: item.sourceEventId,
      sequence: latestSequence.get(item.publicationId)!,
      at: item.publicationTime,
      headline: item.headline,
      attribution:
        item.corrections.length > 0
          ? `${item.outletName}, corrected`
          : item.outletName,
      inNews: true,
      people: item.people.map((person) => ({
        personId: person.personId,
        label: person.label,
      })),
    }));
}

function rootPublicationId(
  publications: NonNullable<World["history"]["publications"]>,
  id: EntityId,
): EntityId {
  let cursor = publications.find((entry) => entry.id === id);
  while (cursor?.correctsPublicationId) {
    const parent = publications.find(
      (entry) => entry.id === cursor!.correctsPublicationId,
    );
    if (!parent) break;
    cursor = parent;
  }
  return cursor?.id ?? id;
}

function learnedSince(
  world: World,
  playerPersonId: EntityId,
  frontier: number,
): RecapEntry[] {
  const events = new Map(
    world.history.events.map((event) => [event.id, event]),
  );
  const entries: RecapEntry[] = [];
  for (const record of world.history.knowledge) {
    if (
      record.personId !== playerPersonId ||
      record.sequence < frontier ||
      record.learnedAt > world.currentDate
    )
      continue;
    const event = events.get(record.eventId);
    if (!event || !isRecappable(event, playerPersonId, record)) continue;
    entries.push({
      key: `known:${record.id}`,
      eventId: event.id,
      sequence: record.sequence,
      at: record.learnedAt,
      headline: record.believedSummary,
      attribution: attributionFor(world, record),
      inNews: false,
      people: participantsOf(world, event, playerPersonId),
    });
  }
  return entries;
}

/**
 * A learned event belongs in a recap when it is a change in the world rather
 * than the player's own doing or the engine's bookkeeping.
 *
 * The player's own conversations and actions are not news to them. A private
 * event reaches a recap only through an account from somebody — told, heard or
 * reported — and then it is attributed, never stated as established.
 */
function isRecappable(
  event: HistoricalEvent,
  playerPersonId: EntityId,
  record: EventKnowledgeRecord,
): boolean {
  if (event.occurredAt > record.learnedAt) return false;
  if (isWorldMachineryEvent(event.type, event.tags)) return false;
  if (event.type === "life.conversation") return false;
  if (event.participants.some((entry) => entry.personId === playerPersonId))
    return false;
  if (event.visibility === "private" && record.source.kind === "direct")
    return false;
  return true;
}

function attributionFor(
  world: World,
  record: EventKnowledgeRecord,
): string | null {
  const source = record.source;
  switch (source.kind) {
    case "direct":
    case "public-record":
      return null;
    case "media":
      return `Reported by ${source.outlet}`;
    case "told-by": {
      const teller = world.people[source.sourcePersonId];
      return teller ? `${personName(teller)} told you` : "Someone told you";
    }
    case "rumor": {
      const teller = source.sourcePersonId
        ? world.people[source.sourcePersonId]
        : undefined;
      return teller ? `Secondhand, from ${personName(teller)}` : "Secondhand";
    }
  }
}

function participantsOf(
  world: World,
  event: HistoricalEvent,
  playerPersonId: EntityId,
): RecapPerson[] {
  const seen = new Set<EntityId>();
  const people: RecapPerson[] = [];
  for (const entry of event.participants) {
    if (entry.personId === playerPersonId || seen.has(entry.personId)) continue;
    const person = world.people[entry.personId];
    if (!person) continue;
    seen.add(entry.personId);
    people.push({ personId: entry.personId, label: personName(person) });
  }
  return people;
}
