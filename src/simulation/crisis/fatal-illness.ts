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
  FATAL_ILLNESS_PROGNOSIS_AT,
  fatalIllnessEpisodeKey,
  remainingDaysAfterOnset,
} from "./death-causes";
import { MULTIPLIER_ONE } from "./hazard";
import { beginHealthEpisode } from "./health";
import {
  mortalityExposureStarts,
  scheduleStrainDeath,
  seriousStrainEpisode,
  strainCrossingDay,
  strainDrivers,
} from "./mortality";
import { CRISIS_PROVISIONAL_POLICY, type HealthCourseStep } from "./types";

/**
 * The serious episode a K1 death follows (Ruling 29).
 *
 * On the day a person's recorded strain crosses the one threshold they fall
 * seriously ill: a health episode begins through the ordinary K2 writer,
 * citing the records that drove the strain, and the household and immediate
 * family are told through its ordinary disclosure recipients. The episode
 * carries its remaining days, from the person's age, the recorded conditions
 * multiplying their strain and their coverage, and the death is put on the
 * clock for the day they run out.
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
  const today = world.currentDate;
  const cancelled = (context: string) => ({
    world,
    status: "cancelled" as const,
    reasonKey: "crisis:fatal-illness-superseded" as const,
    context,
    outcomeEventId: null,
  });
  if (!personId || !world.people[personId])
    return cancelled("The onset no longer names a person.");
  if (
    !isPersonAliveAt(world, personId, {
      asOfDate: today,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return cancelled("The person was no longer alive.");
  if (seriousStrainEpisode(world, personId))
    return cancelled("A serious episode is already running its course.");
  // The strain must have reached the threshold by the end of today under the
  // records as they stand; a later change that moved the day begins nothing.
  const exposed = mortalityExposureStarts(world).get(personId);
  if (
    !exposed ||
    strainCrossingDay(world, personId, exposed, addDays(today, 1)) === null
  )
    return cancelled("A later record change moved the day the strain crosses.");
  const person = world.people[personId]!;
  const drivers = strainDrivers(world, personId, today);
  const diesOn = addDays(
    today,
    remainingDaysAfterOnset({
      age: daysBetween(person.birthDate, today) / 365.25,
      severity: drivers.multiplierMicros / MULTIPLIER_ONE,
      covered: drivers.coverage?.covered ?? null,
    }),
  );
  const coverageDrove =
    drivers.coverage &&
    drivers.coverage.hazardMultiplierMicros !== MULTIPLIER_ONE
      ? [drivers.coverage.id]
      : [];
  const played =
    world.control.kind === "person" && world.control.personId === personId;
  const family = played ? [] : immediateFamilyOf(world, personId);
  const stableKey = fatalIllnessEpisodeKey(personId, diesOn);
  let next = beginHealthEpisode(world, {
    stableKey,
    personId,
    severity: "serious",
    initialLimitation: "limited",
    origin: {
      kind: "authored",
      note: `${CRISIS_PROVISIONAL_POLICY} serious episode on the day recorded strain crossed the threshold (Ruling 29); remaining days recorded crisis-duration rule`,
    },
    causalParentIds: [item.id, ...drivers.conditionIds, ...coverageDrove],
    initialAccess: family.length > 0 ? "specific-people" : "private",
    initialRecipientIds: family,
    course: fatalIllnessCourse(today, diesOn),
  });
  const episode = seriousStrainEpisode(next, personId)!;
  next = scheduleStrainDeath(next, personId, diesOn, episode.id);
  const began = next.history.events.find(
    (event) => event.stableKey === `crisis:health:${stableKey}:event`,
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
