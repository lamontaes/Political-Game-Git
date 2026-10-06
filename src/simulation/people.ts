import { initializePersonCitizenship } from "./citizenship-creation";
import {
  addDays,
  ageOnDate,
  dateAtAge,
  isoDateFromParts,
  yearOf,
} from "./dates";
import { createStableId } from "./ids";
import {
  birthDateAtAge,
  inventedPersonAge,
  inventedPersonBirthDate,
} from "./invented-person-age";
import {
  DEFAULT_CORPUS_VERSION,
  DEMO_NAMES_V4,
  givenNamePoolForCorpus,
  getNameCorpus,
} from "./names-data";
import { derivePersonAppearance } from "./person-appearance";
import { requireStartingBirthday } from "./starting-birthday";
import { SeededRng } from "./rng";
import { generatePersonIdentity } from "./person-identity";
import type {
  EducationFact,
  EntityId,
  HistoricalEvent,
  IsoDate,
  KnowledgeSubjectDefinition,
  OccupationFact,
  Person,
  PersonDetails,
  PersonFact,
  PersonGenerationProfile,
  GenderIdentityKey,
  PersonIdentity,
} from "./types";

export const DEFAULT_PERSON_GENERATOR_VERSION = "person-v5";
export const LEGACY_DEMO_PERSON_GENERATOR_VERSION = "demo-person-v4";

const EDUCATION_PATHS = [
  {
    institution: "a synthetic local high school",
    field: null,
    credential: "high school diploma",
    startAge: 14,
    endAge: 18,
    subjectTags: [] as readonly string[],
  },
  {
    institution: "a synthetic regional trade program",
    field: "skilled trades",
    credential: "trade credential",
    startAge: 18,
    endAge: 19,
    subjectTags: ["background.education.skilled-trades"],
  },
  {
    institution: "a synthetic community college",
    field: "general studies",
    credential: "associate degree",
    startAge: 18,
    endAge: 20,
    subjectTags: ["background.education.general-studies"],
  },
  {
    institution: "a synthetic four-year college",
    field: "public administration",
    credential: "bachelor's degree",
    startAge: 18,
    endAge: 22,
    subjectTags: ["background.education.public-administration"],
  },
] as const;

const OCCUPATION_PROFILES = [
  {
    employer: "a synthetic neighborhood business",
    title: "small-business bookkeeper",
    subjectTags: ["background.occupation.local-finance"],
  },
  {
    employer: "a synthetic community health nonprofit",
    title: "community health coordinator",
    subjectTags: ["background.occupation.community-health"],
  },
  {
    employer: "a synthetic construction firm",
    title: "construction supervisor",
    subjectTags: ["background.occupation.construction"],
  },
  {
    employer: "a synthetic hospitality company",
    title: "hospitality manager",
    subjectTags: ["background.occupation.hospitality"],
  },
  {
    employer: "a synthetic insurance office",
    title: "insurance claims specialist",
    subjectTags: ["background.occupation.insurance"],
  },
  {
    employer: "a synthetic public library",
    title: "library program assistant",
    subjectTags: ["background.occupation.public-programs"],
  },
] as const;

const PROCEDURAL_PROVENANCE = {
  method: "procedural-placeholder",
  sourceEventId: null,
  note: "Synthetic deterministic fixture.",
} as const;

export interface LightweightPersonInput {
  readonly worldId: EntityId;
  readonly worldSeed: string;
  readonly index: number;
  readonly currentDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly birthplaceJurisdictionId?: EntityId;
  readonly profile?: PersonGenerationProfile;
  readonly generatorVersion?: string;
  readonly corpusVersion?: string;
  /**
   * Character catalog generation to pin the new person's appearance to.
   * Supplied by the caller that knows the current art catalog; the simulation
   * never reads the manifest itself.
   */
  readonly appearanceCatalogGeneration?: number;
  /**
   * Appearance recipe to create this person under, when the caller declares one.
   *
   * Absent means the default, which does not move — see
   * `DEFAULT_APPEARANCE_RECIPE_VERSION`. A caller that wants a newer recipe
   * says so, so the change reaches the people it was authorized for and no
   * existing constructor's people are rebuilt behind its back.
   */
  readonly appearanceRecipeVersion?: string;
}

export function personName(person: Person): string {
  return `${person.givenName} ${person.familyName}`;
}

