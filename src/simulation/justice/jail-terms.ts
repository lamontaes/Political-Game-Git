import { isoDateFromParts, makeIsoDate } from "../dates";
import { recordsWithFieldValue } from "../history-index";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";

/**
 * Reading sentences back. Kept apart from `prosecution.ts`, which writes them
 * and reaches the office writers, so that campaign code can ask whether a
 * candidate is in jail without importing any of that.
 */

export const PROSECUTION_SENTENCED_EVENT = "justice.sentenced";
/** The end of a case: a plea, a verdict or a dismissal. */
export const PROSECUTION_ENDED_EVENT = "justice.case-ended";
/**
 * Before trial, the defendant is held in jail: bail they could not pay, or a
 * judge's order to hold them where the law allows no money bail. Written by
 * `prosecution.ts`; the hold lasts until the case ends.
 */
export const PRETRIAL_HELD_EVENT = "justice.held-before-trial";
/** Before trial, the defendant goes home: bail paid, or released without it. */
export const PRETRIAL_RELEASED_EVENT = "justice.released-before-trial";
/** Tags every event of one case with the referral that opened it. */
export const REFERRAL_TAG = "justice.referral:";
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

/**
 * Who a sentencing record sentences. The record also names the judge who
 * handed it down, so a reader asks for the defendant's role rather than any
 * participant.
 */
export function sentencedPersonOf(event: HistoricalEvent): EntityId | null {
  return (
    event.participants.find((entry) => entry.role === "focus:defendant")
      ?.personId ?? null
  );
}

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

/**
 * The events of one type, in history order, read from an index that follows
 * history as it grows, so the weekly court and clemency sweeps do not scan
 * every event of a long life for each case. A copy: the index's own list
 * grows with later history, and a caller holding it would see events its
 * world does not have.
 */
export function eventsOfType(
  world: World,
  type: HistoricalEvent["type"],
): readonly HistoricalEvent[] {
  return [...recordsWithFieldValue(world.history.events, "type", type)];
}

/** Every sentence a person has received, oldest first. Read-only. */
export function sentencesOf(
  world: World,
  personId: EntityId,
  onDate: IsoDate = world.currentDate,
): readonly Sentence[] {
  const grants = new Map<string, HistoricalEvent>();
  for (const event of eventsOfType(world, CLEMENCY_GRANTED_EVENT))
    if (
      event.occurredAt <= onDate &&
      event.participants.some((entry) => entry.personId === personId)
    )
      for (const tag of event.tags)
        if (tag.startsWith(CLEMENCY_SENTENCE_TAG))
          grants.set(tag.slice(CLEMENCY_SENTENCE_TAG.length), event);
  const reductions = new Map<EntityId, IsoDate>();
  for (const review of eventsOfType(
    world,
    "justice.federal-sentence-reduced",
  )) {
    if (review.occurredAt > onDate || sentencedPersonOf(review) !== personId)
      continue;
    const sentenceId = review.tags
      .find((tag) => tag.startsWith("justice.reduced-sentence:"))
      ?.slice("justice.reduced-sentence:".length) as EntityId | undefined;
    const until = review.tags
      .find((tag) => tag.startsWith("justice.reduced-until:"))
      ?.slice("justice.reduced-until:".length) as IsoDate | undefined;
    if (!sentenceId || !until || until < review.occurredAt) continue;
    try {
      makeIsoDate(until);
    } catch {
      continue;
    }
    const prior = reductions.get(sentenceId);
    if (!prior || until < prior) reductions.set(sentenceId, until);
  }
  return eventsOfType(world, PROSECUTION_SENTENCED_EVENT).flatMap((event) => {
    if (event.occurredAt > onDate || sentencedPersonOf(event) !== personId)
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
    const reduction = reductions.get(event.id);
    const legalEnd =
      reduction && reduction < handedDown ? reduction : handedDown;
    const grant = grants.get(event.id);
    const clemencyKind = grant?.tags
      .find((tag) => tag.startsWith(CLEMENCY_KIND_TAG))
      ?.slice(CLEMENCY_KIND_TAG.length) as ClemencyKind | undefined;
    const endedEarly =
      grant && clemencyKind && grant.occurredAt < legalEnd
        ? grant.occurredAt
        : null;
    return [
      {
        sentencedEventId: event.id,
        kind,
        from: event.occurredAt,
        until: endedEarly ?? legalEnd,
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
    sentencesOf(world, personId, date).find(
      (sentence) =>
        sentence.kind === "jail" &&
        sentence.from <= date &&
        date < sentence.until,
    ) ?? null
  );
}

/** A time a person was held in jail before trial. */
export interface PretrialHold {
  readonly heldEventId: EntityId;
  readonly referralId: EntityId;
  readonly from: IsoDate;
  /** The day the case ended, or null while it is still open. */
  readonly until: IsoDate | null;
}

/** Every time a person was held before trial, oldest first. Read-only. */
export function pretrialHoldsOf(
  world: World,
  personId: EntityId,
): readonly PretrialHold[] {
  return eventsOfType(world, PRETRIAL_HELD_EVENT).flatMap((held) => {
    if (sentencedPersonOf(held) !== personId) return [];
    const referralTag = held.tags.find((tag) => tag.startsWith(REFERRAL_TAG));
    if (!referralTag) return [];
    const ended = eventsOfType(world, PROSECUTION_ENDED_EVENT).find((event) =>
      event.tags.includes(referralTag),
    );
    return [
      {
        heldEventId: held.id,
        referralId: referralTag.slice(REFERRAL_TAG.length) as EntityId,
        from: held.occurredAt,
        until: ended?.occurredAt ?? null,
      },
    ];
  });
}

/** Whether a person is held in jail before trial on `date`. Read-only. */
export function heldBeforeTrialOn(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): boolean {
  return pretrialHoldsOf(world, personId).some(
    (hold) => hold.from <= date && (hold.until === null || date < hold.until),
  );
}
