import { relationshipHistory } from "../simulation/queries";
import type { EntityId, World } from "../simulation";
import { proseDate } from "./prose-dates";

/**
 * Whether the last recorded thing between the player and somebody strained
 * the relationship, said from the player's side, dated from the first strain
 * in the unbroken run that ends with it. Read-only. Null when the
 * latest thing between them did not strain it: a later ordinary exchange
 * means the strain is no longer the news.
 *
 * Before this a relative who distanced themselves after a public finding
 * appeared only in the case record and deep in the person's card, in the
 * world's third-person words (Alaska playtest, 2026-09-22).
 */
export function recentStrain(
  world: World,
  playerId: EntityId,
  personId: EntityId,
): string | null {
  if (personId === playerId) return null;
  const history = relationshipHistory(world, playerId, personId).filter(
    (interaction) => interaction.occurredAt <= world.currentDate,
  );
  const latest = history.at(-1);
  if (!latest || latest.change !== "strained") return null;
  const person = world.people[personId];
  if (!person) return null;
  // A second strain on top of the first does not restart it: the person has
  // kept away since the first of the unbroken run.
  let start = history.length - 1;
  while (start > 0 && history[start - 1]!.change === "strained") start -= 1;
  const since = proseDate(history[start]!.occurredAt);
  return latest.kind.startsWith("exchange:matter-")
    ? `${person.givenName} has kept away from you since ${since}, after the case against you became public.`
    : `Things have been strained with ${person.givenName} since ${since}.`;
}
