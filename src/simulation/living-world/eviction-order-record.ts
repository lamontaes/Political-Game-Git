import { ageOnDate } from "../dates";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";

export const PUBLIC_EVICTION_ORDER_TYPE = "court.eviction-order";
const LEASE_TAG_PREFIX = "town-rent-v1:lease:";
export const EVICTION_CASE_TAG_PREFIX = "eviction:case:";
export const EVICTION_ORDER_TAG_PREFIX = "eviction:order:";

/** HELD: one public record of an actual order, visible on each adult's record.
 * The underlying filing/order events remain unchanged. No inferred old orders
 * or court identities are inserted, and this is not a judicial docket writer. */
export function recordPublicEvictionOrder(
  world: World,
  orderEventId: EntityId,
  courtLabel: string,
): World {
  const order = world.history.events.find((event) => event.id === orderEventId);
  if (!order || order.type !== "housing.evicted")
    throw new Error("A public eviction order requires a recorded eviction.");
  const stableKey = `${order.stableKey}:public-court-record`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  if (courtLabel.trim().length === 0)
    throw new Error(
      "A public eviction order requires its recorded court label.",
    );
  const leaseTag = order.tags.find((tag) => tag.startsWith(LEASE_TAG_PREFIX));
  const filing = leaseTag
    ? world.history.events
        .filter(
          (event) =>
            event.type === "housing.eviction-filed" &&
            event.sequence < order.sequence &&
            event.occurredAt <= order.occurredAt &&
            event.tags.includes(leaseTag),
        )
        .at(-1)
    : undefined;
  if (!filing)
    throw new Error("A public eviction order requires its recorded filing.");
  const participants = order.participants.filter((participant) => {
    const person = world.people[participant.personId];
    return person && ageOnDate(person.birthDate, order.occurredAt) >= 18;
  });
  if (participants.length === 0)
    throw new Error(
      "A public eviction order requires a recorded adult tenant.",
    );
  return recordWorldEvent(world, {
    stableKey,
    type: PUBLIC_EVICTION_ORDER_TYPE,
    occurredAt: order.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: order.jurisdictionId,
    involvedEntityIds: [...order.involvedEntityIds],
    participants,
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "life.home",
      leaseTag!,
      `${EVICTION_CASE_TAG_PREFIX}${filing.id}`,
      `${EVICTION_ORDER_TAG_PREFIX}${order.id}`,
    ],
    summary: order.summary,
    context: { ...order.context, socialContext: courtLabel },
  });
}