export function factsForPerson(person: Person): readonly PersonFact[] {
  return [
    ...person.establishedFacts,
    ...(person.detailLevel === "materialized"
      ? person.details.generatedFacts
      : []),
  ];
}

/**
 * A scenario resident's age: the generator's weighting picks the career
 * stage, and the one age-window table (`invented-person-age.ts`) holds each
 * stage's ages.
 */
function generateProductionAge(rng: SeededRng): number {
  const roll = rng.next();
  if (roll < 0.15) {
    return inventedPersonAge(rng, "scenario-young-adult");
  } else if (roll < 0.7) {
    return inventedPersonAge(rng, "scenario-mid-career");
  } else if (roll < 0.9) {
    return inventedPersonAge(rng, "scenario-senior-career");
  } else {
    return inventedPersonAge(rng, "scenario-elder");
  }
}

function generateProductionBirthDate(
  currentDate: IsoDate,
  targetAge: number,
  rng: SeededRng,
): IsoDate {
  return inventedPersonBirthDate(rng, {
    role: "scenario-resident",
    referenceDate: currentDate,
    age: targetAge,
    placement: "drawn-exact-any-day",
  });
}

function generateStressBirthDate(
  index: number,
  currentDate: IsoDate,
  rng: SeededRng,
): IsoDate {
  const stressCase = index % 6;

  switch (stressCase) {
    case 0: {
      // Very young valid adult (age 18)
      return generateProductionBirthDate(currentDate, 18, rng);
    }
    case 1: {
      // Prefer today's month/day; normalize Feb 29 when the birth year is not leap.
      const age = inventedPersonAge(rng, "stress-test-adult");
      const currentYear = yearOf(currentDate);
      const currentMonth = Number(currentDate.slice(5, 7));
      const currentDay = Number(currentDate.slice(8, 10));
      return birthDateAtAge(
        currentDate,
        age,
        currentYear - age,
        currentMonth,
        currentDay,
      );
    }
    case 2: {
      // Prefer tomorrow's month/day, preserving the selected age after normalization.
      const age = inventedPersonAge(rng, "stress-test-adult");
      const tomorrow = addDays(currentDate, 1);
      const tomorrowMonth = Number(tomorrow.slice(5, 7));
      const tomorrowDay = Number(tomorrow.slice(8, 10));
      const birthYear = yearOf(tomorrow) - (age + 1);
      return birthDateAtAge(
        currentDate,
        age,
        birthYear,
        tomorrowMonth,
        tomorrowDay,
      );
    }
    case 3: {
      // Leap-day birthday (Feb 29)
      const leapYears = [
        2004, 2000, 1996, 1992, 1988, 1984, 1980, 1976, 1972, 1968,
      ];
      const leapYear = rng.pick(leapYears);
      return isoDateFromParts(leapYear, 2, 29);
    }
    case 4: {
      // Older adult / senior boundary (age 88)
      return generateProductionBirthDate(currentDate, 88, rng);
    }
    default: {
      // Prefer yesterday's month/day, preserving the selected age after normalization.
      const age = inventedPersonAge(rng, "stress-test-adult");
      const yesterday = addDays(currentDate, -1);
      const yesterdayMonth = Number(yesterday.slice(5, 7));
      const yesterdayDay = Number(yesterday.slice(8, 10));
      const birthYear = yearOf(yesterday) - age;
      return birthDateAtAge(
        currentDate,
        age,
        birthYear,
        yesterdayMonth,
        yesterdayDay,
      );
    }
  }
}

