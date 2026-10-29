// The M1-11 check's rule for which events had to be answered: an event the
// producers emitted in the year, read from the event itself (never from the
// responses), that named someone. A kind no producer emitted is not exercised;
// an event that occurred and named someone but drew no response fails; one
// that named no one is listed by its record as having no one to answer it.

/** An event as the producers emitted it, with the people it named then. */
export interface OccurredEvent {
  readonly id: string;
  readonly kind: string;
  /** Full people the event named, plus counted people its records named, who could answer it then (alive, and still counted for a counted one). */
  readonly named: readonly string[];
  /** People its records named who could not answer it then (dead, or no longer in the counts), by record id. */
  readonly ineligible?: readonly string[];
}

export interface OccurrenceReport {
  /** Kinds no producer emitted in the year. */
  readonly notExercised: readonly string[];
  /** Events that named someone and drew no response, by id. */
  readonly unanswered: readonly OccurredEvent[];
  /** Events that named no one, so no one could answer them, by id. */
  readonly namedNoOne: readonly OccurredEvent[];
}

export function occurrence(
  kinds: Iterable<string>,
  occurred: Iterable<OccurredEvent>,
  answeredEventIds: ReadonlySet<string>,
): OccurrenceReport {
  const events = [...occurred];
  const seen = new Set(events.map((event) => event.kind));
  return {
    notExercised: [...kinds].filter((kind) => !seen.has(kind)),
    unanswered: events.filter(
      (event) => event.named.length > 0 && !answeredEventIds.has(event.id),
    ),
    namedNoOne: events.filter((event) => event.named.length === 0),
  };
}
