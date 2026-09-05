import {
  describePersonContext,
  householdMembershipsAt,
  introducePerson,
  peopleInHouseholdAt,
  personName,
  type EntityId,
  type World,
} from "../simulation";

/**
 * Who the game says your family is, before you play a day of it.
 *
 * Packet 77 made a normal start GENERATE the parents, the household and the
 * background, which raises the obvious question the second playtest already
 * had about "Maya Pittman": who are these people. The answer has to be given
 * before ordinary play begins, and it has to be given from the records the
 * generator actually wrote.
 *
 * WHAT THIS MAY SAY. Only what a canonical record establishes: that somebody
 * shares this household, what relationship the authority or kinship records
 * put them in, and where the household is on record as living. Every line is
 * traceable to a record id.
 *
 * WHAT THIS MAY NEVER SAY. Anything read off a name, an age or a picture. No
 * invented occupation, no invented history, no adjective the world does not
 * hold. If the records are thin the introduction is short, and a short
 * introduction is the correct output rather than a gap to be filled with
 * prose.
 */

export interface IntroducedPerson {
  readonly personId: EntityId;
  /** "Ella Spears, your mom" — or the bare name when no record says more. */
  readonly introduction: string;
  /** The relationship alone, when there is one. */
  readonly relationship: string | null;
  /** The record that established it. Developer-facing. */
  readonly basis: string;
}

export interface LifeIntroduction {
  readonly personName: string;
  readonly age: number;
  /** "Lexington, Kentucky" — from the household's location record. */
  readonly placeName: string | null;
  /** Everybody else on the household record, in record order. */
  readonly household: readonly IntroducedPerson[];
  /** One or two sentences, built from the above and nothing else. */
  readonly sentences: readonly string[];
}

function ageOn(birthDate: string, on: string): number {
  const born = new Date(`${birthDate}T00:00:00Z`);
  const now = new Date(`${on}T00:00:00Z`);
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  const month = now.getUTCMonth() - born.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < born.getUTCDate())) {
    years -= 1;
  }
  return years;
}

/**
 * Builds the introduction, or returns null when there is nothing to introduce.
 *
 * Null is a real answer: a character with no household on record has no family
 * for the game to explain, and inventing one to fill the screen is the failure
 * this module exists to prevent.
 */
export function buildLifeIntroduction(
  world: World,
  personId: EntityId,
): LifeIntroduction | null {
  const player = world.people[personId];
  if (!player) return null;
  const memberships = householdMembershipsAt(world, personId);
  const primary =
    memberships.find((entry) => entry.state.residenceRole === "primary") ??
    memberships[0];
  if (!primary) return null;

  const others = peopleInHouseholdAt(world, primary.household.id)
    .filter((id) => id !== personId)
    .flatMap((id) => {
      const context = describePersonContext(world, personId, id);
      if (!context) return [];
      return [
        {
          personId: id,
          introduction: introducePerson(context),
          relationship: context.relationship,
          basis: context.basis,
        } satisfies IntroducedPerson,
      ];
    });

  const placeName = primary.location?.label ?? null;
  const age = ageOn(player.birthDate, world.currentDate);
  const name = personName(player);

  const sentences: string[] = [];
  sentences.push(
    placeName
      ? `${name} is ${age}, and lives in ${placeName}.`
      : `${name} is ${age}.`,
  );
  if (others.length === 0) {
    sentences.push("Nobody else is on the household record.");
  } else {
    // One line each rather than a joined list. An introduction already carries
    // a comma — "Dakota Romero, your mom" — so joining two of them with
    // another comma produces a sentence a reader has to parse twice.
    sentences.push(others.length === 1 ? "At home:" : "At home with them:");
    for (const person of others) sentences.push(person.introduction);
  }

  return { personName: name, age, placeName, household: others, sentences };
}