export function createLightweightPerson(input: LightweightPersonInput): Person {
  if (!Number.isSafeInteger(input.index) || input.index < 0) {
    throw new Error(
      "Person generation index must be a non-negative safe integer.",
    );
  }

  const generatorVersion =
    input.generatorVersion ?? DEFAULT_PERSON_GENERATOR_VERSION;
  const corpusVersion =
    input.corpusVersion ??
    (generatorVersion === LEGACY_DEMO_PERSON_GENERATOR_VERSION
      ? DEMO_NAMES_V4.version
      : DEFAULT_CORPUS_VERSION);

  const generationKey = `${generatorVersion}:${input.index}`;
  const id = createStableId("person", `${input.worldId}:${generationKey}`);
  const rng = new SeededRng(input.worldSeed).fork(generationKey);
  const corpus = getNameCorpus(corpusVersion);

  let givenName: string;
  let familyName: string;
  let birthDate: IsoDate;

  if (generatorVersion === LEGACY_DEMO_PERSON_GENERATOR_VERSION) {
    // Exact legacy algorithm preserved for backwards compatibility
    givenName = rng.pick(corpus.givenNames);
    const familyOffset = rng.integer(0, corpus.familyNames.length);
    familyName = corpus.familyNames[
      (familyOffset + (input.index % corpus.familyNames.length)) %
        corpus.familyNames.length
    ] as string;
    birthDate = inventedPersonBirthDate(rng, {
      role: "legacy-demo-resident",
      referenceDate: input.currentDate,
    });
  } else {
    // Versioned substrate generation
    const profile = input.profile ?? "production";
    givenName = rng.pick(corpus.givenNames);
    familyName = rng.pick(corpus.familyNames);

    if (profile === "stress") {
      birthDate = generateStressBirthDate(input.index, input.currentDate, rng);
    } else {
      const targetAge = generateProductionAge(rng);
      birthDate = generateProductionBirthDate(
        input.currentDate,
        targetAge,
        rng,
      );
    }
  }

  const appearance = derivePersonAppearance(
    id,
    input.appearanceRecipeVersion,
    input.appearanceCatalogGeneration,
  );
  const birthplaceJurisdictionId =
    input.birthplaceJurisdictionId ?? input.homeJurisdictionId;
  const fullName = `${givenName} ${familyName}`;

  const establishedFacts: readonly PersonFact[] = [
    {
      id: createStableId("fact", `${id}:birth-date`),
      stableKey: "birth-date",
      kind: "birth-date",
      occurredAt: birthDate,
      jurisdictionId: null,
      summary: `${fullName}'s birth date is established as ${birthDate}.`,
      provenance: PROCEDURAL_PROVENANCE,
    },
    {
      id: createStableId("fact", `${id}:birthplace`),
      stableKey: "birthplace",
      kind: "birthplace",
      occurredAt: birthDate,
      jurisdictionId: birthplaceJurisdictionId,
      summary: `${fullName}'s birthplace is established in the world record.`,
      provenance: PROCEDURAL_PROVENANCE,
    },
    {
      id: createStableId("fact", `${id}:residence:initial`),
      stableKey: "residence:initial",
      kind: "residence",
      occurredAt: input.currentDate,
      endedAt: null,
      jurisdictionId: input.homeJurisdictionId,
      summary: `${fullName} resides in the recorded home jurisdiction.`,
      provenance: PROCEDURAL_PROVENANCE,
    },
  ];

  return initializePersonCitizenship(
    {
      id,
      generationKey,
      generatorVersion,
      corpusVersion,
      givenName,
      familyName,
      birthDate,
      homeJurisdictionId: input.homeJurisdictionId,
      appearance,
      detailLevel: "lightweight",
      establishedFacts,
    },
    input.worldSeed,
    input.currentDate,
  );
}

