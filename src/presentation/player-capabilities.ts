import {
  activeWorkRelationshipsAt,
  ageOnDate,
  formativeIntervalAt,
  lifePlaceByJurisdictionId,
} from "../simulation";
import type { EntityId, LifePlace, Person, World } from "../simulation";

/**
 * What this life can currently do.
 *
 * Surfaces appear because the world says the character has a reason to be
 * there. A ten-year-old is not handed a legislative office; an adult who works
 * in a warehouse is not handed one either; and a character in a place whose
 * legislature the game has no sourced rules for does not get another state's
 * procedure with the name swapped.
 *
 * Which legislature, specifically, comes from the job rather than the address.
 * People commute across a state line, and a staffer who moved house has not
 * changed which chamber their bills go to — reading the home jurisdiction and
 * calling it the workplace would quietly hand somebody the wrong legislature
 * and show them a rule pack that does not govern their work.
 */

export const LEGISLATIVE_WORK_PREFIX = "employment:legislative-";

export interface WithheldCapability {
  readonly surface: "office" | "legislation";
  /** Said plainly, because "nothing here" is worse than a reason. */
  readonly reason: string;
}

export interface PlayerCapabilities {
  readonly personId: EntityId;
  readonly person: Person;
  readonly age: number;
  /** Where the character lives. One input among several, never the override. */
  readonly homePlace: LifePlace | null;
  /**
   * The place whose rules this character's work actually runs under. Null when
   * they do not work anywhere the game has a surface for.
   */
  readonly workPlace: LifePlace | null;
  /**
   * Kept for the surfaces that only need "where is this life", which is the
   * workplace when there is one and home otherwise.
   */
  readonly place: LifePlace | null;
  /** True when the job sits in a different jurisdiction from the home address. */
  readonly commutes: boolean;
  /** The character is young enough that the formative years are still running. */
  readonly formativeYears: boolean;
  /**
   * The character works somewhere the game has a workplace surface for. Today
   * that means a legislative office and nothing else — an ordinary job is real
   * in the world record, but there is no room built for it yet, and inventing
   * one would be worse than saying so.
   */
  readonly office: boolean;
  /** The office is legislative and the place has an accepted rule pack. */
  readonly legislation: boolean;
  readonly legislativeScenarioKey: string | null;
  /** The jurisdiction the legislative surface is answerable to, when there is one. */
  readonly legislativeJurisdictionId: EntityId | null;
  readonly withheld: readonly WithheldCapability[];
}

export function resolvePlayerCapabilities(world: World): PlayerCapabilities {
  if (world.control.kind !== "person") {
    throw new Error("This world has no character for the player to be.");
  }
  const personId = world.control.personId;
  const person = world.people[personId];
  if (!person) {
    throw new Error("The character the player controls is missing.");
  }
  const age = ageOnDate(person.birthDate, world.currentDate);
  const homePlace = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const formativeYears = formativeIntervalAt(world, personId) !== null;

  const work = activeWorkRelationshipsAt(world, personId);
  const legislativeWork = work.find((entry) =>
    entry.relationship.kind.startsWith(LEGISLATIVE_WORK_PREFIX),
  );
  const office = legislativeWork !== undefined;

  // The role says where the work happens. Only when it does not is the home
  // address used, and then as a fallback rather than an assumption.
  const workJurisdictionId =
    legislativeWork?.role.locationJurisdictionId ?? null;
  const workPlace =
    workJurisdictionId === null
      ? office
        ? homePlace
        : null
      : lifePlaceByJurisdictionId(workJurisdictionId);
  const commutes =
    workJurisdictionId !== null &&
    workJurisdictionId !== person.homeJurisdictionId;

  const scenarioKey = workPlace?.capabilities.legislativeScenarioKey ?? null;
  const legislation = office && scenarioKey !== null;

  const withheld: WithheldCapability[] = [];
  if (!office) {
    withheld.push({
      surface: "office",
      reason: formativeYears
        ? "There is no job yet. These are still the growing-up years."
        : work.length > 0
          ? "This character works, but not anywhere the game has a room for yet."
          : "This character does not work anywhere the game can show.",
    });
  }
  if (!legislation) {
    withheld.push({
      surface: "legislation",
      reason:
        legislativeWork === undefined
          ? "This character does not work in a legislature."
          : workPlace === null
            ? "Where this job sits is not a place the game has laws for, so it will not guess at whose rules apply."
            : `Nobody has written down how ${workPlace.displayName} makes its laws, and the game will not guess by copying another state.`,
    });
  }

  return {
    personId,
    person,
    age,
    homePlace,
    workPlace,
    place: workPlace ?? homePlace,
    commutes,
    formativeYears,
    office,
    legislation,
    legislativeScenarioKey: legislation ? scenarioKey : null,
    legislativeJurisdictionId:
      legislation && workPlace ? workPlace.context.jurisdiction.id : null,
    withheld,
  };
}

export function withheldReason(
  capabilities: PlayerCapabilities,
  surface: WithheldCapability["surface"],
): string | null {
  return (
    capabilities.withheld.find((entry) => entry.surface === surface)?.reason ??
    null
  );
}
