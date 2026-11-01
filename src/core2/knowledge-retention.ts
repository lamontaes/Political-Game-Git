/**
 * Memory stays flat (owner, Oct 12; CTO speed and memory order, Oct 14):
 * every event a person lives through leaves `event:<id>:experienced` in their
 * knowledge, and only two writers read it: the appraisal the same day, and a
 * drive's update, which checks its source event. Once a month a key older
 * than `experiencedKeyRetentionDays` goes unless it is the source of a drive
 * the person holds. Forgetting is retention, not a check, so it runs with
 * bookkeeping on as well. The event's own facts stay;
 * the player keeps everything.
 *
 * Each key is queued by the day it was learned as it is written
 * (`api.observe`), and the saved queue holds about one retention window of
 * days. The monthly pass walks the queue's days, skips those not yet due and
 * handles the entries of the rest, never every fact of every person. Days are
 * in the order first written, not by date: a back-dated write (a drive's
 * source observed again on the day the drive formed) can add an old day at
 * the end. A key a held drive keeps waits in its day for the next month; a
 * key gone or learned again leaves it (the new write queued its own day); the
 * player's due keys leave it and are queued again from their facts if the
 * player changes. A save made before the queue existed has it rebuilt from
 * the facts as it loads.
 */
import { parameter } from "./parameters";
import { addDays, makeIsoDate } from "./kernel/dates";
import { bookkeeping } from "./bookkeeping";
import { registerWorldMapPart } from "./snapshot";
import type { CoreState } from "./types";

const PREFIX = "event:";
const SUFFIX = ":experienced";

interface ForgetQueue {
  /** [person, key] as written, by the day the key was learned. */
  byDay: Map<string, [string, string][]>;
  /** The player at the last monthly pass, whose due keys were let be. */
  playerId?: string;
}

const queues = new WeakMap<CoreState, ForgetQueue>();
registerWorldMapPart("core2-knowledge-retention-queue", queues, (core) => {
  // A save made before the queue existed: every experienced key it holds.
  const queue: ForgetQueue = { byDay: new Map() };
  for (const [personId, known] of core.knowledgeByPerson)
    for (const [key, fact] of known)
      if (key.startsWith(PREFIX) && key.endsWith(SUFFIX))
        queueKey(queue, personId, key, fact.learnedAt);
  return queue;
});

function queueKey(
  queue: ForgetQueue,
  personId: string,
  key: string,
  learnedAt: string,
): void {
  const day = queue.byDay.get(learnedAt);
  if (day) day.push([personId, key]);
  else queue.byDay.set(learnedAt, [[personId, key]]);
}

/** Queues an experienced key as it is written; `api.observe` calls this for every fact. */
export function queueExperience(
  core: CoreState,
  personId: string,
  key: string,
  learnedAt: string,
): void {
  if (!key.endsWith(SUFFIX) || !key.startsWith(PREFIX)) return;
  let queue = queues.get(core);
  if (!queue) queues.set(core, (queue = { byDay: new Map() }));
  queueKey(queue, personId, key, learnedAt);
}

/** Forgets one due key unless a held drive keeps it; true when one does. */
function forgetUnlessHeld(
  core: CoreState,
  day: string,
  personId: string,
  key: string,
): boolean {
  const known = core.knowledgeByPerson.get(personId);
  const fact = known?.get(key);
  // Gone already, or learned again on a later day (queued then).
  if (!known || !fact || fact.learnedAt !== day) return false;
  if (personId === core.playerId) return false;
  for (const drive of core.people.get(personId)?.drives.values() ?? [])
    if (drive.sourceEventId === fact.value) return true;
  known.delete(key);
  return false;
}

export function forgetOldExperiences(core: CoreState): void {
  if (!core.date.endsWith("-01")) return;
  const before = addDays(
    makeIsoDate(core.date),
    -parameter("experiencedKeyRetentionDays", core.data.parameters),
  );
  const queue = queues.get(core);
  if (queue) {
    const former = queue.playerId;
    if (former !== core.playerId) {
      // A former player's keys are due like anyone's from now on.
      if (former !== undefined)
        for (const [key, fact] of core.knowledgeByPerson.get(former) ?? [])
          if (key.startsWith(PREFIX) && key.endsWith(SUFFIX))
            queueKey(queue, former, key, fact.learnedAt);
      queue.playerId = core.playerId;
    }
    // Every day in the queue, in the order first written; only due days are handled.
    for (const [day, entries] of queue.byDay) {
      if (day >= before) continue;
      // One entry per kept key: the same key written twice on one day is one fact.
      let kept: Set<string> | undefined;
      const held = entries.filter(([personId, key]) => {
        if (!forgetUnlessHeld(core, day, personId, key)) return false;
        const id = `${personId}\u0000${key}`;
        if (kept?.has(id)) return false;
        (kept ??= new Set()).add(id);
        return true;
      });
      if (held.length) queue.byDay.set(day, held);
      else queue.byDay.delete(day);
    }
  }
  if (bookkeeping()) checkForgotten(core, before);
}

/** Tests check the queue against the walk it replaced: no due key is left. */
function checkForgotten(core: CoreState, before: string): void {
  for (const [personId, known] of core.knowledgeByPerson) {
    if (personId === core.playerId) continue;
    const person = core.people.get(personId);
    const sources = new Set<string>();
    for (const drive of person?.drives.values() ?? [])
      sources.add(drive.sourceEventId);
    for (const [key, fact] of known)
      if (
        fact.learnedAt < before &&
        key.startsWith(PREFIX) &&
        key.endsWith(SUFFIX) &&
        !sources.has(fact.value)
      )
        throw new Error(
          `Forgetting queue missed ${key} for ${personId}, learned ${fact.learnedAt}.`,
        );
  }
}
