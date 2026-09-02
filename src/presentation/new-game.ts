import {
  applyCharacterHistoryPlan,
  assertWorldIntegrity,
  createGeneratedWorld,
  createOrganization,
  createWorkRelationship,
  addDays,
  ageOnDate,
  generateQuickCharacterHistory,
  isoDateFromParts,
  lifePlaceByKey,
  makeIsoDate,
  requireLifePlace,
  yearOf,
} from "../simulation";
import type {
  CharacterHistoryTransition,
  EntityId,
  HouseholdMembership,
  HouseholdMembershipStateRecord,
  IsoDate,
  LifePlace,
  Person,
  PersonFact,
  World,
} from "../simulation";

/**
 * Starting a life.
 *
 * The setup screen asks for as little as the world builder actually needs:
 * where the life begins, how old the character is when the player picks them
 * up, how much of the earlier life is played rather than summarized, and
 * whether the character already works somewhere the game has rules for.
 *
 * Nothing here invents biography. A name the player leaves blank is generated;
 * an age is a starting point, not a claim about anyone real; and a place is
 * only offered when the accepted data can put a life in it.
 */

export type NewGameDepth = "play-formative-years" | "summarize-earlier-life";

/**
 * What the character is doing when play begins. This is the capability gate:
 * the office and legislation surfaces exist because the world says the person
 * works there, not because the game has nowhere else to put them.
 */
export type NewGameStartingLife = "ordinary-life" | "legislative-office";

export interface NewGameSetup {
  readonly placeKey: string;
  readonly startAge: number;
  readonly depth: NewGameDepth;
  readonly startingLife: NewGameStartingLife;
  readonly seed: string;
  /** Blank means "generate one" rather than "leave it empty". */
  readonly givenName: string | null;
  readonly familyName: string | null;
}

export interface NewGame {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly place: LifePlace;
  readonly setup: NewGameSetup;
}

export const MINIMUM_START_AGE = 5;
export const MAXIMUM_START_AGE = 70;
/** Below this the legislative office is not offered, and not silently granted. */
export const LEGISLATIVE_OFFICE_MINIMUM_AGE = 21;

export const DEFAULT_NEW_GAME_SETUP: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 10,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  givenName: null,
  familyName: null,
};

export interface NewGameSetupProblem {
  readonly field: keyof NewGameSetup;
  readonly message: string;
}

/** Rejects a setup the world cannot honestly build, and says why in plain words. */
export function newGameSetupProblems(
  setup: NewGameSetup,
): readonly NewGameSetupProblem[] {
  const problems: NewGameSetupProblem[] = [];
  const place = lifePlaceByKey(setup.placeKey);
  if (!place) {
    problems.push({
      field: "placeKey",
      message: "Choose a place the game can start a life in.",
    });
  }
  if (
    !Number.isSafeInteger(setup.startAge) ||
    setup.startAge < MINIMUM_START_AGE ||
    setup.startAge > MAXIMUM_START_AGE
  ) {
    problems.push({
      field: "startAge",
      message: `Choose a starting age between ${MINIMUM_START_AGE} and ${MAXIMUM_START_AGE}.`,
    });
  }
  if (setup.startingLife === "legislative-office") {
    if (setup.startAge < LEGISLATIVE_OFFICE_MINIMUM_AGE) {
      problems.push({
        field: "startingLife",
        message: `A legislative office job needs a character of at least ${LEGISLATIVE_OFFICE_MINIMUM_AGE}.`,
      });
    }
    if (place && place.capabilities.legislativeScenarioKey === null) {
      problems.push({
        field: "startingLife",
        message: `The game has no legislative procedure for ${place.displayName} yet, so it cannot put a character to work in one there.`,
      });
    }
  }
  if (setup.seed.trim().length === 0) {
    problems.push({ field: "seed", message: "A world needs a seed." });
  }
  return problems;
}

/** True when the formative years are actually reachable from this setup. */
export function playsFormativeYears(setup: NewGameSetup): boolean {
  return setup.depth === "play-formative-years" && setup.startAge < 18;
}

