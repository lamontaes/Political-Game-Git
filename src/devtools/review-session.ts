import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";

/** Presentation-only review state; never serialized into a player's World. */
export interface ReviewSession {
  readonly baseline: string;
  readonly world: World;
  readonly source: string;
}
export function cloneForReview(world: World, source: string): ReviewSession {
  const baseline = serializeWorld(world);
  return { baseline, world: deserializeWorld(baseline), source };
}
export function resetReview(session: ReviewSession): ReviewSession {
  return { ...session, world: deserializeWorld(session.baseline) };
}
export function reviewControl(
  session: ReviewSession,
  personId: EntityId,
): ReviewSession {
  return { ...session, world: controlReviewWorld(session.world, personId) };
}
export function controlReviewWorld(world: World, personId: EntityId): World {
  if (!world.people[personId])
    throw new Error("Review person does not exist in this world");
  // Deliberately not a normal-world action: control alone supplies no office,
  // journey, presence, history, time, eligibility or institutional authority.
  return { ...world, control: { kind: "person", personId } };
}
export function memoryReviewStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
