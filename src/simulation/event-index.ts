import type { EntityId, HistoricalEvent, World } from "./types";

/**
 * Events by id, indexed once per history array.
 *
 * GOVERNING profile: the integrity pass ran `history.events.find` inside
 * per-record loops, so every write cost records × events comparisons and the
 * price grew with the length of a life. History arrays are replaced rather
 * than edited, so an index keyed by the array itself is exact: a new array
 * builds a new index, and an unchanged one reuses it.
 */
const EVENT_INDEX = new WeakMap<
  readonly HistoricalEvent[],
  Map<EntityId, HistoricalEvent>
>();

export function eventIndexOf(
  events: readonly HistoricalEvent[],
): Map<EntityId, HistoricalEvent> {
  let index = EVENT_INDEX.get(events);
  if (!index) {
    index = new Map(events.map((event) => [event.id, event]));
    EVENT_INDEX.set(events, index);
  }
  return index;
}

/** The event with this id, or undefined. */
export function eventById(
  world: World,
  id: EntityId,
): HistoricalEvent | undefined {
  return eventIndexOf(world.history.events).get(id);
}
