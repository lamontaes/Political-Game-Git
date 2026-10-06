import {
  narrativeThreads,
  type EntityId,
  type IsoDate,
  type NarrativeThread,
  type World,
} from "../simulation";

/** The saved relationship change, rather than an invitation's existence, earns a chronicle line. */
export function consequentialSocialEventIds(
  world: World,
): ReadonlySet<EntityId> {
  return new Set(
    world.history.relationshipInteractions.flatMap((interaction) =>
      interaction.eventId &&
      (interaction.significance === "meaningful" ||
        interaction.significance === "major")
        ? [interaction.eventId]
        : [],
    ),
  );
}

/** Suppress routine invitation steps only in Journal projections, never in history or Calendar. */
export function isRoutineSocialOccasion(
  consequentialEventIds: ReadonlySet<EntityId>,
  eventId: EntityId,
  type: string,
): boolean {
  if (
    type !== "life.social-occasion-invited" &&
    type !== "life.social-invitation-accepted" &&
    type !== "life.social-invitation-declined" &&
    type !== "life.social-occasion-attended"
  )
    return false;
  return !consequentialEventIds.has(eventId);
}

export interface EntrySignificance {
  readonly score: number;
  readonly reachedPeople: number;
  readonly stillRememberedBy: number;
  readonly closedThread: boolean;
  readonly yearsAgo: number;
}

interface SignificanceIndex {
  readonly events: ReadonlyMap<EntityId, World["history"]["events"][number]>;
  readonly memories: ReadonlyMap<EntityId, ReadonlySet<EntityId>>;
  readonly knowledge: ReadonlyMap<EntityId, ReadonlySet<EntityId>>;
  readonly closedThreads: ReadonlySet<EntityId>;
}

const SIGNIFICANCE_INDEX = new WeakMap<World, Map<string, SignificanceIndex>>();

function indexFor(
  world: World,
  personId: EntityId,
  through: IsoDate,
): SignificanceIndex {
  let byPerson = SIGNIFICANCE_INDEX.get(world);
  if (!byPerson) {
    byPerson = new Map();
    SIGNIFICANCE_INDEX.set(world, byPerson);
  }
  const key = `${personId}:${through}`;
  const known = byPerson.get(key);
  if (known) return known;
  const events = new Map(
    world.history.events
      .filter((event) => event.occurredAt <= through)
      .map((event) => [event.id, event] as const),
  );
  const add = (
    target: Map<EntityId, Set<EntityId>>,
    eventId: EntityId,
    person: EntityId,
  ) => {
    const people = target.get(eventId) ?? new Set<EntityId>();
    people.add(person);
    target.set(eventId, people);
  };
  const memories = new Map<EntityId, Set<EntityId>>();
  for (const row of world.history.memories)
    if (
      row.formedAt <= through &&
      row.personId !== personId &&
      events.has(row.eventId)
    )
      add(memories, row.eventId, row.personId);
  const knowledge = new Map<EntityId, Set<EntityId>>();
  for (const row of world.history.knowledge)
    if (
      row.learnedAt <= through &&
      row.personId !== personId &&
      events.has(row.eventId)
    )
      add(knowledge, row.eventId, row.personId);
  const closedThreads = new Set<EntityId>();
  const threads: readonly NarrativeThread[] = narrativeThreads(
    world,
    personId,
    through,
  );
  for (const thread of threads)
    if (thread.standing === "settled" || thread.standing === "moot")
      for (const anchor of thread.anchors)
        if (events.has(anchor.recordId)) closedThreads.add(anchor.recordId);
  const index = { events, memories, knowledge, closedThreads };
  byPerson.set(key, index);
  return index;
}

/**
 * A grounded measure of how much an event carried beyond the moment. It uses
 * only recorded participants, memories, knowledge and settled life threads.
 * Older events gain weight so a look-back can recover details that have faded
 * from the foreground.
 */
export function entrySignificance(
  world: World,
  personId: EntityId,
  eventIds: readonly EntityId[],
  occurredAt: IsoDate,
  through: IsoDate,
): EntrySignificance {
  const index = indexFor(world, personId, through);
  const events = eventIds.flatMap((id) => {
    const event = index.events.get(id);
    return event ? [event] : [];
  });
  const reached = new Set<EntityId>();
  for (const event of events)
    for (const id of event.involvedEntityIds)
      if (id !== personId) reached.add(id);
  const eventIdsFound = events.map((event) => event.id);
  for (const id of eventIdsFound)
    for (const who of index.memories.get(id) ?? []) reached.add(who);
  const stillRememberedBy = new Set<EntityId>();
  for (const id of eventIdsFound)
    for (const who of index.knowledge.get(id) ?? []) stillRememberedBy.add(who);
  const closedThread = eventIdsFound.some((id) => index.closedThreads.has(id));
  const yearsAgo = Math.max(
    0,
    Number(through.slice(0, 4)) - Number(occurredAt.slice(0, 4)),
  );
  return {
    reachedPeople: reached.size,
    stillRememberedBy: stillRememberedBy.size,
    closedThread,
    yearsAgo,
    score:
      reached.size +
      stillRememberedBy.size * 2 +
      (closedThread ? 2 : 0) +
      (yearsAgo >= 10 ? 2 : yearsAgo >= 5 ? 1 : 0),
  };
}
