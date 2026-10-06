import { carryPeopleReadIndexesAfterAppend } from "./history-index";
import { adultLifeSituations } from "./adult-situations";
import {
  addDays,
  ageOnDate,
  dateAtAge,
  daysBetween,
  makeIsoDate,
  simulationMomentOnLocalDate,
  simulationMinutesBetween,
} from "./dates";
import { createStableId } from "./ids";
import {
  createCareResponsibility,
  createChildAuthority,
  createEducationEnrollment,
  createHousehold,
  createOrganization,
  createOrganizationParticipation,
  createPartnership,
  createWorkRelationship,
  recordCareResponsibilityState,
  recordChildAuthorityState,
  recordEducationEnrollmentState,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  recordKinship,
  recordLifeCommitment,
  recordOrganizationParticipationState,
  recordWorkRole,
  recordWorkStatus,
  startHouseholdMembership,
} from "./life";
import { COUPLE_KIND } from "./couples";
import type {
  CreateCareResponsibilityInput,
  CreateChildAuthorityInput,
  CreateEducationEnrollmentInput,
  CreateHouseholdInput,
  CreateOrganizationInput,
  CreateOrganizationParticipationInput,
  CreatePartnershipInput,
  CreateWorkRelationshipInput,
  RecordCareResponsibilityStateInput,
  RecordChildAuthorityStateInput,
  RecordEducationEnrollmentStateInput,
  RecordHouseholdLocationInput,
  RecordHouseholdMembershipStateInput,
  RecordKinshipInput,
  RecordLifeCommitmentInput,
  RecordOrganizationParticipationStateInput,
  RecordWorkRoleInput,
  RecordWorkStatusInput,
  StartHouseholdMembershipInput,
} from "./life";
import { evaluateLifeEligibility } from "./life-eligibility";
import {
  createDevelopmentProposal,
  createMindProvenance,
  recordAppraisal,
  recordTemporaryState,
} from "./mind";
import {
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import {
  drawCanonicalName,
  drawCanonicalNameForGender,
  drawCanonicalNamedIdentity,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  LEGACY_GIVEN_NAME_GENERATION_VERSION,
  type GivenNameGenerationVersion,
} from "./people";
import {
  lifePlaceByJurisdictionId,
  residentNameForJurisdiction,
} from "./life-places";
import {
  generateSchoolNames,
  stateUsps,
  type SchoolNameVersion,
} from "./school-names";
import {
  appearanceLineageFromPeople,
  derivePersonAppearance,
} from "./person-appearance";
import { generatePersonIdentity } from "./person-identity";
import { defaultPronounsForGender } from "./person-identity";
import { birthCohortGivenName } from "./given-name-cohorts";
import { DEFAULT_CORPUS_VERSION, familyNameFromParent } from "./names-data";
import { SeededRng } from "./rng";
import { drawFamilyShape } from "./family-shape";
import {
  schoolStageCalendarEnd,
  schoolStageCalendarStart,
} from "./school-stages";
import { householdLocationAt, householdMembershipsAt } from "./life-queries";
import { recordPersonDeath } from "./vitality";
import { STRAIN_THRESHOLD } from "./crisis/mortality";
import { firstThresholdDay, thresholdUnits } from "./crisis/hazard";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordDwellingOccupancyState,
  recordHousingTenureState,
  recordResourceFlowTerms,
  recordResourceObligationState,
  recordResourceTransferOutcome,
  startDwellingOccupancy,
} from "./resources";
import type {
  CreateDwellingInput,
  CreateHousingTenureInput,
  CreateResourceFlowInput,
  CreateResourceObligationInput,
  CreateResourcePositionInput,
  CreateWorkCompensationInput,
  RecordDwellingOccupancyStateInput,
  RecordHousingTenureStateInput,
  RecordResourceFlowTermsInput,
  RecordResourceObligationStateInput,
  RecordResourceTransferOutcomeInput,
  StartDwellingOccupancyInput,
} from "./resources";
import type {
  AppraisalRecordInput,
  EventKnowledgeRecordInput,
  HistoricalEventInput,
  MemoryRecordInput,
  RelationshipInteractionInput,
  TemporaryStateRecordInput,
} from "./history";
import type {
  AvailableLifeSituation,
  DevelopmentProposal,
  EntityId,
  FormativePacingBand,
  GenderIdentityKey,
  IsoDate,
  LifeEligibilityDecision,
  RelationshipInteraction,
  LifeEligibilityProvider,
  LifeRecordProvenance,
  LifeSituationKey,
  LifeSituationOption,
  Person,
  PersonFact,
  PersonIdentity,
  OccupationClassification,
  World,
} from "./types";
import { advanceWorldMinutes } from "./time-work";
import { composeWorldTimeHandlers } from "./campaigns";

/** A small, explicit production boundary; it stores no biography alongside world history. */
export type CharacterHistoryMode = "played" | "quick-generated" | "authored";

export type CharacterHistoryProvenance =
  | LifeRecordProvenance
  | { readonly kind: "event"; readonly eventStableKey: string };

export interface CharacterHistoryContextPersonInput {
  readonly stableKey: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly birthplaceJurisdictionId?: EntityId;
  /** Actual supplied household evidence; current home alone does not establish an earlier residence. */
  readonly residence?: {
    readonly householdId: EntityId;
    readonly establishedAt: IsoDate;
  };
  /**
   * Gender and pronouns for somebody the world is inventing.
   *
   * Optional because the callers that had no opinion before this existed still
   * have none, and a person the record says nothing about is written down as
   * saying nothing rather than as neutral. Callers that generate people are
   * expected to supply one from their own seeded stream — see
   * `person-identity.ts` for why generating is not the same as inferring.
   */
  readonly identity?: PersonIdentity;
}

type WithProvenance<T> = Omit<T, "provenance"> & {
  readonly provenance: CharacterHistoryProvenance;
};

/**
 * The people a plan invents, with given names that follow the year each was
 * born. Only the given name can change, and only on a stream of its own, so
 * every other draw in the plan stays where it was. Names already handed out,
 * the player's included, are passed along so a household does not end up with
 * two people of the same first name.
 */
export function withBirthCohortGivenNames(
  worldSeed: string,
  transitions: readonly CharacterHistoryTransition[],
  takenGivenNames: readonly string[],
): CharacterHistoryTransition[] {
  const taken = [...takenGivenNames];
  return transitions.map((entry) => {
    if (entry.kind !== "context-person") return entry;
    const givenName = birthCohortGivenName(
      worldSeed,
      entry.input.stableKey,
      {
        givenName: entry.input.givenName,
        familyName: entry.input.familyName,
        birthDate: entry.input.birthDate,
        gender: entry.input.identity?.gender,
      },
      taken,
    );
    taken.push(givenName);
    return givenName === entry.input.givenName
      ? entry
      : { ...entry, input: { ...entry.input, givenName } };
  });
}

/**
 * Birth-cohort given names for the people an opening seats in a public body.
 * Only the given name changes, on the stream `birthCohortGivenName` forks from
 * the world seed and each person's stable key, so no other draw moves. Members
 * of one body are strangers to each other, so no name is reserved between them.
 */
export function withBirthCohortGivenNamesForPeople(
  worldSeed: string,
  inputs: readonly CharacterHistoryContextPersonInput[],
): CharacterHistoryContextPersonInput[] {
  return inputs.map((input) => {
    const givenName = birthCohortGivenName(worldSeed, input.stableKey, {
      givenName: input.givenName,
      familyName: input.familyName,
      birthDate: input.birthDate,
      gender: input.identity?.gender,
    });
    return givenName === input.givenName ? input : { ...input, givenName };
  });
}

export type CharacterHistoryTransition =
  | {
      readonly kind: "context-person";
      readonly input: CharacterHistoryContextPersonInput;
    }
  | {
      readonly kind: "organization";
      readonly input: WithProvenance<CreateOrganizationInput>;
    }
  | {
      readonly kind: "household";
      readonly input: WithProvenance<CreateHouseholdInput>;
    }
  | {
      readonly kind: "household-location";
      readonly input: WithProvenance<
        Omit<
          RecordHouseholdLocationInput,
          "householdId" | "supersedesLocationId"
        >
      > & { readonly householdStableKey: string };
    }
  | {
      readonly kind: "household-membership";
      readonly input: WithProvenance<StartHouseholdMembershipInput>;
    }
  | {
      readonly kind: "household-membership-state";
      readonly input: WithProvenance<
        Omit<
          RecordHouseholdMembershipStateInput,
          "membershipId" | "supersedesStateId"
        >
      > & { readonly membershipStableKey: string };
    }
  | {
      readonly kind: "kinship";
      readonly input: WithProvenance<RecordKinshipInput>;
    }
  | {
      readonly kind: "partnership";
      readonly input: WithProvenance<CreatePartnershipInput>;
    }
  | {
      readonly kind: "care";
      readonly input: WithProvenance<CreateCareResponsibilityInput>;
    }
  | {
      readonly kind: "care-state";
      readonly input: WithProvenance<
        Omit<
          RecordCareResponsibilityStateInput,
          "careResponsibilityId" | "supersedesStateId"
        >
      > & { readonly careStableKey: string };
    }
  | {
      readonly kind: "authority";
      readonly input: WithProvenance<CreateChildAuthorityInput>;
    }
  | {
      readonly kind: "authority-state";
      readonly input: WithProvenance<
        Omit<
          RecordChildAuthorityStateInput,
          "childAuthorityId" | "supersedesStateId"
        >
      > & { readonly authorityStableKey: string };
    }
  | {
      readonly kind: "education";
      readonly input: WithProvenance<CreateEducationEnrollmentInput>;
    }
  | {
      readonly kind: "education-state";
      readonly input: WithProvenance<
        Omit<
          RecordEducationEnrollmentStateInput,
          "enrollmentId" | "supersedesStateId"
        >
      > & { readonly enrollmentStableKey: string };
    }
  | {
      readonly kind: "participation";
      readonly input: WithProvenance<CreateOrganizationParticipationInput>;
    }
  | {
      readonly kind: "participation-state";
      readonly input: WithProvenance<
        Omit<
          RecordOrganizationParticipationStateInput,
          "participationId" | "supersedesStateId"
        >
      > & { readonly participationStableKey: string };
    }
  | {
      readonly kind: "work";
      readonly input: WithProvenance<CreateWorkRelationshipInput>;
    }
  | {
      readonly kind: "work-status";
      readonly input: WithProvenance<
        Omit<RecordWorkStatusInput, "workRelationshipId" | "supersedesStatusId">
      > & { readonly workStableKey: string };
    }
  | {
      readonly kind: "work-role";
      readonly input: WithProvenance<
        Omit<RecordWorkRoleInput, "workRelationshipId" | "supersedesRoleId">
      > & { readonly workStableKey: string };
    }
  | {
      readonly kind: "commitment";
      readonly input: WithProvenance<RecordLifeCommitmentInput>;
    }
  | {
      readonly kind: "resource-position";
      readonly input: WithProvenance<CreateResourcePositionInput>;
    }
  | {
      readonly kind: "resource-flow";
      readonly input: WithProvenance<CreateResourceFlowInput>;
    }
  | {
      readonly kind: "resource-flow-terms";
      readonly input: WithProvenance<
        Omit<
          RecordResourceFlowTermsInput,
          "resourceFlowId" | "supersedesTermsId"
        >
      > & { readonly resourceFlowStableKey: string };
    }
  | {
      readonly kind: "resource-transfer";
      readonly input: WithProvenance<
        Omit<RecordResourceTransferOutcomeInput, "resourceFlowId">
      > & { readonly resourceFlowStableKey: string };
    }
  | {
      readonly kind: "work-compensation";
      readonly input: WithProvenance<
        Omit<CreateWorkCompensationInput, "workRelationshipId">
      > & { readonly workStableKey: string };
    }
  | {
      readonly kind: "dwelling";
      readonly input: WithProvenance<CreateDwellingInput>;
    }
  | {
      readonly kind: "dwelling-occupancy";
      readonly input: WithProvenance<
        Omit<StartDwellingOccupancyInput, "dwellingId">
      > & {
        readonly dwellingStableKey: string;
      };
    }
  | {
      readonly kind: "dwelling-occupancy-state";
      readonly input: WithProvenance<
        Omit<
          RecordDwellingOccupancyStateInput,
          "dwellingOccupancyId" | "supersedesStateId"
        >
      > & { readonly occupancyStableKey: string };
    }
  | {
      readonly kind: "housing-tenure";
      readonly input: WithProvenance<
        Omit<CreateHousingTenureInput, "dwellingId">
      > & {
        readonly dwellingStableKey: string;
      };
    }
  | {
      readonly kind: "housing-tenure-state";
      readonly input: WithProvenance<
        Omit<
          RecordHousingTenureStateInput,
          "housingTenureId" | "supersedesStateId"
        >
      > & { readonly housingTenureStableKey: string };
    }
  | {
      readonly kind: "resource-obligation";
      readonly input: WithProvenance<
        Omit<
          CreateResourceObligationInput,
          "resourceFlowId" | "careResponsibilityId" | "housingTenureId"
        >
      > & {
        readonly resourceFlowStableKey: string;
        readonly careStableKey: string | null;
        readonly housingTenureStableKey: string | null;
      };
    }
  | {
      readonly kind: "resource-obligation-state";
      readonly input: WithProvenance<
        Omit<
          RecordResourceObligationStateInput,
          "resourceObligationId" | "supersedesStateId"
        >
      > & { readonly resourceObligationStableKey: string };
    }
  | { readonly kind: "event"; readonly input: HistoricalEventInput }
  | {
      readonly kind: "memory";
      readonly input: Omit<MemoryRecordInput, "eventId"> & {
        readonly eventStableKey: string;
      };
    }
  | {
      readonly kind: "knowledge";
      readonly input: Omit<EventKnowledgeRecordInput, "eventId"> & {
        readonly eventStableKey: string;
      };
    }
  | {
      readonly kind: "interaction";
      readonly input: Omit<RelationshipInteractionInput, "eventId"> & {
        readonly eventStableKey: string | null;
      };
    }
  | {
      readonly kind: "appraisal";
      readonly input: Omit<
        AppraisalRecordInput,
        "eventId" | "memoryId" | "eventKnowledgeId" | "provenance"
      > & {
        readonly eventStableKey: string;
        readonly memoryStableKey: string | null;
        readonly knowledgeStableKey: string | null;
      };
    }
  | {
      readonly kind: "temporary-state";
      readonly input: Omit<TemporaryStateRecordInput, "provenance">;
    }
  | {
      readonly kind: "development-proposal";
      readonly input: {
        readonly stableKey: string;
        readonly personId: EntityId;
        readonly proposedAt: IsoDate;
        readonly target: DevelopmentProposal["target"];
        readonly direction: DevelopmentProposal["direction"];
        readonly eventStableKeys: readonly string[];
        readonly repetitionKey: string | null;
        readonly rationale: string;
      };
    };

export interface CharacterHistoryPlan {
  readonly stableKey: string;
  readonly mode: CharacterHistoryMode;
  readonly personId: EntityId;
  readonly transitions: readonly CharacterHistoryTransition[];
}

export interface CharacterHistoryApplication {
  readonly world: World;
  readonly eventIds: Readonly<Record<string, EntityId>>;
  readonly contextPersonIds: Readonly<Record<string, EntityId>>;
  readonly developmentProposals: readonly DevelopmentProposal[];
}

export function characterHistoryContextPersonId(
  world: World,
  stableKey: string,
): EntityId {
  return createStableId("person", `${world.id}:life-context-v1:${stableKey}`);
}

/** Lineage follows immutable people tables; external edits get a fresh read. */
const CONTEXT_LINEAGES = new WeakMap<
  World["people"],
  ReturnType<typeof appearanceLineageFromPeople>
>();

function contextAppearanceLineage(world: World) {
  const cached = CONTEXT_LINEAGES.get(world.people);
  if (cached) return cached;
  const lineage = appearanceLineageFromPeople(Object.values(world.people));
  CONTEXT_LINEAGES.set(world.people, lineage);
  return lineage;
}

