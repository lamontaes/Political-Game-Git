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
    const prefix = `told-view:${holderId}:${officialId}:`;
    if (!row.believedSummary.startsWith(prefix)) continue;
    const position = row.believedSummary.slice(prefix.length);
    if (position !== "support" && position !== "oppose") continue;
    heard.push({
      knowledgeId: row.id,
      eventId: row.eventId,
      holderId,
      officialId,
      position,
      learnedAt: row.learnedAt,
      accuracy: row.accuracy,
      confidence: row.confidence,
    });
  }
  return heard.sort((left, right) =>
    right.learnedAt.localeCompare(left.learnedAt),
  );
}
