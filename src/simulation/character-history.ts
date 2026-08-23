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
import { SeededRng } from "./rng";
import { recordWorldEvent, assertWorldIntegrity, advanceWorld } from "./world";
import type {
  AppraisalRecordInput,
  EventKnowledgeRecordInput,
  HistoricalEventInput,
  MemoryRecordInput,
  RelationshipInteractionInput,
  TemporaryStateRecordInput,
} from "./history";
import type {
  DevelopmentProposal,
  EntityId,
  IsoDate,
  LifeEligibilityDecision,
  LifeEligibilityProvider,
  LifeRecordProvenance,
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

export type FormativePacingBand =
  "early-childhood" | "middle-childhood" | "adolescence";

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

export type LifeSituationKey =
  | "formative.household-transition"
  | "formative.school-entry"
  | "formative.lunch-table"
  | "formative.friend-conflict"
  | "formative.teacher-mentor"
  | "formative.activity-choice"
  | "formative.civic-volunteering"
  | "formative.teen-work-opportunity"
  | "formative.future-preparation";

export interface LifeSituationOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface AvailableLifeSituation {
  readonly key: LifeSituationKey;
  readonly band: FormativePacingBand;
  readonly options: readonly LifeSituationOption[];
}

const SITUATIONS: readonly AvailableLifeSituation[] = [
  {
    key: "formative.household-transition",
    band: "early-childhood",
    options: [
      {
        key: "settle-in",
        label: "Settle in",
        description: "Help make the new routine feel familiar.",
      },
    ],
  },
  {
    key: "formative.school-entry",
    band: "early-childhood",
    options: [
      {
        key: "join-in",
        label: "Join in",
        description: "Take part in the new classroom routine.",
      },
    ],
  },
  {
    key: "formative.lunch-table",
    band: "middle-childhood",
    options: [
      {
        key: "make-room",
        label: "Make room",
        description: "Invite the other child to join the table.",
      },
      {
        key: "look-away",
        label: "Look away",
        description: "Avoid getting involved in the moment.",
      },
    ],
  },
  {
    key: "formative.friend-conflict",
    band: "middle-childhood",
    options: [
      {
        key: "repair",
        label: "Try to repair it",
        description: "Speak directly and attempt a repair.",
      },
      {
        key: "withdraw",
        label: "Step back",
        description: "Take space rather than force a resolution.",
      },
    ],
  },
  {
    key: "formative.teacher-mentor",
    band: "middle-childhood",
    options: [
      {
        key: "accept-guidance",
        label: "Accept guidance",
        description: "Follow up with the adult who offered help.",
      },
      {
        key: "decline-guidance",
        label: "Handle it alone",
        description: "Thank them, then try independently.",
      },
    ],
  },
  {
    key: "formative.activity-choice",
    band: "adolescence",
    options: [
      {
        key: "join",
        label: "Join the activity",
        description: "Commit time to a new group or activity.",
      },
      {
        key: "leave",
        label: "Leave the activity",
        description: "Make room for another priority.",
      },
    ],
  },
  {
    key: "formative.civic-volunteering",
    band: "adolescence",
    options: [
      {
        key: "volunteer",
        label: "Volunteer",
        description: "Contribute time to a local effort.",
      },
      {
        key: "observe",
        label: "Observe first",
        description: "Learn about the work before committing.",
      },
    ],
  },
  {
    key: "formative.teen-work-opportunity",
    band: "adolescence",
    options: [
      {
        key: "accept",
        label: "Accept the opportunity",
        description: "Take on the offered role if it is permitted.",
      },
      {
        key: "decline",
        label: "Decline for now",
        description: "Keep the current commitments manageable.",
      },
    ],
  },
  {
    key: "formative.future-preparation",
    band: "adolescence",
    options: [
      {
        key: "prepare",
        label: "Prepare a next step",
        description:
          "Take a concrete step toward education, training, work, or service.",
      },
    ],
  },
];

export function availableLifeSituations(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly asOfDate: IsoDate;
    readonly otherPersonId?: EntityId | null;
  },
): readonly AvailableLifeSituation[] {
  const interval = formativeIntervalAt(world, input.personId, input.asOfDate);
  if (!interval) return [];
  const otherPersonId = input.otherPersonId ?? null;
  return SITUATIONS.filter((situation) => {
    if (situation.band !== interval.band) return false;
    const social = [
      "formative.lunch-table",
      "formative.friend-conflict",
      "formative.teacher-mentor",
    ].includes(situation.key);
    return !social || (otherPersonId !== null && !!world.people[otherPersonId]);
  });
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
          involvedEntityIds: [input.personId, ...(other ? [other] : [])],
          participants: [
            {
              personId: input.personId,
              role: "agency:actor",
              detail: option.label,
            },
            ...(other
              ? [
                  {
                    personId: other,
                    role: "presence:participant" as const,
                    detail: null,
                  },
                ]
              : []),
          ],
          personFactConstraints: [],
          visibility: "limited",
          tags: [input.situationKey, `choice.${input.optionKey}`],
          summary: `${option.label}: ${option.description}`,
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
        believedSummary: `${option.label}: ${option.description}`,
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
        rememberedSummary: `${option.label}: ${option.description}`,
        interpretation: option.description,
        strength:
          input.situationKey === "formative.lunch-table"
            ? "strong"
            : "moderate",
        relevanceTags: [input.situationKey],
        supersedesMemoryId: null,
      },
    },
  ];
  if (other) {
    consequenceTransitions.push(
      {
        kind: "knowledge",
        input: {
          stableKey: `${input.stableKey}:knowledge:${other}`,
          personId: other,
          eventStableKey,
          learnedAt: input.occurredAt,
          believedSummary: `${option.label}: ${option.description}`,
          accuracy: "accurate",
          confidence: "medium",
          source: { kind: "direct" },
        },
      },
      {
        kind: "interaction",
        input: {
          stableKey: `${input.stableKey}:interaction`,
          personIds: [input.personId, other],
          eventStableKey,
          occurredAt: input.occurredAt,
          kind: interactionKind(input.situationKey, input.optionKey),
          change: interactionChange(input.optionKey),
          significance: "meaningful",
          summary: `${option.label}: ${option.description}`,
          tags: [input.situationKey],
        },
      },
    );
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
          valence:
            input.optionKey === "look-away" || input.optionKey === "withdraw"
              ? "mixed"
              : "positive",
          intensity: "subtle",
        },
      ],
      interpretation: option.description,
      confidence: "medium",
      involvedPersonIds: other ? [other] : [],
      supersedesAppraisalId: null,
    },
  });
  if (input.optionKey === "look-away" || input.optionKey === "withdraw") {
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
        givenName: rng.pick(["Avery", "Jordan", "Morgan"]),
        familyName: person.familyName,
        birthDate: yearsBefore(person.birthDate, 28),
        homeJurisdictionId: input.jurisdictionId,
      },
    },
    {
      kind: "context-person",
      input: {
        stableKey: peerKey,
        givenName: rng.pick(["Casey", "Riley", "Taylor"]),
        familyName: rng.pick(["Bennett", "Kim", "Morales"]),
        birthDate: age(0),
        homeJurisdictionId: input.jurisdictionId,
      },
    },
    {
      kind: "context-person",
      input: {
        stableKey: teacherKey,
        givenName: rng.pick(["Dana", "Robin", "Sam"]),
        familyName: rng.pick(["Cole", "Reed", "Shaw"]),
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
  return { ...input, provenance };
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
): RelationshipInteractionInput["kind"] {
  if (situation === "formative.teacher-mentor") return "mentorship:guidance";
  if (situation === "formative.friend-conflict" || option === "look-away")
    return "conflict:formative";
  return "experience:formative";
}

function interactionChange(
  option: string,
): RelationshipInteractionInput["change"] {
  return option === "repair" ||
    option === "make-room" ||
    option === "accept-guidance"
    ? "strengthened"
    : "strained";
}

function situationEventType(
  key: LifeSituationKey,
): HistoricalEventInput["type"] {
  return `life.${key.slice("formative.".length)}` as HistoricalEventInput["type"];
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