/** Creates the smallest persistent social context person through one validated writer. */
function buildCharacterHistoryContextPerson(
  world: World,
  input: CharacterHistoryContextPersonInput,
  lineage: ReturnType<typeof appearanceLineageFromPeople>,
): Person | null {
  assertNonEmpty(input.stableKey, "Context-person stable key");
  assertNonEmpty(input.givenName, "Context-person given name");
  assertNonEmpty(input.familyName, "Context-person family name");
  const birthDate = makeIsoDate(input.birthDate);
  if (birthDate > world.currentDate) {
    throw new Error("A context person cannot be born after the current date.");
  }
  if (!world.jurisdictions[input.homeJurisdictionId]) {
    throw new Error("A context person requires an existing home jurisdiction.");
  }
  const residenceAt = makeIsoDate(
    input.residence?.establishedAt ?? world.currentDate,
  );
  if (residenceAt < birthDate || residenceAt > world.currentDate)
    throw new Error(
      "Context residence must fall between birth and the current date.",
    );
  if (
    input.residence &&
    householdLocationAt(world, input.residence.householdId, {
      asOfDate: residenceAt,
      historySequenceExclusive: world.history.nextSequence,
    })?.jurisdictionId !== input.homeJurisdictionId
  )
    throw new Error(
      "Context residence requires the supplied household's dated home.",
    );
  const birthplace = input.birthplaceJurisdictionId ?? input.homeJurisdictionId;
  if (!world.jurisdictions[birthplace]) {
    throw new Error(
      "A context person requires an existing birthplace jurisdiction.",
    );
  }
  const id = characterHistoryContextPersonId(world, input.stableKey);
  if (world.people[id]) return null;
  const fullName = `${input.givenName} ${input.familyName}`;
  const provenance = {
    method: "manual" as const,
    sourceEventId: null,
    note: "Character-history bounded context population.",
  };
  const facts: readonly PersonFact[] = [
    {
      id: createStableId("fact", `${id}:birth-date`),
      stableKey: "birth-date",
      kind: "birth-date",
      occurredAt: birthDate,
      jurisdictionId: null,
      summary: `${fullName}'s birth date is established.`,
      provenance,
    },
    {
      id: createStableId("fact", `${id}:birthplace`),
      stableKey: "birthplace",
      kind: "birthplace",
      occurredAt: birthDate,
      jurisdictionId: birthplace,
      summary: `${fullName}'s birthplace is established.`,
      provenance,
    },
    {
      id: createStableId("fact", `${id}:residence:initial`),
      stableKey: "residence:initial",
      kind: "residence",
      occurredAt: residenceAt,
      endedAt: null,
      jurisdictionId: input.homeJurisdictionId,
      summary: `${fullName} resides in the recorded home jurisdiction.`,
      provenance,
    },
  ];
  const person: Person = {
    id,
    generationKey: `life-context-v1:${input.stableKey}`,
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate,
    homeJurisdictionId: input.homeJurisdictionId,
    ...(input.identity === undefined ? {} : { identity: input.identity }),
    detailLevel: "lightweight",
    /*
     * The household has faces too.
     *
     * `createLightweightPerson` and `createStartingPerson` both derive an
     * appearance; this writer did not, and it is the one that makes the people
     * a life is written around — the guardian, the parent, the sibling. So the
     * player got an appearance and everyone they live with got none, and
     * `resolvePersonPortrait` refused them at its very first check with
     * `appearance-unassigned`. On screen that is initials, and it looks exactly
     * like missing art. It is not: nothing had been asked to draw them.
     *
     * Derived from the person's own id through the same canonical writer, so it
     * is deterministic, stable across saves and reloads, and identical for the
     * same person every time. No seed is chosen here, no demographic is
     * asserted, and nobody is rerolled: an appearance is a stable handle for a
     * renderer, not a claim about who this person is.
     *
     * The recipe follows the PEOPLE already in the world rather than a moving
     * default or "production means v2". A life created under v1 keeps a v1
     * household; a life declared under v2 keeps a v2 household. Mixed stamps
     * fail closed to the default recipe.
     */
    appearance: derivePersonAppearance(
      id,
      lineage.recipeVersion,
      lineage.catalogGeneration,
    ),
    establishedFacts: facts,
  };
  return person;
}

export function createCharacterHistoryContextPerson(
  world: World,
  input: CharacterHistoryContextPersonInput,
): World {
  const person = buildCharacterHistoryContextPerson(
    world,
    input,
    contextAppearanceLineage(world),
  );
  if (!person) return admitContextResidences(world, [input]);
  const next: World = {
    ...world,
    people: { ...world.people, [person.id]: person },
    personOrder: [...world.personOrder, person.id],
  };
  const admitted = admitContextResidences(next, [input]);
  assertWorldIntegrity(admitted);
  return admitted;
}

/**
 * The same writer for many people at once, for an opening that seats a whole
 * public body. Each input is validated exactly as the single writer does and
 * receives the lineage the world already declares; adding people stamped with
 * that lineage cannot change it, so it is read once. Integrity is asserted
 * once over the result instead of once per person.
 */
export function createCharacterHistoryContextPeople(
  world: World,
  inputs: readonly CharacterHistoryContextPersonInput[],
): World {
  if (inputs.length === 0) return world;
  const lineage = contextAppearanceLineage(world);
  let people: Record<EntityId, Person> | undefined;
  let personOrder: EntityId[] | undefined;
  let probe = world;
  for (const input of inputs) {
    const person = buildCharacterHistoryContextPerson(probe, input, lineage);
    if (!person) continue;
    // Existing inputs still pass the same validation, but need no table copy.
    if (!people) {
      people = {};
      // Preserve the table's own key order, including after a save reload.
      // An explicit copy avoids V8's slower spread for this large dictionary.
      for (const id of Object.keys(world.people) as EntityId[])
        people[id] = world.people[id]!;
      personOrder = [...world.personOrder];
      probe = { ...world, people };
    }
    people[person.id] = person;
    personOrder!.push(person.id);
  }
  if (!people || !personOrder) return admitContextResidences(world, inputs);
  const next: World = { ...world, people, personOrder };
  // Appended people carry this exact lineage, so they cannot change it.
  CONTEXT_LINEAGES.set(people, lineage);
  carryPeopleReadIndexesAfterAppend(world, next);
  const admitted = admitContextResidences(next, inputs);
  assertWorldIntegrity(admitted);
  return admitted;
}

function admitContextResidences(
  world: World,
  inputs: readonly CharacterHistoryContextPersonInput[],
): World {
  let next = world;
  for (const input of inputs) {
    if (!input.residence) continue;
    const personId = characterHistoryContextPersonId(world, input.stableKey);
    if (
      householdMembershipsAt(next, personId, {
        asOfDate: input.residence.establishedAt,
        historySequenceExclusive: next.history.nextSequence,
      }).some(
        (membership) =>
          membership.household.id === input.residence!.householdId,
      )
    )
      continue;
    next = startHouseholdMembership(next, {
      stableKey: `${input.stableKey}:residence:initial`,
      personId,
      householdId: input.residence.householdId,
      startedAt: input.residence.establishedAt,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: {
        kind: "generated",
        generatorKey: `life-context-v1:${input.stableKey}`,
      },
    });
  }
  return next;
}

/** A seeded day inside an age year for an authored pre-Begin event. */
function preStartEventDate(
  world: World,
  birthDate: IsoDate,
  age: number,
  key: string,
  occupiedMonths?: ReadonlyMap<string, number>,
): IsoDate {
  const first = dateAtAge(birthDate, age);
  const days = daysBetween(first, dateAtAge(birthDate, age + 1));
  return choosePreStartEventDate(world, first, days, key, occupiedMonths);
}

function preStartEventDateInYear(
  world: World,
  year: number,
  key: string,
  occupiedMonths: ReadonlyMap<string, number>,
): IsoDate {
  const first = makeIsoDate(`${year}-01-01`);
  const days = daysBetween(first, makeIsoDate(`${year + 1}-01-01`));
  return choosePreStartEventDate(world, first, days, key, occupiedMonths);
}

function choosePreStartEventDate(
  world: World,
  first: IsoDate,
  days: number,
  key: string,
  occupiedMonths?: ReadonlyMap<string, number>,
): IsoDate {
  // PLACEHOLDER(wave2): replace these fictional season weights with a sourced
  // event-type timing profile. They distribute authored shared moments and
  // moves inside a year of life without turning every event into a birthday.
  const seasonWeight = [1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 1] as const;
  const dates = Array.from({ length: days }, (_, offset) =>
    addDays(first, offset),
  );
  // A discretionary shared moment uses a month with the fewest already
  // recorded lines for this person. School dates and their linked job ends
  // retain their calendar dates; season weights break the remaining ties.
  const leastOccupied = occupiedMonths
    ? Math.min(
        ...dates.map((date) => occupiedMonths.get(date.slice(5, 7)) ?? 0),
      )
    : 0;
  const weights = Array.from({ length: days }, (_, offset) => {
    const month = dates[offset]!.slice(5, 7);
    return occupiedMonths && (occupiedMonths.get(month) ?? 0) > leastOccupied
      ? 0
      : seasonWeight[Number(month) - 1]!;
  });
  const total = weights.reduce<number>((sum, weight) => sum + weight, 0);
  let draw = new SeededRng(world.seed)
    .fork(`pre-start-event-date:${key}`)
    .integer(0, total);
  for (let offset = 0; offset < days; offset += 1) {
    draw -= weights[offset]!;
    if (draw < 0) return dates[offset]!;
  }
  throw new Error("A pre-start event needs a date in its selected year.");
}

/** Dated canonical rows that can appear in the person's ordinary Journal. */
function preStartVisibleDates(world: World, personId: EntityId): IsoDate[] {
  const dates: IsoDate[] = [];
  const count = (date: IsoDate) => {
    if (date >= world.currentDate) return;
    dates.push(date);
  };
  const enrollmentIds = new Set(
    world.history.educationEnrollments
      .filter((row) => row.personId === personId)
      .map((row) => row.id),
  );
  for (const row of world.history.educationEnrollmentStates)
    if (enrollmentIds.has(row.enrollmentId)) count(row.effectiveAt);
  const workIds = new Set(
    world.history.workRelationships
      .filter((row) => row.personId === personId)
      .map((row) => row.id),
  );
  for (const row of world.history.workStatuses)
    if (workIds.has(row.workRelationshipId)) count(row.effectiveAt);
  for (const event of world.history.events)
    if (
      event.participants.some(
        (row) =>
          row.personId === personId &&
          (row.role.startsWith("presence:") || row.role.startsWith("agency:")),
      )
    )
      count(event.occurredAt);
  return dates;
}

function preStartVisibleMonthCounts(
  world: World,
  personId: EntityId,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of preStartVisibleDates(world, personId))
    countPreStartMonth(counts, date);
  return counts;
}

/** Finds a real uncovered childhood span in the existing dated rows. */
function preStartUncoveredChildhoodYear(
  world: World,
  personId: EntityId,
  newMomentAt: IsoDate,
): number | null {
  const birthDate = world.people[personId]!.birthDate;
  const years = [
    ...new Set(
      [...preStartVisibleDates(world, personId), newMomentAt]
        .filter((date) => date >= birthDate && ageOnDate(birthDate, date) < 18)
        .map((date) => Number(date.slice(0, 4))),
    ),
  ].sort((left, right) => left - right);
  for (let index = 1; index < years.length; index += 1) {
    const earlier = years[index - 1]!;
    const later = years[index]!;
    if (later - earlier > 3) return Math.floor((earlier + later) / 2);
  }
  return null;
}

function countPreStartMonth(counts: Map<string, number>, date: IsoDate): void {
  const month = date.slice(5, 7);
  counts.set(month, (counts.get(month) ?? 0) + 1);
}

function drawCloseRelativeName(
  world: World,
  key: string,
  gender: GenderIdentityKey,
  corpusVersion: string,
  taken: string[],
): { readonly givenName: string; readonly familyName: string } {
  const normalized = new Set(
    taken.map((name) => name.toLocaleLowerCase("en-US")),
  );
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const name = drawCanonicalNameForGender(
      new SeededRng(world.seed).fork(`${key}:name:${attempt}`),
      gender,
      corpusVersion,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
      taken,
    );
    if (normalized.has(name.givenName.toLocaleLowerCase("en-US"))) continue;
    taken.push(name.givenName);
    return name;
  }
  throw new Error("The close-circle name pool has no distinct given name.");
}

function existingCloseGivenNames(world: World, personId: EntityId): string[] {
  const relativeIds = new Set(
    world.history.kinshipRelationships
      .filter((row) => row.personIds.includes(personId))
      .flatMap((row) => row.personIds)
      .filter((id) => id !== personId),
  );
  return [
    world.people[personId]!.givenName,
    ...[...relativeIds]
      .map((id) => world.people[id]?.givenName)
      .filter((name): name is string => name !== undefined),
  ];
}

interface AdultFamilyInput {
  readonly key: string;
  readonly player: Person;
  readonly firstParent: EntityId;
  readonly jurisdictionId: EntityId;
  readonly rng: SeededRng;
  readonly corpusVersion: string;
  readonly taken: string[];
  readonly generated: {
    readonly kind: "generated";
    readonly generatorKey: string;
  };
}

interface AdultFamily {
  readonly world: World;
  readonly secondParentId: EntityId | null;
  /** Brothers and sisters, oldest first. */
  readonly siblingIds: readonly EntityId[];
  readonly grandparentIds: readonly EntityId[];
}

/**
 * A family drawn from real shares (see `family-shape.ts`): a second parent
 * only in the share of homes that had one, their age gap drawn, brothers and
 * sisters by count and spacing, and grandparents on each recorded parent's
 * side. One rule for every place.
 */
function drawnAdultFamily(
  world: World,
  {
    key,
    player,
    firstParent,
    jurisdictionId,
    corpusVersion,
    taken,
  }: AdultFamilyInput,
): AdultFamily {
  const shape = drawFamilyShape(world, key);
  const first = world.people[firstParent]!;
  const firstGender = first.identity?.gender;
  const secondParentKey = `${key}:second-parent`;
  const people: CharacterHistoryContextPersonInput[] = [];
  let secondBirthDate: IsoDate | null = null;
  if (shape.secondParent) {
    const gender: "female" | "male" =
      firstGender === "female" ? "male" : "female";
    // The gap is measured from the mother, so it runs the other way when the
    // first parent is the father. Nobody becomes a parent before 16.
    const drawnGap =
      firstGender === "female"
        ? shape.parentAgeGapYears
        : -shape.parentAgeGapYears;
    const candidate = yearsBefore(first.birthDate, drawnGap);
    secondBirthDate =
      candidate > yearsBefore(player.birthDate, 16)
        ? yearsBefore(player.birthDate, 16)
        : candidate;
    people.push({
      stableKey: secondParentKey,
      ...drawCloseRelativeName(
        world,
        secondParentKey,
        gender,
        corpusVersion,
        taken,
      ),
      familyName: player.familyName,
      identity: { gender, pronouns: defaultPronounsForGender(gender) },
      birthDate: secondBirthDate,
      homeJurisdictionId: jurisdictionId,
    });
  }
  // A brother or sister is kept only when the first parent was 16 to 49 at
  // their birth and the birth is on or before the day the world starts.
  const siblingKeys: string[] = [];
  for (const [index, offset] of shape.siblingOffsetsYears.entries()) {
    const birthDate = yearsBefore(player.birthDate, offset);
    const parentAge = ageOnDate(first.birthDate, birthDate);
    if (birthDate > world.currentDate || parentAge < 16 || parentAge > 49)
      continue;
    const stableKey = `${key}:sibling:${index + 1}`;
    const identity = generatePersonIdentity(
      new SeededRng(world.seed).fork(stableKey),
    );
    siblingKeys.push(stableKey);
    people.push({
      stableKey,
      ...drawCloseRelativeName(
        world,
        stableKey,
        identity.gender,
        corpusVersion,
        taken,
      ),
      familyName: player.familyName,
      identity,
      birthDate,
      homeJurisdictionId: jurisdictionId,
    });
  }
  const sides: { parentKey: string | null; parentBirth: IsoDate }[] = [
    { parentKey: null, parentBirth: first.birthDate },
    ...(secondBirthDate === null
      ? []
      : [{ parentKey: secondParentKey, parentBirth: secondBirthDate }]),
  ];
  // The family name comes down the father's side when there is a father and
  // the first recorded parent is the mother; otherwise down the first side.
  const namingSide = shape.secondParent && firstGender === "female" ? 1 : 0;
  const grandparentKeys: { stableKey: string; side: number }[] = [];
  for (const [side, { parentBirth }] of sides.entries()) {
    // A grandparent couple shares the surname their child was born with: the
    // naming side carries the player's, and the other side's couple shares
    // one drawn surname (the other parent's birth name).
    let sideFamilyName: string | null =
      side === namingSide ? player.familyName : null;
    for (const [slot, gender] of (["female", "male"] as const).entries()) {
      const grandparentAge = shape.grandparentAgesAtBirth[side]![slot];
      if (grandparentAge === null || grandparentAge === undefined) continue;
      const stableKey = `${key}:grandparent:${side + 1}:${slot + 1}`;
      grandparentKeys.push({ stableKey, side });
      const drawn = drawCloseRelativeName(
        world,
        stableKey,
        gender,
        corpusVersion,
        taken,
      );
      sideFamilyName ??= drawn.familyName;
      people.push({
        stableKey,
        ...drawn,
        familyName: sideFamilyName,
        identity: { gender, pronouns: defaultPronounsForGender(gender) },
        birthDate: yearsBefore(parentBirth, grandparentAge),
        homeJurisdictionId: jurisdictionId,
      });
    }
  }
  let next = createCharacterHistoryContextPeople(world, people);
  const secondParentId =
    secondBirthDate === null
      ? null
      : characterHistoryContextPersonId(next, secondParentKey);
  const siblingIds = siblingKeys.map((stableKey) =>
    characterHistoryContextPersonId(next, stableKey),
  );
  const parents = [
    firstParent,
    ...(secondParentId === null ? [] : [secondParentId]),
  ];
  const kinship = (
    stableKey: string,
    personIds: readonly [EntityId, EntityId],
    establishedAt: IsoDate,
    kind:
      | "lineal:parent-child"
      | "collateral:sibling"
      | "lineal:grandparent-grandchild",
  ) => {
    next = recordKinship(next, {
      stableKey,
      personIds,
      establishedAt,
      kind,
      provenance: {
        kind: "authored",
        note: `${shape.estimate.note} Comparable people: ${shape.estimate.samples.map((row) => row.personId).join(", ")}; kinships: ${shape.estimate.samples.flatMap((row) => row.kinshipIds).join(", ")}.`,
      },
    });
  };
  if (secondParentId !== null)
    kinship(
      `${key}:parent`,
      [secondParentId, player.id],
      player.birthDate,
      "lineal:parent-child",
    );
  for (const [index, siblingId] of siblingIds.entries()) {
    const siblingBirth = next.people[siblingId]!.birthDate;
    const together =
      siblingBirth < player.birthDate ? player.birthDate : siblingBirth;
    kinship(
      `${key}:sibling:${index + 1}`,
      [siblingId, player.id],
      together,
      "collateral:sibling",
    );
    for (const [parentIndex, parentId] of parents.entries())
      kinship(
        `${key}:sibling:${index + 1}:parent:${parentIndex + 1}`,
        [parentId, siblingId],
        siblingBirth,
        "lineal:parent-child",
      );
    for (const [otherIndex, otherId] of siblingIds.entries()) {
      if (otherIndex <= index) continue;
      const otherBirth = next.people[otherId]!.birthDate;
      kinship(
        `${key}:sibling:${index + 1}:sibling:${otherIndex + 1}`,
        [siblingId, otherId],
        otherBirth > siblingBirth ? otherBirth : siblingBirth,
        "collateral:sibling",
      );
    }
  }
  const grandparentIds = grandparentKeys.map(({ stableKey, side }) => {
    const grandparentId = characterHistoryContextPersonId(next, stableKey);
    const parentId = parents[side]!;
    kinship(
      `${stableKey}:parent`,
      [grandparentId, parentId],
      next.people[parentId]!.birthDate,
      "lineal:parent-child",
    );
    kinship(
      `${stableKey}:grandchild`,
      [grandparentId, player.id],
      player.birthDate,
      "lineal:grandparent-grandchild",
    );
    for (const [index, siblingId] of siblingIds.entries())
      kinship(
        `${stableKey}:grandchild:${index + 1}`,
        [grandparentId, siblingId],
        next.people[siblingId]!.birthDate,
        "lineal:grandparent-grandchild",
      );
    return grandparentId;
  });
  return { world: next, secondParentId, siblingIds, grandparentIds };
}