export function materializePersonRecord(
  person: Person,
  worldSeed: string,
  backgroundAnchorDate: IsoDate,
  personHistory: readonly HistoricalEvent[],
  availableSubjects: Readonly<Record<string, KnowledgeSubjectDefinition>>,
): Person {
  if (person.detailLevel === "materialized") {
    return person;
  }

  const rng = new SeededRng(worldSeed).fork(
    `person-materialization-v4:${person.id}`,
  );
  const ageAtAnchor = ageOnDate(person.birthDate, backgroundAnchorDate);
  const constrainedFactKinds = new Set(
    personHistory.flatMap((event) =>
      event.personFactConstraints
        .filter((constraint) => constraint.personId === person.id)
        .map((constraint) => constraint.kind),
    ),
  );
  const existingFacts = factsForPerson(person);
  const hasEducationFact = existingFacts.some(
    (fact) => fact.kind === "education",
  );
  const hasOccupationFact = existingFacts.some(
    (fact) => fact.kind === "occupation",
  );
  const eligibleEducationPaths = EDUCATION_PATHS.filter(
    (path) => path.endAge <= ageAtAnchor,
  );
  const educationPath =
    !hasEducationFact &&
    !constrainedFactKinds.has("education") &&
    eligibleEducationPaths.length > 0
      ? rng.pick(eligibleEducationPaths)
      : null;
  const earliestWorkAge = Math.max(18, (educationPath?.endAge ?? 17) + 1);
  const occupationProfile =
    !hasOccupationFact &&
    !constrainedFactKinds.has("occupation") &&
    ageAtAnchor >= earliestWorkAge
      ? rng.pick(OCCUPATION_PROFILES)
      : null;
  const name = personName(person);
  const generatedFacts: PersonFact[] = [];

  if (educationPath) {
    const education: EducationFact = {
      id: createStableId("fact", `${person.id}:education:v4`),
      stableKey: "education:v4",
      kind: "education",
      occurredAt: dateAtAge(person.birthDate, educationPath.startAge),
      endedAt: dateAtAge(person.birthDate, educationPath.endAge),
      jurisdictionId: null,
      institution: educationPath.institution,
      field: educationPath.field,
      credential: educationPath.credential,
      status: "completed",
      subjectIds: subjectIdsMatchingTags(
        availableSubjects,
        educationPath.subjectTags,
      ),
      summary: `${name} completed a procedurally generated ${educationPath.credential}.`,
      provenance: PROCEDURAL_PROVENANCE,
    };
    generatedFacts.push(education);
  }

  if (occupationProfile) {
    const latestWorkAge = Math.min(ageAtAnchor, earliestWorkAge + 3);
    const workAge = rng.integer(earliestWorkAge, latestWorkAge + 1);
    const occupation: OccupationFact = {
      id: createStableId("fact", `${person.id}:occupation:v4`),
      stableKey: "occupation:v4",
      kind: "occupation",
      occurredAt: dateAtAge(person.birthDate, workAge),
      endedAt: null,
      jurisdictionId: person.homeJurisdictionId,
      employer: occupationProfile.employer,
      title: occupationProfile.title,
      status: "ongoing",
      subjectIds: subjectIdsMatchingTags(
        availableSubjects,
        occupationProfile.subjectTags,
      ),
      summary: `${name} works as a ${occupationProfile.title}.`,
      provenance: PROCEDURAL_PROVENANCE,
    };
    generatedFacts.push(occupation);
  }

  const details: PersonDetails = {
    generatorVersion: "person-materialization-v4",
    generatedFacts,
  };

  return {
    ...person,
    detailLevel: "materialized",
    details,
  };
}

function subjectIdsMatchingTags(
  subjects: Readonly<Record<string, KnowledgeSubjectDefinition>>,
  tags: readonly string[],
): readonly EntityId[] {
  if (tags.length === 0) return [];
  return Object.values(subjects)
    .filter((subject) => tags.some((tag) => subject.tags.includes(tag)))
    .map((subject) => subject.id)
    .sort();
}

/**
 * The starting person is generated, not lifted from a fixture, and the record
 * of where their facts came from should say so rather than inheriting the
 * demo generator's note.
 */
const STARTING_PERSON_PROVENANCE = {
  method: "procedural-placeholder",
  sourceEventId: null,
  note: "Generated from the player's setup at the start of a new game.",
} as const;

export const STARTING_PERSON_GENERATOR_VERSION = "starting-person-v1";

export interface StartingPersonInput {
  readonly worldId: EntityId;
  readonly worldSeed: string;
  readonly currentDate: IsoDate;
  /** Prior-date construction keeps the target birthday but starts residence earlier. */
  readonly initialResidenceDate?: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly birthplaceJurisdictionId?: EntityId;
  /** Exactly how old the person is on `currentDate`. Not a range to sample. */
  readonly age: number;
  /** Blank or absent means "draw one from the corpus", never "leave it empty". */
  readonly givenName?: string | null;
  readonly familyName?: string | null;
  readonly corpusVersion?: string;
  readonly appearanceCatalogGeneration?: number;
  /** See `LightweightPersonInput.appearanceRecipeVersion`. */
  readonly appearanceRecipeVersion?: string;
  /**
   * The gender and pronouns the player chose, when they chose any.
   *
   * Absent means they did not say, which is recorded as saying nothing rather
   * than filled in from the name that was just drawn.
   */
  readonly identity?: PersonIdentity;
  /**
   * Birthday month and day the player named, when they named both.
   *
   * Absent keeps the seeded anniversary so old setups and saved people keep
   * the birth dates they already have. Both must be present together.
   */
  readonly birthMonth?: number;
  readonly birthDay?: number;
}

/**
 * The person a new game is actually about.
 *
 * Unlike the fixture generator, this one is told the age and the names rather
 * than inventing an adult and having them corrected afterwards. That ordering
 * is the whole point: the id, the appearance derived from it, the birth-date
 * fact and every summary sentence are computed once, from the identity the
 * player asked for, so nothing downstream ever has to reconcile a person with
 * the record of their own creation.
 *
 * Names the player leaves blank come from the versioned corpus through the
 * seeded generator, the same path every other canonical name takes. A name
 * carries no claim about anybody's background.
 */
