import { isoDateFromParts } from "../dates";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";

/**
 * Reading sentences back. Kept apart from `prosecution.ts`, which writes them
 * and reaches the office writers, so that campaign code can ask whether a
 * candidate is in jail without importing any of that.
 */

export const PROSECUTION_SENTENCED_EVENT = "justice.sentenced";
export const SENTENCE_KIND_TAG = "justice.sentence:";
export const SENTENCE_MONTHS_TAG = "justice.sentence-months:";

/**
 * A grant of clemency, written by `clemency.ts`. It lives here, beside the
 * sentence it ends, so every reader of a sentence sees the grant without
 * importing the clemency route.
 */
export const CLEMENCY_GRANTED_EVENT = "justice.clemency-granted";
export const CLEMENCY_SENTENCE_TAG = "justice.clemency-sentence:";
export const CLEMENCY_KIND_TAG = "justice.clemency-kind:";

/** A pardon ends the sentence and forgives it; a commutation only ends it. */
export type ClemencyKind = "pardon" | "commutation";

export type SentenceKind = "jail" | "probation";

export interface Sentence {
  readonly sentencedEventId: EntityId;
  readonly kind: SentenceKind;
  readonly from: IsoDate;
  /** When it ends: as handed down, or the day clemency ended it early. */
  readonly until: IsoDate;
  readonly months: number;
  /** The grant that ended it early, or null. */
  readonly clemency: {
    readonly eventId: EntityId;
    readonly kind: ClemencyKind;
    readonly on: IsoDate;
  } | null;
}

/** The same day `months` later, or that month's last day when it is shorter. */
export function addCalendarMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return isoDateFromParts(targetYear, targetMonth, Math.min(day, lastDay));
}

/** Every sentence a person has received, oldest first. Read-only. */
export function sentencesOf(
  world: World,
  personId: EntityId,
): readonly Sentence[] {
  const grants = new Map<string, HistoricalEvent>();
  for (const event of world.history.events)
    if (
      event.type === CLEMENCY_GRANTED_EVENT &&
      event.participants.some((entry) => entry.personId === personId)
    )
      for (const tag of event.tags)
        if (tag.startsWith(CLEMENCY_SENTENCE_TAG))
          grants.set(tag.slice(CLEMENCY_SENTENCE_TAG.length), event);
  return world.history.events.flatMap((event) => {
    if (event.type !== PROSECUTION_SENTENCED_EVENT) return [];
    if (!event.participants.some((entry) => entry.personId === personId))
      return [];
    const kind = event.tags
      .find((tag) => tag.startsWith(SENTENCE_KIND_TAG))
      ?.slice(SENTENCE_KIND_TAG.length) as SentenceKind | undefined;
    const months = Number(
      event.tags
        .find((tag) => tag.startsWith(SENTENCE_MONTHS_TAG))
        ?.slice(SENTENCE_MONTHS_TAG.length) ?? "0",
    );
    if (!kind) return [];
    const handedDown = addCalendarMonths(event.occurredAt, months);
    const grant = grants.get(event.id);
    const clemencyKind = grant?.tags
      .find((tag) => tag.startsWith(CLEMENCY_KIND_TAG))
      ?.slice(CLEMENCY_KIND_TAG.length) as ClemencyKind | undefined;
    const endedEarly =
      grant && clemencyKind && grant.occurredAt < handedDown
        ? grant.occurredAt
        : null;
    return [
      {
        sentencedEventId: event.id,
        kind,
        from: event.occurredAt,
        until: endedEarly ?? handedDown,
        months,
        clemency:
          grant && clemencyKind
            ? { eventId: grant.id, kind: clemencyKind, on: grant.occurredAt }
            : null,
      },
    ];
  });
}

/** The jail term a person is serving on `date`, if any. Read-only. */
export function jailTermOn(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): Sentence | null {
  return (
    sentencesOf(world, personId).find(
      (sentence) =>
        sentence.kind === "jail" &&
        sentence.from <= date &&
        date < sentence.until,
    ) ?? null
  );
}
