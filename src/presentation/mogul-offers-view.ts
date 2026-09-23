import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  answerMogulOffer,
  deliverMogulStance,
  mogulOffers,
  type MogulOffer,
  type MogulOfferAnswer,
} from "../simulation/moguls";
import { displayMoney } from "./money-display";

export interface MogulOfferView {
  readonly offerEventId: EntityId;
  readonly from: string;
  /** What is offered, in one sentence. */
  readonly offer: string;
  /** What is asked in return, in one sentence. */
  readonly ask: string;
  readonly offeredOn: string;
  readonly standsUntil: string;
  readonly canAnswer: boolean;
  /** An accepted deal whose stance has not been said yet. */
  readonly canDeliver: boolean;
  readonly deliverLabel: string | null;
  /** How it ended, once it has. */
  readonly outcome: string | null;
}

function askText(world: World, offer: MogulOffer): string {
  if (offer.kind === "donation") return "Nothing is asked in return.";
  const question = world.policyCatalog.propositions[offer.propositionId]!.name;
  return `In return, they want you to say in public that you ${offer.wants} this: ${question}.`;
}

function outcomeText(world: World, offer: MogulOffer): string | null {
  const from = personName(world.people[offer.mogulPersonId]!);
  switch (offer.state) {
    case "open":
      return null;
    case "lapsed":
      return "You did not answer, and the offer lapsed.";
    case "declined":
      return "You turned it down.";
    case "accepted":
      return offer.kind === "deal"
        ? `You took the money. You have not said it in public yet.`
        : "You took the money.";
    case "delivered":
      return "You took the money and said it in public.";
    case "exposed":
      return `You took the money and never said it. ${from} went public about what the money was for.`;
    case "dropped":
      return "You took the money and never said it.";
  }
}

/**
 * Offers of money made to this person by people who want something from
 * government, newest first. Read-only: reading spends no time. Each line
 * says only what the person was told: who offered, how much and what for.
 */
export function projectMogulOffers(
  world: World,
  personId: EntityId,
): readonly MogulOfferView[] {
  return mogulOffers(world, { toPersonId: personId })
    .slice()
    .reverse()
    .map((offer) => {
      const from = personName(world.people[offer.mogulPersonId]!);
      return {
        offerEventId: offer.eventId,
        from,
        offer: `${from} offers your campaign ${displayMoney(offer.amount)}.`,
        ask: askText(world, offer),
        offeredOn: offer.offeredAt,
        standsUntil: offer.standsUntil,
        canAnswer: offer.state === "open",
        canDeliver: offer.kind === "deal" && offer.state === "accepted",
        deliverLabel:
          offer.kind === "deal" && offer.state === "accepted"
            ? `Say in public that you ${offer.wants} it`
            : null,
        outcome: outcomeText(world, offer),
      };
    });
}

export function answerOffer(
  world: World,
  offerEventId: EntityId,
  answer: MogulOfferAnswer,
): World {
  return answerMogulOffer(world, { offerEventId, answer }).world;
}

export function deliverOfferStance(
  world: World,
  offerEventId: EntityId,
): World {
  return deliverMogulStance(world, offerEventId);
}
