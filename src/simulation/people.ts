import {
  addDays,
  ageOnDate,
  dateAtAge,
  isoDateFromParts,
  yearOf,
} from "./dates";
import { createStableId } from "./ids";
import {
  DEFAULT_CORPUS_VERSION,
  DEMO_NAMES_V4,
  getNameCorpus,
} from "./names-data";
import { derivePersonAppearance } from "./person-appearance";
import { SeededRng } from "./rng";
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

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function generateProductionAge(rng: SeededRng): number {
  const roll = rng.next();
  if (roll < 0.15) {
    return rng.integer(21, 30); // 21-29 young adult
  } else if (roll < 0.7) {
    return rng.integer(30, 50); // 30-49 mid career
  } else if (roll < 0.9) {
    return rng.integer(50, 65); // 50-64 senior career
  } else {
    return rng.integer(65, 76); // 65-75 elder/retirement
  }
}

function generateProductionBirthDate(
  currentDate: IsoDate,
  targetAge: number,
  rng: SeededRng,
): IsoDate {
  const currentYear = yearOf(currentDate);
  const currentMonth = Number(currentDate.slice(5, 7));
  const currentDay = Number(currentDate.slice(8, 10));

  const month = rng.integer(1, 13);
  const maxDay = daysInMonth(currentYear - targetAge, month);
  const day = rng.integer(1, maxDay + 1);

  const birthdayPassedOrToday =
    month < currentMonth || (month === currentMonth && day <= currentDay);
  const birthYear = birthdayPassedOrToday
    ? currentYear - targetAge
    : currentYear - targetAge - 1;

  return birthDateForSelectedAge(currentDate, targetAge, birthYear, month, day);
}

function birthDateForSelectedAge(
  currentDate: IsoDate,
  targetAge: number,
  birthYear: number,
  month: number,
  day: number,
): IsoDate {
  // Normalize before constructing any date. Copying a leap-day anniversary
  // into a non-leap birth year must never reach the calendar validator.
  const safeDay = Math.min(day, daysInMonth(birthYear, month));
  const candidate = isoDateFromParts(birthYear, month, safeDay);
  const ageDifference = ageOnDate(candidate, currentDate) - targetAge;
  if (ageDifference === 0) return candidate;

  // Normalization (and the canonical Feb 28 observance of a leap birthday)
  // can change which side of the birthday we are on. Keep the normalized day
  // and reconcile the year, without rerolling age or changing RNG consumption.
  const correctedYear = birthYear + ageDifference;
  return isoDateFromParts(
    correctedYear,
    month,
    Math.min(safeDay, daysInMonth(correctedYear, month)),
  );
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
      const age = rng.integer(22, 70);
      const currentYear = yearOf(currentDate);
      const currentMonth = Number(currentDate.slice(5, 7));
      const currentDay = Number(currentDate.slice(8, 10));
      return birthDateForSelectedAge(
        currentDate,
        age,
        currentYear - age,
        currentMonth,
        currentDay,
      );
    }
    case 2: {
      // Prefer tomorrow's month/day, preserving the selected age after normalization.
      const age = rng.integer(22, 70);
      const tomorrow = addDays(currentDate, 1);
      const tomorrowMonth = Number(tomorrow.slice(5, 7));
      const tomorrowDay = Number(tomorrow.slice(8, 10));
      const birthYear = yearOf(tomorrow) - (age + 1);
      return birthDateForSelectedAge(
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
      const age = rng.integer(22, 70);
      const yesterday = addDays(currentDate, -1);
      const yesterdayMonth = Number(yesterday.slice(5, 7));
      const yesterdayDay = Number(yesterday.slice(8, 10));
      const birthYear = yearOf(yesterday) - age;
      return birthDateForSelectedAge(
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
    const age = rng.integer(24, 68);
    birthDate = isoDateFromParts(
      yearOf(input.currentDate) - age,
      rng.integer(1, 13),
      rng.integer(1, 29),
    );
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
    undefined,
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

  return {
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
  };
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
