import { addDays } from "./dates";
import { agreedToRequest, recalledRequest } from "./people-recall";
import type {
  ContradictionEvidence,
  ContradictionRoute,
} from "./claim-contradiction-routes";
import type { ClaimStance } from "./claim-stances";
import type { EntityId, HistoricalEvent, World } from "./types";

/**
 * The evidence route for an answer about a request somebody made
 * (CRUNCH47 B1, P4).
 *
 * The person who asked was there when the player answered. They hold their own
 * record of it, so if the player later tells them something else, the thing
 * that contradicts it is that same conversation — not a document, not a
 * witness, and not an inference from how it turned out.
 *
 * The route decides nothing about intent. A player who says "I think I told
 * you I would" and is wrong made a mistake; a player who says "I definitely
 * said yes" knowing they declined lied. Both arrive here identically, and the
 * check writes the same discovery; the difference lives in the stance the
 * answer already recorded.
 */

/** A day is enough: the other person is remembering their own conversation. */
const REMEMBERS_WITHIN_DAYS = 1;

export const REQUEST_PROPOSITION_PREFIX = "agreed";

export function requestPropositionKey(requestEventId: EntityId): string {
  return `${REQUEST_PROPOSITION_PREFIX}:${requestEventId}`;
}

export const peopleRequestContradictionRoute: ContradictionRoute = {
  prefix: REQUEST_PROPOSITION_PREFIX,
  discovery: { family: "favor", place: "By phone" },
  checkDate(world: World, _stance: ClaimStance, id: EntityId) {
    // Only an answered request has something to be checked against.
    const asked = world.history.events.some((event) => event.id === id);
    return asked ? addDays(world.currentDate, REMEMBERS_WITHIN_DAYS) : null;
  },
  evidenceFor(
    world: World,
    _stanceEvent: HistoricalEvent,
    stance: ClaimStance,
    id: EntityId,
    recipientPersonId: EntityId,
  ): ContradictionEvidence | null {
    // The request itself says who was asked; the stance is theirs.
    const request = world.history.events.find((event) => event.id === id);
    const askedOfId = request?.participants.find(
      (entry) => entry.role === "focus:asked-of",
    )?.personId;
    if (!askedOfId) return null;
    const entry = recalledRequest(world, askedOfId, id);
    // Only the person who asked can contradict this from their own memory.
    if (!entry || entry.counterpartPersonId !== recipientPersonId) return null;
    if (!entry.responseEventId) return null;
    const agreed = agreedToRequest(entry);
    if (agreed === null) return null;
    const claimedAgreement =
      stance.asserted === "affirms"
        ? true
        : stance.asserted === "denies"
          ? false
          : null;
    if (claimedAgreement === null || claimedAgreement === agreed) return null;
    return {
      evidenceEventId: entry.responseEventId,
      label: "what you said at the time",
    };
  },
};
