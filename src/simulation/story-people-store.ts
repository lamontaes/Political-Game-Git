import { recordById } from "./history-index";
import type { EntityId, StoryPersonRecord, World } from "./types";

/**
 * The story-only people store (`story-people.ts` names and writes them out).
 * Its readers and integrity check live apart from the writers so the world's
 * own integrity check can read them without loading the town roster.
 */

const NONE: readonly StoryPersonRecord[] = [];

export function storyPeople(world: World): readonly StoryPersonRecord[] {
  return world.history.storyPeople ?? NONE;
}

export function storyPerson(
  world: World,
  id: EntityId,
): StoryPersonRecord | null {
  return recordById(storyPeople(world), id) ?? null;
}

/**
 * World integrity: each story person named once, in sequence order. A story
 * person who has been written out keeps their row: it is when they were first
 * named, and their id is the one they were written out under.
 */
export function assertStoryPeopleIntegrity(world: World): void {
  const ids = new Set<EntityId>();
  let last = -1;
  for (const record of storyPeople(world)) {
    if (
      ids.has(record.id) ||
      record.sequence <= last ||
      record.sequence >= world.history.nextSequence ||
      record.origin.kind !== "town-roster" ||
      !record.stableKey.endsWith(
        `:household:${record.origin.household}:person:${record.origin.member}`,
      )
    )
      throw new Error(`Invalid story person: ${record.stableKey}`);
    ids.add(record.id);
    last = record.sequence;
  }
}
