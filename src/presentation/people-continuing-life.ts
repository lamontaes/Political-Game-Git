import { compareSimulationMoments, personName } from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  IsoDate,
  World,
} from "../simulation";
import { attendContactMeeting } from "../simulation/people-continuing-life";
import { scheduledActivityState } from "../simulation/time-work";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { currentLifeCutoff } from "../simulation/life-queries";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { proseDate } from "./prose-dates";

/**
 * What is open between the played person and everybody else (MUSE-PEOPLE).
 *
 * A card is one offer, arrangement or rhythm with a question still in it, or
 * a kept, broken or renegotiated arrangement worth remembering — each with
 * the date it happened and the record it happened in. Everything here is
 * already the played person's own knowledge: offers addressed to them,
 * arrangements they are party to, rhythms they agreed to. NPC intentions are
 * deliberately absent — an intention is not news until the NPC acts on it.
 *
 * Pure. Cards are ordered most recent first, like the recall cards beside
 * them. Favour asks are not repeated here: the recall cards own those.
 */

export type ContinuingLifeCardKind =
  | "repair"
  | "introduction"
  | "collaboration"
  | "promise-due"
  | "reconnect"
  | "arrangement";

export interface ContinuingLifeCard {
  readonly kind: ContinuingLifeCardKind;
  /** The record the drilldown opens. */
  readonly eventId: EntityId;
  readonly on: IsoDate;
  /** The date said the way a person says it. */
  readonly onSpoken: string;
  readonly title: string;
  readonly detail: string;
  readonly otherPersonId: EntityId | null;
  readonly otherPersonName: string | null;
  /** True when the player's own answer is still outstanding. */
  readonly openQuestion: boolean;
  readonly otherPersonDied: boolean;
}

export function projectContinuingLifeCards(
  world: World,
  personId: EntityId,
): readonly ContinuingLifeCard[] {
  const cards: ContinuingLifeCard[] = [];
  const cutoff = currentLifeCutoff(world);
  const died = (id: EntityId | null): boolean =>
    id !== null && !!world.people[id] && !isPersonAliveAt(world, id, cutoff);
  const push = (card: ContinuingLifeCard): void => {
    cards.push(card);
  };
  const answeredRepair = (offerId: EntityId): boolean =>
    world.history.events.some(
      (event) =>
        (event.type === "life.repair-accepted" ||
          event.type === "life.repair-declined") &&
        event.tags.includes(`followthrough.answer:${offerId}`),
    );
  const answeredIntroduction = (offerId: EntityId): boolean =>
    world.history.events.some(
      (event) =>
        (event.type === "life.introduction-made" ||
          event.type === "life.introduction-declined" ||
          event.type === "life.introduction-offer-declined") &&
        event.tags.includes(`followthrough.answer:${offerId}`),
    );
  const answeredCollaboration = (offerId: EntityId): boolean =>
    world.history.events.some(
      (event) =>
        (event.type === "life.collaboration-agreed" ||
          event.type === "life.collaboration-declined") &&
        event.tags.includes(`followthrough.answer:${offerId}`),
    );
  for (const offer of world.history.events) {
    if (!offer.involvedEntityIds.includes(personId)) continue;
    const otherId =
      offer.involvedEntityIds.find((id) => id !== personId) ?? null;
    const other = otherId ? world.people[otherId] : undefined;
    const gone = died(otherId);
    if (offer.type === "life.repair-offered") {
      const open = !answeredRepair(offer.id);
      push({
        kind: "repair",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: `${other ? personName(other) : "Somebody"} wants to make amends`,
        detail: open
          ? gone
            ? "Unanswered. They have since died."
            : "You have not answered."
          : "Answered.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: open && !gone,
        otherPersonDied: gone,
      });
    } else if (offer.type === "life.introduction-offered") {
      const open = !answeredIntroduction(offer.id);
      push({
        kind: "introduction",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: offer.summary,
        detail: open
          ? gone
            ? "Unanswered. They have since died."
            : "You have not answered."
          : "Answered.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: open && !gone,
        otherPersonDied: gone,
      });
    } else if (offer.type === "life.collaboration-offered") {
      const open = !answeredCollaboration(offer.id);
      push({
        kind: "collaboration",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: offer.summary,
        detail: open ? "You have not answered." : "Answered.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: open && !gone,
        otherPersonDied: gone,
      });
    } else if (offer.type === "life.collaboration-agreed") {
      const sourceTag = `followthrough.source:${offer.id}`;
      const ended = world.history.events.some(
        (event) =>
          (event.type === "life.collaboration-ended" ||
            event.type === "life.collaboration-established") &&
          event.tags.includes(sourceTag),
      );
      push({
        kind: "collaboration",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: offer.summary,
        detail: ended ? "Ended." : "Running.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: false,
        otherPersonDied: gone,
      });
    } else if (offer.type === "life.promise-comes-due") {
      push({
        kind: "promise-due",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: offer.summary,
        detail: "A revised arrangement, come due.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: false,
        otherPersonDied: gone,
      });
    } else if (offer.type === "life.reconnect-raised") {
      push({
        kind: "reconnect",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: offer.summary,
        detail: gone ? "They have since died." : "Somebody got back in touch.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: false,
        otherPersonDied: gone,
      });
    } else if (offer.type === "life.agreement-revision-asked") {
      const agreed = world.history.events.some(
        (event) =>
          event.type === "life.agreement-revision-agreed" &&
          event.involvedEntityIds.includes(personId) &&
          otherId !== null &&
          event.involvedEntityIds.includes(otherId),
      );
      push({
        kind: "arrangement",
        eventId: offer.id,
        on: offer.occurredAt,
        onSpoken: proseDate(offer.occurredAt),
        title: offer.summary,
        detail: agreed
          ? "The arrangement was changed by agreement."
          : "The arrangement stands as agreed.",
        otherPersonId: otherId,
        otherPersonName: other ? personName(other) : null,
        openQuestion: false,
        otherPersonDied: gone,
      });
    }
  }
  return cards.sort((left, right) =>
    left.on === right.on
      ? left.eventId.localeCompare(right.eventId)
      : right.on.localeCompare(left.on),
  );
}

/**
 * Go to an agreed meeting the way ordinary time passes: an optional calendar
 * hold reached on the way lapses, exactly as letting the day run would lapse
 * it, and a confirmed commitment still stops the way. Returns the World
 * unchanged when the meeting cannot be reached now.
 */
export function goToAgreedMeeting(
  world: World,
  playerId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry,
): World {
  let current = world;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const attended = attendContactMeeting(
      current,
      playerId,
      activityId,
      handlers,
    );
    if (attended !== current) return attended;
    const meetingStart = scheduledActivityState(current, activityId).start;
    const hold = current.history.scheduledActivities.find((activity) => {
      if (activity.kind !== "tentative" || activity.id === activityId) {
        return false;
      }
      if (!activity.participantPersonIds.includes(playerId)) return false;
      const state = scheduledActivityState(current, activity.id);
      return (
        state.status === "scheduled" &&
        compareSimulationMoments(state.start, meetingStart) < 0 &&
        compareSimulationMoments(state.end, current.currentMoment) > 0
      );
    });
    if (!hold) return world;
    const lapsed = declineVenueActivity(current, playerId, hold.id, "lapsed");
    if (lapsed === current) return world;
    current = lapsed;
  }
  return world;
}
