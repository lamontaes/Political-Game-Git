/**
 * Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): the set of
 * every event id the world has seen (`core.eventIds`) lets an event enter
 * once and lets its writers ask "has this happened?". Every reader asks
 * about today (a speech, an address or a closure on `core.date`), about a
 * race still ahead (a contest id carries its election day) or about an id
 * with no date (a cause group's founding, a scene's reply). So an id whose
 * newest written date is more than `eventIdRetentionDays` past can never be
 * asked about again, and it leaves the set; an id with no date stays.
 *
 * Ids are queued by the month of their newest date as they enter, so the
 * monthly pass drops whole months and never walks the set. With bookkeeping
 * on (tests, proofs) every id stays. Kept forever, the set was 117 MB of a
 * long run's heap (Montpelier, Vermont, year 6: 661,212 ids).
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import { bookkeeping } from "./bookkeeping";
import { parameter } from "./parameters";
import { registerWorldMapPart } from "./snapshot";
import type { CoreState } from "./types";

const ISO_DATE = /\d{4}-\d{2}-\d{2}/g;

/** The newest ISO date written in an id, if any. */
export function newestDateIn(id: string): string | undefined {
  let newest: string | undefined;
  for (const match of id.matchAll(ISO_DATE))
    if (newest === undefined || match[0] > newest) newest = match[0];
  return newest;
}

/** Dated event ids by the month (yyyy-mm) of their newest date. */
type EventIdQueue = Map<string, string[]>;

const queues = new WeakMap<CoreState, EventIdQueue>();
registerWorldMapPart("core2-event-id-retention-queue", queues, (core) => {
  // A save made before the queue existed: every dated id it holds.
  const queue: EventIdQueue = new Map();
  for (const id of core.eventIds) queueId(queue, id);
  return queue.size ? queue : undefined;
});

function queueId(queue: EventIdQueue, id: string): void {
  const date = newestDateIn(id);
  if (date === undefined) return;
  const month = date.slice(0, 7);
  const list = queue.get(month);
  if (list) list.push(id);
  else queue.set(month, [id]);
}

/** Queues an event id as it enters the world (`applyCoreEvent`). */
export function queueEventId(core: CoreState, id: string): void {
  let queue = queues.get(core);
  if (!queue) queues.set(core, (queue = new Map()));
  queueId(queue, id);
}

/** On the first of each month, in play: ids whose newest date is past the window leave the set. */
export function forgetOldEventIds(core: CoreState): void {
  if (bookkeeping() || !core.date.endsWith("-01")) return;
  const queue = queues.get(core);
  if (!queue) return;
  const before = addDays(
    makeIsoDate(core.date),
    -parameter("eventIdRetentionDays", core.data.parameters),
  ).slice(0, 7);
  for (const [month, ids] of queue) {
    if (month >= before) continue;
    for (const id of ids) core.eventIds.delete(id);
    queue.delete(month);
  }
}

/** How many dated ids wait in the queue (tests and probes). */
export function queuedEventIds(core: CoreState): number {
  let n = 0;
  for (const ids of queues.get(core)?.values() ?? []) n += ids.length;
  return n;
}