/**
 * Deaths of older relatives before the start, by the game's own ordinary
 * mortality (./crisis/mortality.ts): the same SSA 2023 life table and the same
 * one strain threshold the running world uses (Ruling 29), accumulated from
 * the last day the record shows the relative alive (the birth of their
 * youngest recorded child) up to the start. Nothing is rolled; no cause is
 * inferred, and no serious episode is written for a death before the start. The 2023 table is applied to earlier decades too, which
 * slightly shortens lives the record places before it. A relative the opening
 * already seats in a home at the start is living there, so is never given a
 * death before it.
 */
function recordRelativeDeaths(
  world: World,
  next: World,
  key: string,
  relativeIds: readonly EntityId[],
): World {
  for (const relativeId of relativeIds) {
    if (
      next.history.personDeaths.some((death) => death.personId === relativeId)
    )
      continue;
    // Somebody the opening already seats in a home today is alive today:
    // that record is the later and stronger one, so the life table is not
    // run over it. Only relatives with no present home can have died.
    if (householdMembershipsAt(next, relativeId).length > 0) continue;
    const relative = next.people[relativeId]!;
    const knownAlive = next.history.kinshipRelationships
      .filter(
        (row) =>
          row.kind === "lineal:parent-child" &&
          row.personIds.includes(relativeId),
      )
      .flatMap((row) => row.personIds)
      .map((id) => next.people[id]!.birthDate)
      .filter((birth) => birth > relative.birthDate)
      .reduce(
        (latest, birth) => (birth > latest ? birth : latest),
        relative.birthDate,
      );
    const diedAt = firstThresholdDay(
      {
        birthDate: relative.birthDate,
        category: "equal-mixture",
        exposureStart: knownAlive,
        multipliers: [],
      },
      thresholdUnits(STRAIN_THRESHOLD),
      knownAlive,
      world.currentDate,
    );
    if (diedAt === null) continue;
    if (diedAt > world.currentDate) continue;
    next = recordPersonDeath(next, {
      stableKey: `${key}:relative-death:${relativeId}`,
      personId: relativeId,
      diedAt,
      causeKey: "cause:unknown",
      sourceEntityIds: [relativeId],
      summary: `${relative.givenName} ${relative.familyName} died. The cause is not recorded.`,
      provenance: {
        kind: "authored",
        note: "Generated fictional family history; the death day follows the game's ordinary mortality and no cause is inferred.",
      },
    });
  }
  return next;
}

/**
 * The drawn family for an adult New Game start, around the parent the
 * summarized earlier life already recorded: a second parent in the share of
 * homes that had one, brothers and sisters, and grandparents on each side.
 * Runs once; a second call finds its own records and returns the world.
 */
export function establishDrawnAdultFamily(
  world: World,
  input: { readonly personId: EntityId; readonly jurisdictionId: EntityId },
): World {
  const key = `drawn-adult-family-v2:${input.personId}`;
  if (
    world.people[
      characterHistoryContextPersonId(world, `${key}:grandparent:1:1`)
    ]
  )
    return world;
  const player = world.people[input.personId];
  if (!player) throw new Error(`Missing family person ${input.personId}.`);
  const firstParent = world.history.kinshipRelationships
    .filter(
      (row) =>
        row.kind === "lineal:parent-child" && row.personIds.includes(player.id),
    )
    .flatMap((row) => row.personIds.filter((id) => id !== player.id))
    .find((id) => world.people[id]!.birthDate < player.birthDate);
  if (!firstParent) return world;
  const rng = new SeededRng(world.seed).fork(key);
  const family = drawnAdultFamily(world, {
    key,
    player,
    firstParent,
    jurisdictionId: input.jurisdictionId,
    rng,
    corpusVersion: player.corpusVersion ?? DEFAULT_CORPUS_VERSION,
    taken: existingCloseGivenNames(world, player.id),
    generated: { kind: "generated", generatorKey: key },
  });
  return recordRelativeDeaths(world, family.world, key, [
    firstParent,
    ...(family.secondParentId === null ? [] : [family.secondParentId]),
    ...family.grandparentIds,
  ]);
}

/**
 * Versioned close-circle and adult-year construction for a new life. This is
 * invoked only while the pre-start world is still at its prior-year date.
 * The people, kinships, work and shared moments are canonical records; no
 * journal reader has to manufacture an unrecorded past.
 */
