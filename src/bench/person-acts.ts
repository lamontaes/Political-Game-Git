// What the player can do about a person from their card: visit them or call
// them (owner, Nov 14: a promise made in a talk, "I'll come by" or "I'll
// call", needs an act that keeps it). One list for the card to draw, one place
// that says whether each act is open now and, if not, why (a closed key the
// card words), and the writers that put a done act on the record. Nothing
// here is rolled: the records say whether the act is open.
import { recordVisit } from "../core2/modules/people";
import {
  askOut,
  canAsk,
  propose,
  type AskWhere,
} from "../core2/modules/partnerships";
import { livesElsewhere } from "../core2/modules/moves";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { parameter } from "../core2/parameters";
import { openConversation } from "../director/conversation";
import type { Director } from "../director/ledger";
import type { CoreState, PersonId } from "../core2/types";
import { orgPlace } from "./scene";
import { hasBackdrop } from "./backdrop-places";
import { shiftOrganization } from "./shift";

export type ActKind = "visit" | "call" | "ask-out" | "propose";

/** Why an act is closed, as a key the card words (controls.json person.actReasons). */
export type ActReason =
  /** The person is in the room with you now: talk to them. */
  | "here"
  /** The person lives outside the town: a call reaches them, a visit does not. */
  | "elsewhere"
  /** A stop or choice holds the clock, so a trip cannot be taken. */
  | "held"
  /** They live with the player: home is not a visit, and nobody calls a house they are in. */
  | "home"
  /** The trip and the visit's hours would run past the end of today. */
  | "late"
  /** Asked before and told no, and the reason they gave still holds. */
  | "nothing-changed";

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
  /** Whether the player is at their own home now (not out at work or on a visit). */
  atHome: boolean;
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
  // Someone who has died is offered nothing: the card has no Get in touch.
  if (!other.alive) return [];
  const visit = ((): PersonAct => {
    if (context.here.includes(otherId)) return closed("visit", "here");
    if (other.householdId === core.people.get(playerId)?.householdId)
      return closed("visit", "home");
    if (
      livesElsewhere(core, other) ||
      other.placeId !== core.people.get(playerId)?.placeId
    )
      return closed("visit", "elsewhere");
    if (context.held) return closed("visit", "held");
    if (context.minute + visitMinutesOf(core) >= dayMinutesOf(core))
      return closed("visit", "late");
    return { kind: "visit", open: true };
  })();
  // At work in a place the game has no room for, there is nowhere to go
  // to: no Visit is offered then (none is shown, as with a Call that has
  // nothing to say), and the card offers it again once they leave work.
  const at = whereIs(core, otherId, context.minute);
  const unreachable =
    visit.open &&
    at.kind === "work" &&
    !hasBackdrop(orgPlace(core, at.organizationId) ?? "");
  // A visit is to talk with them: one the game has nothing to say for (a
  // colleague never met, at home or at their work) is not offered either,
  // so the player is never set down in a room where nothing happens.
  const silent =
    visit.open &&
    !unreachable &&
    !openConversation(core, playerId as PersonId, otherId as PersonId, {
      ...(context.director ? { director: context.director } : {}),
      ...(at.kind === "work" ? { visitOrganizationId: at.organizationId } : {}),
      minuteOfDay: Math.min(
        context.minute + visitMinutesOf(core),
        dayMinutesOf(core) - 1,
      ),
      look: true,
    }).lines.length;
  const visits = unreachable || silent ? [] : [visit];
  // Nobody calls someone in the room, or a house they are standing in: a
  // housemate at home while the player is home is not called either.
  const sameHouse =
    context.here.includes(otherId) ||
    (context.atHome &&
      other.householdId === core.people.get(playerId)?.householdId &&
      whereIs(core, otherId, context.minute).kind === "home");
  if (sameHouse)
    return [...visits, ...courtshipActs(core, playerId, otherId, context)];
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
  return [
    ...visits,
    // While a stop or scene holds the clock, Call waits like Visit does.
    ...(talk.lines.length
      ? [
          context.held
            ? { kind: "call" as const, open: false, reason: "held" as const }
            : { kind: "call" as const, open: true },
        ]
      : []),
    ...courtshipActs(core, playerId, otherId, context),
  ];
}

/**
 * Ask out and Propose (family life question 1, ruled Nov 14 2026 under the
 * owner's overnight say): offered only where they could mean something. Ask
 * out is offered for an adult in town who is not family and not the player's
 * partner; Propose only for the player's partner before an engagement. Each
 * is open or closed by the partnerships engine's own `canAsk` (a player
 * who is seeing someone is not offered Ask out); the answer
 * itself is the other person's, from their record, when the player presses.
 */
function courtshipActs(
  core: CoreState,
  playerId: string,
  otherId: string,
  context: ActContext,
): PersonAct[] {
  const api = coreAPI(core);
  const shown = (kind: "ask-out" | "propose"): PersonAct | undefined => {
    const gate = canAsk(api, playerId as PersonId, otherId as PersonId, kind);
    if (gate.open)
      return context.held
        ? { kind, open: false, reason: "held" }
        : { kind, open: true };
    if (gate.reason === "nothing-changed")
      return { kind, open: false, reason: "nothing-changed" };
    return undefined;
  };
  return [shown("ask-out"), shown("propose")].filter(
    (act): act is PersonAct => act !== undefined,
  );
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

/** The minutes a visit takes on the clock: the trip there and the visit's hours. */
export const visitMinutesOf = (core: CoreState): number =>
  Math.round(
    parameter("tripMinutes", core.data.parameters) +
      visitHoursOf(core) * parameter("minutesPerHour", core.data.parameters),
  );

/** The minutes in a day, from the core's parameters (the clock's own day). */
const dayMinutesOf = (core: CoreState): number =>
  parameter("hoursPerDay", core.data.parameters) *
  parameter("minutesPerHour", core.data.parameters);

/** The hours a visit takes: the people engine's own visit effort (socialHours). */
export const visitHoursOf = (core: CoreState): number =>
  parameter("socialHours", core.data.parameters);

/**
 * The player's Ask out or Propose from the card: the partnerships engine
 * decides the other person's answer from their own record and writes it,
 * and the director stages that record at once on the player's clock. Returns
 * the moment the answer is, for the screen to play as its scene.
 */
export function askFromCard(
  core: CoreState,
  director: Director | undefined,
  playerId: string,
  otherId: string,
  kind: "ask-out" | "propose",
  /** The room the two stand in together, or by phone while they are apart: the answer is given there. */
  where?: AskWhere,
): { momentId?: string } {
  const ask = kind === "ask-out" ? askOut : propose;
  const answered = ask(
    coreAPI(core),
    playerId as PersonId,
    otherId as PersonId,
    where,
  );
  const recordId = answered.recordId;
  if (!recordId) return {};
  // The ask is the player's own press: its scene is staged now and shown
  // (on the opening day too, before the clock has run), not held for the
  // day's close. The one path the running-mate ask uses.
  const entry = director?.stageOwnPress(core, playerId as PersonId, recordId);
  return entry ? { momentId: entry.momentId } : {};
}
