import { ageOnDate, dateAtAge, isoDateFromParts, yearOf } from "./dates";
import { createStableId } from "./ids";
import { pickDistinct, SeededRng } from "./rng";
import type {
  EducationFact,
  EntityId,
  HistoricalEvent,
  IsoDate,
  OccupationFact,
  Person,
  PersonDetails,
  PersonFact,
} from "./types";

const GIVEN_NAMES = [
  "Andre",
  "Avery",
  "Cameron",
  "Elias",
  "Jordan",
  "Julian",
  "Leah",
  "Malcolm",
  "Maya",
  "Naomi",
  "Priya",
  "Sofia",
] as const;

const FAMILY_NAMES = [
  "Bennett",
  "Collins",
  "Dawson",
  "Ellis",
  "Foster",
  "Gaines",
  "Harris",
  "Kim",
  "Morales",
  "Patel",
  "Reed",
  "Turner",
] as const;

const EDUCATION_PATHS = [
  {
    institution: "a synthetic local high school",
    field: null,
    credential: "high school diploma",
    startAge: 14,
    endAge: 18,
  },
  {
    institution: "a synthetic regional trade program",
    field: "skilled trades",
    credential: "trade credential",
    startAge: 18,
    endAge: 19,
  },
  {
    institution: "a synthetic community college",
    field: "general studies",
    credential: "associate degree",
    startAge: 18,
    endAge: 20,
  },
  {
    institution: "a synthetic four-year college",
    field: "public administration",
    credential: "bachelor's degree",
    startAge: 18,
    endAge: 22,
  },
] as const;

const OCCUPATION_PROFILES = [
  {
    employer: "a synthetic neighborhood business",
    title: "small-business bookkeeper",
    expertise: ["local finance", "small business"],
  },
  {
    employer: "a synthetic community health nonprofit",
    title: "community health coordinator",
    expertise: ["public health", "community outreach"],
  },
  {
    employer: "a synthetic construction firm",
    title: "construction supervisor",
    expertise: ["construction", "workplace logistics"],
  },
  {
    employer: "a synthetic hospitality company",
    title: "hospitality manager",
    expertise: ["hospitality", "staff management"],
  },
  {
    employer: "a synthetic insurance office",
    title: "insurance claims specialist",
    expertise: ["insurance", "case review"],
  },
  {
    employer: "a synthetic public library",
    title: "library program assistant",
    expertise: ["public programs", "research"],
  },
] as const;

const PERSONALITY_TENDENCIES = [
  "deliberate under pressure",
  "comfortable meeting strangers",
  "protective of close relationships",
  "quick to notice inconsistencies",
  "reserved in unfamiliar groups",
  "willing to revise an initial view",
] as const;

const GOALS = [
  "build a more stable career",
  "deepen ties in the local community",
  "make time for family commitments",
  "learn a new professional skill",
  "take on a meaningful civic project",
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

export function createLightweightPerson(input: LightweightPersonInput): Person {
  if (!Number.isSafeInteger(input.index) || input.index < 0) {
    throw new Error(
      "Person generation index must be a non-negative safe integer.",
    );
  }

  const generationKey = `demo-person-v2:${input.index}`;
  const id = createStableId("person", `${input.worldId}:${generationKey}`);
  const rng = new SeededRng(input.worldSeed).fork(generationKey);
  const givenName = rng.pick(GIVEN_NAMES);
  const familyOffset = rng.integer(0, FAMILY_NAMES.length);
  const familyName = FAMILY_NAMES[
    (familyOffset + (input.index % FAMILY_NAMES.length)) % FAMILY_NAMES.length
  ] as string;
  const age = rng.integer(24, 68);
  const birthDate = isoDateFromParts(
    yearOf(input.currentDate) - age,
    rng.integer(1, 13),
    rng.integer(1, 29),
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
    givenName,
    familyName,
    birthDate,
    homeJurisdictionId: input.homeJurisdictionId,
    detailLevel: "lightweight",
    establishedFacts,
  };
}

export function materializePersonRecord(
  person: Person,
  worldSeed: string,
  backgroundAnchorDate: IsoDate,
  personHistory: readonly HistoricalEvent[],
): Person {
  if (person.detailLevel === "materialized") {
    return person;
  }

  const rng = new SeededRng(worldSeed).fork(
    `person-materialization-v2:${person.id}`,
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
      id: createStableId("fact", `${person.id}:education:v2`),
      stableKey: "education:v2",
      kind: "education",
      occurredAt: dateAtAge(person.birthDate, educationPath.startAge),
      endedAt: dateAtAge(person.birthDate, educationPath.endAge),
      jurisdictionId: null,
      institution: educationPath.institution,
      field: educationPath.field,
      credential: educationPath.credential,
      status: "completed",
      summary: `${name} completed a procedurally generated ${educationPath.credential}.`,
      provenance: PROCEDURAL_PROVENANCE,
    };
    generatedFacts.push(education);
  }

  if (occupationProfile) {
    const latestWorkAge = Math.min(ageAtAnchor, earliestWorkAge + 3);
    const workAge = rng.integer(earliestWorkAge, latestWorkAge + 1);
    const occupation: OccupationFact = {
      id: createStableId("fact", `${person.id}:occupation:v2`),
      stableKey: "occupation:v2",
      kind: "occupation",
      occurredAt: dateAtAge(person.birthDate, workAge),
      endedAt: null,
      jurisdictionId: person.homeJurisdictionId,
      employer: occupationProfile.employer,
      title: occupationProfile.title,
      status: "ongoing",
      summary: `${name} works as a ${occupationProfile.title}.`,
      provenance: PROCEDURAL_PROVENANCE,
    };
    generatedFacts.push(occupation);
  }

  const details: PersonDetails = {
    generatorVersion: "person-materialization-v2",
    expertise: occupationProfile ? [...occupationProfile.expertise] : [],
    personalityTendencies: pickDistinct(rng, PERSONALITY_TENDENCIES, 2),
    currentGoals: [rng.pick(GOALS)],
    generatedFacts,
  };

  return {
    ...person,
    detailLevel: "materialized",
    details,
  };
}
