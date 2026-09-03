import { adultLifeSituations } from "./adult-situations";
import { addDays, ageOnDate, dateAtAge, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  createCareResponsibility,
  createChildAuthority,
  createEducationEnrollment,
  createHousehold,
  createOrganization,
  createOrganizationParticipation,
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
import type {
  CreateCareResponsibilityInput,
  CreateChildAuthorityInput,
  CreateEducationEnrollmentInput,
  CreateHouseholdInput,
  CreateOrganizationInput,
  CreateOrganizationParticipationInput,
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
import { drawCanonicalName } from "./people";
import { SeededRng } from "./rng";
import { recordWorldEvent, assertWorldIntegrity, advanceWorld } from "./world";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  createResourcePosition,
  createWorkCompensation,
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
  IsoDate,
  LifeEligibilityDecision,
  LifeEligibilityProvider,
  LifeRecordProvenance,
  LifeSituationKey,
  LifeSituationOption,
  Person,
  PersonFact,
  World,
} from "./types";

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
}

type WithProvenance<T> = Omit<T, "provenance"> & {
  readonly provenance: CharacterHistoryProvenance;
};

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

/** Creates the smallest persistent social context person through one validated writer. */
export function createCharacterHistoryContextPerson(
  world: World,
  input: CharacterHistoryContextPersonInput,
): World {
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
  const birthplace = input.birthplaceJurisdictionId ?? input.homeJurisdictionId;
  if (!world.jurisdictions[birthplace]) {
    throw new Error(
      "A context person requires an existing birthplace jurisdiction.",
    );
  }
  const id = characterHistoryContextPersonId(world, input.stableKey);
  const existing = world.people[id];
  if (existing) return world;
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
      occurredAt: world.currentDate,
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
    detailLevel: "lightweight",
    establishedFacts: facts,
  };
  const next: World = {
    ...world,
    people: { ...world.people, [id]: person },
    personOrder: [...world.personOrder, id],
  };
  assertWorldIntegrity(next);
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
  const next = advanceWorld(world, input.days);
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
            pressure: null,
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
  if (interactions.length >= 2 && other) {
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
  },
): CharacterHistoryPlan {
  const person = requirePerson(world, input.personId);
  const rng = new SeededRng(world.seed).fork(
    `character-history-v1:${input.personId}:${input.stableKey}`,
  );
  const generated = {
    kind: "generated" as const,
    generatorKey: `character-history-v1:${input.stableKey}`,
  };
  const key = (suffix: string) => `${input.stableKey}:${suffix}`;
  const parentKey = key("parent");
  const peerKey = key("peer");
  const teacherKey = key("teacher");
  const parentId = characterHistoryContextPersonId(world, parentKey);
  const peerId = characterHistoryContextPersonId(world, peerKey);
  const teacherId = characterHistoryContextPersonId(world, teacherKey);
  const home = key("household");
  const elementary = key("elementary-school");
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
        ...drawCanonicalName(rng.fork("parent")),
        // A child usually shares a name with whoever raised them. A household
        // convention, and no claim about either of them beyond that.
        familyName: person.familyName,
        birthDate: yearsBefore(person.birthDate, 28),
        homeJurisdictionId: input.jurisdictionId,
      },
    },
    {
      kind: "context-person",
      input: {
        stableKey: peerKey,
        ...drawCanonicalName(rng.fork("peer")),
        // Born the same year, because a peer has to actually be one.
        birthDate: age(0),
        homeJurisdictionId: input.jurisdictionId,
      },
    },
    {
      kind: "context-person",
      input: {
        stableKey: teacherKey,
        ...drawCanonicalName(rng.fork("teacher")),
        // An adult, because the role requires one.
        birthDate: yearsBefore(person.birthDate, 30),
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
            name: "Local Elementary School",
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
            name: "Local High School",
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
            name: "Neighborhood Market",
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
        kind: "education",
        input: {
          stableKey: key("education:elementary"),
          personId: input.personId,
          organizationId: createStableId(
            "organization",
            `${world.id}:${elementary}`,
          ),
          startedAt: age(5),
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
          age(6),
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
          effectiveAt: age(6),
          jurisdictionId: input.jurisdictionId,
          label: "Later family residence",
          kind: "residence:family-home",
          provenance: { kind: "event", eventStableKey: earlyEvent },
        },
      },
      {
        kind: "education-state",
        input: {
          stableKey: key("education:elementary:transfer"),
          enrollmentStableKey: key("education:elementary"),
          effectiveAt: age(7),
          status: "transferred",
          contextKind: "stage:elementary",
          reason: "Household move changed school context.",
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
          startedAt: age(7),
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
          startedAt: age(7),
          programKind: "schooling:secondary",
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
            `${world.id}:${highSchool}`,
          ),
          startedAt: age(7),
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
        kind: "event",
        input: formativeEvent(
          lunchEvent,
          "life.lunch-table-choice",
          age(10),
          input.jurisdictionId,
          [input.personId, peerId],
          "A lunch-table choice became part of a peer relationship.",
        ),
      },
      {
        kind: "knowledge",
        input: {
          stableKey: `${lunchEvent}:knowledge`,
          personId: input.personId,
          eventStableKey: lunchEvent,
          learnedAt: age(10),
          believedSummary:
            "A lunch-table choice became part of a peer relationship.",
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
          formedAt: age(10),
          rememberedSummary: "I remember making room at the table.",
          interpretation: "A small social choice mattered.",
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
          occurredAt: age(10),
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
          appraisedAt: age(10),
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
          age(12),
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
          occurredAt: age(12),
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
          startedAt: age(14),
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
          startsAt: age(14),
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
          age(15),
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
          age(16),
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
          startedAt: age(16),
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
          age(17),
          input.jurisdictionId,
          [input.personId],
          "The teenager prepared a next education, training, work, or service step.",
        ),
      },
      {
        kind: "education-state",
        input: {
          stableKey: key("education:high-school:completed"),
          enrollmentStableKey: key("education:high-school"),
          effectiveAt: age(18),
          status: "completed",
          contextKind: "stage:school",
          reason: "Completed the school program.",
          provenance: { kind: "event", eventStableKey: futureEvent },
        },
      },
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

function yearsBefore(date: IsoDate, years: number): IsoDate {
  return makeIsoDate(
    `${(Number(date.slice(0, 4)) - years).toString().padStart(4, "0")}${date.slice(4)}`,
  );
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
