// STOPGAP offices.delegate-missing-term-end: Missing term-end tags retain a null value cast as a date by the legacy occupant reader.
// stopgapId: "offices.delegate-missing-term-end"
import type {
  HouseDelegateSeat,
  HouseDelegateOccupant,
} from "../../simulation/living-world/house-delegates";
import type { HistoricalEvent, Person, IsoDate } from "../../simulation/types";
export interface DelegateFacts {
  readonly seat: HouseDelegateSeat | null;
  readonly currentDate: IsoDate;
  readonly tenureEventType: string;
  readonly events: readonly HistoricalEvent[];
  readonly people: Readonly<Record<string, Pick<Person, "id">>>;
  readonly alivePeople: ReadonlySet<string>;
  readonly names: Readonly<Record<string, string>>;
}
function delegateTagValue(
  event: HistoricalEvent,
  prefix: string,
): string | null {
  return (
    event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
    null
  );
}
export function houseDelegateOccupant(
  facts: DelegateFacts,
  asOf: IsoDate = facts.currentDate,
): HouseDelegateOccupant {
  const seat = facts.seat;
  if (!seat) return { kind: "not-seated" };
  let event: HistoricalEvent | undefined;
  for (const candidate of facts.events.filter(
    (row) => row.type === facts.tenureEventType,
  )) {
    if (!candidate.tags.includes(`seat:${seat.seatKey}`)) continue;
    if (candidate.occurredAt > asOf || candidate.recordedAt > facts.currentDate)
      continue;
    if (
      !event ||
      candidate.occurredAt > event.occurredAt ||
      (candidate.occurredAt === event.occurredAt &&
        candidate.sequence > event.sequence)
    )
      event = candidate;
  }
  if (!event) return { kind: "not-seated" };
  const endExclusive = delegateTagValue(event, "term-end:") as IsoDate;
  if (asOf >= endExclusive)
    return { kind: "no-current-record", lastTermEnded: endExclusive };
  const personId = event.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  const person = personId ? facts.people[personId] : undefined;
  if (!person || !facts.alivePeople.has(person.id))
    return { kind: "no-current-record", lastTermEnded: asOf };
  return {
    kind: "member",
    personId: person.id,
    personName: facts.names[person.id]!,
    caucus: delegateTagValue(event, "caucus:"),
    party: delegateTagValue(event, "party:"),
    startedAt: event.occurredAt,
    endExclusive,
  };
}
