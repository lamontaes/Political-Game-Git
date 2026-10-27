/**
 * The M1-11 check's rule for who may answer an event, kept apart so it has
 * its own test. A full person answers when the event names them, or names
 * someone in their household or family. A counted person's response carries
 * their own id as its subject, so for them the event's own records decide:
 * the counted subject it names, the counted people it lists as perceiving it,
 * the counted workers a closure ended, or someone in the same counted
 * household as one of those. Being counted is never enough by itself.
 */
export interface AnswerRow {
  personId: string;
  counted?: true;
  eventId: string;
  event: {
    subjects: readonly string[];
    facts?: Readonly<Record<string, string>>;
  };
}

export interface NamedLookups {
  /** The household a full or counted person lives in. */
  householdOf: (personId: string) => string | undefined;
  /** A full person's parents, children, siblings and partner. */
  kinOf: (personId: string) => ReadonlySet<string> | undefined;
  /** The counted workers a closure ended, by the closure's event id. */
  endedCountedWorkers: (eventId: string) => readonly string[];
  /** The fact keys the drives data names. */
  factKeys: { countedSubject: string; countedPerceivers: string };
}

/** The people the event's own records name, before any response. */
function namedBy(row: AnswerRow, lookups: NamedLookups): Set<string> {
  const facts = row.event.facts ?? {};
  const named = new Set<string>(row.counted ? [] : row.event.subjects);
  const subject = facts[lookups.factKeys.countedSubject];
  if (subject) named.add(subject);
  const around = facts[lookups.factKeys.countedPerceivers];
  if (around) for (const id of JSON.parse(around) as string[]) named.add(id);
  for (const id of lookups.endedCountedWorkers(row.eventId)) named.add(id);
  return named;
}

/** Whether the person who answered was named by the event or lives with or is kin to someone it named. */
export function answeredByNamed(
  row: AnswerRow,
  lookups: NamedLookups,
): boolean {
  const named = namedBy(row, lookups);
  if (named.has(row.personId)) return true;
  const home = lookups.householdOf(row.personId);
  for (const id of named) {
    if (home !== undefined && lookups.householdOf(id) === home) return true;
    if (lookups.kinOf(id)?.has(row.personId)) return true;
  }
  return false;
}
