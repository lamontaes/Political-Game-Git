import {
  applyCharacterHistoryPlan,
  assertWorldIntegrity,
  addDays,
  ageOnDate,
  characterHistoryContextPersonId,
  createStartingPerson,
  createStableId,
  createWorld,
  createWorldId,
  dateAtAge,
  drawCanonicalName,
  generateQuickCharacterHistory,
  personName,
  recordWorldEvent,
  SeededRng,
} from "../simulation";
import type {
  CharacterHistoryTransition,
  EntityId,
  IsoDate,
  LifePlace,
  Person,
  World,
} from "../simulation";

/**
 * Building the world a new game actually happens in.
 *
 * The old path made a developer fixture and renamed the person inside it. That
 * is why a five-year-old could turn up holding a staff salary, a campaign
 * pledge and a public position on drug pricing: none of it was ever decided,
 * it was inherited from a diagnostic scaffold that happened to be the only
 * world constructor in reach.
 *
 * This one builds from first principles instead, and the ordering below is the
 * architecture rather than an implementation detail:
 *
 *   1. infrastructure every valid world needs — a clock, a jurisdiction, an id;
 *   2. the person the player chose, named and dated correctly from creation;
 *   3. state that follows from the character's age, and only their age;
 *   4. role and career facts, and only where a setup choice justifies them;
 *   5. nothing else. A gap stays a gap.
 *
 * Nothing here imports a demo or scenario constructor, and a test enforces
 * that. What is not established by one of those four steps is not in the world,
 * and the record says UNKNOWN rather than guessing.
 */

/** What the character is doing when play begins, from the setup screen. */
export type ProductionStartingLife = "ordinary-life" | "legislative-office";

/** How much of the life before play is written down rather than played. */
export type ProductionDepth = "play-formative-years" | "summarize-earlier-life";

/** Whether an adult's household has anybody else in it. Asked, never guessed. */
export type ProductionHousehold = "lives-alone" | "shares-a-home";

export interface ProductionWorldInput {
  /** The full world seed, already derived from the player's setup. */
  readonly seed: string;
  readonly place: LifePlace;
  readonly age: number;
  readonly givenName: string | null;
  readonly familyName: string | null;
  readonly startingLife: ProductionStartingLife;
  readonly depth: ProductionDepth;
  readonly household: ProductionHousehold;
}

export interface ProductionWorld {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly player: Person;
}

/** Below this a character lives in someone else's household by default. */
export const DEPENDENT_AGE_CEILING = 18;
/** The age the game assumes ordinary schooling has begun by. */
const SCHOOL_ENTRY_AGE = 5;

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "production-world-v1",
};

export function buildProductionWorld(
  input: ProductionWorldInput,
): ProductionWorld {
  const place = input.place;
  const jurisdiction = place.context.jurisdiction;
  const currentDate = place.context.initialMoment.date as IsoDate;
  const worldId = createWorldId(input.seed, "production");

  // Step 2 before step 1 in code, because a world is created with its people:
  // the person is built with the identity the player asked for so that no
  // later pass has to correct the record of their own creation.
  const player = createStartingPerson({
    worldId,
    worldSeed: input.seed,
    currentDate,
    homeJurisdictionId: jurisdiction.id,
    age: input.age,
    givenName: input.givenName,
    familyName: input.familyName,
  });

  // The world is assembled before anybody is playing it. Generated background
  // is not allowed to make a major mind change for the person under player
  // control, which is the right rule: what a character became before play began
  // is background, not a decision anyone made at the keyboard. So control is
  // handed over once the background is written, not before.
  let world = createWorld({
    seed: input.seed,
    // Declared, not defaulted. The lineage decides the world's id namespace,
    // its generator stamp and the catalogs it starts with, so a player's save
    // can no longer be mistaken for — or built out of — a diagnostic fixture.
    lineage: "production",
    currentDate,
    currentMoment: place.context.initialMoment,
    jurisdictions: [jurisdiction],
    people: [player],
  });

  world = recordCreation(world, player, place, input);
  world = establishAgeEligibleState(
    world,
    player,
    place,
    input.depth,
    input.household,
  );
  if (input.startingLife === "legislative-office") {
    world = employInLegislativeOffice(world, player.id, place);
  }

  world = { ...world, control: { kind: "person", personId: player.id } };
  assertWorldIntegrity(world);
  return { world, playerPersonId: player.id, player };
}

