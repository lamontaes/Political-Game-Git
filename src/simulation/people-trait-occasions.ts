import { contactProposals, CONTACT_DECLINED_EVENT } from "./people-contact";
import { attemptTraitChange } from "./people-trait-change";
import {
  PEOPLE_MIND_VERSION,
  type TraitValue,
} from "./people-trait-definitions";
import { personTrait } from "./people-traits";
import type { EntityId, World } from "./types";

/**
 * The occasions in an ordinary life that move somebody.
 *
 * The trait machinery had every part but this one. A pack declares traits, a
 * decision reads them, resistance is read from a life and pressure accumulates
 * — and nothing in play ever called the producer, so nobody's temperament had
 * moved since the game was written. This is the producer's first caller.
 *
 * The standard every occasion here has to meet: a player must be able to point
 * at the thing that happened. A trait that moves for a reason nobody can find
 * is a number drifting, not a person changing. So each occasion attempts the
 * change once per specific event, citing that event, which means the chain of
 * records afterwards names the particular asks that went unanswered rather
 * than reporting that sociability moved. Resistance already works that way;
 * the producing side holds the same line.
 *
 * Nothing here touches the played character. Their temperament moves only
 * through `recordPlayerTraitChoice`, on their own choices, and the skip is
 * explicit rather than left to the store's guard, so no pressure is recorded
 * against a trait they do not have.
 */

/** Neither pole is ever exceeded; a life does not push past its own scale. */
function toward(current: TraitValue, step: -1 | 1): TraitValue {
  return Math.max(-2, Math.min(2, current + step)) as TraitValue;
}

function controlledPerson(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/**
 * Whether this occasion has already been weighed against this person.
 *
 * Both outcomes leave a record — a move writes a tendency citing the event, a
 * failure writes an unmoved event — and either is proof the occasion was
 * counted. Without this an ask would be re-weighed on every refresh and a
 * single unanswered invitation would grind somebody down by repetition, which
 * is the opposite of what recording pressure is for.
 */
function alreadyWeighed(
  world: World,
  personId: EntityId,
  occasionKey: string,
  eventId: EntityId,
): boolean {
  const unmoved = `${PEOPLE_MIND_VERSION}:unmoved:${occasionKey}`;
  if (world.history.events.some((event) => event.stableKey === unmoved)) {
    return true;
  }
  return world.history.personalityTendencies.some(
    (record) =>
      record.personId === personId &&
      record.stableKey.includes(`:after:${eventId}:`),
  );
}

/**
 * Somebody reached out and it came to nothing.
 *
 * The first occasion, chosen because the world already writes every part of
 * it: `contactProposals` records who asked, who was asked, the day it was for
 * and what became of it. Nothing has to be invented to make this fire.
 *
 * Two ways an ask comes to nothing, and both count. Being turned down is the
 * common one, because the game answers on a schedule. Never being answered at
 * all is rarer but real, and it is the harsher of the two — a refusal is at
 * least a reply. They are recorded with different reasons so the record can
 * say which happened, rather than flattening them into "it did not work out".
 *
 * One such evening does nothing. That is resistance doing its job and it is
 * true to life: the same thing happening again and again is what moves
 * somebody, because each failed attempt is recorded and counts as pressure on
 * the next. Somebody who reaches out for a year and keeps getting nowhere
 * becomes a person who reaches out less.
 *
 * Only asks whose day has passed count. An ask still ahead has not come to
 * nothing; it is waiting, and treating the two alike is the same error as
 * counting a lapsed calendar hold as a refusal.
 */
export function produceRebuffedAskEffects(
  world: World,
  personId: EntityId,
): World {
  const controlled = controlledPerson(world);
  let next = world;
  for (const proposal of contactProposals(world, personId)) {
    if (proposal.on >= world.currentDate) continue;
    const outcome = askOutcome(next, proposal.eventId, proposal.answered);
    if (outcome === null) continue;
    const asker = proposal.fromPersonId;
    // The played character is never authored, on any occasion.
    if (asker === controlled) continue;
    if (!next.people[asker]) continue;
    const occasionKey = `${outcome.key}:${proposal.eventId}`;
    if (alreadyWeighed(next, asker, occasionKey, proposal.eventId)) continue;
    const current = personTrait(next, asker, "sociability");
    const target = toward(current.value, -1);
    if (target === current.value) continue;
    next = attemptTraitChange(next, {
      personId: asker,
      trait: "sociability",
      value: target,
      eventId: proposal.eventId,
      reason: `${outcome.reason} (${proposal.on})`,
      force: "passing",
      stableKey: occasionKey,
    }).world;
  }
  return next;
}

/**
 * What came of an ask whose day has gone by, or null if it came to something.
 *
 * An accepted meeting and a counter-offer are not rebuffs: one is a yes and
 * the other is somebody still trying to make it work.
 */
function askOutcome(
  world: World,
  proposalEventId: EntityId,
  answered: boolean,
): { readonly key: string; readonly reason: string } | null {
  if (!answered) {
    return {
      key: "unanswered-ask",
      reason: "Asked to meet and never heard back",
    };
  }
  const declined = world.history.events.some(
    (event) =>
      event.type === CONTACT_DECLINED_EVENT &&
      event.tags.includes(`contact.proposal:${proposalEventId}`),
  );
  return declined
    ? { key: "declined-ask", reason: "Asked to meet and was turned down" }
    : null;
}