/**
 * A given name that agrees with the gender the player stated, or null.
 *
 * Null for `unstated` and for an absent identity, which is what keeps the
 * unrestricted corpus draw the default. Nothing here reads a name to decide a
 * gender; the argument is the player's own answer and the return is a string.
 */
function statedGenderGivenName(
  worldSeed: string,
  generationKey: string,
  gender: GenderIdentityKey | undefined,
  corpusVersion: string,
): string | null {
  if (gender === undefined || gender === "unstated") return null;
  const pool = givenNamePoolForCorpus(getNameCorpus(corpusVersion), gender);
  return new SeededRng(worldSeed)
    .fork(`${generationKey}:stated-gender-given-name`)
    .pick(pool);
}

export function createStartingPerson(input: StartingPersonInput): Person {
  if (!Number.isSafeInteger(input.age) || input.age < 0 || input.age > 130) {
    throw new Error("A starting person needs a plausible age in whole years.");
  }
  const corpusVersion = input.corpusVersion ?? DEFAULT_CORPUS_VERSION;
  const generationKey = `${STARTING_PERSON_GENERATOR_VERSION}:player`;
  const id = createStableId("person", `${input.worldId}:${generationKey}`);
  const rng = new SeededRng(input.worldSeed).fork(generationKey);
  const corpus = getNameCorpus(corpusVersion);

  // Both names are drawn whether or not they are used, so a player who types
  // one of them does not shift the birthday of the person they are naming.
  const drawnGivenName = rng.pick(corpus.givenNames);
  const firstFamilyName = rng.pick(corpus.familyNames);
  const drawnFamilyName =
    corpus.surnamesCarried === 2
      ? `${firstFamilyName} ${rng.pick(corpus.familyNames)}`
      : firstFamilyName;
  // A player who states a gender and leaves the name blank is asking for a name
  // that goes with what they just said. That draw runs on its own forked
  // stream, so honoring it cannot move the birthday, the appearance, or any
  // other person in the world by a single value.
  const statedGivenName = statedGenderGivenName(
    input.worldSeed,
    generationKey,
    input.identity?.gender,
    corpusVersion,
  );
  const givenName =
    input.givenName?.trim() || statedGivenName || drawnGivenName;
  const familyName = input.familyName?.trim() || drawnFamilyName;

  const namedBirthday =
    input.birthMonth !== undefined || input.birthDay !== undefined;
  const birthDate = namedBirthday
    ? requireStartingBirthday({
        currentDate: input.currentDate,
        startAge: input.age,
        birthMonth: input.birthMonth as number,
        birthDay: input.birthDay as number,
      })
    : inventedPersonBirthDate(rng, {
        role: "player-character",
        referenceDate: input.currentDate,
        age: input.age,
        placement: "drawn-exact-any-day",
      });

  const appearance = derivePersonAppearance(
    id,
    input.appearanceRecipeVersion,
    input.appearanceCatalogGeneration,
  );
  const birthplaceJurisdictionId =
    input.birthplaceJurisdictionId ?? input.homeJurisdictionId;
  const fullName = `${givenName} ${familyName}`;

  const establishedFacts: readonly PersonFact[] = [
    {
      id: createStableId("fact", `${id}:birth-date`),
      stableKey: "birth-date",
      kind: "birth-date",
      occurredAt: birthDate,
      jurisdictionId: null,
      summary: `${fullName}'s birth date is established as ${birthDate}.`,
      provenance: STARTING_PERSON_PROVENANCE,
    },
    {
      id: createStableId("fact", `${id}:birthplace`),
      stableKey: "birthplace",
      kind: "birthplace",
      occurredAt: birthDate,
      jurisdictionId: birthplaceJurisdictionId,
      summary: `${fullName}'s birthplace is established in the world record.`,
      provenance: STARTING_PERSON_PROVENANCE,
    },
    {
      id: createStableId("fact", `${id}:residence:initial`),
      stableKey: "residence:initial",
      kind: "residence",
      occurredAt: input.initialResidenceDate ?? input.currentDate,
      endedAt: null,
      jurisdictionId: input.homeJurisdictionId,
      summary: `${fullName} resides in the recorded home jurisdiction.`,
      provenance: STARTING_PERSON_PROVENANCE,
    },
  ];

  return initializePersonCitizenship(
    {
      id,
      generationKey,
      generatorVersion: STARTING_PERSON_GENERATOR_VERSION,
      corpusVersion,
      givenName,
      familyName,
      birthDate,
      homeJurisdictionId: input.homeJurisdictionId,
      appearance,
      ...(input.identity === undefined ? {} : { identity: input.identity }),
      detailLevel: "lightweight",
      establishedFacts,
    },
    input.worldSeed,
    input.currentDate,
  );
}