export function createNewGameWorld(setup: NewGameSetup): NewGame {
  const problems = newGameSetupProblems(setup);
  if (problems.length > 0) {
    throw new Error(problems[0]!.message);
  }
  const place = requireLifePlace(setup.placeKey);
  let world = createGeneratedWorld(setup.seed, { context: place.context });
  const playerPersonId = world.personOrder[0];
  if (!playerPersonId) {
    throw new Error("A new world was created without anyone in it.");
  }
  const generated = world.people[playerPersonId];
  if (!generated) {
    throw new Error("A new world lost the person it just generated.");
  }

  const player = withStartingIdentity(generated, world.currentDate, setup);
  world = { ...world, people: { ...world.people, [playerPersonId]: player } };

  // Earlier life is written before the player takes the character over. The
  // world refuses to let generated history make a major mind change for a
  // person under player control, and it is right to: what the character became
  // before play began is background, not a choice anyone made at the keyboard.
  if (setup.depth === "summarize-earlier-life") {
    world = summarizeEarlierLife(
      world,
      playerPersonId,
      place.context.jurisdiction.id,
    );
  }

  if (setup.startingLife === "legislative-office") {
    world = employInLegislativeOffice(world, playerPersonId, place);
  }

  world = { ...world, control: { kind: "person", personId: playerPersonId } };
  assertWorldIntegrity(world);
  return { world, playerPersonId, place, setup };
}

/**
 * Applies the player's setup choices to the generated person.
 *
 * The generator picks a plausible adult; the setup says how old this character
 * is and, if the player typed one, what they are called. The birth-date and
 * birthplace facts are rewritten with it so the record never disagrees with
 * itself.
 */
function withStartingIdentity(
  person: Person,
  currentDate: IsoDate,
  setup: NewGameSetup,
): Person {
  const givenName = setup.givenName?.trim() || person.givenName;
  const familyName = setup.familyName?.trim() || person.familyName;
  const birthDate = birthDateForAge(
    person.birthDate,
    currentDate,
    setup.startAge,
  );
  const fullName = `${givenName} ${familyName}`;
  const establishedFacts: readonly PersonFact[] = person.establishedFacts.map(
    (fact): PersonFact => {
      if (fact.stableKey === "birth-date") {
        return {
          ...fact,
          occurredAt: birthDate,
          summary: `${fullName}'s birth date is established as ${birthDate}.`,
        };
      }
      if (fact.stableKey === "birthplace") {
        return {
          ...fact,
          occurredAt: birthDate,
          summary: `${fullName}'s birthplace is established in the world record.`,
        };
      }
      if (fact.stableKey === "residence:initial") {
        return {
          ...fact,
          summary: `${fullName} resides in the recorded home jurisdiction.`,
        };
      }
      return fact;
    },
  );
  return { ...person, givenName, familyName, birthDate, establishedFacts };
}

/** Keeps the generated day and month so two ages of the same person still differ. */
function birthDateForAge(
  generatedBirthDate: IsoDate,
  currentDate: IsoDate,
  startAge: number,
): IsoDate {
  const [, month, day] = generatedBirthDate.split("-").map(Number);
  const safeMonth = month && month >= 1 && month <= 12 ? month : 6;
  const safeDay = day && day >= 1 && day <= 28 ? day : 15;
  const candidate = isoDateFromParts(
    yearOf(currentDate) - startAge,
    safeMonth,
    safeDay,
  );
  // A birthday later in the year than today has not happened yet, which would
  // leave the character a year younger than the player asked for.
  return ageOnDate(candidate, currentDate) === startAge
    ? candidate
    : isoDateFromParts(yearOf(currentDate) - startAge - 1, safeMonth, safeDay);
}

/**
 * Writes the years before play as canonical history instead of leaving them
 * blank.
 *
 * The generated world already puts the character in a household as of today.
 * A childhood home that runs from birth to now would mean living in two places
 * at once, which the world will not accept — so this records the move as a
 * move: the current household is closed while the childhood one is written,
 * the childhood one ends the day before play begins, and the character then
 * moves into the household they are in today.
 */
