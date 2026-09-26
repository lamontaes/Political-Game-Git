import { addDays, daysBetween } from "../dates";
import {
  activePartnershipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type {
  EntityId,
  FutureTransitionHandler,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import {
  FATAL_ILLNESS_EPISODE_PREFIX,
  FATAL_ILLNESS_PROGNOSIS_AT,
  fatalIllnessDeathDay,
  fatalIllnessEpisodeKey,
} from "./death-causes";
import { beginHealthEpisode } from "./health";
import { activeHealthEpisodes } from "./health-queries";
import { mortalityCrossingDay } from "./mortality";
import { CRISIS_PROVISIONAL_POLICY, type HealthCourseStep } from "./types";

/**
 * The lead-up to a K1 death whose seeded cause is an illness with a course.
 *
 * On its onset day the person falls seriously ill: a health episode begins
 * through the ordinary K2 writer, and the household and immediate family are
 * told through its ordinary disclosure recipients. The death itself is not
 * written here. It stays on its own due item and its own day, so the hazard
 * model's deaths are exactly what they were; this only makes the family's
 * months before it true.
 *
 * The played character's own illness is not disclosed for them. They see it
 * on their own health surface and decide whom to tell, as K2 requires.
 */

/** Household members, partners, parents, children and siblings, alive now. */
export function immediateFamilyOf(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const ids = new Set<EntityId>();
  for (const relationship of kinshipRelationshipsAt(world, personId, cutoff)) {
    const immediate =
      relationship.kind === "collateral:sibling" ||
      (relationship.kind.startsWith("lineal:") &&
        !relationship.kind.includes("grand"));
    if (!immediate) continue;
    for (const other of relationship.personIds)
      if (other !== personId) ids.add(other);
  }
  for (const partnership of activePartnershipsAt(world, personId, cutoff))
    for (const other of partnership.personIds)
      if (other !== personId) ids.add(other);
  for (const membership of householdMembershipsAt(world, personId, cutoff))
    for (const other of peopleInHouseholdAt(
      world,
      membership.household.id,
      cutoff,
    ))
      if (other !== personId) ids.add(other);
  return [...ids]
    .filter(
      (id) =>
        !!world.people[id] &&
        world.people[id]!.birthDate <= world.currentDate &&
        isPersonAliveAt(world, id, cutoff),
    )
    .sort();
}

/** The course of an illness that ends in death on `diesOn`: no recovery step. */
export function fatalIllnessCourse(
  onsetAt: IsoDate,
  diesOn: IsoDate,
): readonly HealthCourseStep[] {
  const lead = daysBetween(onsetAt, diesOn);
  const turn = Math.floor(
    (lead * FATAL_ILLNESS_PROGNOSIS_AT.numerator) /
      FATAL_ILLNESS_PROGNOSIS_AT.denominator,
  );
  return turn >= 1 && turn < lead
    ? [
        {
          afterDays: turn,
          state: "prognosis-limited",
          functionalLimitation: "limited",
        },
      ]
    : [];
}

export const fatalIllnessOnsetHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const personId = item.entityIds[0];
  const diesOn = fatalIllnessDeathDay(item.stableKey);
  const cancelled = (context: string) => ({
    world,
    status: "cancelled" as const,
    reasonKey: "crisis:fatal-illness-superseded" as const,
    context,
    outcomeEventId: null,
  });
  if (!personId || !diesOn || !world.people[personId])
    return cancelled("The onset no longer names a person and a day.");
  if (
    !isPersonAliveAt(world, personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return cancelled("The person was no longer alive.");
  if (diesOn <= world.currentDate)
    return cancelled("No day was left before the death.");
  // The hazard must still reach the person on that day; a later hazard change
  // that moved it leaves no illness to begin.
  if (
    mortalityCrossingDay(
      world,
      personId,
      world.currentDate,
      addDays(diesOn, 1),
    ) !== diesOn
  )
    return cancelled("A later hazard change moved the death day.");
  if (
    activeHealthEpisodes(world, personId).some((episode) =>
      episode.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
    )
  )
    return cancelled("A fatal illness is already recorded.");
  const played =
    world.control.kind === "person" && world.control.personId === personId;
  const family = played ? [] : immediateFamilyOf(world, personId);
  const next = beginHealthEpisode(world, {
    stableKey: fatalIllnessEpisodeKey(personId, diesOn),
    personId,
    severity: "serious",
    initialLimitation: "limited",
    origin: {
      kind: "authored",
      note: `${CRISIS_PROVISIONAL_POLICY} fatal illness ahead of a K1 hazard death; PLACEHOLDER(research: causes-of-death-by-age)`,
    },
    causalParentIds: [item.id],
    initialAccess: family.length > 0 ? "specific-people" : "private",
    initialRecipientIds: family,
    course: fatalIllnessCourse(world.currentDate, diesOn),
  });
  const began = next.history.events.find(
    (event) =>
      event.stableKey ===
      `crisis:health:${fatalIllnessEpisodeKey(personId, diesOn)}:event`,
  );
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:fatal-illness-onset",
    context: played
      ? "Fell seriously ill; the played character decides whom to tell."
      : `Fell seriously ill; ${family.length} family members were told.`,
    outcomeEventId: began?.id ?? null,
  };
};
