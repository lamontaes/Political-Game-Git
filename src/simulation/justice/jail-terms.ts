import { isoDateFromParts } from "../dates";
import type { EntityId, IsoDate, World } from "../types";

/**
 * Reading sentences back. Kept apart from `prosecution.ts`, which writes them
 * and reaches the office writers, so that campaign code can ask whether a
 * candidate is in jail without importing any of that.
 */

export const PROSECUTION_SENTENCED_EVENT = "justice.sentenced";
export const SENTENCE_KIND_TAG = "justice.sentence:";
export const SENTENCE_MONTHS_TAG = "justice.sentence-months:";

export type SentenceKind = "jail" | "probation";

export interface Sentence {
  readonly sentencedEventId: EntityId;
  readonly kind: SentenceKind;
  readonly from: IsoDate;
  readonly until: IsoDate;
  readonly months: number;
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
    return [
      {
        sentencedEventId: event.id,
        kind,
        from: event.occurredAt,
        until: addCalendarMonths(event.occurredAt, months),
        months,
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