/**
 * The world's own creation event, written about the person who exists rather
 * than about a generated placeholder that was overwritten a moment later.
 */
function recordCreation(
  world: World,
  player: Person,
  place: LifePlace,
  input: ProductionWorldInput,
): World {
  const name = personName(player);
  const age = ageOnDate(player.birthDate, world.currentDate);
  return recordWorldEvent(world, {
    stableKey: "production:world-created",
    type: "world.created",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: place.context.jurisdiction.id,
    involvedEntityIds: [place.context.jurisdiction.id, player.id],
    participants: [
      {
        personId: player.id,
        role: "focus:subject",
        detail: "The character this life follows",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["world.created", "life.started"],
    summary: `${name} is ${age}, and lives in ${place.displayName}. This is where their life is picked up.`,
    context: {
      location: {
        jurisdictionId: place.context.jurisdiction.id,
        label: place.displayName,
        setting:
          input.startingLife === "legislative-office"
            ? "The start of a working life"
            : "The start of a life",
      },
      socialContext:
        age < DEPENDENT_AGE_CEILING
          ? "A childhood already under way, in a household the character did not choose."
          : "An ordinary adult life already under way.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * What follows from an age, and nothing more.
 *
 * A child lives with someone: that is not a career, a politics or a
 * personality, it is the fact that eight-year-olds do not hold their own
 * leases. So a child gets a household, a guardian, the authority record that
 * makes the guardian's position canonical, and — once they are old enough for
 * it — a school. An adult gets a household of their own.
 *
 * Nobody gets a job here. Nobody gets an opinion. Those come from a setup
 * choice or from play, or they do not exist.
 */
function establishAgeEligibleState(
  world: World,
  player: Person,
  place: LifePlace,
  depth: ProductionDepth,
  household: ProductionHousehold,
): World {
  const jurisdictionId = place.context.jurisdiction.id;
  const age = ageOnDate(player.birthDate, world.currentDate);
  const dependent = age < DEPENDENT_AGE_CEILING;
  const stableKey = "production:initial-life";
  const householdKey = `${stableKey}:household`;
  const householdId = householdIdFor(world.id, householdKey);
  const rng = new SeededRng(world.seed).fork("production-world-v1:household");

  const transitions: CharacterHistoryTransition[] = [
    {
      kind: "household",
      input: {
        stableKey: householdKey,
        formedAt: world.currentDate,
        label: dependent
          ? `${player.familyName} household`
          : `${personName(player)}'s household`,
        provenance: PROVENANCE,
      },
    },
    {
      kind: "household-location",
      input: {
        stableKey: `${householdKey}:location`,
        householdStableKey: householdKey,
        effectiveAt: world.currentDate,
        jurisdictionId,
        label: place.displayName,
        kind: "residence:home",
        provenance: PROVENANCE,
      },
    },
  ];

  if (!dependent) {
    // An adult gets their earlier life written down whichever depth was
    // chosen, because for an adult there is nothing left to play: the depth
    // option decides whether a *child* plays their formative years, and
    // honouring it literally here left a thirty-six-year-old alone in an
    // otherwise empty world, with no history and nobody to talk to.
    //
    // The childhood comes first, so the household they live in today is the
    // one they moved into rather than the only one they have ever had. Living
    // in two primary residences at once is not something the world will
    // accept, and it should not: that would be a false biography, not a
    // bookkeeping quirk.
    void depth;
    const withEarlierLife = summarizeEarlierLife(world, player, jurisdictionId);
    transitions.push({
      kind: "household-membership",
      input: {
        stableKey: `${stableKey}:membership:player`,
        personId: player.id,
        householdId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance: PROVENANCE,
      },
    });

    if (household === "shares-a-home") {
      // Somebody the player said was there. Their name comes from the corpus
      // and their age from the same adult range as anyone else's; the world is
      // not claiming anything else about who they are to each other.
      const otherKey = `${stableKey}:housemate`;
      const otherName = drawCanonicalName(rng);
      transitions.push(
        {
          kind: "context-person",
          input: {
            stableKey: otherKey,
            ...otherName,
            birthDate: yearsBefore(player.birthDate, rng.integer(-6, 7)),
            homeJurisdictionId: jurisdictionId,
          },
        },
        {
          kind: "household-membership",
          input: {
            stableKey: `${stableKey}:membership:housemate`,
            personId: characterHistoryContextPersonId(world, otherKey),
            householdId,
            startedAt: world.currentDate,
            residenceRole: "primary",
            kind: "resident:member",
            provenance: PROVENANCE,
          },
        },
      );
    }

    return applyCharacterHistoryPlan(withEarlierLife, {
      stableKey,
      mode: "quick-generated",
      personId: player.id,
      transitions,
    }).world;
  }

  // A guardian, named through the versioned corpus like every other canonical
  // person. Their age is a household fact — an adult old enough to be raising
  // this child — and says nothing else about them.
  const guardianKey = `${stableKey}:guardian`;
  const guardianId = characterHistoryContextPersonId(world, guardianKey);
  const guardianName = drawCanonicalName(rng);
  const guardianBirthDate = yearsBefore(player.birthDate, rng.integer(24, 41));

  transitions.push(
    {
      kind: "context-person",
      input: {
        stableKey: guardianKey,
        givenName: guardianName.givenName,
        // A child usually shares a name with whoever is raising them. This is a
        // household convention, not an inference about either of them.
        familyName: player.familyName,
        birthDate: guardianBirthDate,
        homeJurisdictionId: jurisdictionId,
      },
    },
    {
      kind: "household-membership",
      input: {
        stableKey: `${stableKey}:membership:guardian`,
        personId: guardianId,
        householdId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance: PROVENANCE,
      },
    },
    {
      kind: "household-membership",
      input: {
        stableKey: `${stableKey}:membership:player`,
        personId: player.id,
        householdId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:child",
        provenance: PROVENANCE,
      },
    },
    {
      kind: "kinship",
      input: {
        stableKey: `${stableKey}:kinship:guardian`,
        personIds: [guardianId, player.id],
        establishedAt: player.birthDate,
        kind: "lineal:parent-child",
        provenance: PROVENANCE,
      },
    },
    {
      kind: "authority",
      input: {
        stableKey: `${stableKey}:authority:guardian`,
        childPersonId: player.id,
        holder: {
          kind: "person",
          personId: guardianId,
        },
        establishedAt: player.birthDate,
        kind: "parental:primary",
        basisKind: "legal:presumed",
        context: null,
        provenance: PROVENANCE,
      },
    },
  );

  if (age >= SCHOOL_ENTRY_AGE) {
    const schoolKey = `${stableKey}:school`;
    // The world does not know when the school was founded, and does not
    // pretend to: the earliest date it can honestly claim the school existed
    // is the day this child started attending it.
    const enrolledOn = dateAtAge(player.birthDate, SCHOOL_ENTRY_AGE);
    transitions.push(
      {
        kind: "organization",
        input: {
          stableKey: schoolKey,
          formedAt: enrolledOn,
          provenance: PROVENANCE,
          initialProfile: {
            name: `${place.displayName} public school`,
            classification: "sector:education",
            locationJurisdictionId: jurisdictionId,
          },
        },
      },
      {
        kind: "education",
        input: {
          stableKey: `${stableKey}:enrollment`,
          personId: player.id,
          organizationId: organizationIdFor(world.id, schoolKey),
          startedAt: enrolledOn,
          programKind: "schooling:general",
          contextKind: age >= 14 ? "stage:secondary" : "stage:primary",
          provenance: PROVENANCE,
        },
      },
    );
  }

  return applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "quick-generated",
    personId: player.id,
    transitions,
  }).world;
}

const OFFICE_HOURS = {
  expectedWeekly: { minimumHours: 35, maximumHours: 45 },
  attention: "high",
  concurrency: "partly-concurrent",
  scheduleRigidity: "mixed",
  interruptibility: "interruptible",
} as const;

/**
 * The one career fact a setup choice can establish.
 *
 * This is what makes the office and legislation surfaces appear later: they
 * read this work record. Nothing sets a flag on the way past, and no other
 * starting life reaches this function.
 */
function employInLegislativeOffice(
  world: World,
  personId: EntityId,
  place: LifePlace,
): World {
  const jurisdictionId = place.context.jurisdiction.id;
  const stableKey = "production:legislative-office";
  return applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "quick-generated",
    personId,
    transitions: [
      {
        kind: "organization",
        input: {
          stableKey,
          formedAt: world.currentDate,
          provenance: PROVENANCE,
          initialProfile: {
            name: `${place.displayName} legislative office`,
            classification: "sector:government",
            locationJurisdictionId: jurisdictionId,
          },
        },
      },
      {
        kind: "work",
        input: {
          stableKey: `${stableKey}:work`,
          personId,
          organizationId: organizationIdFor(world.id, stableKey),
          startedAt: world.currentDate,
          kind: "employment:legislative-staff",
          compensation: "paid",
          authority: "shared",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance: PROVENANCE,
          initialRole: {
            title: "Legislative staff",
            occupationClassification: "occupation:legislative-staff",
            locationJurisdictionId: jurisdictionId,
            timeDemand: {
              ...OFFICE_HOURS,
              locationJurisdictionId: jurisdictionId,
            },
          },
        },
      },
    ],
  }).world;
}

/**
 * The years before play, written as history rather than left blank.
 *
 * The childhood household runs from birth and is closed the day before play
 * begins; the adult's own household opens today. Nothing here is a choice
 * anybody made at the keyboard, which is the point of summarizing it.
 */
function summarizeEarlierLife(
  world: World,
  player: Person,
  jurisdictionId: EntityId,
): World {
  const stableKey = "production:earlier-life";
  const next = applyCharacterHistoryPlan(
    world,
    generateQuickCharacterHistory(world, {
      stableKey,
      personId: player.id,
      jurisdictionId,
    }),
  ).world;
  return applyCharacterHistoryPlan(next, {
    stableKey: `${stableKey}:left-home`,
    mode: "quick-generated",
    personId: player.id,
    transitions: [
      {
        kind: "household-membership-state",
        input: {
          stableKey: `${stableKey}:childhood-home:ended`,
          membershipStableKey: `${stableKey}:household:child`,
          effectiveAt: addDays(world.currentDate, -1),
          status: "ended",
          residenceRole: "primary",
          kind: "resident:child",
          provenance: PROVENANCE,
        },
      },
      {
        // The summarized childhood opens a part-time job at sixteen and never
        // closes it, so an adult arrived still holding it: a thirty-four-year-old
        // legislative staffer was also, on the record, a store assistant. It
        // ends when they leave school, which is the only claim the summary can
        // honestly make about when it ended.
        kind: "work-status",
        input: {
          stableKey: `${stableKey}:teen-work:ended`,
          workStableKey: `${stableKey}:work:teen`,
          effectiveAt: dateAtAge(player.birthDate, 18),
          status: "ended",
          reason:
            "The job the character had at school did not follow them out of it.",
          provenance: PROVENANCE,
        },
      },
    ],
  }).world;
}

/*
 * Records created inside a plan are referenced by later transitions in the same
 * plan, so their ids are derived from the world id and stable key exactly the
 * way the writers derive them. This is the established pattern: the ids are
 * deterministic, and a mismatch fails loudly in the writer rather than
 * silently pointing at nothing.
 */
/** The same calendar year arithmetic the character-history writer uses. */
function yearsBefore(date: IsoDate, years: number): IsoDate {
  return `${(Number(date.slice(0, 4)) - years).toString().padStart(4, "0")}${date.slice(4)}` as IsoDate;
}

function householdIdFor(worldId: EntityId, stableKey: string): EntityId {
  return createStableId("household", `${worldId}:${stableKey}`);
}

function organizationIdFor(worldId: EntityId, stableKey: string): EntityId {
  return createStableId("organization", `${worldId}:${stableKey}`);
}
