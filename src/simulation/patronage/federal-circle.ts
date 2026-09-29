import { projectCongress } from "../living-world/congress";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import type { EntityId, World } from "../types";

/*
 * The federal circles an appointer draws from, kept apart from the chooser in
 * `appointments.ts` so the town code that also calls the chooser does not load
 * Congress and the state executives.
 */

/**
 * The officeholders a President works with: every sitting member of Congress
 * and every state's chief executive. Working together is how officeholders
 * know each other; that reading is inferred, not measured.
 */
export function federalColleaguesOf(world: World): readonly EntityId[] {
  const congress = projectCongress(world);
  const ids = new Set<EntityId>();
  for (const seat of [
    ...(congress?.house.seats ?? []),
    ...(congress?.senate.seats ?? []),
  ])
    if (seat.occupant.kind === "member") ids.add(seat.occupant.member.personId);
  for (const holder of currentStateExecutiveHolders(world))
    ids.add(holder.personId);
  return [...ids].sort();
}

/** Who nominated this person, from the nomination event for the vacancy. */
export function nominatorOf(
  world: World,
  eventType: string,
  vacancyTag: string,
  nomineeId: EntityId,
): EntityId | null {
  for (let index = world.history.events.length - 1; index >= 0; index -= 1) {
    const event = world.history.events[index]!;
    if (event.type !== eventType || !event.tags.includes(vacancyTag)) continue;
    const subject = event.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    if (subject !== nomineeId) continue;
    return (
      event.participants.find(
        (participant) => participant.role === "focus:actor",
      )?.personId ?? null
    );
  }
  return null;
}
