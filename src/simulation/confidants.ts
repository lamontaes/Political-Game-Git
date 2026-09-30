import { kinshipRelationshipsAt, householdMembershipsAt } from "./life-queries";
import { personTrait } from "./people-traits";
import {
  readRelationshipStanding,
  type StandingBand,
} from "./relationship-standing";
import type { EntityId, World } from "./types";

/**
 * The people somebody actually tells things to.
 *
 * Nobody tells a fixed number of people. Somebody tells their family and the
 * people they live with, and beyond them the people they are warm toward;
 * how warm someone has to be before they hear it depends on how outgoing the
 * teller is. An outgoing person tells anyone they like at all, a reserved one
 * only the people they are closest to. Everyone here is somebody the World
 * records a tie with; nobody is invented.
 *
 * The check, never the rule: Americans name about two people they discuss
 * important matters with, most often a spouse or other kin (McPherson,
 * Smith-Lovin and Brashears, 2006, from the General Social Survey: a mean of
 * 2.08 in 2004 and 2.94 in 1985).
 */

const BAND_ORDER: readonly StandingBand[] = [
  "none",
  "slight",
  "marked",
  "strong",
];

/**
 * SET BY HAND: how warm a tie outside the family has to be before this person
 * tells them, by where they sit on sociability. The scale is the relationship
 * record's own bands.
 */
function warmthNeeded(world: World, personId: EntityId): StandingBand {
  const sociability = personTrait(world, personId, "sociability").value;
  if (sociability > 0) return "slight";
  if (sociability < 0) return "strong";
  return "marked";
}

function alive(world: World, personId: EntityId): boolean {
  return !world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

/**
 * Who this person tells, family and household first, then the warm ties in
 * the order they have dealt with them most.
 */
export function confidantsOf(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  if (!world.people[personId]) return [];
  const usable = (id: EntityId | undefined): id is EntityId =>
    !!id && id !== personId && !!world.people[id] && alive(world, id);

  const close = new Set<EntityId>();
  for (const kin of kinshipRelationshipsAt(world, personId)) {
    const other = kin.personIds.find((id) => id !== personId);
    if (usable(other)) close.add(other);
  }
  const homes = new Set(
    householdMembershipsAt(world, personId).map((entry) => entry.household.id),
  );
  for (const record of world.history.householdMemberships) {
    if (homes.has(record.householdId) && usable(record.personId)) {
      close.add(record.personId);
    }
  }

  const dealings = new Map<EntityId, number>();
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    const other = interaction.personIds.find((id) => id !== personId);
    if (!usable(other) || close.has(other)) continue;
    dealings.set(other, (dealings.get(other) ?? 0) + 1);
  }
  const needed = BAND_ORDER.indexOf(warmthNeeded(world, personId));
  const warm = [...dealings.entries()]
    .filter(([other]) => {
      const warmth = readRelationshipStanding(world, personId, other).readings
        .warmth;
      return !warmth.adverse && BAND_ORDER.indexOf(warmth.band) >= needed;
    })
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([other]) => other);

  return [...[...close].sort(), ...warm];
}