/**
 * A name off the whole corpus, with nothing said about who is carrying it.
 *
 * Deliberately off the module's surface. It was on it, and that is most of why a man came out
 * named Maria: a writer that wanted a name reached for the loose draw, got one
 * with no argument to fill in, and never learned that a gendered draw existed
 * two functions down. Sixteen routes did exactly that. Correcting sixteen
 * callers while leaving the loose draw on the module's surface only waits for
 * the seventeenth, so the surface is now `drawCanonicalNameForGender`, whose
 * gender argument is required. A route that genuinely knows nothing passes
 * `"unstated"` and lands back here, which is the same draw and a declaration
 * instead of an omission. The one narrow exception is `drawCanonicalName`
 * below, which exists so a pre-fix save still replays byte-for-byte.
 */
function drawUnrestrictedName(
  rng: SeededRng,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
): { readonly givenName: string; readonly familyName: string } {
  const corpus = getNameCorpus(corpusVersion);
  const givenName = rng.pick(corpus.givenNames);
  const familyName = rng.pick(corpus.familyNames);
  return {
    givenName,
    familyName:
      corpus.surnamesCarried === 2
        ? `${familyName} ${rng.pick(corpus.familyNames)}`
        : familyName,
  };
}

/**
 * The loose draw, kept reachable for one purpose only: replaying a world that
 * was written before the gendered draw existed. A save recorded under the
 * legacy member-name policy has to produce the same bytes it produced then,
 * and that means reaching the same stream in the same order with the same
 * corpus. `src/simulation/living-world/opening.ts` is the only production
 * caller, behind its `memberNameVersion` gate; `gendered-given-names.test.ts`
 * holds that allowlist and fails if a second one appears. New code has no
 * business here — call `drawCanonicalNameForGender` with `"unstated"` if the
 * gender really is unknown, so the omission is at least written down.
 */
export function drawCanonicalName(
  rng: SeededRng,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
): { readonly givenName: string; readonly familyName: string } {
  return drawUnrestrictedName(rng, corpusVersion);
}

export const LEGACY_GIVEN_NAME_GENERATION_VERSION = "given-name-v1";
export const DISTINCT_GIVEN_NAME_GENERATION_VERSION = "given-name-v2";
/**
 * v2, and then a generated person's given name follows the year they were
 * born (`given-name-cohorts.ts`). The draw itself is v2's; the cohort is
 * applied once the birth date is known, by the routes that write the person.
 */
export const COHORT_GIVEN_NAME_GENERATION_VERSION = "given-name-v3";
export type GivenNameGenerationVersion =
  | typeof LEGACY_GIVEN_NAME_GENERATION_VERSION
  | typeof DISTINCT_GIVEN_NAME_GENERATION_VERSION
  | typeof COHORT_GIVEN_NAME_GENERATION_VERSION;

/**
 * The same draw, for somebody whose gender the world has already generated.
 *
 * OCD-UI-003 settles the direction: gender is the input to name generation, and
 * a name is never read backwards to decide a gender. `createStartingPerson`
 * already honors that for the player. Every other generated person — a
 * guardian, a sibling, a housemate, a fictional governor — was getting an
 * identity from one stream and a name from the whole corpus on another, with
 * nothing joining them, which is how a household ended up introducing "Moses
 * Mason, your older sister".
 *
 * `unstated` and an absent identity keep the unrestricted draw, because a
 * person the world says nothing about must not be given a name that implies
 * something. The gendered given name is taken from a FORKED stream, so the
 * parent stream advances by exactly the two values it advanced by before this
 * existed: adding this moves nobody's birthday and no other person in the
 * world.
 *
 * Version 2's fork key carries the unrestricted draw. `SeededRng.fork` derives from the
 * seed and the key alone and never from how far the stream has run, so a fixed
 * key gave every gendered person drawn off one stream the SAME given name —
 * "Luke Whitehead", "Luke Snyder", "Luke Marshall" from one household stream.
 * A household then overwrites the family name with the player's, so the third
 * playtest's home scene offered "Tell Charles Rush" about Charles Rush: a
 * guardian and a sibling the player could not tell apart. Keying the fork on
 * the name this person's own two draws produced varies it per person while the
 * parent stream still advances by exactly two values.
 *
 * `takenGivenNames` is for a group the player meets under one roof, where two
 * people sharing a first name is not color but an unanswerable scene: the
 * household passes the names it has already handed out and the draw steps on
 * through the same pool. It is a preference, not a guarantee — a pool smaller
 * than the group keeps the drawn name rather than inventing one outside it.
 */
