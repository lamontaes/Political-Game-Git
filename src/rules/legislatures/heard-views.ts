import type {
  EntityId,
  EventKnowledgeRecord,
  IsoDate,
  World,
} from "../../simulation/types";
export interface HeardViewFacts {
  readonly people: Readonly<Record<EntityId, unknown>>;
  readonly events: World["history"]["events"];
  readonly knowledge: readonly EventKnowledgeRecord[];
  readonly nextSequence: number;
  readonly onDate: IsoDate;
}
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

export function heardViewsHeldBy(
  facts: HeardViewFacts,
  listenerId: EntityId,
  holderId: EntityId,
): readonly HeardOfficialView[] {
  if (!facts.people[listenerId] || !facts.people[holderId]) return [];
  const prefix = `told-view:${holderId}:`;
  return readHeardViews(facts, listenerId, (row, sourceId) => {
    if (sourceId !== holderId || !row.believedSummary.startsWith(prefix))
      return null;
    const rest = row.believedSummary.slice(prefix.length);
    const cut = rest.lastIndexOf(":");
    if (cut <= 0) return null;
    const officialId = rest.slice(0, cut) as EntityId;
    return facts.people[officialId]
      ? { officialId, position: rest.slice(cut + 1) }
      : null;
  });
}

function readHeardViews(
  facts: HeardViewFacts,
  listenerId: EntityId,
  parse: (
    row: EventKnowledgeRecord,
    holderId: EntityId,
  ) => {
    readonly officialId: EntityId;
    readonly position: string;
  } | null,
): readonly HeardOfficialView[] {
  const events = new Set(
    facts.events
      .filter(
        (event) =>
          event.sequence < facts.nextSequence &&
          event.occurredAt <= facts.onDate &&
          event.recordedAt <= facts.onDate,
      )
      .map((event) => event.id),
  );
  const heard: HeardOfficialView[] = [];
  for (const row of facts.knowledge) {
    if (
      row.personId !== listenerId ||
      row.source.kind !== "told-by" ||
      row.sequence >= facts.nextSequence ||
      row.learnedAt > facts.onDate ||
      !events.has(row.eventId) ||
      !facts.people[row.source.sourcePersonId]
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
