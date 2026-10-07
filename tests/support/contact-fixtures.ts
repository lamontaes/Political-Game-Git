import { personName } from "../../src/simulation";
import {
  contactProposals,
  proposeContact,
} from "../../src/simulation/relationship-contact";
import { coupleBetween, dateRefusal } from "../../src/simulation/couples";
import type { EntityId, IsoDate, World } from "../../src/simulation/types";

/**
 * Test fixtures only. The player can no longer start a meeting or a date from
 * a screen (OW-20b); worlds that need one on record write it through the same
 * contact writer a reaching-out person uses.
 */
export function askToMeet(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly otherPersonId: EntityId;
    readonly on: IsoDate;
    readonly purpose?: string;
  },
): World {
  const other = world.people[input.otherPersonId];
  if (!other) throw new Error("There is nobody there to ask.");
  return proposeContact(world, {
    stableKey: `contact:${input.personId}:${input.otherPersonId}:${input.on}`,
    fromPersonId: input.personId,
    toPersonId: input.otherPersonId,
    on: input.on,
    purpose: input.purpose?.trim() ? input.purpose : `See ${personName(other)}`,
  }).world;
}

export function askOnADate(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly otherPersonId: EntityId;
    readonly on: IsoDate;
  },
): World {
  const other = world.people[input.otherPersonId];
  if (!other) throw new Error("There is nobody there to ask.");
  return proposeContact(world, {
    stableKey: `date:${input.personId}:${input.otherPersonId}:${input.on}`,
    fromPersonId: input.personId,
    toPersonId: input.otherPersonId,
    on: input.on,
    purpose: `Go out with ${personName(other)}`,
    date: true,
  }).world;
}

/**
 * What the contacts list used to offer for "ask somebody out": nothing where a
 * date is refused or the two are already a couple, otherwise available unless
 * a request between them is still open.
 */
export function dateAction(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): { readonly kind: "ask-on-a-date"; readonly available: boolean } | undefined {
  if (dateRefusal(world, personId, otherId)) return undefined;
  if (coupleBetween(world, personId, otherId)) return undefined;
  const open = contactProposals(world, personId).some(
    (proposal) =>
      !proposal.answered &&
      (proposal.fromPersonId === otherId || proposal.toPersonId === otherId),
  );
  return { kind: "ask-on-a-date", available: !open };
}

/** The same for "ask to meet": available unless a request is still open. */
export function meetAvailable(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): boolean {
  return !contactProposals(world, personId).some(
    (proposal) =>
      !proposal.answered &&
      (proposal.fromPersonId === otherId || proposal.toPersonId === otherId),
  );
}
