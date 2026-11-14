// What the player can do about a person from their card: visit them or call
// them (owner, Nov 14: a promise made in a talk, "I'll come by" or "I'll
// call", needs an act that keeps it). One list for the card to draw, one place
// that says whether each act is open now and, if not, why (a closed key the
// card words), and the writers that put a done act on the record. Nothing
// here is rolled: the records say whether the act is open.
import { recordVisit } from "../core2/modules/people";
import { livesElsewhere } from "../core2/modules/moves";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { parameter } from "../core2/parameters";
import { openConversation } from "../director/conversation";
import type { Director } from "../director/ledger";
import type { CoreState, PersonId } from "../core2/types";
import { orgPlace } from "./scene";
import { hasBackdrop } from "./backdrop-places";
import { shiftOrganization } from "./shift";

export type ActKind = "visit" | "call";

/** Why an act is closed, as a key the card words (controls.json person.actReasons). */
export type ActReason =
  /** The person is in the room with you now: talk to them. */
  | "here"
  /** The person lives outside the town: a call reaches them, a visit does not. */
  | "elsewhere"
  /** The person is at a place the game has no picture of. */
  | "away"
  /** A stop or choice holds the clock, so a trip cannot be taken. */
  | "held"
  /** The person has died: the card says so and offers nothing. */
  | "died";

export interface PersonAct {
  kind: ActKind;
  open: boolean;
  reason?: ActReason;
}

/** The events a done act writes. A promise to visit or call is kept on these. */
export const CONTACT_VISIT = "contact.visit";
export const CONTACT_CALL = "contact.call";

/** Where a person is at this minute: at work in an organization, else at home. */
export function whereIs(
  core: CoreState,
  personId: string,
  minute: number,
): { kind: "work"; organizationId: string } | { kind: "home" } {
  const organizationId = shiftOrganization(core, personId, minute);
  return organizationId ? { kind: "work", organizationId } : { kind: "home" };
}

export interface ActContext {
  /** The player's own minute of the day, from their clock. */
  minute: number;
  /** Whether a stop or choice holds the clock. */
  held: boolean;
  /** Who is in the player's room now. */
  here: readonly string[];
  director?: Director;
}

/** The acts the card offers for one person, each open or closed with its reason. */
export function personActs(
  core: CoreState,
  playerId: string,
  otherId: string,
  context: ActContext,
): PersonAct[] {
  const other = core.people.get(otherId);
  if (!other || otherId === playerId) return [];
  const closed = (kind: ActKind, reason: ActReason): PersonAct => ({
    kind,
    open: false,
    reason,
  });
  // Someone who has died is one line on the card, not two closed buttons.
  if (!other.alive) return [closed("visit", "died")];
  const visit = ((): PersonAct => {
    if (context.here.includes(otherId)) return closed("visit", "here");
    if (
      livesElsewhere(core, other) ||
      other.placeId !== core.people.get(playerId)?.placeId
    )
      return closed("visit", "elsewhere");
    if (context.held) return closed("visit", "held");
    const at = whereIs(core, otherId, context.minute);
    if (
      at.kind === "work" &&
      !hasBackdrop(orgPlace(core, at.organizationId) ?? "")
    )
      return closed("visit", "away");
    return { kind: "visit", open: true };
  })();
  // A call that cannot open (the game has no talk for them) is not offered:
  // no button and no reason, since "nothing to say" would not be true of them.
  const talk = openConversation(
    core,
    playerId as PersonId,
    otherId as PersonId,
    {
      ...(context.director ? { director: context.director } : {}),
      byPhone: true,
      look: true,
    },
  );
  return talk.lines.length ? [visit, { kind: "call", open: true }] : [visit];
}

/**
 * The player's visit, on the record: the time together the visit's hours are
 * (the one writer the people engine's own visits use), the household met, and
 * a `contact.visit` event naming both, which a kept promise reads. Returns the
 * event id.
 */
export function recordPlayerVisit(
  core: CoreState,
  playerId: string,
  otherId: string,
  minute: number,
  hours: number,
): string {
  recordVisit(coreAPI(core), playerId, otherId, hours);
  return emitContact(core, CONTACT_VISIT, playerId, otherId, minute);
}

/**
 * The player's call, on the record: both sides' last contact is today and a
 * `contact.call` event names both. The time together is the talk's own
 * (each exchange writes its hours), so none is written here.
 */
export function recordPlayerCall(
  core: CoreState,
  playerId: string,
  otherId: string,
  minute: number,
): string {
  const api = coreAPI(core);
  api.updatePerson(playerId, { lastContactDate: core.date });
  api.updatePerson(otherId, { lastContactDate: core.date });
  return emitContact(core, CONTACT_CALL, playerId, otherId, minute);
}

function emitContact(
  core: CoreState,
  kind: string,
  playerId: string,
  otherId: string,
  minute: number,
): string {
  const id = `${kind}:${playerId}:${otherId}:${core.date}:${minute}`;
  applyCoreEvent(core, {
    id,
    date: core.date,
    kind,
    personIds: [playerId as PersonId, otherId as PersonId],
    placeId: core.people.get(playerId)!.placeId as never,
    publicRecord: false,
    facts: { how: kind === CONTACT_VISIT ? "visit" : "call" },
    source: {
      tag: "SOURCED",
      citation: "Recorded act: the player chose to see or call this person.",
      asOf: core.date,
    },
  });
  return id;
}

/** The hours a visit takes: the people engine's own visit effort (socialHours). */
export const visitHoursOf = (core: CoreState): number =>
  parameter("socialHours", core.data.parameters);
