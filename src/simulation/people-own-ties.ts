import { ageOnDate } from "./dates";
import { currentLifeCutoff, householdMembershipsAt } from "./life-queries";
import { recordRelationshipInteraction } from "./records";
import { SeededRng } from "./rng";
import type { EntityId, RelationshipInteraction, World } from "./types";

/**
 * A few people somebody in the played life knows who are not the player.
 *
 * The people written around a played life (a parent, a classmate, a teacher)
 * come with one tie: the player. Everybody else they might know was never
 * recorded, so a goal to keep up with people had nobody to call, and every
 * step they took landed on the player, in every life alike. This gives each of
 * them, once, a couple of neighbors and a friend or two from people who
 * already live in their town. Nobody is created for the purpose, and where the
 * town has nobody to draw from, nothing is written.
 *
 * Coworkers are not written here: somebody with a recorded job already knows
 * the people recorded at the same employer (`coworkersOf` in
 * people-goal-review.ts reads them).
 */

export const OWN_TIES_VERSION = "own-ties-v1";
export const OWN_TIES_TAG = "people.own-ties";

/** How many of each kind of tie a person is given. Pacing, not measurement. */
const OWN_TIES = {
  neighbors: 2,
  /** One or two friends, drawn per person. */
  friends: { minimum: 1, maximum: 2 },
  /** A friend is somebody within this many years of their age. */
  friendAgeGapYears: 10,
} as const;

const PEOPLE_WITH_OWN_TIES = new WeakMap<
  readonly RelationshipInteraction[],
  ReadonlySet<EntityId>
>();

function peopleWithOwnTies(world: World): ReadonlySet<EntityId> {
  const interactions = world.history.relationshipInteractions;
  let found = PEOPLE_WITH_OWN_TIES.get(interactions);
  if (!found) {
    const ids = new Set<EntityId>();
    for (const interaction of interactions) {
      if (interaction.tags.includes(OWN_TIES_TAG)) {
        for (const id of interaction.personIds) ids.add(id);
      }
    }
    found = ids;
    PEOPLE_WITH_OWN_TIES.set(interactions, found);
  }
  return found;
}

/**
 * Whether this person already knows anybody besides `anchorId` and the
 * people they live with: a recorded interaction with somebody else.
 */
function knowsSomebodyElse(
  world: World,
  personId: EntityId,
  anchorId: EntityId,
  housemates: ReadonlySet<EntityId>,
): boolean {
  return world.history.relationshipInteractions.some((interaction) => {
    if (!interaction.personIds.includes(personId)) return false;
    const other = interaction.personIds.find((id) => id !== personId);
    return !!other && other !== anchorId && !housemates.has(other);
  });
}

/**
 * Gives `personId` their own few ties, once. `anchorId` is the played person,
 * who is never drawn. Returns the world unchanged when the person already has
 * ties of their own, is not an adult, or their town has nobody to draw from.
 */
export function ensureOwnTies(
  world: World,
  personId: EntityId,
  anchorId: EntityId,
): World {
  const person = world.people[personId];
  if (!person || personId === anchorId) return world;
  if (peopleWithOwnTies(world).has(personId)) return world;
  const today = world.currentDate;
  const adultOn = (id: EntityId) =>
    ageOnDate(world.people[id]!.birthDate, today) >= 18;
  if (!adultOn(personId)) return world;

  const cutoff = currentLifeCutoff(world);
  const homes = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  const housemates = new Set(
    world.history.householdMemberships
      .filter((record) => homes.has(record.householdId))
      .map((record) => record.personId),
  );
  if (knowsSomebodyElse(world, personId, anchorId, housemates)) return world;

  const dead = new Set(
    world.history.personDeaths
      .filter((death) => death.diedAt <= today)
      .map((death) => death.personId),
  );
  const pool = (Object.keys(world.people) as EntityId[])
    .filter(
      (id) =>
        id !== personId &&
        id !== anchorId &&
        !housemates.has(id) &&
        !dead.has(id) &&
        world.people[id]!.homeJurisdictionId === person.homeJurisdictionId &&
        adultOn(id),
    )
    .sort();
  if (pool.length === 0) return world;

  const rng = new SeededRng(world.seed).fork(`${OWN_TIES_VERSION}:${personId}`);
  const draw = (from: readonly EntityId[], count: number) => {
    const left = [...from];
    const drawn: EntityId[] = [];
    while (drawn.length < count && left.length > 0) {
      drawn.push(left.splice(rng.integer(0, left.length), 1)[0]!);
    }
    return drawn;
  };

  const neighbors = draw(pool, OWN_TIES.neighbors);
  const age = ageOnDate(person.birthDate, today);
  const friendPool = pool.filter(
    (id) =>
      !neighbors.includes(id) &&
      Math.abs(ageOnDate(world.people[id]!.birthDate, today) - age) <=
        OWN_TIES.friendAgeGapYears,
  );
  const friends = draw(
    friendPool,
    rng.integer(OWN_TIES.friends.minimum, OWN_TIES.friends.maximum + 1),
  );

  let next = world;
  const tie = (
    otherId: EntityId,
    kind: "contact:neighbors" | "contact:friendship",
    summary: string,
  ) => {
    next = recordRelationshipInteraction(next, {
      stableKey: `${OWN_TIES_VERSION}:${personId}:${otherId}`,
      personIds: [personId, otherId],
      eventId: null,
      // Recorded when the played life first reaches them, like the town's own
      // neighbor ties: someone who moved in during the life may be drawn, so
      // a date before the life began would claim a past the record lacks.
      occurredAt: world.currentDate,
      kind,
      change: "formed",
      significance: kind === "contact:friendship" ? "meaningful" : "minor",
      summary,
      tags: [OWN_TIES_TAG],
    });
  };
  for (const id of neighbors)
    tie(id, "contact:neighbors", "Neighbors in the same town.");
  for (const id of friends)
    tie(id, "contact:friendship", "Friends in the same town.");
  return next;
}
