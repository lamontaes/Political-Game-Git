import { ageOnDate } from "../dates";
import type { EntityId, World } from "../types";
import { stateJurisdictionForKey } from "../life-places";
import { activeWorkRelationshipsAt } from "../life-queries";
import { playerOfficeScope } from "../governing/office-consequence";
import { mediaOutlets } from "../press/outlets";
import { personTrait } from "../people-traits";
import { homeStateUsps } from "../nationwide-world/state-executives";
import { mediaOutletKey } from "../press/records";
import { SYNTHETIC_MIND_IDS } from "../mind-catalog";
import { latestPersonalityTendency } from "../queries";

export interface NewsHabit {
  readonly personId: EntityId;
  readonly age: number;
  readonly interests: readonly string[];
  readonly temperament: readonly string[];
  readonly job: string | null;
  readonly outletKeys: readonly string[];
  readonly followsClosely: boolean;
}

/** Reads the news outlets a person can follow from their life and offices. */
export function newsHabitOf(world: World, personId: EntityId): NewsHabit {
  const person = world.people[personId];
  if (!person)
    return {
      personId,
      age: 0,
      interests: [],
      temperament: [],
      job: null,
      outletKeys: [],
      followsClosely: false,
    };
  const age = ageOnDate(person.birthDate, world.currentDate);
  const work = activeWorkRelationshipsAt(world, personId);
  const job =
    work
      .map((entry) => entry.role.occupationClassification ?? entry.role.title)
      .sort()[0] ?? null;
  const interests = [
    ...new Set(
      work.flatMap((entry) => {
        const text =
          `${entry.role.title} ${entry.role.occupationClassification ?? ""}`.toLowerCase();
        return [
          "business",
          "education",
          "government",
          "health",
          "law",
          "labor",
          "transportation",
        ].filter((interest) => text.includes(interest));
      }),
    ),
  ].sort();
  const temperament = [
    personTrait(world, personId, "deliberation").label,
    personTrait(world, personId, "sociability").label,
    personTrait(world, personId, "reliability").label,
  ].filter((value): value is string => value !== null);
  const officeScopes = playerOfficeScope(world, personId);
  const homeUsps = homeStateUsps(world, personId);
  const stateKey = homeUsps ? `US-${homeUsps}` : null;
  const homeState = stateKey ? stateJurisdictionForKey(stateKey) : null;
  const followedJurisdictions = new Set<EntityId>([
    person.homeJurisdictionId,
    ...(homeState ? [homeState.id] : []),
    ...officeScopes.map((office) => office.jurisdictionId),
  ]);
  const outletKeys = mediaOutlets(world)
    .filter(
      (outlet) =>
        outlet.scope === "national" ||
        outlet.primaryJurisdictionIds.some((id) =>
          followedJurisdictions.has(id),
        ),
    )
    .map((outlet) => mediaOutletKey(outlet.id))
    .sort();
  const curiosity = latestPersonalityTendency(
    world,
    personId,
    SYNTHETIC_MIND_IDS.tendencies.curiosity,
  )?.expressionKey;
  return {
    personId,
    age,
    interests,
    temperament,
    job,
    outletKeys,
    followsClosely: curiosity === "curious" || (age >= 65 && work.length === 0),
  };
}

export function followsNewsCloselyFromHabit(
  world: World,
  personId: EntityId,
): boolean {
  return newsHabitOf(world, personId).followsClosely;
}
