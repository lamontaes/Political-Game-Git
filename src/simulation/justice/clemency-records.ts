import type { EntityId, HistoricalEvent, World } from "../types";

/**
 * The clemency route's records, as a leaf module so the governor's desk, the
 * reasoning and the route itself can all read them without importing each
 * other. Every record is an ordinary historical event: append-only, dated,
 * and linked by tag, because an event is not an entity another event can
 * involve.
 */

export const CLEMENCY_VERSION = "clemency-v1";

/** A person asked for clemency on one sentence. */
export const CLEMENCY_PETITION_EVENT = "justice.clemency-petition";
/** One body answered: an advising board, a board, a council or the executive. */
export const CLEMENCY_ANSWER_EVENT = "justice.clemency-answer";
/** The request was turned down, by whichever body said no. */
export const CLEMENCY_DENIED_EVENT = "justice.clemency-denied";

export const PETITION_TAG = "justice.clemency-petition:";
export const PETITION_PLACE_TAG = "justice.clemency-place:";
export const BODY_TAG = "justice.clemency-body:";
export const ANSWER_TAG = "justice.clemency-answer:";
export const ROLE_TAG = "justice.clemency-role:";
export const ANSWERED_BY_TAG = "justice.clemency-answered-by:";

export const PETITIONER_ROLE = "focus:petitioner" as const;

export function tagValue(
  event: HistoricalEvent,
  prefix: string,
): string | null {
  return (
    event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
    null
  );
}

export function petitionerOf(petition: HistoricalEvent): EntityId | null {
  return (
    petition.participants.find((entry) => entry.role === PETITIONER_ROLE)
      ?.personId ?? null
  );
}

export interface ClemencyAnswer {
  readonly event: HistoricalEvent;
  readonly bodyKey: string;
  readonly bodyLabel: string;
  /** "advisory": heard without a veto; "consent": its yes is needed. */
  readonly role: "advisory" | "consent";
  readonly favorable: boolean;
}

/** Every answer a petition has had, in the order they were given. */
export function answersTo(
  world: World,
  petitionId: EntityId,
): readonly ClemencyAnswer[] {
  return world.history.events.flatMap((event) => {
    if (event.type !== CLEMENCY_ANSWER_EVENT) return [];
    if (!event.tags.includes(`${PETITION_TAG}${petitionId}`)) return [];
    const bodyKey = tagValue(event, BODY_TAG);
    if (!bodyKey) return [];
    return [
      {
        event,
        bodyKey,
        bodyLabel: event.context.socialContext ?? bodyKey,
        role: tagValue(event, ROLE_TAG) === "advisory" ? "advisory" : "consent",
        favorable: tagValue(event, ANSWER_TAG) === "favorable",
      },
    ];
  });
}