export function establishPreStartAdultHistory(
  world: World,
  input: {
    readonly onCheckpoint?: (world: World, personId: EntityId) => void;
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly employerId: EntityId;
    readonly employerName: string;
    readonly employerFormedAt: IsoDate;
    readonly monthlyWageMinor: number;
    readonly monthlyWageAtDate?: (onDate: IsoDate) => number;
    readonly workTitle?: string;
    readonly occupationClassification?: OccupationClassification;
  },
): World {
  const key = `pre-start-adult-history-v2:${input.personId}`;
  if (
    world.history.events.some((event) => event.stableKey === `${key}:year:18`)
  )
    return world;
  const player = world.people[input.personId];
  if (!player)
    throw new Error(`Missing adult-history person ${input.personId}.`);
  const age = ageOnDate(player.birthDate, world.currentDate);
  if (age < 19) return world;
  const firstParent = world.history.kinshipRelationships
    .find(
      (row) =>
        row.kind === "lineal:parent-child" && row.personIds.includes(player.id),
    )
    ?.personIds.find((id) => id !== player.id);
  if (!firstParent)
    throw new Error("Adult history needs the established parent.");
  const rng = new SeededRng(world.seed).fork(key);
  const corpusVersion = player.corpusVersion ?? DEFAULT_CORPUS_VERSION;
  const taken = existingCloseGivenNames(world, player.id);
  const generated = { kind: "generated" as const, generatorKey: key };
  const family = drawnAdultFamily(world, {
    key,
    player,
    firstParent,
    jurisdictionId: input.jurisdictionId,
    rng,
    corpusVersion,
    taken,
    generated,
  });
  const parentId = family.secondParentId;
  const siblingIds = family.siblingIds;
  const grandparentIds = family.grandparentIds;
  let next = family.world;
  // The player's own partner and child, from the day each joined the family.
  const ownFamily: { readonly personId: EntityId; readonly from: IsoDate }[] =
    [];

  // The older starting ages have a recorded partner and grown child in their
  // close circle. Neither is silently placed in a lives-alone household.
  if (age >= 45) {
    const partnerKey = `${key}:partner`;
    const childKey = `${key}:child`;
    const partnerIdentity = generatePersonIdentity(rng.fork(partnerKey));
    const childIdentity = generatePersonIdentity(rng.fork(childKey));
    next = createCharacterHistoryContextPeople(next, [
      {
        stableKey: partnerKey,
        ...drawCloseRelativeName(
          world,
          partnerKey,
          partnerIdentity.gender,
          corpusVersion,
          taken,
        ),
        identity: partnerIdentity,
        birthDate: yearsBefore(player.birthDate, -2),
        homeJurisdictionId: input.jurisdictionId,
      },
      {
        stableKey: childKey,
        ...drawCloseRelativeName(
          world,
          childKey,
          childIdentity.gender,
          corpusVersion,
          taken,
        ),
        familyName: player.familyName,
        identity: childIdentity,
        birthDate: preStartEventDate(
          world,
          player.birthDate,
          30,
          `${key}:child-birth`,
        ),
        homeJurisdictionId: input.jurisdictionId,
      },
    ]);
    const partnerId = characterHistoryContextPersonId(next, partnerKey);
    const childId = characterHistoryContextPersonId(next, childKey);
    const childBirthDate = next.people[childId]!.birthDate;
    next = createPartnership(next, {
      stableKey: `${key}:partnership`,
      personIds: [player.id, partnerId],
      startedAt: preStartEventDate(
        world,
        player.birthDate,
        27,
        `${key}:partnership`,
      ),
      kind: COUPLE_KIND,
      provenance: generated,
    });
    for (const parentId of [player.id, partnerId])
      next = recordKinship(next, {
        stableKey: `${key}:child-of:${parentId}`,
        personIds: [parentId, childId],
        establishedAt: childBirthDate,
        kind: "lineal:parent-child",
        provenance: generated,
      });
    ownFamily.push(
      {
        personId: partnerId,
        from: preStartEventDate(
          world,
          player.birthDate,
          27,
          `${key}:partnership`,
        ),
      },
      { personId: childId, from: childBirthDate },
    );
  }
  next = recordRelativeDeaths(world, next, key, [
    firstParent,
    ...(parentId === null ? [] : [parentId]),
    ...grandparentIds,
  ]);

  const adultStart = dateAtAge(player.birthDate, 18);
  const recentStart = yearsBefore(world.currentDate, Math.min(age - 18, 8));
  const workStart =
    recentStart > input.employerFormedAt ? recentStart : input.employerFormedAt;
  if (workStart <= world.currentDate) {
    next = createWorkRelationship(next, {
      stableKey: `${key}:local-work`,
      personId: player.id,
      organizationId: input.employerId,
      startedAt: workStart < adultStart ? adultStart : workStart,
      kind: "employment:local-business",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: generated,
      initialRole: {
        title: input.workTitle ?? "Staff member",
        occupationClassification:
          input.occupationClassification ?? "custom:local-business-staff",
        locationJurisdictionId: input.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 40 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "interruptible",
          locationJurisdictionId: input.jurisdictionId,
        },
      },
    });
    // Dated terms preserve the earlier nominal pay. Transfers remain separate;
    // the forward clock settles only the periods it actually advances through.
    next = createResourceFlow(next, {
      stableKey: `${key}:local-pay`,
      source: { kind: "organization", organizationId: input.employerId },
      recipient: { kind: "person", personId: player.id },
      startsAt: input.monthlyWageAtDate
        ? next.history.workRelationships.at(-1)!.startedAt
        : world.currentDate,
      amount: money(
        input.monthlyWageAtDate?.(
          next.history.workRelationships.at(-1)!.startedAt,
        ) ?? input.monthlyWageMinor,
        "USD",
      ),
      cadenceKind: "schedule:monthly",
      basisKind: "compensation:wages",
      basisReference: {
        kind: "work",
        workRelationshipId: next.history.workRelationships.at(-1)!.id,
      },
      restrictionKind: null,
      jurisdictionId: input.jurisdictionId,
      provenance: generated,
    });
    if (input.monthlyWageAtDate && workStart < world.currentDate) {
      const flow = next.history.resourceFlows.at(-1)!;
      next = recordResourceFlowTerms(next, {
        stableKey: `${key}:local-pay-current`,
        resourceFlowId: flow.id,
        effectiveAt: world.currentDate,
        amount: money(input.monthlyWageMinor, "USD"),
        cadenceKind: "schedule:monthly",
        status: "active",
        reason: "Recorded pay at the start of these years.",
        supersedesTermsId: next.history.resourceFlowTerms.at(-1)!.id,
        provenance: generated,
      });
    }
  }

  const aliveOn = (personId: EntityId, date: IsoDate): boolean =>
    !next.history.personDeaths.some(
      (death) => death.personId === personId && death.diedAt <= date,
    );
  /**
   * Who shares a recorded family moment: whoever is alive on that day,
   * parents first while the player is young; later brothers and sisters, then
   * the player's own partner and child.
   */
  const companionOn = (date: IsoDate, year: number): EntityId | null => {
    const parents = [firstParent, ...(parentId === null ? [] : [parentId])];
    const own = ownFamily
      .filter((member) => member.from <= date)
      .map((member) => member.personId);
    const order =
      year < 35
        ? [...parents, ...siblingIds, ...own]
        : [...siblingIds, ...own, ...parents];
    return order.find((personId) => aliveOn(personId, date)) ?? null;
  };
  const playerName = `${player.givenName} ${player.familyName}`;
  const occupiedMonths = preStartVisibleMonthCounts(next, player.id);
  const earlyKey = `${key}:early-family-time`;
  const earlyAt = preStartEventDate(
    world,
    player.birthDate,
    2,
    earlyKey,
    occupiedMonths,
  );
  countPreStartMonth(occupiedMonths, earlyAt);
  const gapYear = preStartUncoveredChildhoodYear(next, player.id, earlyAt);
  const gapKey = gapYear === null ? null : `${key}:childhood-gap:${gapYear}`;
  const gapAt =
    gapYear === null || gapKey === null
      ? null
      : preStartEventDateInYear(world, gapYear, gapKey, occupiedMonths);
  for (const [momentKey, occurredAt] of [
    [earlyKey, earlyAt],
    ...(gapKey && gapAt ? [[gapKey, gapAt] as const] : []),
  ] as const) {
    const withId =
      companionOn(occurredAt, ageOnDate(player.birthDate, occurredAt)) ??
      firstParent;
    const withName = next.people[withId]!.givenName;
    next = recordWorldEvent(next, {
      stableKey: momentKey,
      type: "life.family-time",
      occurredAt,
      recordedAt: world.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds: [player.id, withId],
      participants: [player.id, withId].map((personId) => ({
        personId,
        role: "presence:participant",
        detail: null,
      })),
      personFactConstraints: [],
      visibility: "limited",
      tags: ["life.family-time"],
      summary: `${playerName} and ${withName} spent time together in ${occurredAt.slice(0, 4)}.`,
      context: {
        location: {
          jurisdictionId: input.jurisdictionId,
          label: "Home area",
          setting: null,
        },
        socialContext: "Recorded time with family",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    if (momentKey !== earlyKey) countPreStartMonth(occupiedMonths, occurredAt);
  }
  for (let year = 18; year < age; year += 1) {
    const occurredAt = preStartEventDate(
      world,
      player.birthDate,
      year,
      `${key}:year:${year}`,
      occupiedMonths,
    );
    if (occurredAt >= world.currentDate) break;
    const otherId = companionOn(occurredAt, year);
    const wantsFamily = occurredAt < workStart || year < 24 || year % 4 === 0;
    // Nobody left to share the year with, and no work yet: nothing is written.
    if (otherId === null && occurredAt < workStart) continue;
    const isFamily = wantsFamily && otherId !== null;
    const otherName = otherId === null ? "" : next.people[otherId]!.givenName;
    const summary = isFamily
      ? `${playerName} and ${otherName} spent time together at age ${year}.`
      : `${playerName} continued working at ${input.employerName} at age ${year}.`;
    const involvedEntityIds = isFamily
      ? [player.id, otherId!]
      : [player.id, input.employerId];
    next = recordWorldEvent(next, {
      stableKey: `${key}:year:${year}`,
      type: isFamily ? "life.family-time" : "life.work-routine",
      occurredAt,
      recordedAt: world.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds,
      participants: involvedEntityIds
        .filter((id) => next.people[id])
        .map((personId, index) => ({
          personId,
          role: index === 0 ? "agency:participant" : "presence:participant",
          detail: null,
        })),
      personFactConstraints: [],
      visibility: "limited",
      tags: [isFamily ? "life.family-time" : "life.work-routine"],
      summary,
      context: {
        location: {
          jurisdictionId: input.jurisdictionId,
          label: "Home area",
          setting: null,
        },
        socialContext: isFamily
          ? "Recorded time with family"
          : "Recorded employment",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    countPreStartMonth(occupiedMonths, occurredAt);
    input.onCheckpoint?.(next, player.id);
  }
  return next;
}

/** The close family and dated shared childhood that a prior-year child can know. */
export function establishPreStartChildHistory(
  world: World,
  input: { readonly personId: EntityId; readonly jurisdictionId: EntityId },
): World {
  const key = `pre-start-child-history-v1:${input.personId}`;
  if (world.history.events.some((event) => event.stableKey === `${key}:age:2`))
    return world;
  const player = world.people[input.personId];
  if (!player)
    throw new Error(`Missing child-history person ${input.personId}.`);
  const age = ageOnDate(player.birthDate, world.currentDate);
  if (age < 9 || age >= 18) return world;
  const parentIds = world.history.kinshipRelationships
    .filter(
      (row) =>
        row.kind === "lineal:parent-child" && row.personIds.includes(player.id),
    )
    .flatMap((row) => row.personIds.filter((id) => id !== player.id));
  const existingMother = parentIds.find(
    (id) => world.people[id]?.identity?.gender === "female",
  );
  const existingSibling = world.history.kinshipRelationships
    .find(
      (row) =>
        row.kind === "collateral:sibling" && row.personIds.includes(player.id),
    )
    ?.personIds.find((id) => id !== player.id);
  const rng = new SeededRng(world.seed).fork(key);
  const corpusVersion = player.corpusVersion ?? DEFAULT_CORPUS_VERSION;
  const taken = existingCloseGivenNames(world, player.id);
  const motherKey = `${key}:mother`;
  const siblingKey = `${key}:sibling`;
  const motherBirthDate = existingMother
    ? world.people[existingMother]!.birthDate
    : yearsBefore(player.birthDate, 29);
  const grandparentKeys = [
    `${key}:grandparent:1`,
    `${key}:grandparent:2`,
  ] as const;
  const grandparentPeople = grandparentKeys.map((stableKey, index) => {
    const gender: "female" | "male" = index === 0 ? "female" : "male";
    return {
      stableKey,
      ...drawCloseRelativeName(world, stableKey, gender, corpusVersion, taken),
      identity: { gender, pronouns: defaultPronounsForGender(gender) },
      birthDate: yearsBefore(motherBirthDate, 24 + index * 4),
      homeJurisdictionId: input.jurisdictionId,
    };
  });
  const added: CharacterHistoryContextPersonInput[] = [...grandparentPeople];
  if (!existingMother)
    added.push({
      stableKey: motherKey,
      ...drawCloseRelativeName(
        world,
        motherKey,
        "female",
        corpusVersion,
        taken,
      ),
      familyName: player.familyName,
      identity: {
        gender: "female",
        pronouns: defaultPronounsForGender("female"),
      },
      birthDate: motherBirthDate,
      homeJurisdictionId: input.jurisdictionId,
    });
  if (!existingSibling) {
    const identity = generatePersonIdentity(rng.fork(siblingKey));
    added.push({
      stableKey: siblingKey,
      ...drawCloseRelativeName(
        world,
        siblingKey,
        identity.gender,
        corpusVersion,
        taken,
      ),
      familyName: player.familyName,
      identity,
      birthDate: yearsBefore(player.birthDate, 3),
      homeJurisdictionId: input.jurisdictionId,
    });
  }
  let next = createCharacterHistoryContextPeople(world, added);
  const motherId =
    existingMother ?? characterHistoryContextPersonId(next, motherKey);
  const siblingId =
    existingSibling ?? characterHistoryContextPersonId(next, siblingKey);
  const generated = { kind: "generated" as const, generatorKey: key };
  if (!existingMother)
    next = recordKinship(next, {
      stableKey: `${key}:mother-child`,
      personIds: [motherId, player.id],
      establishedAt: player.birthDate,
      kind: "lineal:parent-child",
      provenance: generated,
    });
  if (!existingSibling)
    next = recordKinship(next, {
      stableKey: `${key}:sibling`,
      personIds: [siblingId, player.id],
      establishedAt: player.birthDate,
      kind: "collateral:sibling",
      provenance: generated,
    });
  for (const [index, stableKey] of grandparentKeys.entries()) {
    const grandparentId = characterHistoryContextPersonId(next, stableKey);
    next = recordKinship(next, {
      stableKey: `${key}:grandparent-parent:${index}`,
      personIds: [grandparentId, motherId],
      establishedAt: motherBirthDate,
      kind: "lineal:parent-child",
      provenance: generated,
    });
    next = recordKinship(next, {
      stableKey: `${key}:grandparent-child:${index}`,
      personIds: [grandparentId, player.id],
      establishedAt: player.birthDate,
      kind: "lineal:grandparent-grandchild",
      provenance: generated,
    });
  }
  const motherName = next.people[motherId]!.givenName;
  const occupiedMonths = preStartVisibleMonthCounts(next, player.id);
  for (const childAge of [2, 6, 8]) {
    const occurredAt = preStartEventDate(
      world,
      player.birthDate,
      childAge,
      `${key}:age:${childAge}`,
      occupiedMonths,
    );
    if (occurredAt > world.currentDate) continue;
    next = recordWorldEvent(next, {
      stableKey: `${key}:age:${childAge}`,
      type: "life.family-time",
      occurredAt,
      recordedAt: world.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds: [player.id, motherId],
      participants: [player.id, motherId].map((personId) => ({
        personId,
        role: "presence:participant",
        detail: null,
      })),
      personFactConstraints: [],
      visibility: "limited",
      tags: ["life.family-time"],
      summary: `${player.givenName} ${player.familyName} and ${motherName} spent time together in ${occurredAt.slice(0, 4)}.`,
      context: {
        location: {
          jurisdictionId: input.jurisdictionId,
          label: "Home area",
          setting: null,
        },
        socialContext: "Recorded time with family",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    countPreStartMonth(occupiedMonths, occurredAt);
  }
  return next;
}

/** Applies every mode through the established canonical writers; no plan is durable truth. */
export function applyCharacterHistoryPlan(
  world: World,
  plan: CharacterHistoryPlan,
): CharacterHistoryApplication {
  assertNonEmpty(plan.stableKey, "Character-history plan stable key");
  if (!world.people[plan.personId]) {
    throw new Error(`Missing character-history subject: ${plan.personId}`);
  }
  let next = world;
  const eventIds: Record<string, EntityId> = {};
  const contextPersonIds: Record<string, EntityId> = {};
  const developmentProposals: DevelopmentProposal[] = [];
  for (const transition of plan.transitions) {
    switch (transition.kind) {
      case "context-person": {
        next = createCharacterHistoryContextPerson(next, transition.input);
        contextPersonIds[transition.input.stableKey] =
          characterHistoryContextPersonId(next, transition.input.stableKey);
        break;
      }
      case "organization":
        next = createOrganization(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "household":
        next = createHousehold(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "household-location": {
        const household = byStableKey(
          next.history.households,
          transition.input.householdStableKey,
          "household",
        );
        const previous = next.history.householdLocations
          .filter((item) => item.householdId === household.id)
          .at(-1);
        next = recordHouseholdLocation(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            householdId: household.id,
            supersedesLocationId: previous?.id ?? null,
          }),
        );
        break;
      }
      case "household-membership":
        next = startHouseholdMembership(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "household-membership-state": {
        const membership = byStableKey(
          next.history.householdMemberships,
          transition.input.membershipStableKey,
          "household membership",
        );
        const previous = next.history.householdMembershipStates
          .filter((item) => item.membershipId === membership.id)
          .at(-1);
        next = recordHouseholdMembershipState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            membershipId: membership.id,
            supersedesStateId: requiredPrevious(
              previous,
              "household membership state",
            ),
          }),
        );
        break;
      }
      case "kinship":
        next = recordKinship(next, withLifeProvenance(next, transition.input));
        break;
      case "partnership":
        next = createPartnership(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "care":
        next = createCareResponsibility(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "care-state": {
        const care = byStableKey(
          next.history.careResponsibilities,
          transition.input.careStableKey,
          "care responsibility",
        );
        const previous = next.history.careResponsibilityStates
          .filter((item) => item.careResponsibilityId === care.id)
          .at(-1);
        next = recordCareResponsibilityState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            careResponsibilityId: care.id,
            supersedesStateId: requiredPrevious(previous, "care state"),
          }),
        );
        break;
      }
      case "authority":
        next = createChildAuthority(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "authority-state": {
        const authority = byStableKey(
          next.history.childAuthorities,
          transition.input.authorityStableKey,
          "child authority",
        );
        const previous = next.history.childAuthorityStates
          .filter((item) => item.childAuthorityId === authority.id)
          .at(-1);
        next = recordChildAuthorityState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            childAuthorityId: authority.id,
            supersedesStateId: requiredPrevious(
              previous,
              "child authority state",
            ),
          }),
        );
        break;
      }
      case "education":
        next = createEducationEnrollment(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "education-state": {
        const enrollment = byStableKey(
          next.history.educationEnrollments,
          transition.input.enrollmentStableKey,
          "education enrollment",
        );
        const previous = next.history.educationEnrollmentStates
          .filter((item) => item.enrollmentId === enrollment.id)
          .at(-1);
        next = recordEducationEnrollmentState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            enrollmentId: enrollment.id,
            supersedesStateId: requiredPrevious(
              previous,
              "education enrollment state",
            ),
          }),
        );
        break;
      }
      case "participation":
        next = createOrganizationParticipation(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "participation-state": {
        const participation = byStableKey(
          next.history.organizationParticipations,
          transition.input.participationStableKey,
          "organization participation",
        );
        const previous = next.history.organizationParticipationStates
          .filter((item) => item.participationId === participation.id)
          .at(-1);
        next = recordOrganizationParticipationState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            participationId: participation.id,
            supersedesStateId: requiredPrevious(
              previous,
              "organization participation state",
            ),
          }),
        );
        break;
      }
      case "work":
        next = createWorkRelationship(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "work-status": {
        const work = byStableKey(
          next.history.workRelationships,
          transition.input.workStableKey,
          "work relationship",
        );
        const previous = next.history.workStatuses
          .filter((item) => item.workRelationshipId === work.id)
          .at(-1);
        next = recordWorkStatus(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            workRelationshipId: work.id,
            supersedesStatusId: requiredPrevious(previous, "work status"),
          }),
        );
        break;
      }
      case "work-role": {
        const work = byStableKey(
          next.history.workRelationships,
          transition.input.workStableKey,
          "work relationship",
        );
        const previous = next.history.workRoles
          .filter((item) => item.workRelationshipId === work.id)
          .at(-1);
        next = recordWorkRole(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            workRelationshipId: work.id,
            supersedesRoleId: requiredPrevious(previous, "work role"),
          }),
        );
        break;
      }
      case "commitment":
        next = recordLifeCommitment(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "resource-position":
        next = createResourcePosition(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "resource-flow":
        next = createResourceFlow(
          next,
          withLifeProvenance(next, transition.input),
        );
        break;
      case "resource-flow-terms": {
        const flow = byStableKey(
          next.history.resourceFlows,
          transition.input.resourceFlowStableKey,
          "resource flow",
        );
        const previous = next.history.resourceFlowTerms
          .filter((item) => item.resourceFlowId === flow.id)
          .at(-1);
        next = recordResourceFlowTerms(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            resourceFlowId: flow.id,
            supersedesTermsId: requiredPrevious(
              previous,
              "resource-flow terms",
            ),
          }),
        );
        break;
      }
      case "resource-transfer": {
        const flow = byStableKey(
          next.history.resourceFlows,
          transition.input.resourceFlowStableKey,
          "resource flow",
        );
        next = recordResourceTransferOutcome(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            resourceFlowId: flow.id,
          }),
        );
        break;
      }
      case "work-compensation": {
        const work = byStableKey(
          next.history.workRelationships,
          transition.input.workStableKey,
          "work relationship",
        );
        next = createWorkCompensation(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            workRelationshipId: work.id,
          }),
        );
        break;
      }
      case "dwelling":
        next = createDwelling(next, withLifeProvenance(next, transition.input));
        break;
      case "dwelling-occupancy": {
        const dwelling = byStableKey(
          next.history.dwellings,
          transition.input.dwellingStableKey,
          "dwelling",
        );
        next = startDwellingOccupancy(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            dwellingId: dwelling.id,
          }),
        );
        break;
      }
      case "dwelling-occupancy-state": {
        const occupancy = byStableKey(
          next.history.dwellingOccupancies,
          transition.input.occupancyStableKey,
          "dwelling occupancy",
        );
        const previous = next.history.dwellingOccupancyStates
          .filter((item) => item.dwellingOccupancyId === occupancy.id)
          .at(-1);
        next = recordDwellingOccupancyState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            dwellingOccupancyId: occupancy.id,
            supersedesStateId: requiredPrevious(
              previous,
              "dwelling occupancy state",
            ),
          }),
        );
        break;
      }
      case "housing-tenure": {
        const dwelling = byStableKey(
          next.history.dwellings,
          transition.input.dwellingStableKey,
          "dwelling",
        );
        next = createHousingTenure(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            dwellingId: dwelling.id,
          }),
        );
        break;
      }
      case "housing-tenure-state": {
        const tenure = byStableKey(
          next.history.housingTenures,
          transition.input.housingTenureStableKey,
          "housing tenure",
        );
        const previous = next.history.housingTenureStates
          .filter((item) => item.housingTenureId === tenure.id)
          .at(-1);
        next = recordHousingTenureState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            housingTenureId: tenure.id,
            supersedesStateId: requiredPrevious(
              previous,
              "housing tenure state",
            ),
          }),
        );
        break;
      }
      case "resource-obligation": {
        const flow = byStableKey(
          next.history.resourceFlows,
          transition.input.resourceFlowStableKey,
          "resource flow",
        );
        const care =
          transition.input.careStableKey === null
            ? null
            : byStableKey(
                next.history.careResponsibilities,
                transition.input.careStableKey,
                "care responsibility",
              );
        const tenure =
          transition.input.housingTenureStableKey === null
            ? null
            : byStableKey(
                next.history.housingTenures,
                transition.input.housingTenureStableKey,
                "housing tenure",
              );
        next = createResourceObligation(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            resourceFlowId: flow.id,
            careResponsibilityId: care?.id ?? null,
            housingTenureId: tenure?.id ?? null,
          }),
        );
        break;
      }
      case "resource-obligation-state": {
        const obligation = byStableKey(
          next.history.resourceObligations,
          transition.input.resourceObligationStableKey,
          "resource obligation",
        );
        const previous = next.history.resourceObligationStates
          .filter((item) => item.resourceObligationId === obligation.id)
          .at(-1);
        next = recordResourceObligationState(
          next,
          withLifeProvenance(next, {
            ...transition.input,
            resourceObligationId: obligation.id,
            supersedesStateId: requiredPrevious(
              previous,
              "resource obligation state",
            ),
          }),
        );
        break;
      }
      case "event": {
        next = recordWorldEvent(next, transition.input);
        eventIds[transition.input.stableKey] = requiredEvent(
          next,
          transition.input.stableKey,
        ).id;
        break;
      }
      case "memory":
        next = recordMemory(next, {
          ...transition.input,
          eventId: requiredEvent(next, transition.input.eventStableKey).id,
        });
        break;
      case "knowledge":
        next = recordEventKnowledge(next, {
          ...transition.input,
          eventId: requiredEvent(next, transition.input.eventStableKey).id,
        });
        break;
      case "interaction":
        next = recordRelationshipInteraction(next, {
          ...transition.input,
          eventId:
            transition.input.eventStableKey === null
              ? null
              : requiredEvent(next, transition.input.eventStableKey).id,
        });
        break;
      case "appraisal": {
        const memory =
          transition.input.memoryStableKey === null
            ? null
            : byStableKey(
                next.history.memories,
                transition.input.memoryStableKey,
                "memory",
              );
        const knowledge =
          transition.input.knowledgeStableKey === null
            ? null
            : byStableKey(
                next.history.knowledge,
                transition.input.knowledgeStableKey,
                "event knowledge",
              );
        const event = requiredEvent(next, transition.input.eventStableKey);
        next = recordAppraisal(next, {
          ...transition.input,
          eventId: event.id,
          memoryId: memory?.id ?? null,
          eventKnowledgeId: knowledge?.id ?? null,
          provenance: createMindProvenance(mindProvenanceKind(plan.mode), {
            sourceRefs: [{ kind: "historical-event", eventId: event.id }],
          }),
        });
        break;
      }
      case "temporary-state":
        next = recordTemporaryState(next, {
          ...transition.input,
          provenance: createMindProvenance(mindProvenanceKind(plan.mode)),
        });
        break;
      case "development-proposal": {
        const eventIdsForProposal = transition.input.eventStableKeys.map(
          (key) => requiredEvent(next, key).id,
        );
        developmentProposals.push(
          createDevelopmentProposal(next, {
            stableKey: transition.input.stableKey,
            personId: transition.input.personId,
            proposedAt: transition.input.proposedAt,
            target: transition.input.target,
            direction: transition.input.direction,
            sourceRefs: eventIdsForProposal.map((eventId) => ({
              kind: "historical-event" as const,
              eventId,
            })),
            repetitionKey: transition.input.repetitionKey,
            rationale: transition.input.rationale,
          }),
        );
        break;
      }
    }
  }
  return { world: next, eventIds, contextPersonIds, developmentProposals };
}

