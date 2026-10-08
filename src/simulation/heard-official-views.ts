import type { EntityId, EventKnowledgeRecord, IsoDate, World } from "./types";

/** A dated statement the listener learned, not the holder's current belief. */
export interface HeardOfficialView {
  readonly knowledgeId: EntityId;
  readonly eventId: EntityId;
  readonly holderId: EntityId;
  readonly officialId: EntityId;
  readonly position: "support" | "oppose";
  readonly learnedAt: IsoDate;
  readonly accuracy: EventKnowledgeRecord["accuracy"];
  readonly confidence: EventKnowledgeRecord["confidence"];
}

/**
 * Read only the listener's saved word-of-mouth statements about this official.
 * The complete known IDs delimit the old summary format: entity IDs themselves
 * contain colons. A later private change of mind never rewrites what was heard.
 * No standing totals or private-belief reads belong in this projection.
 */
export function heardOfficialViews(
  world: World,
  listenerId: EntityId,
  officialId: EntityId = listenerId,
): readonly HeardOfficialView[] {
  if (!world.people[listenerId] || !world.people[officialId]) return [];
  return readHeardViews(world, listenerId, (row, holderId) => {
    const prefix = `told-view:${holderId}:${officialId}:`;
    return row.believedSummary.startsWith(prefix)
      ? { officialId, position: row.believedSummary.slice(prefix.length) }
      : null;
  });
}

/**
 * Every view one person told the listener, about any official: what a
 * neighbor says of whom. The summary is `told-view:<holder>:<official>:<position>`,
 * and the position is the part after the last colon, because IDs contain colons.
 */
export function heardViewsHeldBy(
  world: World,
  listenerId: EntityId,
  holderId: EntityId,
): readonly HeardOfficialView[] {
  if (!world.people[listenerId] || !world.people[holderId]) return [];
  const prefix = `told-view:${holderId}:`;
  return readHeardViews(world, listenerId, (row, sourceId) => {
    if (sourceId !== holderId || !row.believedSummary.startsWith(prefix))
      return null;
    const rest = row.believedSummary.slice(prefix.length);
    const cut = rest.lastIndexOf(":");
    if (cut <= 0) return null;
    const officialId = rest.slice(0, cut) as EntityId;
    return world.people[officialId]
      ? { officialId, position: rest.slice(cut + 1) }
      : null;
  });
}

function readHeardViews(
  world: World,
  listenerId: EntityId,
  parse: (
    row: EventKnowledgeRecord,
    holderId: EntityId,
  ) => { readonly officialId: EntityId; readonly position: string } | null,
): readonly HeardOfficialView[] {
  const events = new Set(
    world.history.events
      .filter(
        (event) =>
          event.sequence < world.history.nextSequence &&
          event.occurredAt <= world.currentDate &&
          event.recordedAt <= world.currentDate,
      )
      .map((event) => event.id),
  );
  const heard: HeardOfficialView[] = [];
  for (const row of world.history.knowledge) {
    if (
      row.personId !== listenerId ||
      row.source.kind !== "told-by" ||
      row.sequence >= world.history.nextSequence ||
      row.learnedAt > world.currentDate ||
      !events.has(row.eventId) ||
      !world.people[row.source.sourcePersonId]
    )
      continue;
    const holderId = row.source.sourcePersonId;
    const parsed = parse(row, holderId);
    if (
      !parsed ||
      (parsed.position !== "support" && parsed.position !== "oppose")
    )
      continue;
    heard.push({
      knowledgeId: row.id,
      eventId: row.eventId,
      holderId,
      officialId: parsed.officialId,
      position: parsed.position,
      learnedAt: row.learnedAt,
      accuracy: row.accuracy,
      confidence: row.confidence,
    });
  }
  return heard.sort((left, right) =>
    right.learnedAt.localeCompare(left.learnedAt),
  );
}