/**
 * A name and an identity for somebody the world is inventing, drawn so the
 * two agree: the identity comes first from its own stream, then a given name
 * for that gender. Without this a generated officeholder could be named Alan
 * and drawn with a woman's body, because the appearance reads the identity.
 */
export function drawGeneratedPersonName(
  rng: SeededRng,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
): {
  readonly givenName: string;
  readonly familyName: string;
  readonly identity: PersonIdentity;
} {
  const identity = generatePersonIdentity(rng.fork("generated-identity"));
  const name = drawCanonicalNameForGender(
    rng,
    identity.gender === "female" || identity.gender === "male"
      ? identity.gender
      : "unstated",
    corpusVersion,
  );
  return { ...name, identity };
}

export function drawCanonicalNameForGender(
  rng: SeededRng,
  gender: GenderIdentityKey,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
  generationVersion: GivenNameGenerationVersion = LEGACY_GIVEN_NAME_GENERATION_VERSION,
  takenGivenNames: readonly string[] = [],
): { readonly givenName: string; readonly familyName: string } {
  const drawn = drawUnrestrictedName(rng, corpusVersion);
  if (gender === "unstated") return drawn;
  const pool = givenNamePoolForCorpus(getNameCorpus(corpusVersion), gender);
  if (generationVersion === LEGACY_GIVEN_NAME_GENERATION_VERSION) {
    return {
      givenName: rng.fork("canonical-name:gendered-given-name").pick(pool),
      familyName: drawn.familyName,
    };
  }
  const offset = rng
    .fork(
      `canonical-name:gendered-given-name:${drawn.givenName}:${drawn.familyName}`,
    )
    .integer(0, pool.length);
  const taken = new Set(takenGivenNames);
  let givenName = pool[offset] as string;
  for (let step = 0; step < pool.length && taken.has(givenName); step += 1) {
    givenName = pool[(offset + step + 1) % pool.length] as string;
  }
  return { givenName, familyName: drawn.familyName };
}

/**
 * A name and the identity it agrees with, drawn as one act.
 *
 * `drawCanonicalNameForGender` has existed since OCD-UI-003 and is correct.
 * The defect it was written for kept happening anyway, because honoring it is
 * opt-in: a writer that draws a name on one stream and an identity on another
 * gets a person whose two halves were never introduced, and nothing complains.
 * Measured on this branch before the repair, an adult start in Lexington gave
 * 29 of 72 generated people a given name from the opposite pool — the owner
 * met a man called Maria and correctly called him "your dad".
 *
 * So the pairing is the unit. A route passes the identity it already draws —
 * on its own stream, under its own key, so no generated gender moves — and
 * gets back the name together with it. There is one call, one spread, and no
 * way to take the name without the identity that shaped it.
 *
 * The direction is still OCD-UI-003's: gender is the input, and no name is
 * ever read backwards to decide one. An `unstated` identity keeps the
 * unrestricted draw, because a person the world says nothing about must not be
 * given a name that implies something.
 */
export function drawCanonicalNamedIdentity(
  rng: SeededRng,
  identity: PersonIdentity,
  options: {
    readonly corpusVersion?: string;
    readonly generationVersion?: GivenNameGenerationVersion;
    readonly takenGivenNames?: readonly string[];
  } = {},
): {
  readonly givenName: string;
  readonly familyName: string;
  readonly identity: PersonIdentity;
} {
  return {
    ...drawCanonicalNameForGender(
      rng,
      identity.gender,
      options.corpusVersion,
      options.generationVersion ?? LEGACY_GIVEN_NAME_GENERATION_VERSION,
      options.takenGivenNames ?? [],
    ),
    identity,
  };
}