export interface FormativeInterval {
  readonly band: FormativePacingBand;
  readonly beginsAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly anchorBudget: readonly [number, number];
  readonly agency: "caregiver-led" | "shared" | "substantially-player-directed";
}

export function formativeIntervalAt(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): FormativeInterval | null {
  const person = requirePerson(world, personId);
  const date = makeIsoDate(asOfDate);
  const age = ageOnDate(person.birthDate, date);
  if (age < 0 || age >= 18) return null;
  if (age <= 7)
    return {
      band: "early-childhood",
      beginsAt: person.birthDate,
      endsAt: dateAtAge(person.birthDate, 8),
      anchorBudget: [4, 6],
      agency: "caregiver-led",
    };
  if (age <= 12)
    return {
      band: "middle-childhood",
      beginsAt: dateAtAge(person.birthDate, 8),
      endsAt: dateAtAge(person.birthDate, 13),
      anchorBudget: [6, 9],
      agency: "shared",
    };
  return {
    band: "adolescence",
    beginsAt: dateAtAge(person.birthDate, 13),
    endsAt: dateAtAge(person.birthDate, 18),
    anchorBudget: [8, 15],
    agency: "substantially-player-directed",
  };
}

/** Existing time remains authoritative; this advances one chosen interval rather than weeks. */
export function advanceFormativeInterval(
  world: World,
  input: { readonly personId: EntityId; readonly days: number },
): {
  readonly world: World;
  readonly prior: FormativeInterval | null;
  readonly current: FormativeInterval | null;
} {
  const prior = formativeIntervalAt(world, input.personId);
  if (prior === null)
    throw new Error(
      "Formative interval advancement requires a person under 18.",
    );
  if (!Number.isSafeInteger(input.days) || input.days <= 0) {
    throw new Error(
      "Time advancement must be a positive whole number of days.",
    );
  }
  const target = simulationMomentOnLocalDate(
    world.currentMoment,
    addDays(world.currentDate, input.days),
  );
  const next = advanceWorldMinutes(
    world,
    simulationMinutesBetween(world.currentMoment, target),
    composeWorldTimeHandlers(),
  );
  return {
    world: next,
    prior,
    current: formativeIntervalAt(next, input.personId),
  };
}

/**
 * The formative situations the game can currently play.
 *
 * Each one is authored content over the existing eligibility and consequence
 * machinery. The research kernels these come from mostly have no defensible
 * national arrival rate, so nothing here samples a frequency: a situation is
 * offered when the person is in its age band and its context exists, and the
 * player chooses from there.
 */
const AUTHORED_SITUATIONS: readonly Omit<
  AvailableLifeSituation,
  "needsCompanion"
>[] = [
  {
    key: "formative.household-transition",
    band: "early-childhood",
    prose:
      "There is a new child in the house. The nights are louder, and the adults are tired in a way you have not seen before.",
    options: [
      {
        key: "settle-in",
        label: "Settle in",
        description: "Help make the new routine feel familiar.",
        memory:
          "The house rearranged itself around someone small and loud, and you learned the new order of the mornings before anyone explained it.",
      },
      {
        key: "keep-your-corner",
        label: "Keep to your own corner",
        description: "Hold on to the parts of the day that are still yours.",
        memory:
          "You kept your own corner of the house through all the noise, and nobody made you give it up.",
      },
      {
        key: "make-yourself-useful",
        label: "Make yourself useful",
        description: "Take on one of the small jobs nobody has asked you to.",
        memory:
          "You took on one of the small jobs without being asked, and it stayed yours for years.",
        stance: "engaged",
      },
    ],
  },
  {
    key: "formative.school-entry",
    band: "early-childhood",
    prose:
      "A room of children you do not know, a coat hook with your name on it, and an adult who claps twice when it is time to listen.",
    options: [
      {
        key: "join-in",
        label: "Join in",
        description: "Take part in the new classroom routine.",
        memory:
          "You went in with the others on the first morning and copied what they did until it stopped feeling like copying.",
      },
      {
        key: "hang-back",
        label: "Hang back and watch",
        description: "Learn how the room works before joining it.",
        memory:
          "You stayed at the edge of the room for a while, and understood how it worked before anyone had to tell you.",
      },
    ],
  },
  {
    key: "formative.broken-object",
    band: "early-childhood",
    prose:
      "Something that mattered is in pieces on the floor. An adult is in the doorway asking what happened.",
    options: [
      {
        key: "say-what-happened",
        label: "Say what happened",
        description: "Tell it straight, including your own part in it.",
        memory:
          "You said it was you before anyone worked it out, and the room went quiet in a way you did not forget.",
        witnessed:
          "The child said it was them before anyone had worked out who it was.",
      },
      {
        key: "stay-quiet",
        label: "Say nothing",
        description: "Let the question go unanswered.",
        memory:
          "You let the question sit there unanswered, and it stayed unanswered for a long time.",
        witnessed:
          "The child did not answer when they were asked what had happened.",
      },
    ],
  },
  {
    key: "formative.small-money",
    band: "early-childhood",
    prose:
      "A little money of your own, in a pocket, and nobody telling you what it is for.",
    options: [
      {
        key: "spend",
        label: "Spend it",
        description: "Get the thing you want now.",
        memory:
          "You spent it that same week on something you wanted, and at the time you were glad you had.",
      },
      {
        key: "put-it-away",
        label: "Put it away",
        description: "Keep it for something later.",
        memory:
          "You put it somewhere safe and left it there, waiting for a use you had not thought of yet.",
      },
      {
        key: "share",
        label: "Share it",
        description: "Split it with someone else.",
        memory: "You split it with someone, without being asked to.",
      },
    ],
  },
  {
    key: "formative.lunch-table",
    band: "middle-childhood",
    prose:
      "The table is full except for one gap, and someone is standing at the end of it holding a tray.",
    options: [
      {
        key: "make-room",
        label: "Make room",
        description: "Invite the other child to join the table.",
        memory:
          "You slid down the bench and made a space, and the table closed back up around one more person.",
        witnessed: "They moved along the bench and made room at the table.",
      },
      {
        key: "look-away",
        label: "Look away",
        description: "Avoid getting involved in the moment.",
        memory:
          "You looked at your food until the person holding the tray went somewhere else.",
        witnessed: "They stayed where they were and did not look up.",
      },
      {
        key: "go-with-them",
        label: "Go and sit somewhere else with them",
        description: "Leave the full table rather than squeeze one more in.",
        memory:
          "You got up and went and sat somewhere else with them, and the table you left noticed that too.",
        witnessed:
          "They got up from the full table and went and sat somewhere else with them.",
        stance: "engaged",
        relationalChange: "strengthened",
      },
    ],
  },
  {
    key: "formative.friend-conflict",
    band: "middle-childhood",
    prose:
      "Something got said that should not have been, and now the two of you are being careful with each other.",
    options: [
      {
        key: "repair",
        label: "Try to repair it",
        description: "Speak directly and attempt a repair.",
        memory:
          "You said the awkward first sentence yourself, and the rest of it came easier after that.",
        witnessed: "They spoke first, and the two of them talked it through.",
      },
      {
        key: "withdraw",
        label: "Step back",
        description: "Take space rather than force a resolution.",
        memory: "You let the silence stand. It cooled, but it did not close.",
        witnessed: "Neither of them raised it again, and the quiet stayed.",
      },
      {
        key: "ask-someone",
        label: "Get somebody else involved",
        description: "Bring in a third person rather than manage it alone.",
        memory:
          "You brought somebody else into it, which fixed it and also changed what it had been.",
        witnessed: "They brought somebody else into it.",
        stance: "engaged",
        relationalChange: "maintained",
      },
    ],
  },
  {
    key: "formative.teacher-mentor",
    band: "middle-childhood",
    prose:
      "A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.",
    options: [
      {
        key: "accept-guidance",
        label: "Accept guidance",
        description: "Follow up with the adult who offered help.",
        memory:
          "You took the help that was offered, and the thing you kept getting wrong got smaller.",
        witnessed: "They stayed behind and took the help that was offered.",
      },
      {
        key: "decline-guidance",
        label: "Handle it alone",
        description: "Thank them, then try independently.",
        memory:
          "You said thank you and worked it out in your own time, slower and by yourself.",
        witnessed:
          "They thanked the teacher and said they would work at it on their own.",
      },
    ],
  },
  {
    key: "formative.school-rule-input",
    band: "middle-childhood",
    prose:
      "The school is changing a rule, and for once it is asking the people the rule is about.",
    options: [
      {
        key: "speak-up",
        label: "Say what you think",
        description: "Give the school your actual view of the rule.",
        memory:
          "You said what you thought of the rule out loud, in front of people, and then watched what the school did with it.",
      },
      {
        key: "leave-it-to-others",
        label: "Leave it to others",
        description: "Let the people who want to speak do the speaking.",
        memory:
          "You had a view and kept it to yourself while other people argued it out.",
      },
      {
        key: "write-it-down",
        label: "Put it in writing",
        description: "Say it where it has to be read rather than heard.",
        memory:
          "You wrote it down instead of saying it out loud, and it got further than you expected.",
        stance: "engaged",
      },
    ],
  },
  {
    key: "formative.care-conflict",
    band: "middle-childhood",
    prose:
      "The house needs you on the same afternoons the thing you signed up for does.",
    options: [
      {
        key: "cover-at-home",
        label: "Cover things at home",
        description: "Be the one the household can count on.",
        memory:
          "You were the one at home on those afternoons, and the other thing went on without you.",
      },
      {
        key: "keep-the-commitment",
        label: "Keep the commitment",
        description: "Hold on to what you already agreed to.",
        memory:
          "You kept going to it, and someone else at home covered what you did not.",
      },
      {
        key: "do-both-badly",
        label: "Try to do both",
        description: "Split the afternoons and give each of them less.",
        memory:
          "You split the afternoons between the two of them, and neither got what it needed.",
        stance: "engaged",
      },
    ],
  },
  {
    key: "formative.activity-choice",
    band: "adolescence",
    prose:
      "There is a sign-up sheet, a practice schedule, and only so many afternoons in a week.",
    options: [
      {
        key: "join",
        label: "Join the activity",
        description: "Commit time to a new group or activity.",
        memory: "You put your name on the sheet and gave the afternoons to it.",
      },
      {
        key: "leave",
        label: "Leave the activity",
        description: "Make room for another priority.",
        memory:
          "You gave the afternoons back, and something else grew into the space.",
      },
      {
        key: "stay-smaller",
        label: "Stay, but do less of it",
        description: "Keep a foot in without giving it the week.",
        memory:
          "You stayed in it but stopped being one of the ones it relied on, and nobody said anything about that.",
        stance: "engaged",
      },
    ],
  },
  {
    key: "formative.civic-volunteering",
    band: "adolescence",
    prose:
      "Something local needs hands on a Saturday, and someone has asked whether you are one of them.",
    options: [
      {
        key: "volunteer",
        label: "Volunteer",
        description: "Contribute time to a local effort.",
        memory:
          "You gave up a Saturday to it, and found out how much of the work was unglamorous.",
      },
      {
        key: "observe",
        label: "Observe first",
        description: "Learn about the work before committing.",
        memory: "You went and watched before you agreed to anything.",
      },
      {
        key: "send-others",
        label: "Get other people to go",
        description: "Find the hands rather than be them.",
        memory:
          "You found other people to go instead of going, which worked, and which one of them mentioned later.",
        stance: "engaged",
      },
    ],
  },
  {
    key: "formative.teen-work-opportunity",
    band: "adolescence",
    prose:
      "There is a job going. The hours are real, and the law has something to say about which of them you are allowed to work.",
    options: [
      {
        key: "accept",
        label: "Accept the opportunity",
        description: "Take on the offered role if it is permitted.",
        memory:
          "You took the job, and your own time stopped being entirely your own.",
      },
      {
        key: "decline",
        label: "Decline for now",
        description: "Keep the current commitments manageable.",
        memory: "You turned the job down and kept the week you already had.",
      },
    ],
  },
  {
    key: "formative.student-organizing",
    band: "adolescence",
    prose:
      "Something at school is wrong enough that people are talking about doing something, and the talking has reached you.",
    options: [
      {
        key: "help-organize",
        label: "Help organize it",
        description: "Put your name and your time behind it.",
        memory:
          "You helped organize it, learned who would actually turn up, and saw what the school did when students pushed.",
      },
      {
        key: "stay-out",
        label: "Stay out of it",
        description: "Let it happen without you.",
        memory:
          "You watched it happen from outside it, and kept your own account of whether it was right.",
      },
    ],
  },
  {
    key: "formative.belief-challenge",
    band: "adolescence",
    prose:
      "Someone you respect says something you think is wrong, and says it as though it settles the matter.",
    options: [
      {
        key: "say-you-disagree",
        label: "Say you disagree",
        description: "Tell them, to their face, that you see it differently.",
        memory:
          "You told someone you respected that they were wrong, and found out both what that costs and what it does not.",
        witnessed: "They said out loud that they saw it differently.",
      },
      {
        key: "let-it-pass",
        label: "Let it pass",
        description: "Keep the disagreement to yourself for now.",
        memory:
          "You let it pass without saying anything, and kept the disagreement somewhere only you could see it.",
        // Decided inwardly. Somebody standing there saw nothing to know.
        witnessed: null,
      },
    ],
  },
  {
    key: "formative.future-preparation",
    band: "adolescence",
    prose:
      "The year is running out, and people keep asking what comes after it.",
    options: [
      {
        key: "prepare",
        label: "Take a concrete step",
        description:
          "Move on education, training, work, or service while there is time.",
        memory:
          "You took one concrete step toward what came next, before you were sure it was the right one.",
      },
      {
        key: "keep-options-open",
        label: "Keep your options open",
        description: "Decide later, on better information.",
        memory:
          "You did not commit that year. You kept looking, and let the question stay open.",
      },
      {
        key: "ask-someone-who-knows",
        label: "Ask somebody who has done it",
        description: "Go and find out what it is actually like first.",
        memory:
          "You went and asked somebody who had actually done it, and what they told you was not what the school had.",
        stance: "engaged",
      },
    ],
  },
  {
    // Early childhood had nothing about a household under strain. A child does
    // not diagnose anything; they notice the day going differently.
    key: "formative.illness-in-the-house",
    band: "early-childhood",
    prose:
      "Someone at home has been in bed for days. The mornings are quieter than they should be, and nobody has explained why.",
    options: [
      {
        key: "keep-close",
        label: "Stay near them",
        description: "Spend the quiet hours in the same room.",
        memory:
          "You sat in the room with the curtains half shut, not doing much, and nobody asked you to leave.",
      },
      {
        key: "keep-the-routine",
        label: "Keep everything else going",
        description: "Hold on to the ordinary parts of the day.",
        memory:
          "You kept your own mornings running exactly as they had been, because one part of the day still worked.",
      },
    ],
  },
  {
    // Middle childhood had no money pressure at all. The early-childhood
    // small-money situation is about having some; this is about the house not.
    key: "formative.money-shortfall",
    band: "middle-childhood",
    prose:
      "The thing that was planned for this month is not happening any more. The reason given is short, and the subject gets changed.",
    options: [
      {
        key: "ask-what-happened",
        label: "Ask what happened",
        description: "Ask directly why the plan changed.",
        memory:
          "You asked why, and got an answer that was true and much shorter than the question deserved.",
      },
      {
        key: "let-it-go",
        label: "Let it go",
        description: "Accept the change without pressing.",
        memory:
          "You said it was fine before anyone had to explain, and found out you were the kind of person who does that.",
      },
    ],
  },
  {
    // Adolescence has the widest anchor budget and the least covering it, and
    // nothing at all about carrying somebody else's needs.
    key: "formative.caring-for-someone",
    band: "adolescence",
    prose:
      "Somebody at home needs more looking after than the household can spread around, and you are old enough now for that to mean you.",
    options: [
      {
        key: "take-it-on",
        label: "Take it on",
        description: "Carry the regular share nobody else can.",
        memory:
          "You took on the afternoons nobody else could cover, and they stayed yours for a long time.",
      },
      {
        key: "hold-the-line",
        label: "Say what you can manage",
        description: "Name the limit before it becomes assumed.",
        memory:
          "You said what you could actually manage before it became assumed, and the household worked around the answer.",
      },
      {
        key: "look-outside",
        label: "Look for help from outside the house",
        description:
          "Find somebody who is not in the family to carry part of it.",
        memory:
          "You went looking for help outside the house, which took a long time and eventually worked.",
        stance: "engaged",
      },
    ],
  },
  {
    // Reachable only once there is a job, which is what makes it worth having:
    // the first situation whose context comes from something the player did.
    key: "formative.workplace-rule",
    band: "adolescence",
    prose:
      "There is a rule at work that nobody follows, and today somebody older is telling you to follow it in front of a customer.",
    options: [
      {
        key: "follow-it",
        label: "Follow the rule",
        description: "Do it the way you were just told to.",
        memory:
          "You did it the way you were told in front of everyone, and thought about it for the rest of the shift.",
      },
      {
        key: "say-nobody-does",
        label: "Say nobody does that",
        description: "Point out that the rule is not how the place runs.",
        memory:
          "You said out loud that nobody actually did it that way, and learned what it costs to be right in front of a customer.",
      },
      {
        key: "say-it-after",
        label: "Do it, then say something after",
        description: "Not in front of the customer.",
        memory:
          "You did it their way in front of the customer and said what you thought once the shop was empty.",
        stance: "engaged",
      },
    ],
  },
];

