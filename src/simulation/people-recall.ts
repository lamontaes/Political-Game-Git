import { favorEntries } from "./life-favors";
import { lifeRequestDetails } from "./life-request-details";
import type { EntityId, HistoricalEvent, IsoDate, World } from "./types";

/**
 * What the world can say about a request somebody made of the player
 * (CRUNCH47 B1, P4).
 *
 * Three different things are kept apart here, because a life that cannot tell
 * them apart cannot hold anybody to anything: what was asked, what the player
 * answered, and whether the thing was actually done. "Agreed" is not
 * "performed", and "declined" is not "never asked". Each has its own canonical
 * event, and this module only reads them.
 *
 * Nothing here judges the player. A request that was answered and never
 * carried out is an ordinary fact of a life; it becomes a scene only when the
 * person who asked chooses to raise it again, through the callback the world
 * already schedules.
 */

export type RecalledRequestStatus =
  "asked" | "agreed" | "declined" | "performed" | "cancelled";

export interface RecalledRequest {
  /** The event where the request was made. The drilldown opens this. */
  readonly requestEventId: EntityId;
  /** The player's own answer, when they gave one. */
  readonly responseEventId: EntityId | null;
  /** The doing of it, when it was done. */
  readonly outcomeEventId: EntityId | null;
  readonly counterpartPersonId: EntityId;
  readonly counterpartName: string;
  /** The task in the asker's own words, from the saved request terms. */
  readonly task: string;
  readonly askedOn: IsoDate;
  readonly answeredOn: IsoDate | null;
  readonly status: RecalledRequestStatus;
  /** The limit the player put on it, when they agreed with one. */
  readonly conditions: string | null;
}

/** Every request of the player that the record can still speak to. */
export function recalledRequests(
  world: World,
  personId: EntityId,
): readonly RecalledRequest[] {
  return favorEntries(world, personId).map((entry) => ({
    requestEventId: entry.request.id,
    responseEventId: entry.response?.id ?? null,
    outcomeEventId: entry.outcome?.id ?? null,
    counterpartPersonId: entry.counterpartId,
    counterpartName: entry.name,
    task: entry.details.task,
    askedOn: entry.request.occurredAt,
    answeredOn: entry.response?.occurredAt ?? null,
    status: entry.status,
    conditions: entry.condition,
  }));
}

export function recalledRequest(
  world: World,
  personId: EntityId,
  requestEventId: EntityId,
): RecalledRequest | null {
  return (
    recalledRequests(world, personId).find(
      (entry) => entry.requestEventId === requestEventId,
    ) ?? null
  );
}

/**
 * Whether the player's own record says they took the request on.
 *
 * `null` where the record says nothing either way, which is not the same as a
 * no: an unanswered request is a question still open, and the player who
 * answers it from memory is guessing about their own past, not lying.
 */
export function agreedToRequest(entry: RecalledRequest): boolean | null {
  switch (entry.status) {
    case "agreed":
    case "performed":
      return true;
    case "declined":
      return false;
    default:
      return null;
  }
}

/** The request an earlier-choice-returned event brought back up, if any. */
export function requestBehindCallback(
  world: World,
  personId: EntityId,
  callback: HistoricalEvent,
): RecalledRequest | null {
  const originId = callback.tags
    .find((tag) => tag.startsWith("origin:"))
    ?.slice("origin:".length);
  if (!originId) return null;
  const origin = world.history.events.find((event) => event.id === originId);
  if (!origin) return null;
  // The callback names the choice the player made, not the request it
  // answered; the request is the one whose saved terms that choice replied to.
  const entries = recalledRequests(world, personId).filter(
    (entry) => entry.counterpartPersonId !== personId,
  );
  return (
    entries.find((entry) => entry.responseEventId === origin.id) ??
    entries.find((entry) => entry.requestEventId === origin.id) ??
    entries.find(
      (entry) =>
        origin.involvedEntityIds.includes(entry.counterpartPersonId) &&
        !!lifeRequestDetails(
          world.history.events.find(
            (event) => event.id === entry.requestEventId,
          )!,
        ),
    ) ??
    null
  );
}
