import { currentCloseness } from "../core2/closeness";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { MOVED_AWAY_EVENT } from "../core2/modules/moves";
import type { CoreState, IsoDate, Relationship } from "../core2/types";

/** The circle the People web marks changes in: a person's five closest ties. */
const CIRCLE = 5;
/** How far back "this year" reaches, in days. */
const YEAR_DAYS = 365;
/** The death record's kind on the durable log. */
const DEATH_EVENT = "life.death";

export interface CircleChange {
  readonly personId: string;
  readonly name: string;
  /** What changed the tie, from its record: a chosen act, a move, a death. */
  readonly cause: string;
  /** The record that names the cause: the tie's change, the move or the death. */
  readonly recordId: string;
  readonly date: string;
}

/**
 * Who joined a person's five closest in the last year and who left it, read
 * from the tie records. A tie's closeness a year ago is its record's level
 * before its latest change, faded to that day (a tie made this year stood at
 * nothing); today's is its level faded to today. Whoever is in one five and
 * not the other joined or left, with the record that explains it.
 */
export function circleChanges(core: CoreState, personId: string) {
  const since = addDays(makeIsoDate(core.date), -YEAR_DAYS);
  const rows = [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((row): row is Relationship => row !== undefined);
  const otherOf = (row: Relationship) =>
    row.actorId === personId ? row.otherId : row.actorId;
  const then = (row: Relationship): number => {
    const change = row.latestChange;
    if (change && change.date > since) {
      if (change.created) return 0;
      return currentCloseness(
        core,
        {
          level: change.before.level,
          lastContactDate: change.before.lastContactDate ?? change.date,
          kind: row.kind,
        },
        since,
      );
    }
    return currentCloseness(core, row, since);
  };
  const top = (score: (row: Relationship) => number) =>
    rows
      .map((row) => ({ row, score: score(row) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || otherOf(a.row).localeCompare(otherOf(b.row)),
      )
      .slice(0, CIRCLE)
      .map((entry) => entry.row);
  const now = top((row) => currentCloseness(core, row));
  const before = top(then);
  const name = (id: string) => {
    const other = core.people.get(id);
    return other ? `${other.givenName} ${other.familyName}` : id;
  };
  // A move or a death that took them, by its record.
  const eventFor = (kind: string, otherId: string) => {
    for (const id of core.logByKind.get(kind) ?? []) {
      const record = core.durableLog.get(id);
      if (record?.personIds.includes(otherId) && record.date > since)
        return record;
    }
    return undefined;
  };
  const joined: CircleChange[] = now
    .filter((row) => !before.includes(row))
    .map((row) => ({
      personId: otherOf(row),
      name: name(otherOf(row)),
      cause:
        row.latestChange?.reason?.cause ?? row.latestChange?.cause ?? row.kind,
      recordId: row.latestChange?.reason?.sourceId ?? row.id,
      date: row.latestChange?.date ?? row.lastContactDate,
    }));
  const left: CircleChange[] = before
    .filter((row) => !now.includes(row))
    .map((row) => {
      const otherId = otherOf(row);
      const record =
        eventFor(DEATH_EVENT, otherId) ?? eventFor(MOVED_AWAY_EVENT, otherId);
      if (record)
        return {
          personId: otherId,
          name: name(otherId),
          cause: record.kind,
          recordId: record.id,
          date: record.date,
        };
      // A falling-out on the tie's own record (a change that set out to
      // lower it, not a visit that only came after time apart), else time
      // apart since the last contact it records.
      const change = row.latestChange;
      const fell = change && change.requestedChange < 0;
      return {
        personId: otherId,
        name: name(otherId),
        cause: fell
          ? (change.reason?.cause ?? change.cause)
          : "no-time-together",
        recordId: fell ? (change.reason?.sourceId ?? row.id) : row.id,
        date: fell ? change.date : row.lastContactDate,
      };
    });
  return {
    since: since as IsoDate,
    closest: now.map(otherOf),
    joined,
    left,
  };
}