/**
 * Whether the person held back rather than acted.
 *
 * An option that says so is believed; the key list below is what the formative
 * bank said before options could say it themselves, and stays as the answer
 * for those.
 */
function heldBack(option: LifeSituationOption, optionKey: string): boolean {
  if (option.stance) return option.stance === "withdrawn";
  return WITHDRAWN_OPTION_KEYS.includes(optionKey);
}

/**
 * Options where the person held back rather than acted. They read as mixed
 * rather than positive afterwards, and leave a short after-effect.
 */
const WITHDRAWN_OPTION_KEYS: readonly string[] = [
  "look-away",
  "withdraw",
  "stay-quiet",
  "leave-it-to-others",
  "stay-out",
  "let-it-pass",
];

/** Options that leave the other person on better terms than before. */
const WARMING_OPTION_KEYS: readonly string[] = [
  "repair",
  "make-room",
  "accept-guidance",
  "say-what-happened",
];

/** Situations that need someone else in the scene to make any sense. */
const SOCIAL_SITUATION_KEYS: readonly LifeSituationKey[] = [
  "formative.broken-object",
  "formative.lunch-table",
  "formative.friend-conflict",
  "formative.teacher-mentor",
  "formative.belief-challenge",
];

const SITUATIONS: readonly AvailableLifeSituation[] = AUTHORED_SITUATIONS.map(
  (situation) => ({
    ...situation,
    needsCompanion: SOCIAL_SITUATION_KEYS.includes(situation.key),
  }),
);

/**
 * Every authored formative situation, whether or not any particular life can
 * currently reach one.
 *
 * `availableLifeSituations` answers a different question — what this person,
 * in this band, with or without somebody beside them, can be offered right now
 * — and it is the only question play needs. Review needs the other one: what
 * has been written at all. Both read the same array, so the reviewed bank and
 * the played bank cannot drift apart.
 */
export function lifeSituationCatalog(): readonly AvailableLifeSituation[] {
  return SITUATIONS;
}

export function availableLifeSituations(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly asOfDate: IsoDate;
    readonly otherPersonId?: EntityId | null;
  },
): readonly AvailableLifeSituation[] {
  const interval = formativeIntervalAt(world, input.personId, input.asOfDate);
  // Past eighteen the question stops being "which band is this person in" and
  // starts being "what does their world contain". The adult provider answers
  // the second, and returning an empty list — which is what happened before it
  // existed — was the reason an adult life had nothing in it.
  if (!interval) {
    return adultLifeSituations(world, {
      personId: input.personId,
      asOfDate: input.asOfDate,
    });
  }
  const otherPersonId = input.otherPersonId ?? null;
  const companionPresent =
    otherPersonId !== null && !!world.people[otherPersonId];
  return SITUATIONS.filter(
    (situation) =>
      situation.band === interval.band &&
      (!situation.needsCompanion || companionPresent),
  );
}

export interface TeenWorkOpportunity {
  readonly organizationId: EntityId;
  readonly workStableKey: string;
  readonly title: string;
  readonly workKind: CreateWorkRelationshipInput["kind"];
  readonly occupationClassification: NonNullable<
    CreateWorkRelationshipInput["initialRole"]["occupationClassification"]
  >;
  readonly timeDemand: CreateWorkRelationshipInput["initialRole"]["timeDemand"];
}

export interface ResolveLifeSituationInput {
  readonly stableKey: string;
  readonly mode: CharacterHistoryMode;
  readonly personId: EntityId;
  readonly situationKey: LifeSituationKey;
  readonly optionKey: string;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly otherPersonId?: EntityId | null;
  readonly eligibilityProvider?: LifeEligibilityProvider;
  readonly teenWorkOpportunity?: TeenWorkOpportunity;
  readonly additionalTransitions?: readonly CharacterHistoryTransition[];
}

export type LifeSituationResolution =
  | {
      readonly status: "blocked";
      readonly eligibility: LifeEligibilityDecision;
      readonly world: World;
    }
  | {
      readonly status: "resolved";
      readonly world: World;
      readonly eventId: EntityId;
      readonly developmentProposals: readonly DevelopmentProposal[];
    };

/** Bounded content resolution that leaves truth in ordinary Stage 3/4/5 records. */

/**
 * How many times something happened, rather than how many rows recorded it.
 *
 * Several interaction records can carry one event, so counting rows counts
 * one occasion more than once. Records with no event fall back to their own
 * stable key, which is unique per record and therefore counts as its own
 * occasion — a record the history cannot tie to an event is the only evidence
 * there is that it happened.
 */
export function distinctOccasions(
  interactions: readonly RelationshipInteraction[],
): number {
  return new Set(interactions.map((item) => item.eventId ?? item.stableKey))
    .size;
}

export function resolveLifeSituation(
  world: World,
  input: ResolveLifeSituationInput,
): LifeSituationResolution {
  const available = availableLifeSituations(world, {
    personId: input.personId,
    asOfDate: input.occurredAt,
    otherPersonId: input.otherPersonId,
  });
  const situation = available.find((item) => item.key === input.situationKey);
  const option = situation?.options.find(
    (item) => item.key === input.optionKey,
  );
  if (!situation || !option)
    throw new Error(
      "The selected life situation is not appropriate for the current formative context.",
    );
  if (
    input.situationKey === "formative.teen-work-opportunity" &&
    input.optionKey === "accept"
  ) {
    const eligibility = evaluateLifeEligibility(
      world,
      {
        actorPersonId: input.personId,
        actionKey: "work:teen-opportunity",
        asOfDate: input.occurredAt,
        jurisdictionId: input.jurisdictionId,
        contextEntityIds: input.teenWorkOpportunity
          ? [input.teenWorkOpportunity.organizationId]
          : [],
      },
      input.eligibilityProvider,
    );
    if (eligibility.status === "blocked")
      return { status: "blocked", eligibility, world };
  }
  const other = input.otherPersonId ?? null;
  // Whether anything about this choice was outward at all. An option with
  // nothing witnessed is one the other person had no part in — they were in the
  // room, but the thing being recorded happened where only the player could see
  // it.
  const witnessed = option.witnessed ?? null;
  if (other !== null && !("witnessed" in option)) {
    // Silence here would drop the other person from the record entirely, and
    // an omission is not the same answer as "there was nothing to see". An
    // option in a scene with somebody else in it has to say which.
    throw new Error(
      `The ${input.situationKey} situation has somebody else in it, so its "${option.key}" option must say what they witnessed, or say null for nothing.`,
    );
  }
  const shared = other !== null && witnessed !== null ? other : null;
  const eventStableKey = `${input.stableKey}:event`;
  const basePlan: CharacterHistoryPlan = {
    stableKey: input.stableKey,
    mode: input.mode,
    personId: input.personId,
    transitions: [
      {
        kind: "event",
        input: {
          stableKey: eventStableKey,
          type: situationEventType(input.situationKey),
          occurredAt: input.occurredAt,
          recordedAt: world.currentDate,
          jurisdictionId: input.jurisdictionId,
          // The event's summary is the player's own remembered sentence, so
          // whoever is named on it is claimed to have been part of that. The
          // audit reproduced a teacher whose own history returned "you kept it
          // somewhere only you could see" — correctly given no knowledge of it,
          // and still handed the sentence, because being listed as a
          // participant is what person history reads. Somebody who witnessed
          // nothing is not on the record of it.
          involvedEntityIds: [input.personId, ...(shared ? [shared] : [])],
          participants: [
            {
              personId: input.personId,
              role: "agency:actor",
              detail: option.label,
            },
            ...(shared
              ? [
                  {
                    personId: shared,
                    role: "presence:participant" as const,
                    detail: witnessed,
                  },
                ]
              : []),
          ],
          personFactConstraints: [],
          visibility: "limited",
          tags: [input.situationKey, `choice.${input.optionKey}`],
          summary: option.memory,
          context: {
            location: input.jurisdictionId
              ? {
                  jurisdictionId: input.jurisdictionId,
                  label: "Life context",
                  setting: null,
                }
              : null,
            socialContext: situation.key,
            pressure: situation.prose,
            choice: option.label,
            motivation: null,
            immediateReaction: null,
          },
        },
      },
    ],
  };
  const applied = applyCharacterHistoryPlan(world, basePlan);
  const consequenceTransitions: CharacterHistoryTransition[] = [
    {
      kind: "knowledge",
      input: {
        stableKey: `${input.stableKey}:knowledge:${input.personId}`,
        personId: input.personId,
        eventStableKey,
        learnedAt: input.occurredAt,
        believedSummary: option.memory,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      },
    },
    {
      kind: "memory",
      input: {
        stableKey: `${input.stableKey}:memory:${input.personId}`,
        personId: input.personId,
        eventStableKey,
        formedAt: input.occurredAt,
        rememberedSummary: option.memory,
        interpretation: option.memory,
        strength:
          input.situationKey === "formative.lunch-table"
            ? "strong"
            : "moderate",
        relevanceTags: [input.situationKey],
        supersedesMemoryId: null,
      },
    },
  ];
  if (shared !== null && witnessed !== null) {
    // What they saw, not what the other person privately made of it, and
    // partial because watching is not being told.
    consequenceTransitions.push({
      kind: "knowledge",
      input: {
        stableKey: `${input.stableKey}:knowledge:${shared}`,
        personId: shared,
        eventStableKey,
        learnedAt: input.occurredAt,
        believedSummary: witnessed,
        accuracy: "partial",
        confidence: "medium",
        source: { kind: "direct" },
      },
    });
    // And the exchange between them is described by what passed between them,
    // not by what one of them privately made of it.
    consequenceTransitions.push({
      kind: "interaction",
      input: {
        stableKey: `${input.stableKey}:interaction`,
        personIds: [input.personId, shared],
        eventStableKey,
        occurredAt: input.occurredAt,
        kind: interactionKind(
          input.situationKey,
          input.optionKey,
          option.interactionKind,
        ),
        change: interactionChange(input.optionKey, option.relationalChange),
        significance: "meaningful",
        summary: witnessed,
        tags: [input.situationKey],
      },
    });
  }
  consequenceTransitions.push({
    kind: "appraisal",
    input: {
      stableKey: `${input.stableKey}:appraisal`,
      personId: input.personId,
      eventStableKey,
      memoryStableKey: `${input.stableKey}:memory:${input.personId}`,
      knowledgeStableKey: `${input.stableKey}:knowledge:${input.personId}`,
      appraisedAt: input.occurredAt,
      meanings: [
        {
          key: "formative-choice",
          label: "A formative choice",
          valence: heldBack(option, input.optionKey) ? "mixed" : "positive",
          intensity: "subtle",
        },
      ],
      interpretation: option.memory,
      confidence: "medium",
      // An appraisal may only name people the event it appraises involved —
      // the engine enforces that, and it is right to. So an inward choice is
      // appraised without naming anybody: there was nobody else in it.
      involvedPersonIds: shared ? [shared] : [],
      supersedesAppraisalId: null,
    },
  });
  if (heldBack(option, input.optionKey)) {
    consequenceTransitions.push({
      kind: "temporary-state",
      input: {
        stableKey: `${input.stableKey}:temporary`,
        personId: input.personId,
        stateKey: "life:formative-tension",
        label: "Formative tension",
        recordedAt: input.occurredAt,
        startsAt: input.occurredAt,
        endsAt: addDays(input.occurredAt, 14),
        intensity: "subtle",
        decisionTags: [input.situationKey],
      },
    });
  }
  consequenceTransitions.push(...(input.additionalTransitions ?? []));
  if (
    input.situationKey === "formative.teen-work-opportunity" &&
    input.optionKey === "accept"
  ) {
    const work = input.teenWorkOpportunity;
    if (!work)
      throw new Error(
        "Accepting a teen work opportunity requires work details.",
      );
    consequenceTransitions.push({
      kind: "work",
      input: {
        stableKey: work.workStableKey,
        personId: input.personId,
        organizationId: work.organizationId,
        startedAt: input.occurredAt,
        kind: work.workKind,
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "event", eventStableKey },
        initialRole: {
          title: work.title,
          occupationClassification: work.occupationClassification,
          locationJurisdictionId: input.jurisdictionId,
          timeDemand: work.timeDemand,
        },
      },
    });
  }
  let next = applyCharacterHistoryPlan(applied.world, {
    stableKey: `${input.stableKey}:consequences`,
    mode: input.mode,
    personId: input.personId,
    transitions: consequenceTransitions,
  }).world;
  const event = requiredEvent(next, eventStableKey);
  const interactions = other
    ? next.history.relationshipInteractions.filter(
        (item) =>
          item.personIds.includes(input.personId) &&
          item.personIds.includes(other) &&
          item.tags.includes(input.situationKey),
      )
    : [];
  let proposals: readonly DevelopmentProposal[] = [];
  /*
   * Two copies of one event are one observation.
   *
   * This used to count rows in `relationshipInteractions`, which is not the
   * same as counting times something happened: several records can carry one
   * event. Distinct occasions are counted instead, falling back to the
   * record's own stable key where an interaction carries no event.
   *
   * What is NOT fixed here, and is filed as
   * `which-tendency-a-formative-situation-bears-on`: the tendency proposed
   * below is `tendencyOrder[0]`, the catalog's first entry, whatever the
   * occasions were about. In the synthetic catalog that is `riskApproach`,
   * so every character development this produces, in every life, is about
   * risk. The evidence decides whether a development is proposed and has no
   * say in which one. Choosing correctly needs an authored link from a
   * situation to the tendency it bears on, which is content this lane will
   * not invent.
   */
  if (distinctOccasions(interactions) >= 2 && other) {
    const tendency =
      next.mindCatalog.tendencies[
        next.mindCatalog.tendencyOrder[0] as EntityId
      ];
    if (tendency) {
      const proposalResult = applyCharacterHistoryPlan(next, {
        stableKey: `${input.stableKey}:development`,
        mode: input.mode,
        personId: input.personId,
        transitions: [
          {
            kind: "development-proposal",
            input: {
              stableKey: `${input.stableKey}:development`,
              personId: input.personId,
              proposedAt: input.occurredAt,
              target: {
                kind: "personality",
                tendencyId: tendency.id,
                expressionKey: tendency.expressions[0]?.key ?? "",
              },
              direction: "reconsider",
              eventStableKeys: [eventStableKey],
              repetitionKey: input.situationKey,
              rationale:
                "Repeated formative history may warrant reflection; it does not apply a trait change.",
            },
          },
        ],
      });
      next = proposalResult.world;
      proposals = proposalResult.developmentProposals;
    }
  }
  return {
    status: "resolved",
    world: next,
    eventId: event.id,
    developmentProposals: proposals,
  };
}

