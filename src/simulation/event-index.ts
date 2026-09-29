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

/**
 * The array most recently indexed. A write appends events to a copy of the
 * array, so the next array asked about usually begins with every event of
 * this one; its index is then this one's, extended, instead of a new index of
 * every event again each time an event is recorded. The older array gives the
 * index up and builds its own if it is asked about again.
 */
let latestIndexed: readonly HistoricalEvent[] | null = null;

export function eventIndexOf(
  events: readonly HistoricalEvent[],
): Map<EntityId, HistoricalEvent> {
  let index = EVENT_INDEX.get(events);
  if (!index) {
    index = extendedIndex(events) ?? undefined;
    if (!index) {
      index = new Map();
      for (const event of events) index.set(event.id, event);
    }
    EVENT_INDEX.set(events, index);
  }
  latestIndexed = events;
  return index;
}

function extendedIndex(
  events: readonly HistoricalEvent[],
): Map<EntityId, HistoricalEvent> | null {
  const previous = latestIndexed;
  if (!previous || previous === events || previous.length > events.length)
    return null;
  const index = EVENT_INDEX.get(previous);
  if (!index) return null;
  for (let at = previous.length - 1; at >= 0; at -= 1)
    if (previous[at] !== events[at]) return null;
  EVENT_INDEX.delete(previous);
  for (let at = previous.length; at < events.length; at += 1)
    index.set(events[at]!.id, events[at]!);
  return index;
}

/**
 * The event with this id, or undefined. A missing id (null or undefined) finds
 * nothing, as `events.find((event) => event.id === id)` would.
 */
export function eventById(
  world: World,
  id: EntityId | string | null | undefined,
): HistoricalEvent | undefined {
  if (id === null || id === undefined) return undefined;
  return eventIndexOf(world.history.events).get(id as EntityId);
}
