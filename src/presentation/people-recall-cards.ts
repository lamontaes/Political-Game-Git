import { personName } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { claimStancesBy } from "../simulation/claim-stances";
import { currentLifeCutoff } from "../simulation/life-queries";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { proseDate } from "./prose-dates";

/**
 * What the played person can be expected to remember (CRUNCH47 B1, P4).
 *
 * Not a transcript. A card is one thing they said, with the date it happened
 * and the record it happened in, so the interface can open that record rather
 * than paraphrase it. Everything here is
 * already the played person's own knowledge; nothing is revealed by reading it.
 *
 * Pure. The cards are ordered most recent first, because that is the order a
 * person would bring them to mind in, not because recency means importance.
 */

export type RecallCardKind = "said";

export interface RecallCard {
  readonly kind: RecallCardKind;
  /** The record the drilldown opens. */
  readonly eventId: EntityId;
  readonly on: IsoDate;
  /** The date said the way a person says it. */
  readonly onSpoken: string;
  readonly title: string;
  readonly detail: string;
  readonly otherPersonId: EntityId | null;
  readonly otherPersonName: string | null;
  /**
   * True when the person on the other side of this memory has died.
   *
   * The memory stands — something said is not undone by the other person's
   * death.
   */
  readonly otherPersonDied: boolean;
}

export function projectRecallCards(
  world: World,
  personId: EntityId,
): readonly RecallCard[] {
  const cards: RecallCard[] = [];
  const cutoff = currentLifeCutoff(world);
  const died = (id: EntityId | null): boolean =>
    id !== null && !!world.people[id] && !isPersonAliveAt(world, id, cutoff);
  for (const recorded of claimStancesBy(world, personId)) {
    const heard = recorded.stance.recipientPersonIds[0] ?? null;
    const other = heard ? world.people[heard] : undefined;
    cards.push({
      kind: "said",
      eventId: recorded.event.id,
      on: recorded.event.occurredAt,
      onSpoken: proseDate(recorded.event.occurredAt),
      title: other
        ? `You told ${personName(other)}: “${recorded.stance.statement}”`
        : `You said: “${recorded.stance.statement}”`,
      detail: recorded.stance.proposition,
      otherPersonId: heard,
      otherPersonName: other ? personName(other) : null,
      otherPersonDied: died(heard),
    });
  }
  return cards.sort((left, right) =>
    left.on === right.on
      ? left.eventId.localeCompare(right.eventId)
      : right.on.localeCompare(left.on),
  );
}