export function generateQuickCharacterHistory(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    /**
     * Versioned independently, like every other naming change, so an old
     * replay descriptor that never named a version keeps the draw it was
     * written under rather than being quietly renamed.
     */
    readonly givenNameGenerationVersion?: GivenNameGenerationVersion;
    /**
     * Absent keeps the fixed offsets every replay before the repair was
     * written under: a classmate born on the player's own birthday, a parent
     * exactly 28 years older to the day and a teacher exactly 30.
     */
    readonly childhoodGenerationVersion?: ChildhoodGenerationVersion;
    /** Absent keeps the v1 school-name draw an old replay was written under. */
    readonly schoolNameVersion?: SchoolNameVersion;
    /** The name corpus of the place this life began in; absent, the national one. */
    readonly nameCorpusVersion?: string;
    /** New pre-Begin biographies spread events across seasons; old replay keeps birthdays. */
    readonly preStartDates?: true;
  },
): CharacterHistoryPlan {
  const person = requirePerson(world, input.personId);
  const givenNameGenerationVersion =
    input.givenNameGenerationVersion ?? LEGACY_GIVEN_NAME_GENERATION_VERSION;
  const rng = new SeededRng(world.seed).fork(
    `character-history-v1:${input.personId}:${input.stableKey}`,
  );
  const generated = {
    kind: "generated" as const,
    generatorKey: `character-history-v1:${input.stableKey}`,
  };
  const key = (suffix: string) => `${input.stableKey}:${suffix}`;
  // A generated childhood still happened somewhere. The schools are named for
  // the town this character actually grew up in, through the same seeded
  // stream every other generated name goes through, so they are the same
  // schools in every save of this world.
  const homeJurisdiction = world.jurisdictions[input.jurisdictionId];
  const schoolNames = generateSchoolNames(
    rng.fork("schools"),
    residentNameForJurisdiction(
      homeJurisdiction?.name ?? "",
      homeJurisdiction?.parentName ?? null,
    ),
    input.schoolNameVersion,
    {
      state: stateUsps(
        lifePlaceByJurisdictionId(input.jurisdictionId)?.stateJurisdictionKey ??
          null,
      ),
    },
  );
  const parentKey = key("parent");
  const peerKey = key("peer");
  const teacherKey = key("teacher");
  const parentId = characterHistoryContextPersonId(world, parentKey);
  const peerId = characterHistoryContextPersonId(world, peerKey);
  const teacherId = characterHistoryContextPersonId(world, teacherKey);
  // The parent, the peer and the teacher are the three people an adult start
  // actually meets, and the player meets them on the second day. Each draws
  // its identity on its own forked stream, exactly as before, so no generated
  // gender moves; the name is then drawn to agree with it. The names already
  // handed out are passed along so the three cannot collide — a household that
  // offers "Tell Charles Rush" about Charles Rush is an unanswerable scene.
  //
  // Versioned, like the living-world opening's own member names: a save
  // recorded before this existed has to rebuild to the same bytes it was
  // captured with, so the legacy branch keeps the two separate draws on the
  // two streams it always used. A new game declares v2 and gets the pairing.
  //
  // The birth-year pass later keeps these clear of the player's own first
  // name. A place with its own corpus skips that pass, so the player's name is
  // spoken for from the start there instead.
  const spokenFor: string[] =
    input.preStartDates ||
    (input.nameCorpusVersion !== undefined &&
      input.nameCorpusVersion !== DEFAULT_CORPUS_VERSION)
      ? [person.givenName]
      : [];
  const named = (suffix: string) => {
    const identity = generatePersonIdentity(rng.fork(`${suffix}:identity`));
    if (givenNameGenerationVersion === LEGACY_GIVEN_NAME_GENERATION_VERSION) {
      return { ...drawCanonicalName(rng.fork(suffix)), identity };
    }
    const drawn = drawCanonicalNamedIdentity(rng.fork(suffix), identity, {
      ...(input.nameCorpusVersion === undefined
        ? {}
        : { corpusVersion: input.nameCorpusVersion }),
      generationVersion: givenNameGenerationVersion,
      takenGivenNames: spokenFor,
    });
    spokenFor.push(drawn.givenName);
    return drawn;
  };
  const home = key("household");
  const elementary = key("elementary-school");
  const middleSchool = key("middle-school");
  const highSchool = key("high-school");
  const club = key("civic-club");
  const job = key("teen-employer");
  const earlyEvent = key("event:move");
  const lunchEvent = key("event:lunch");
  const teacherEvent = key("event:mentor");
  const civicEvent = key("event:civic");
  const workEvent = key("event:work");
  const futureEvent = key("event:future");
  const age = (value: number) => dateAtAge(person.birthDate, value);
  const episodeAt = (value: number, suffix: string) =>
    input.preStartDates
      ? preStartEventDate(world, person.birthDate, value, key(suffix))
      : age(value);
  const schoolStart = (
    stage: "elementary" | "middle" | "high",
    value: number,
  ) =>
    input.preStartDates
      ? schoolStageCalendarStart(world, person.id, stage)
      : age(value);
  const schoolEnd = (stage: "middle" | "high", value: number) =>
    input.preStartDates
      ? schoolStageCalendarEnd(world, person.id, stage)
      : age(value);
  const moveAt = episodeAt(6, "event:move");
  const lunchAt = episodeAt(10, "event:lunch");
  const teacherAt = episodeAt(12, "event:mentor");
  const civicAt = episodeAt(15, "event:civic");
  const workAt = episodeAt(16, "event:work");
  const futureAt = episodeAt(17, "event:future");
  const bornBefore = contextBirthDates(
    person.birthDate,
    rng,
    input.childhoodGenerationVersion,
  );
  const parentNamed = named("parent");
  const contextPeople: readonly {
    readonly kind: "context-person";
    readonly input: CharacterHistoryContextPersonInput;
  }[] = [
    {
      kind: "context-person",
      input: {
        stableKey: parentKey,
        // Every canonical name comes from the versioned corpus through the
        // seeded generator. A module keeping a private list of three first
        // names is how a whole cast ends up sharing them.
        //
        // Name and identity are drawn together, because drawing them apart is
        // what gave the owner a father called Maria: the pronouns came off one
        // stream and the name off the whole corpus on another, with nothing
        // joining them.
        ...parentNamed,
        // A child usually shares a name with whoever raised them. A household
        // convention, and no claim about either of them beyond that. Where a
        // name is two surnames, one from each parent, the parent has the first
        // and their own second after it.
        familyName:
          familyNameFromParent(person.familyName, 0, parentNamed.familyName) ??
          person.familyName,
        birthDate: bornBefore.parent,
        homeJurisdictionId: input.jurisdictionId,
      },
    },
    {
      kind: "context-person",
      input: {
        stableKey: peerKey,
        ...named("peer"),
        // In the same school year, because a peer has to actually be one.
        birthDate: bornBefore.peer,
        homeJurisdictionId: input.jurisdictionId,
      },
    },
    {
      kind: "context-person",
      input: {
        stableKey: teacherKey,
        ...named("teacher"),
        // An adult, because the role requires one.
        birthDate: bornBefore.teacher,
        homeJurisdictionId: input.jurisdictionId,
      },
    },
  ];
  return {
    stableKey: input.stableKey,
    mode: "quick-generated",
    personId: input.personId,
    transitions: [
      ...contextPeople,
      {
        kind: "organization",
        input: {
          stableKey: elementary,
          formedAt: age(0),
          provenance: generated,
          initialProfile: {
            name: schoolNames.elementary,
            classification: "service:school",
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      },
      {
        kind: "organization",
        input: {
          stableKey: middleSchool,
          formedAt: age(0),
          provenance: generated,
          initialProfile: {
            name: schoolNames.middle,
            classification: "service:school",
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      },
      {
        kind: "organization",
        input: {
          stableKey: highSchool,
          formedAt: age(0),
          provenance: generated,
          initialProfile: {
            name: schoolNames.high,
            classification: "service:school",
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      },
      {
        kind: "organization",
        input: {
          stableKey: club,
          formedAt: age(0),
          provenance: generated,
          initialProfile: {
            name: "Community Service Club",
            classification: "community:youth-service",
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      },
      {
        kind: "organization",
        input: {
          stableKey: job,
          formedAt: age(0),
          provenance: generated,
          initialProfile: {
            name: input.preStartDates
              ? `${homeJurisdiction!.name} Market`
              : "Neighborhood Market",
            classification: "enterprise:retail",
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      },
      {
        kind: "household",
        input: {
          stableKey: home,
          formedAt: person.birthDate,
          label: "Childhood household",
          provenance: generated,
        },
      },
      {
        kind: "household-location",
        input: {
          stableKey: `${home}:location:birth`,
          householdStableKey: home,
          effectiveAt: person.birthDate,
          jurisdictionId: input.jurisdictionId,
          label: "Initial family residence",
          kind: "residence:family-home",
          provenance: generated,
        },
      },
      {
        kind: "household-membership",
        input: {
          stableKey: `${home}:child`,
          personId: input.personId,
          householdId: createStableId("household", `${world.id}:${home}`),
          startedAt: person.birthDate,
          residenceRole: "primary",
          kind: "resident:child",
          provenance: generated,
        },
      },
      {
        kind: "household-membership",
        input: {
          stableKey: `${home}:parent`,
          personId: parentId,
          householdId: createStableId("household", `${world.id}:${home}`),
          startedAt: person.birthDate,
          residenceRole: "primary",
          kind: "resident:adult",
          provenance: generated,
        },
      },
      {
        kind: "kinship",
        input: {
          stableKey: key("kinship"),
          personIds: [input.personId, parentId],
          establishedAt: person.birthDate,
          kind: "lineal:parent-child",
          provenance: generated,
        },
      },
      {
        kind: "care",
        input: {
          stableKey: key("care"),
          caregiverPersonId: parentId,
          recipientPersonId: input.personId,
          startedAt: person.birthDate,
          kind: "supervision:childcare",
          share: "primary",
          context: "Childhood care",
          timeDemand: lowTimeDemand(input.jurisdictionId),
          provenance: generated,
        },
      },
      {
        kind: "authority",
        input: {
          stableKey: key("authority"),
          childPersonId: input.personId,
          holder: { kind: "person", personId: parentId },
          establishedAt: person.birthDate,
          kind: "parental:ordinary",
          basisKind: "custom:family",
          context: "Childhood authority",
          provenance: generated,
        },
      },
      {
        // And it ends when they grow up.
        //
        // It did not, before Packet 72, and nothing noticed because nothing
        // asked. Once a stage could require that a character answers for
        // themselves, a thirty-four-year-old with an open childhood authority
        // record was recorded as still being somebody's dependent — so the
        // adult household family withheld itself from every adult in the
        // game. A childhood that never ends is a false biography, not a
        // bookkeeping quirk.
        kind: "authority-state",
        input: {
          stableKey: key("authority:ended"),
          authorityStableKey: key("authority"),
          effectiveAt: age(18),
          status: "ended",
          basisKind: "custom:family",
          context: "Reached adulthood",
          provenance: generated,
        },
      },
      {
        kind: "education",
        input: {
          stableKey: key("education:elementary"),
          personId: input.personId,
          organizationId: createStableId(
            "organization",
            `${world.id}:${elementary}`,
          ),
          startedAt: schoolStart("elementary", 5),
          programKind: "schooling:elementary",
          contextKind: "stage:elementary",
          provenance: generated,
        },
      },
      {
        kind: "event",
        input: formativeEvent(
          earlyEvent,
          "life.household-move",
          moveAt,
          input.jurisdictionId,
          [input.personId, parentId],
          "A household move changed the child's local routine.",
        ),
      },
      {
        kind: "household-location",
        input: {
          stableKey: `${home}:location:move`,
          householdStableKey: home,
          effectiveAt: moveAt,
          jurisdictionId: input.jurisdictionId,
          label: "Later family residence",
          kind: "residence:family-home",
          provenance: { kind: "event", eventStableKey: earlyEvent },
        },
      },
      {
        kind: "education-state",
        input: {
          stableKey: key(
            input.preStartDates
              ? "education:elementary:completed"
              : "education:elementary:transfer",
          ),
          enrollmentStableKey: key("education:elementary"),
          effectiveAt: input.preStartDates
            ? schoolStageCalendarEnd(world, person.id, "elementary")
            : episodeAt(7, "elementary-transfer"),
          status: input.preStartDates ? "completed" : "transferred",
          contextKind: "stage:elementary",
          reason: input.preStartDates
            ? "Completed elementary school before the recorded middle-school enrollment."
            : "Household move changed school context.",
          provenance: generated,
        },
      },
      {
        kind: "education",
        input: {
          stableKey: key("education:middle-school"),
          personId: input.personId,
          organizationId: createStableId(
            "organization",
            `${world.id}:${middleSchool}`,
          ),
          startedAt: schoolStart("middle", 11),
          programKind: "schooling:middle",
          contextKind: "stage:school",
          provenance: generated,
        },
      },
      {
        kind: "work",
        input: {
          stableKey: key("work:teacher"),
          personId: teacherId,
          organizationId: createStableId(
            "organization",
            `${world.id}:${middleSchool}`,
          ),
          startedAt: schoolStart("middle", 11),
          kind: "employment:education",
          compensation: "paid",
          authority: "directs-others",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance: generated,
          initialRole: {
            title: "Teacher",
            occupationClassification: "profession:teacher",
            locationJurisdictionId: input.jurisdictionId,
            timeDemand: moderateTimeDemand(input.jurisdictionId),
          },
        },
      },
      {
        kind: "education-state",
        input: {
          stableKey: key("education:middle-school:completed"),
          enrollmentStableKey: key("education:middle-school"),
          effectiveAt: schoolEnd("middle", 14),
          status: "completed",
          contextKind: "stage:school",
          reason: "Completed the middle-school program.",
          provenance: generated,
        },
      },
      {
        kind: "education",
        input: {
          stableKey: key("education:high-school"),
          personId: input.personId,
          organizationId: createStableId(
            "organization",
            `${world.id}:${highSchool}`,
          ),
          // The summarized history used to put this at age seven. The
          // projection then truthfully told a 34-year-old that high school had
          // begun two years after elementary school. Secondary school starts
          // in the adolescent band, after the recorded middle-school step.
          startedAt: schoolStart("high", 14),
          programKind: "schooling:secondary",
          contextKind: "stage:school",
          provenance: generated,
        },
      },
      {
        kind: "education",
        input: {
          stableKey: key("education:peer"),
          personId: peerId,
          organizationId: createStableId(
            "organization",
            `${world.id}:${highSchool}`,
          ),
          startedAt: schoolStart("high", 14),
          programKind: "schooling:secondary",
          contextKind: "stage:school",
          provenance: generated,
        },
      },
      {
        kind: "event",
        input: formativeEvent(
          lunchEvent,
          "life.lunch-table-choice",
          lunchAt,
          input.jurisdictionId,
          [input.personId, peerId],
          // Concrete and the same act the memory below records (UI FINISH).
          "At lunch you made room at the table for another kid.",
        ),
      },
      {
        kind: "knowledge",
        input: {
          stableKey: `${lunchEvent}:knowledge`,
          personId: input.personId,
          eventStableKey: lunchEvent,
          learnedAt: lunchAt,
          believedSummary:
            "At lunch you made room at the table for another kid.",
          accuracy: "accurate",
          confidence: "high",
          source: { kind: "direct" },
        },
      },
      {
        kind: "memory",
        input: {
          stableKey: `${lunchEvent}:memory`,
          personId: input.personId,
          eventStableKey: lunchEvent,
          formedAt: lunchAt,
          rememberedSummary: "I remember making room at the table.",
          interpretation: "It was a small thing, and it stayed with you.",
          strength: "moderate",
          relevanceTags: ["formative.lunch-table"],
          supersedesMemoryId: null,
        },
      },
      {
        kind: "interaction",
        input: {
          stableKey: `${lunchEvent}:interaction`,
          personIds: [input.personId, peerId],
          eventStableKey: lunchEvent,
          occurredAt: lunchAt,
          kind: "experience:shared-school",
          change: "formed",
          significance: "meaningful",
          summary:
            "A small shared school moment started a durable acquaintance.",
          tags: ["formative.lunch-table"],
        },
      },
      {
        kind: "appraisal",
        input: {
          stableKey: `${lunchEvent}:appraisal`,
          personId: input.personId,
          eventStableKey: lunchEvent,
          memoryStableKey: `${lunchEvent}:memory`,
          knowledgeStableKey: `${lunchEvent}:knowledge`,
          appraisedAt: lunchAt,
          meanings: [
            {
              key: "social-choice",
              label: "A social choice",
              valence: "positive",
              intensity: "subtle",
            },
          ],
          interpretation: "A small social choice mattered.",
          confidence: "medium",
          involvedPersonIds: [peerId],
          supersedesAppraisalId: null,
        },
      },
      {
        kind: "event",
        input: formativeEvent(
          teacherEvent,
          "life.teacher-guidance",
          teacherAt,
          input.jurisdictionId,
          [input.personId, teacherId],
          "A teacher offered concrete guidance.",
        ),
      },
      {
        kind: "interaction",
        input: {
          stableKey: `${teacherEvent}:interaction`,
          personIds: [input.personId, teacherId],
          eventStableKey: teacherEvent,
          occurredAt: teacherAt,
          kind: "mentorship:guidance",
          change: "formed",
          significance: "meaningful",
          summary: "The teacher became a durable mentoring context.",
          tags: ["formative.teacher-mentor"],
        },
      },
      {
        kind: "participation",
        input: {
          stableKey: key("participation:civic"),
          personId: input.personId,
          organizationId: createStableId("organization", `${world.id}:${club}`),
          startedAt: episodeAt(14, "civic-participation"),
          kind: "activity:community-service",
          roleKind: "participant:volunteer",
          context: "Youth community service",
          provenance: generated,
        },
      },
      {
        kind: "commitment",
        input: {
          stableKey: key("commitment:civic"),
          personId: input.personId,
          startsAt: episodeAt(14, "civic-participation"),
          endsAt: age(18),
          kind: "community:volunteering",
          label: "Youth community service",
          timeDemand: lowTimeDemand(input.jurisdictionId),
          provenance: generated,
        },
      },
      {
        kind: "event",
        input: formativeEvent(
          civicEvent,
          "life.civic-volunteering",
          civicAt,
          input.jurisdictionId,
          [input.personId],
          "The teenager joined a local volunteer effort.",
        ),
      },
      {
        kind: "event",
        input: formativeEvent(
          workEvent,
          "life.teen-work",
          workAt,
          input.jurisdictionId,
          [input.personId],
          "The teenager took a limited local job.",
        ),
      },
      {
        kind: "work",
        input: {
          stableKey: key("work:teen"),
          personId: input.personId,
          organizationId: createStableId("organization", `${world.id}:${job}`),
          startedAt: workAt,
          kind: "employment:part-time",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance: { kind: "event", eventStableKey: workEvent },
          initialRole: {
            title: "Store assistant",
            occupationClassification: "occupation:retail-assistant",
            locationJurisdictionId: input.jurisdictionId,
            timeDemand: lowTimeDemand(input.jurisdictionId),
          },
        },
      },
      {
        kind: "event",
        input: formativeEvent(
          futureEvent,
          "life.future-preparation",
          futureAt,
          input.jurisdictionId,
          [input.personId],
          "The teenager prepared a next education, training, work, or service step.",
        ),
      },
      // An old replay always recorded the completion, credited to the
      // future-preparation event, and has to rebuild to those same bytes. A
      // new pre-Begin biography records it only once the calendar reaches it.
      ...(!input.preStartDates || schoolEnd("high", 18) <= world.currentDate
        ? [
            {
              kind: "education-state" as const,
              input: {
                stableKey: key("education:high-school:completed"),
                enrollmentStableKey: key("education:high-school"),
                effectiveAt: schoolEnd("high", 18),
                status: "completed" as const,
                contextKind: "stage:school" as const,
                reason: "Completed the school program.",
                provenance: input.preStartDates
                  ? generated
                  : { kind: "event" as const, eventStableKey: futureEvent },
              },
            },
          ]
        : []),
    ],
  };
}

export function composeApprenticeshipPlan(input: {
  readonly stableKey: string;
  readonly mode: CharacterHistoryMode;
  readonly personId: EntityId;
  readonly organizationId: EntityId;
  readonly mentorPersonId: EntityId;
  readonly startsAt: IsoDate;
  readonly completesAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
}): CharacterHistoryPlan {
  const provenance: LifeRecordProvenance =
    input.mode === "authored"
      ? { kind: "authored", note: "Authored apprenticeship composition." }
      : { kind: "generated", generatorKey: input.stableKey };
  const eventKey = `${input.stableKey}:completion-event`;
  return {
    stableKey: input.stableKey,
    mode: input.mode,
    personId: input.personId,
    transitions: [
      {
        kind: "education",
        input: {
          stableKey: `${input.stableKey}:education`,
          personId: input.personId,
          organizationId: input.organizationId,
          startedAt: input.startsAt,
          programKind: "training:apprenticeship",
          contextKind: "track:work-based-learning",
          provenance,
        },
      },
      {
        kind: "work",
        input: {
          stableKey: `${input.stableKey}:work`,
          personId: input.personId,
          organizationId: input.organizationId,
          startedAt: input.startsAt,
          kind: "training:apprenticeship",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Apprentice",
            occupationClassification: "trade:apprentice",
            locationJurisdictionId: input.jurisdictionId,
            timeDemand: moderateTimeDemand(input.jurisdictionId),
          },
        },
      },
      {
        kind: "commitment",
        input: {
          stableKey: `${input.stableKey}:commitment`,
          personId: input.personId,
          startsAt: input.startsAt,
          endsAt: input.completesAt,
          kind: "personal:training",
          label: "Work-based training",
          timeDemand: moderateTimeDemand(input.jurisdictionId),
          provenance,
        },
      },
      {
        kind: "event",
        input: formativeEvent(
          eventKey,
          "life.training-completed",
          input.completesAt,
          input.jurisdictionId,
          [input.personId, input.mentorPersonId],
          "The apprenticeship training reached a recorded completion.",
        ),
      },
      {
        kind: "interaction",
        input: {
          stableKey: `${input.stableKey}:mentor-interaction`,
          personIds: [input.personId, input.mentorPersonId],
          eventStableKey: eventKey,
          occurredAt: input.completesAt,
          kind: "mentorship:training",
          change: "strengthened",
          significance: "meaningful",
          summary:
            "The training relationship included ordinary mentoring context.",
          tags: ["training.apprenticeship"],
        },
      },
      {
        kind: "education-state",
        input: {
          stableKey: `${input.stableKey}:education:completed`,
          enrollmentStableKey: `${input.stableKey}:education`,
          effectiveAt: input.completesAt,
          status: "completed",
          contextKind: "track:work-based-learning",
          reason: "Completed the recorded training outcome.",
          provenance: { kind: "event", eventStableKey: eventKey },
        },
      },
    ],
  };
}

export function composeGuardReservePlan(input: {
  readonly stableKey: string;
  readonly mode: CharacterHistoryMode;
  readonly personId: EntityId;
  readonly civilianOrganizationId: EntityId;
  readonly serviceOrganizationId: EntityId;
  readonly civilianStartsAt: IsoDate;
  readonly serviceStartsAt: IsoDate;
  readonly activationAt: IsoDate;
  readonly returnAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
}): CharacterHistoryPlan {
  const provenance: LifeRecordProvenance =
    input.mode === "authored"
      ? { kind: "authored", note: "Authored Guard/Reserve composition." }
      : { kind: "generated", generatorKey: input.stableKey };
  const civilian = `${input.stableKey}:civilian-work`;
  const service = `${input.stableKey}:service-work`;
  return {
    stableKey: input.stableKey,
    mode: input.mode,
    personId: input.personId,
    transitions: [
      {
        kind: "work",
        input: {
          stableKey: civilian,
          personId: input.personId,
          organizationId: input.civilianOrganizationId,
          startedAt: input.civilianStartsAt,
          kind: "employment:ordinary",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Civilian employee",
            occupationClassification: "occupation:general",
            locationJurisdictionId: input.jurisdictionId,
            timeDemand: moderateTimeDemand(input.jurisdictionId),
          },
        },
      },
      {
        kind: "work",
        input: {
          stableKey: service,
          personId: input.personId,
          organizationId: input.serviceOrganizationId,
          startedAt: input.serviceStartsAt,
          kind: "service:reserve",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Reserve service member",
            occupationClassification: "service:reserve",
            locationJurisdictionId: input.jurisdictionId,
            timeDemand: lowTimeDemand(input.jurisdictionId),
          },
        },
      },
      {
        kind: "work-status",
        input: {
          stableKey: `${civilian}:activation`,
          workStableKey: civilian,
          effectiveAt: input.activationAt,
          status: "temporarily-inactive",
          reason: "Service activation period.",
          provenance,
        },
      },
      {
        kind: "work-role",
        input: {
          stableKey: `${service}:activation-role`,
          workStableKey: service,
          effectiveAt: input.activationAt,
          title: "Activated service member",
          occupationClassification: "service:active-duty",
          locationJurisdictionId: input.jurisdictionId,
          timeDemand: {
            ...moderateTimeDemand(input.jurisdictionId),
            expectedWeekly: { minimumHours: 35, maximumHours: 55 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "rigid",
            interruptibility: "limited",
          },
          provenance,
        },
      },
      {
        kind: "work-status",
        input: {
          stableKey: `${civilian}:return`,
          workStableKey: civilian,
          effectiveAt: input.returnAt,
          status: "active",
          reason: "Returned from service activation.",
          provenance,
        },
      },
    ],
  };
}

export function composePcsRelocationPlan(input: {
  readonly stableKey: string;
  readonly mode: CharacterHistoryMode;
  readonly personId: EntityId;
  readonly householdStableKey: string;
  readonly effectiveAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly label: string;
}): CharacterHistoryPlan {
  const provenance: LifeRecordProvenance =
    input.mode === "authored"
      ? { kind: "authored", note: "Authored relocation composition." }
      : { kind: "generated", generatorKey: input.stableKey };
  return {
    stableKey: input.stableKey,
    mode: input.mode,
    personId: input.personId,
    transitions: [
      {
        kind: "household-location",
        input: {
          stableKey: `${input.stableKey}:household-location`,
          householdStableKey: input.householdStableKey,
          effectiveAt: input.effectiveAt,
          jurisdictionId: input.jurisdictionId,
          label: input.label,
          kind: "temporary:service-assignment",
          provenance,
        },
      },
    ],
  };
}

function withLifeProvenance<
  T extends { readonly provenance: CharacterHistoryProvenance },
>(
  world: World,
  input: T,
): Omit<T, "provenance"> & { readonly provenance: LifeRecordProvenance } {
  const provenance =
    input.provenance.kind === "event"
      ? {
          kind: "simulated-event" as const,
          eventId: requiredEvent(world, input.provenance.eventStableKey).id,
        }
      : input.provenance;
  const canonicalInput = Object.fromEntries(
    Object.entries(input).filter(
      ([key]) => key !== "provenance" && !key.endsWith("StableKey"),
    ),
  );
  return { ...canonicalInput, provenance } as Omit<T, "provenance"> & {
    readonly provenance: LifeRecordProvenance;
  };
}

function requiredEvent(world: World, stableKey: string) {
  return byStableKey(world.history.events, stableKey, "event");
}

function byStableKey<T extends { readonly stableKey: string }>(
  records: readonly T[],
  stableKey: string,
  label: string,
): T {
  const record = records.find((item) => item.stableKey === stableKey);
  if (!record) throw new Error(`Missing ${label} stable key: ${stableKey}`);
  return record;
}

function requiredPrevious<T extends { readonly id: EntityId }>(
  record: T | undefined,
  label: string,
): EntityId {
  if (!record) throw new Error(`Missing prior ${label}.`);
  return record.id;
}

function requirePerson(world: World, personId: EntityId): Person {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  return person;
}

function mindProvenanceKind(mode: CharacterHistoryMode) {
  return mode === "played"
    ? ("player-choice" as const)
    : mode === "authored"
      ? ("authored" as const)
      : ("reflection" as const);
}

function interactionKind(
  situation: LifeSituationKey,
  option: string,
  declared: RelationshipInteractionInput["kind"] | undefined,
): RelationshipInteractionInput["kind"] {
  if (declared) return declared;
  if (situation === "formative.teacher-mentor") return "mentorship:guidance";
  if (situation === "formative.belief-challenge")
    return option === "say-you-disagree"
      ? "conflict:formative"
      : "experience:formative";
  if (situation === "formative.friend-conflict" || option === "look-away")
    return "conflict:formative";
  return "experience:formative";
}

function interactionChange(
  option: string,
  declared: RelationshipInteractionInput["change"] | undefined,
): RelationshipInteractionInput["change"] {
  if (declared) return declared;
  if (WARMING_OPTION_KEYS.includes(option)) return "strengthened";
  // Saying so out loud tests a relationship rather than damaging it; only
  // pulling away or staying silent leaves it strained.
  if (option === "say-you-disagree") return "maintained";
  return "strained";
}

function situationEventType(
  key: LifeSituationKey,
): HistoricalEventInput["type"] {
  // Every situation key is `<band>.<family>`, and the event is `life.<family>`
  // whichever band it came from. Slicing a fixed prefix worked while there was
  // one band and would have silently produced `life.adult.debt-call` once there
  // were two.
  return `life.${key.slice(key.indexOf(".") + 1)}` as HistoricalEventInput["type"];
}

function formativeEvent(
  stableKey: string,
  type: HistoricalEventInput["type"],
  occurredAt: IsoDate,
  jurisdictionId: EntityId | null,
  people: readonly EntityId[],
  summary: string,
): HistoricalEventInput {
  return {
    stableKey,
    type,
    occurredAt,
    recordedAt: occurredAt,
    jurisdictionId,
    involvedEntityIds: [...people],
    participants: people.map((personId, index) => ({
      personId,
      role: index === 0 ? "focus:subject" : "presence:participant",
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "limited",
    tags: [type.replace(".", ".")],
    summary,
    context: {
      location: jurisdictionId
        ? { jurisdictionId, label: "Life context", setting: null }
        : null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  };
}

function lowTimeDemand(
  locationJurisdictionId: EntityId | null,
): CreateWorkRelationshipInput["initialRole"]["timeDemand"] {
  return {
    expectedWeekly: { minimumHours: 2, maximumHours: 8 },
    attention: "low",
    concurrency: "mostly-concurrent",
    scheduleRigidity: "flexible",
    interruptibility: "interruptible",
    locationJurisdictionId,
  };
}

function moderateTimeDemand(
  locationJurisdictionId: EntityId | null,
): CreateWorkRelationshipInput["initialRole"]["timeDemand"] {
  return {
    expectedWeekly: { minimumHours: 20, maximumHours: 40 },
    attention: "moderate",
    concurrency: "partly-concurrent",
    scheduleRigidity: "mixed",
    interruptibility: "limited",
    locationJurisdictionId,
  };
}

/**
 * The childhood repair a new game declares. Under it the parent, classmate and
 * teacher of a summarized childhood get birthdays of their own, and a child who
 * starts in school attends a school with a generated name rather than "<town>
 * public school". A replay that never named it keeps what it was written under.
 */
export const CHILDHOOD_GENERATION_V2 = "childhood-v2";
export type ChildhoodGenerationVersion = typeof CHILDHOOD_GENERATION_V2;

/**
 * Birth dates for the three people a summarized childhood meets.
 *
 * The legacy offsets put a stranger on the player's exact birthday in every
 * save, with a parent and a teacher born on the same day of the year as well.
 * The spread draws each on its own fork, so no other draw in the history
 * moves. The ranges are authored, not measured: a classmate within half a year
 * either side, never the same day; a parent 22 to 39 years older; a teacher 24
 * to 56, which keeps them of working age when the child is ten or twelve.
 */
function contextBirthDates(
  birthDate: IsoDate,
  rng: SeededRng,
  version: ChildhoodGenerationVersion | undefined,
): {
  readonly parent: IsoDate;
  readonly peer: IsoDate;
  readonly teacher: IsoDate;
} {
  if (version !== CHILDHOOD_GENERATION_V2) {
    return {
      parent: yearsBefore(birthDate, 28),
      peer: birthDate,
      teacher: yearsBefore(birthDate, 30),
    };
  }
  const older = (suffix: string, minYears: number, maxYears: number) => {
    const draw = rng.fork(`${suffix}:birth-date`);
    const years = draw.integer(minYears, maxYears + 1);
    return addDays(yearsBefore(birthDate, years), -draw.integer(0, 365));
  };
  const peerDraw = rng.fork("peer:birth-date");
  const peerOffset =
    peerDraw.integer(1, 183) * (peerDraw.next() < 0.5 ? -1 : 1);
  return {
    parent: older("parent", 22, 38),
    peer: addDays(birthDate, peerOffset),
    teacher: older("teacher", 24, 55),
  };
}

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const year = (Number(date.slice(0, 4)) - years).toString().padStart(4, "0");
  // Somebody born on the 29th of February has a parent and a teacher born in
  // years that mostly have no such day. The 28th, as dateAtAge does, rather
  // than a date the calendar refuses; every other date is unchanged.
  try {
    return makeIsoDate(`${year}${date.slice(4)}`);
  } catch (error) {
    if (date.slice(5) !== "02-29") throw error;
    return makeIsoDate(`${year}-02-28`);
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
