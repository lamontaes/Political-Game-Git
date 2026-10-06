import { ageOnDate } from "./dates";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
} from "./life-queries";
import { personTrait } from "./people-traits";
import { recordRelationshipInteraction } from "./records";
import { sharedPlaceAcquaintances } from "./shared-places";
import type { EntityId, RelationshipInteraction, World } from "./types";

/**
 * A few people somebody in the played life knows who are not the player.
 *
 * The people written around a played life (a parent, a classmate, a teacher)
 * come with one tie: the player. Everybody else they might know was never
 * recorded, so a goal to keep up with people had nobody to call, and every
 * step they took landed on the player, in every life alike. This gives each of
 * them, once, a friend or two and a couple of neighbors. Nothing is drawn:
 *
 * - a friend is somebody they already share a room with (a congregation, a
 *   club, a council, a child's class: `shared-places.ts`) or a job with, the
 *   nearest in age first; a sociable person keeps two, anyone else one; when
 *   the record puts them in no room, the adults in town nearest their age;
 * - a neighbor is somebody their household already has a recorded neighbor
 *   contact with, the nearest in age first. A home has no place on a street
 *   on record, so nobody else can be called a neighbor.
 *
 * Nobody is created for the purpose, and where the record gives nobody,
 * nothing is written.
 *
 * Coworkers are not written as ties here: somebody with a recorded job
 * already knows the people recorded at the same employer (`coworkersOf` in
 * people-goal-review.ts reads them). They can still become a friend.
 */

export const OWN_TIES_VERSION = "own-ties-v1";
export const OWN_TIES_TAG = "people.own-ties";

/**
 * The recorded starting allocation gives a person two neighbors and one friend.
 * This controls pacing, not measurement.
 */
const OWN_TIES = {
  neighbors: 2,
  /** One friend, or two for somebody who leans sociable. */
  friends: { minimum: 1, sociable: 2 },
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
 * who is never chosen. Returns the world unchanged when the person already has
 * ties of their own, is not an adult, or the record gives them nobody.
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
  const eligible = (id: EntityId) =>
    id !== personId &&
    id !== anchorId &&
    !housemates.has(id) &&
    !dead.has(id) &&
    !!world.people[id] &&
    world.people[id]!.homeJurisdictionId === person.homeJurisdictionId &&
    adultOn(id);
  const age = ageOnDate(person.birthDate, today);
  const nearestInAge = (ids: Iterable<EntityId>) =>
    [...new Set(ids)].filter(eligible).sort((a, b) => {
      const gap = (id: EntityId) =>
        Math.abs(ageOnDate(world.people[id]!.birthDate, today) - age);
      return gap(a) - gap(b) || a.localeCompare(b);
    });

  // Neighbors the household already has on record.
  const recordedNeighbors: EntityId[] = [];
  for (const interaction of world.history.relationshipInteractions)
    if (
      interaction.kind === "contact:neighbors" &&
      interaction.personIds.some((id) => housemates.has(id))
    )
      for (const id of interaction.personIds)
        if (!housemates.has(id)) recordedNeighbors.push(id);
  const neighbors = nearestInAge(recordedNeighbors).slice(
    0,
    OWN_TIES.neighbors,
  );

  // Friends from the rooms and the jobs they already share.
  const workplaces = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).flatMap((row) =>
      row.relationship.organizationId ? [row.relationship.organizationId] : [],
    ),
  );
  const coworkers = world.history.workRelationships
    .filter(
      (row) =>
        !!row.organizationId &&
        workplaces.has(row.organizationId) &&
        activeWorkRelationshipsAt(world, row.personId, cutoff).some(
          (active) => active.relationship.organizationId === row.organizationId,
        ),
    )
    .map((row) => row.personId);
  const friendCount =
    personTrait(world, personId, "sociability").value >= 1
      ? OWN_TIES.friends.sociable
      : OWN_TIES.friends.minimum;
  const friends = nearestInAge([
    ...sharedPlaceAcquaintances(world, personId),
    ...coworkers,
  ])
    .filter(
      (id) =>
        !neighbors.includes(id) &&
        Math.abs(ageOnDate(world.people[id]!.birthDate, today) - age) <=
          OWN_TIES.friendAgeGapYears,
    )
    .slice(0, friendCount);
  // Somebody the record places in no room and no job still has a friend in
  // town: the adults nearest their age, since friends are most often of an
  // age (McPherson, Smith-Lovin and Cook, "Birds of a Feather", Annual Review
  // of Sociology, 2001).
  if (friends.length < friendCount)
    for (const id of nearestInAge(Object.keys(world.people) as EntityId[])) {
      if (friends.length >= friendCount) break;
      if (neighbors.includes(id) || friends.includes(id)) continue;
      if (
        Math.abs(ageOnDate(world.people[id]!.birthDate, today) - age) >
        OWN_TIES.friendAgeGapYears
      )
        break;
      friends.push(id);
    }
  if (neighbors.length === 0 && friends.length === 0) return world;

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
