import { eventById, eventIndexOf } from "../event-index";
import type { EntityId, HistoricalEvent, World } from "../types";

/**
 * The crimes a person suffered: every offense the crime producer recorded
 * with them as its victim (`impact:crime-victim`), reported or not.
 *
 * This is the one reader of that fact. The principles a life forms
 * (`principles-from-life.ts`), the victim's own decision to report
 * (`reporting.ts`) and the views a person forms of the officials who answer
 * for what happened to them (`living-world/lived-outcomes.ts`) all read it.
 */

const VICTIM_EVENTS = new WeakMap<
  readonly HistoricalEvent[],
  ReadonlyMap<EntityId, readonly EntityId[]>
>();

/** The ids of the crimes against `personId` on or before `through`. */
export function crimesSufferedBy(
  world: World,
  personId: EntityId,
  through = world.currentDate,
): readonly EntityId[] {
  const events = world.history.events;
  let index = VICTIM_EVENTS.get(events);
  if (!index) {
    const built = new Map<EntityId, EntityId[]>();
    for (const event of eventIndexOf(events).values())
      for (const participant of event.participants)
        if (
          participant.role === "impact:crime-victim" &&
          participant.personId
        ) {
          const list = built.get(participant.personId) ?? [];
          list.push(event.id);
          built.set(participant.personId, list);
        }
    VICTIM_EVENTS.set(events, built);
    index = built;
  }
  return (index.get(personId) ?? []).filter(
    (id) => (eventById(world, id)?.occurredAt ?? "") <= through,
  );
}
