import {
  describePersonContext,
  educationEnrollmentHistoryForPerson,
  householdMembershipsAt,
  introducePerson,
  kinshipRelationshipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  personName,
  workRelationshipHistoryForPerson,
  workStatusAt,
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

/**
 * One fact about the life that happened before the player arrived in it.
 *
 * Each is read off a record and carries the id of the record it came from, so
 * a line on the screen can always be traced back to the thing that established
 * it. A life with thin records produces few of these, and few is correct.
 */
export interface LifeGroundingFact {
  readonly kind: "family" | "education" | "work";
  readonly text: string;
  /** The record that established it. Developer-facing. */
  readonly basis: EntityId;
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
  /**
   * What the generator actually wrote down about this life before play began:
   * who raised them, where they were schooled, what they have done for a
   * living. Empty when the records hold none of it.
   *
   * This exists because the opening used to say only "You are 34, and you live
   * in Lexington, Kentucky" — two facts the player had just typed in — and
   * then went straight to a decision. The records held a childhood household,
   * two schools and two jobs the whole time; none of it reached the screen.
   */
  readonly grounding: readonly LifeGroundingFact[];
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

const PROGRAM_LABELS: Readonly<Record<string, string>> = {
  "schooling:elementary": "elementary school",
  "schooling:secondary": "high school",
  "schooling:tertiary": "college",
};

/** An organization's name at the current cutoff, or null when unnamed. */
function organizationName(
  world: World,
  organizationId: EntityId,
): string | null {
  return organizationProfileAt(world, organizationId)?.name ?? null;
}

function yearOf(date: string): string {
  return date.slice(0, 4);
}

/**
 * What the records say happened before today, as short readable lines.
 *
 * Strictly a projection. Every line needs a record; a school with no name
 * profile, or a work relationship whose organization was never named, is
 * skipped rather than described as "somewhere". Nothing here reaches for an
 * adjective, a motive or a reason — those are not in the records, and #99 owns
 * how any of this eventually reads, not whether it is true.
 */
function buildGrounding(
  world: World,
  personId: EntityId,
  household: readonly IntroducedPerson[],
): readonly LifeGroundingFact[] {
  const facts: LifeGroundingFact[] = [];

  // Who the record says they are related to, read from the kinship records
  // rather than from who happens to share an address today. A parent a
  // thirty-four-year-old moved out from years ago is still their parent, and
  // that is exactly the relationship the opening was dropping.
  const alreadyNamed = new Set(household.map((person) => person.personId));
  for (const kinship of kinshipRelationshipsAt(world, personId)) {
    for (const otherId of kinship.personIds) {
      if (otherId === personId || alreadyNamed.has(otherId)) continue;
      const context = describePersonContext(world, personId, otherId);
      if (!context?.relationship) continue;
      alreadyNamed.add(otherId);
      facts.push({
        kind: "family",
        text: `You were raised by ${introducePerson(context)}.`,
        basis: kinship.id,
      });
    }
  }

  for (const enrollment of educationEnrollmentHistoryForPerson(
    world,
    personId,
  )) {
    const name = organizationName(world, enrollment.organizationId);
    const label = PROGRAM_LABELS[enrollment.programKind];
    if (name === null || label === undefined) continue;
    facts.push({
      kind: "education",
      text: `You started ${label} at ${name} in ${yearOf(enrollment.startedAt)}.`,
      basis: enrollment.id,
    });
  }

  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    // Work with no organization on the record is real — somebody working for
    // themselves — and there is no name to put in a sentence, so it is left
    // out rather than described as working "somewhere".
    if (work.organizationId === null) continue;
    const name = organizationName(world, work.organizationId);
    if (name === null) continue;
    const ended = workStatusAt(world, work.id)?.status === "ended";
    facts.push({
      kind: "work",
      text: ended
        ? `You worked at ${name} from ${yearOf(work.startedAt)}.`
        : `You work at ${name}, and have since ${yearOf(work.startedAt)}.`,
      basis: work.id,
    });
  }

  return facts;
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
  // Second person, addressed to the player, so the introduction reads like
  // meeting your own life rather than a record about a stranger (Task §5/§6).
  sentences.push(
    placeName
      ? `You're ${age}, and you live in ${placeName}.`
      : `You're ${age}.`,
  );
  if (others.length === 0) {
    sentences.push("You live on your own.");
  } else {
    // One line each rather than a joined list. An introduction already carries
    // a comma — "Dakota Romero, your mom" — so joining two of them with
    // another comma produces a sentence a reader has to parse twice.
    sentences.push("At home with you:");
    for (const person of others) sentences.push(person.introduction);
  }

  return {
    personName: name,
    age,
    placeName,
    household: others,
    sentences,
    grounding: buildGrounding(world, personId, others),
  };
}
