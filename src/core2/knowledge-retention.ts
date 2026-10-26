/**
 * Memory stays flat (owner, Oct 12; CTO speed and memory order, Oct 14):
 * every event a person lives through leaves `event:<id>:experienced` in their
 * knowledge, and only two writers read it: the appraisal the same day, and a
 * drive's update, which checks its source event. Once a month a key older
 * than `experiencedKeyRetentionDays` goes unless it is the source of a drive
 * the person holds. Forgetting is retention, not a check, so it runs with
 * bookkeeping on as well. The event's own facts stay;
 * the player keeps everything.
 */
import { parameter } from "./parameters";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoreState } from "./types";

const PREFIX = "event:";
const SUFFIX = ":experienced";

export function forgetOldExperiences(core: CoreState): void {
  if (!core.date.endsWith("-01")) return;
  const before = addDays(
    makeIsoDate(core.date),
    -parameter("experiencedKeyRetentionDays", core.data.parameters),
  );
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
        known.delete(key);
  }
}