function summarizeEarlierLife(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
): World {
  const stableKey = `new-game:${personId}:earlier-life`;
  const provenance = {
    kind: "generated" as const,
    generatorKey: `new-game-earlier-life-v1:${personId}`,
  };
  const current = latestHouseholdMembership(world, personId);
  const movedOutOn = addDays(world.currentDate, -1);

  let next = world;
  if (current) {
    next = applyCharacterHistoryPlan(next, {
      stableKey: `${stableKey}:set-aside-current-home`,
      mode: "quick-generated",
      personId,
      transitions: [
        {
          kind: "household-membership-state",
          input: {
            stableKey: `${stableKey}:current-home:set-aside`,
            membershipStableKey: current.membership.stableKey,
            effectiveAt: world.currentDate,
            status: "ended",
            residenceRole: current.state.residenceRole,
            kind: current.state.kind,
            provenance,
          },
        },
      ],
    }).world;
  }

  next = applyCharacterHistoryPlan(
    next,
    generateQuickCharacterHistory(next, {
      stableKey,
      personId,
      jurisdictionId,
    }),
  ).world;

  const transitions: CharacterHistoryTransition[] = [
    {
      kind: "household-membership-state",
      input: {
        stableKey: `${stableKey}:childhood-home:ended`,
        membershipStableKey: `${stableKey}:household:child`,
        effectiveAt: movedOutOn,
        status: "ended",
        residenceRole: "primary",
        kind: "resident:child",
        provenance,
      },
    },
  ];
  if (current) {
    transitions.push({
      kind: "household-membership",
      input: {
        stableKey: `${stableKey}:moved-in`,
        personId,
        householdId: current.membership.householdId,
        startedAt: world.currentDate,
        residenceRole: current.state.residenceRole,
        kind: current.state.kind,
        provenance,
      },
    });
  }
  return applyCharacterHistoryPlan(next, {
    stableKey: `${stableKey}:left-home`,
    mode: "quick-generated",
    personId,
    transitions,
  }).world;
}

/** The household the character lives in today, with the terms it is held on. */
function latestHouseholdMembership(
  world: World,
  personId: EntityId,
): {
  readonly membership: HouseholdMembership;
  readonly state: HouseholdMembershipStateRecord;
} | null {
  const memberships = world.history.householdMemberships.filter(
    (membership) => membership.personId === personId,
  );
  const membership = memberships[memberships.length - 1];
  if (!membership) return null;
  const states = world.history.householdMembershipStates.filter(
    (state) => state.membershipId === membership.id,
  );
  const state = states[states.length - 1];
  return state ? { membership, state } : null;
}

const OFFICE_HOURS = {
  expectedWeekly: { minimumHours: 35, maximumHours: 45 },
  attention: "high",
  concurrency: "partly-concurrent",
  scheduleRigidity: "mixed",
  interruptibility: "interruptible",
} as const;

/**
 * Puts the character on a legislative office staff. This is what makes the
 * office and legislation surfaces appear later: they read the work record, not
 * a flag someone set on the way past.
 */
function employInLegislativeOffice(
  world: World,
  personId: EntityId,
  place: LifePlace,
): World {
  const jurisdictionId = place.context.jurisdiction.id;
  const startedAt = makeIsoDate(world.currentDate);
  const provenance = {
    kind: "generated" as const,
    generatorKey: `new-game-office-v1:${place.key}`,
  };
  let next = createOrganization(world, {
    stableKey: `new-game:${place.key}:legislative-office`,
    formedAt: startedAt,
    provenance,
    initialProfile: {
      name: `${place.displayName} legislative office`,
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organization = next.history.organizations.at(-1);
  if (!organization) {
    throw new Error("The legislative office was not recorded.");
  }
  next = createWorkRelationship(next, {
    stableKey: `new-game:${personId}:legislative-staff`,
    personId,
    organizationId: organization.id,
    startedAt,
    kind: "employment:legislative-staff",
    compensation: "paid",
    authority: "shared",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Legislative staff",
      occupationClassification: "occupation:legislative-staff",
      locationJurisdictionId: jurisdictionId,
      timeDemand: { ...OFFICE_HOURS, locationJurisdictionId: jurisdictionId },
    },
  });
  return next;
}
