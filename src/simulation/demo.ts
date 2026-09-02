import { addDays, makeIsoDate } from "./dates";
import {
  LEXINGTON_DEMO_CONTEXT,
  LEXINGTON_PLACEHOLDER_ID,
  type DemoJurisdictionContext,
} from "./demo-jurisdiction-context";

export {
  DEMO_START_DATE,
  LEXINGTON_DEMO_CONTEXT,
  LEXINGTON_PLACEHOLDER_ID,
} from "./demo-jurisdiction-context";
export type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import { createStableId } from "./ids";
import {
  createCareResponsibility,
  createHousehold,
  createOrganization,
  createWorkRelationship,
  recordHouseholdLocation,
  recordLifeCommitment,
  startHouseholdMembership,
} from "./life";
import {
  createMindProvenance,
  recordAppraisal,
  recordGoalState,
  recordPersonalValue,
  recordPersonalityTendency,
  recordPerception,
  recordTemporaryState,
} from "./mind";
import { SYNTHETIC_MIND_IDS } from "./mind-catalog";
import {
  DEFAULT_PERSON_GENERATOR_VERSION,
  LEGACY_DEMO_PERSON_GENERATOR_VERSION,
  createLightweightPerson,
  personName,
} from "./people";
import { DEFAULT_CORPUS_VERSION, DEMO_NAMES_V4 } from "./names-data";
import { SYNTHETIC_POLICY_IDS } from "./policy";
import {
  createFormationContext,
  recordCampaignCommitment,
  recordPrinciple,
  recordPrivateBelief,
  recordPropositionExposure,
  recordPublicPosition,
  recordSubjectKnowledge,
} from "./politics";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
} from "./political-belief-formation";
import { pickDistinct, SeededRng, normalizeSeed } from "./rng";
import {
  recordClaim,
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import type { EntityId, PersonGenerationProfile, World } from "./types";
import {
  advanceWorld,
  createWorld,
  createWorldId,
  materializePerson,
  recordWorldEvent,
} from "./world";

export const DEFAULT_DEMO_SEED = "lexington-foundation";

const COMMUNITY_TOPICS = [
  "access to neighborhood services",
  "local transportation needs",
  "small-business conditions",
  "workforce training options",
] as const;

export interface CreateScenarioWorldOptions {
  readonly generatorVersion?: string;
  readonly corpusVersion?: string;
  readonly profile?: PersonGenerationProfile;
  readonly peopleCount?: number;
}

export interface CreateDemoWorldOptions extends CreateScenarioWorldOptions {
  readonly context?: DemoJurisdictionContext;
}

/** Compatibility entry point: omitted context preserves the primary fixture. */
export function createDemoWorld(
  seedInput = DEFAULT_DEMO_SEED,
  options?: CreateDemoWorldOptions,
): World {
  const { context = LEXINGTON_DEMO_CONTEXT, ...generationOptions } =
    options ?? {};
  return createScenarioWorld(seedInput, context, {
    ...generationOptions,
    generatorVersion:
      generationOptions.generatorVersion ??
      LEGACY_DEMO_PERSON_GENERATOR_VERSION,
  });
}

/** Shared fixture assembly; jurisdiction and canonical clock are required inputs. */
export function createScenarioWorld(
  seedInput: string,
  context: DemoJurisdictionContext,
  options?: CreateScenarioWorldOptions,
): World {
  const seed = normalizeSeed(seedInput);
  const worldId = createWorldId(seed);
  const jurisdiction = context.jurisdiction;
  const currentDate = makeIsoDate(context.initialMoment.date);
  const generatorVersion =
    options?.generatorVersion ?? DEFAULT_PERSON_GENERATOR_VERSION;
  const corpusVersion =
    options?.corpusVersion ??
    (generatorVersion === LEGACY_DEMO_PERSON_GENERATOR_VERSION
      ? DEMO_NAMES_V4.version
      : DEFAULT_CORPUS_VERSION);
  const count = options?.peopleCount ?? 6;
  const people = Array.from({ length: count }, (_, index) =>
    createLightweightPerson({
      worldId,
      worldSeed: seed,
      index,
      currentDate,
      homeJurisdictionId: jurisdiction.id,
      profile: options?.profile,
      generatorVersion,
      corpusVersion,
    }),
  );

  let world = createWorld({
    seed,
    currentDate,
    currentMoment: context.initialMoment,
    jurisdictions: [jurisdiction],
    people,
  });

  world = recordWorldEvent(world, {
    stableKey: "initial:world-created",
    type: "world.created",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [jurisdiction.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.world-created"],
    summary: context.creationSummary,
    context: {
      location: {
        jurisdictionId: jurisdiction.id,
        label: jurisdiction.name,
        setting: "Synthetic development fixture",
      },
      socialContext:
        "Synthetic foundation data; not a sourced real-world civic snapshot.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  for (const person of people) {
    world = recordWorldEvent(world, {
      stableKey: `initial:lightweight-person:${person.id}`,
      type: "person.lightweight-generated",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: jurisdiction.id,
      involvedEntityIds: [person.id, jurisdiction.id],
      participants: [
        {
          personId: person.id,
          role: "focus:subject",
          detail: "Generated person",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["person.generated", "simulation.fixture"],
      summary: `${personName(person)} entered the active simulation as a lightweight person.`,
      context: {
        location: {
          jurisdictionId: jurisdiction.id,
          label: jurisdiction.name,
          setting: "Synthetic development fixture",
        },
        socialContext: "Synthetic progressive-generation demonstration event.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }

  const diagnosticPerson = people[0];
  if (!diagnosticPerson) {
    throw new Error("Demo world did not generate a diagnostic person.");
  }
  world = recordPropositionExposure(world, {
    stableKey: `initial:exposure:${diagnosticPerson.id}:drug-negotiation`,
    personId: diagnosticPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
    encounteredAt: world.currentDate,
    summary:
      "Encountered the synthetic drug-negotiation proposition without an automatically assigned view.",
    provenance: {
      kind: "manual",
      note: "Authored fixture used to demonstrate sparse proposition exposure.",
    },
  });
  const diagnosticExposure = world.history.propositionExposures.at(-1);
  if (!diagnosticExposure) {
    throw new Error("Demo world did not record its diagnostic exposure.");
  }
  world = recordPrivateBelief(world, {
    stableKey: `initial:belief:${diagnosticPerson.id}:drug-negotiation`,
    personId: diagnosticPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
    formedAt: world.currentDate,
    position: "support",
    conviction: "tentative",
    salience: "moderate",
    flexibility: "open",
    rationale: "Initial synthetic diagnostic record.",
    formation: createFormationContext("reflection:initial", {
      propositionExposureIds: [diagnosticExposure.id],
      note: "Authored fixture; not inferred from personality or biography.",
    }),
    supersedesBeliefId: null,
  });
  world = recordPublicPosition(world, {
    stableKey: `initial:public-position:${diagnosticPerson.id}:drug-negotiation`,
    personId: diagnosticPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
    statedAt: world.currentDate,
    stance: "undecided",
    statement: "I remain publicly undecided on this proposal.",
    audience: "public",
    venue: "Synthetic developer fixture",
    sourceEventId: null,
    supersedesPublicPositionId: null,
  });
  world = recordCampaignCommitment(world, {
    stableKey: `initial:commitment:${diagnosticPerson.id}:drug-negotiation`,
    personId: diagnosticPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
    madeAt: world.currentDate,
    stance: "oppose",
    level: "pledge",
    statement:
      "I pledge to oppose this proposal in the synthetic campaign record.",
    conditions: null,
    sourceEventId: null,
    supersedesCommitmentId: null,
  });
  world = recordPrinciple(world, {
    stableKey: `initial:principle:${diagnosticPerson.id}:reduce-inequality`,
    personId: diagnosticPerson.id,
    principleId: SYNTHETIC_POLICY_IDS.principles.reduceInequality,
    formedAt: world.currentDate,
    stance: "endorses",
    conviction: "moderate",
    flexibility: "conditional",
    qualification: "Institutional stability also matters.",
    formation: createFormationContext("reflection:initial", {
      note: "Authored fixture; no proposition positions were inferred.",
    }),
    supersedesPrincipleRecordId: null,
  });
  world = recordSubjectKnowledge(world, {
    stableKey: `initial:subject-knowledge:${diagnosticPerson.id}:healthcare`,
    personId: diagnosticPerson.id,
    subjectId: SYNTHETIC_POLICY_IDS.subjects.healthcare,
    recordedAt: world.currentDate,
    familiarity: "aware",
    understanding: "minimal",
    expertise: "none",
    practicalExperience: "indirect",
    provenance: {
      kind: "manual",
      note: "Synthetic diagnostic scaffold, not an assertion of correctness.",
    },
    supersedesKnowledgeId: null,
  });

  const diagnosticEntryEvent = world.history.events.find(
    (event) =>
      event.type === "person.lightweight-generated" &&
      event.involvedEntityIds.includes(diagnosticPerson.id),
  );
  if (!diagnosticEntryEvent) {
    throw new Error(
      "Demo world did not retain the diagnostic person's entry event.",
    );
  }
  world = recordPersonalityTendency(world, {
    stableKey: `initial:tendency:${diagnosticPerson.id}:risk-approach`,
    personId: diagnosticPerson.id,
    tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
    recordedAt: world.currentDate,
    expressionKey: "cautious",
    strength: "moderate",
    confidence: "medium",
    scopeTags: ["decision.uncertainty"],
    provenance: createMindProvenance("authored", {
      note: "Synthetic diagnostic fixture; not inferred from biography.",
    }),
    supersedesTendencyId: null,
  });
  world = recordPersonalValue(world, {
    stableKey: `initial:value:${diagnosticPerson.id}:compassion`,
    personId: diagnosticPerson.id,
    valueId: SYNTHETIC_MIND_IDS.values.compassion,
    recordedAt: world.currentDate,
    orientation: "embraces",
    strength: "strong",
    salience: "high",
    qualification: "Especially when concrete hardship is visible.",
    provenance: createMindProvenance("authored", {
      note: "Synthetic diagnostic fixture; no policy position is implied.",
    }),
    supersedesValueId: null,
  });
  world = recordGoalState(world, {
    stableKey: `initial:goal:${diagnosticPerson.id}:understand-local-needs`,
    goalKey: "understand-local-needs",
    personId: diagnosticPerson.id,
    recordedAt: world.currentDate,
    objective: "Understand one concrete local need before taking a firm view.",
    domain: "community-learning",
    scope: context.goalScope,
    priority: "moderate",
    status: "active",
    targetEntityId: jurisdiction.id,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Synthetic diagnostic goal.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
  world = recordAppraisal(world, {
    stableKey: `initial:appraisal:${diagnosticPerson.id}:entry`,
    personId: diagnosticPerson.id,
    eventId: diagnosticEntryEvent.id,
    memoryId: null,
    eventKnowledgeId: null,
    appraisedAt: world.currentDate,
    meanings: [
      {
        key: "new-responsibility",
        label: "New responsibility",
        valence: "mixed",
        intensity: "moderate",
      },
    ],
    interpretation:
      "Entering the active simulation feels like an invitation to learn before committing.",
    confidence: "medium",
    involvedPersonIds: [diagnosticPerson.id],
    provenance: createMindProvenance("reflection", {
      sourceRefs: [
        { kind: "historical-event", eventId: diagnosticEntryEvent.id },
      ],
      note: "Synthetic diagnostic appraisal, separate from event truth.",
    }),
    supersedesAppraisalId: null,
  });
  const diagnosticAppraisal = world.history.appraisals.at(-1);
  if (!diagnosticAppraisal) {
    throw new Error("Demo world did not record its diagnostic appraisal.");
  }
  world = recordTemporaryState(world, {
    stableKey: `initial:temporary-state:${diagnosticPerson.id}:heightened-attention`,
    personId: diagnosticPerson.id,
    stateKey: "heightened-attention",
    label: "Heightened attention",
    recordedAt: world.currentDate,
    startsAt: world.currentDate,
    endsAt: addDays(world.currentDate, 1),
    intensity: "subtle",
    decisionTags: ["political-belief-formation"],
    provenance: createMindProvenance("reflection", {
      sourceRefs: [{ kind: "appraisal", appraisalId: diagnosticAppraisal.id }],
      note: "Short-lived context, not a permanent mood meter.",
    }),
  });

  world = recordPropositionExposure(world, {
    stableKey: `initial:exposure:${diagnosticPerson.id}:drug-price-caps`,
    personId: diagnosticPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps,
    encounteredAt: world.currentDate,
    summary:
      "Encountered a synthetic proposal framed as limiting selected out-of-pocket drug prices.",
    provenance: {
      kind: "manual",
      note: "Synthetic diagnostic framing, not a sourced policy-effect claim.",
    },
  });
  const priceCapExposure = world.history.propositionExposures.at(-1);
  if (!priceCapExposure) {
    throw new Error("Demo world did not record its price-cap exposure.");
  }
  world = recordPerception(world, {
    stableKey: `initial:perception:${diagnosticPerson.id}:drug-price-caps`,
    personId: diagnosticPerson.id,
    perceivedAt: world.currentDate,
    subjectKind: "domain:policy-proposition",
    subjectKey: `proposition:${SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps}`,
    subjectEntityId: SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps,
    assertion:
      "This proposal might reduce hardship for some people who buy medicine.",
    confidence: "low",
    sourceCredibility: "unknown",
    source: {
      kind: "proposition-exposure",
      exposureId: priceCapExposure.id,
    },
    supersedesPerceptionId: null,
  });
  const priceCapPerception = world.history.perceptions.at(-1);
  const compassionValue = world.history.personalValues.at(-1);
  if (!priceCapPerception || !compassionValue) {
    throw new Error(
      "Demo world did not prepare its political reasoning sources.",
    );
  }
  const politicalProposal = evaluatePoliticalBeliefFormation(world, {
    stableKey: `initial:belief-formation:${diagnosticPerson.id}:drug-price-caps`,
    personId: diagnosticPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps,
    perceptionIds: [priceCapPerception.id],
    randomness: "none",
    beliefDimensions: {
      conviction: "tentative",
      salience: "high",
      flexibility: "open",
    },
    factors: [
      {
        stableKey: "compassion-under-perceived-hardship",
        favors: "tentative-support",
        sourceType: "mind:value",
        importance: "strong",
        confidence: "medium",
        explanation:
          "In this specific encounter, perceived hardship makes the actor's compassion value relevant without creating a universal value-to-policy rule.",
        sourceRefs: [
          {
            kind: "personal-value",
            valueRecordId: compassionValue.id,
          },
          { kind: "perception", perceptionId: priceCapPerception.id },
          {
            kind: "proposition-exposure",
            exposureId: priceCapExposure.id,
          },
        ],
      },
    ],
  });
  world = applyNpcPoliticalBeliefFormation(world, politicalProposal);

  const lifeProvenance = {
    kind: "authored" as const,
    note: "Synthetic Stage 5.1 diagnostic fixture.",
  };
  world = createOrganization(world, {
    stableKey: "initial:organization:community-services-cooperative",
    formedAt: world.currentDate,
    provenance: lifeProvenance,
    initialProfile: {
      name: "Synthetic Community Services Cooperative",
      classification: "custom:community-services-cooperative",
      locationJurisdictionId: jurisdiction.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)?.id;
  const householdPerson = world.people[world.personOrder[1] ?? ""];
  const careRecipient = world.people[world.personOrder[2] ?? ""];
  if (!organizationId || !householdPerson || !careRecipient) {
    throw new Error("Demo world did not prepare its Stage 5.1 entities.");
  }
  const primaryTimeDemand = {
    expectedWeekly: { minimumHours: 32, maximumHours: 40 },
    attention: "high" as const,
    concurrency: "mostly-exclusive" as const,
    scheduleRigidity: "mixed" as const,
    interruptibility: "limited" as const,
    locationJurisdictionId: jurisdiction.id,
  };
  world = createWorkRelationship(world, {
    stableKey: `initial:work:${diagnosticPerson.id}:community-services`,
    personId: diagnosticPerson.id,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: lifeProvenance,
    initialRole: {
      title: "Community services coordinator",
      occupationClassification: "service:community-coordination",
      locationJurisdictionId: jurisdiction.id,
      timeDemand: primaryTimeDemand,
    },
  });
  world = createWorkRelationship(world, {
    stableKey: `initial:work:${householdPerson.id}:volunteer-repair`,
    personId: householdPerson.id,
    organizationId,
    startedAt: world.currentDate,
    kind: "volunteer:repair-support",
    compensation: "unpaid",
    authority: "shared",
    dependency: "independent",
    economicRisk: "shared",
    provenance: lifeProvenance,
    initialRole: {
      title: "Volunteer repair mentor",
      occupationClassification: "custom:repair-mentorship",
      locationJurisdictionId: jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 4, maximumHours: 8 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: jurisdiction.id,
      },
    },
  });
  world = createHousehold(world, {
    stableKey: "initial:household:shared-residence",
    formedAt: world.currentDate,
    label: "Synthetic shared residence household",
    provenance: lifeProvenance,
  });
  const sharedHouseholdId = world.history.households.at(-1)?.id;
  world = createHousehold(world, {
    stableKey: "initial:household:care-recipient",
    formedAt: world.currentDate,
    label: "Synthetic separate care-recipient household",
    provenance: lifeProvenance,
  });
  const recipientHouseholdId = world.history.households.at(-1)?.id;
  if (!sharedHouseholdId || !recipientHouseholdId) {
    throw new Error("Demo world did not create its Stage 5.1 households.");
  }
  for (const [householdId, stableKey] of [
    [sharedHouseholdId, "shared"],
    [recipientHouseholdId, "recipient"],
  ] as const) {
    world = recordHouseholdLocation(world, {
      stableKey: `initial:household-location:${stableKey}`,
      householdId,
      effectiveAt: world.currentDate,
      jurisdictionId: jurisdiction.id,
      label: context.householdLocationLabel,
      kind: "residence:community-base",
      provenance: lifeProvenance,
      supersedesLocationId: null,
    });
  }
  for (const person of [diagnosticPerson, householdPerson]) {
    world = startHouseholdMembership(world, {
      stableKey: `initial:household-membership:${person.id}`,
      personId: person.id,
      householdId: sharedHouseholdId,
      startedAt: world.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: lifeProvenance,
    });
  }
  world = startHouseholdMembership(world, {
    stableKey: `initial:household-membership:${careRecipient.id}`,
    personId: careRecipient.id,
    householdId: recipientHouseholdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance: lifeProvenance,
  });
  world = createCareResponsibility(world, {
    stableKey: `initial:care:${diagnosticPerson.id}:${careRecipient.id}`,
    caregiverPersonId: diagnosticPerson.id,
    recipientPersonId: careRecipient.id,
    startedAt: world.currentDate,
    kind: "custom:appointment-and-language-support",
    share: "shared",
    context: "Periodic appointment and language support across households",
    timeDemand: {
      expectedWeekly: { minimumHours: 4, maximumHours: 10 },
      attention: "low",
      concurrency: "mostly-concurrent",
      scheduleRigidity: "flexible",
      interruptibility: "interruptible",
      locationJurisdictionId: null,
    },
    provenance: lifeProvenance,
  });
  world = recordLifeCommitment(world, {
    stableKey: `initial:commitment:${diagnosticPerson.id}:mutual-aid-circle`,
    personId: diagnosticPerson.id,
    startsAt: world.currentDate,
    endsAt: null,
    kind: "custom:mutual-aid-circle",
    label: "Mutual-aid coordination circle",
    timeDemand: {
      expectedWeekly: { minimumHours: 3, maximumHours: 6 },
      attention: "moderate",
      concurrency: "partly-concurrent",
      scheduleRigidity: "flexible",
      interruptibility: "interruptible",
      locationJurisdictionId: null,
    },
    provenance: lifeProvenance,
  });

  return world;
}

/**
 * Creates a fresh simulation world using the standard generated-person foundation
 * (person-v5 / names-v1) and plausible working age profile.
 */
export function createGeneratedWorld(
  seedInput = DEFAULT_DEMO_SEED,
  options?: Omit<CreateDemoWorldOptions, "generatorVersion" | "corpusVersion">,
): World {
  return createDemoWorld(seedInput, {
    generatorVersion: DEFAULT_PERSON_GENERATOR_VERSION,
    corpusVersion: DEFAULT_CORPUS_VERSION,
    ...options,
  });
}

export function advanceDemoWorld(world: World, days = 7): World {
  const actionSequence = world.actionSequence;
  let advanced = advanceWorld(world, days);
  const jurisdictionId = advanced.jurisdictionOrder[0];

  if (!jurisdictionId || advanced.personOrder.length < 2) {
    return advanced;
  }

  const rng = new SeededRng(world.seed).fork(
    `demo-advance-v1:${actionSequence}:${world.currentDate}:${days}`,
  );
  const participantIds = pickDistinct(rng, advanced.personOrder, 2);
  const firstPersonId = participantIds[0];
  const secondPersonId = participantIds[1];
  const firstPerson = firstPersonId
    ? advanced.people[firstPersonId]
    : undefined;
  const secondPerson = secondPersonId
    ? advanced.people[secondPersonId]
    : undefined;

  const jurisdiction = advanced.jurisdictions[jurisdictionId];
  if (!jurisdiction || !firstPerson || !secondPerson) {
    throw new Error(
      "Demo occurrence could not resolve its selected participants.",
    );
  }

  const topic = rng.pick(COMMUNITY_TOPICS);

  advanced = recordWorldEvent(advanced, {
    stableKey: `action:${actionSequence}:community-listening-session:${world.currentDate}:${days}:${advanced.currentDate}:${firstPerson.id}:${secondPerson.id}:${topic}`,
    type: "community.listening-session",
    occurredAt: advanced.currentDate,
    recordedAt: advanced.currentDate,
    jurisdictionId,
    involvedEntityIds: [jurisdictionId, firstPerson.id, secondPerson.id],
    participants: [
      {
        personId: firstPerson.id,
        role: "presence:participant",
        detail: "Attendee",
      },
      {
        personId: secondPerson.id,
        role: "presence:participant",
        detail: "Attendee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["community.listening", "relationship.shared-experience"],
    summary: `${personName(firstPerson)} and ${personName(secondPerson)} attended a listening session about ${topic}.`,
    context: {
      location: {
        jurisdictionId,
        // Retain the accepted primary fixture's exact historical copy.
        label:
          jurisdictionId === LEXINGTON_PLACEHOLDER_ID
            ? "Lexington-Fayette community venue"
            : `${jurisdiction.name} community venue`,
        setting: "Public listening session",
      },
      socialContext:
        "Synthetic placeholder occurrence generated to exercise durable history.",
      pressure: null,
      choice: `Both people chose to attend a session about ${topic}.`,
      motivation: "Learn about a local concern.",
      immediateReaction: "Both remained through the session.",
    },
  });

  const listeningEvent = advanced.history.events.at(-1);
  if (!listeningEvent) {
    throw new Error("Demo listening-session event was not recorded.");
  }
  advanced = recordRelationshipInteraction(advanced, {
    stableKey: `action:${actionSequence}:relationship:${firstPerson.id}:${secondPerson.id}`,
    personIds: [firstPerson.id, secondPerson.id],
    eventId: listeningEvent.id,
    occurredAt: listeningEvent.occurredAt,
    kind: "experience:shared",
    change: "formed",
    significance: "minor",
    summary: `${personName(firstPerson)} and ${personName(secondPerson)} met through the listening session.`,
    tags: ["community.listening", "relationship.shared-experience"],
  });
  advanced = recordMemory(advanced, {
    stableKey: `action:${actionSequence}:memory:${firstPerson.id}`,
    personId: firstPerson.id,
    eventId: listeningEvent.id,
    formedAt: listeningEvent.occurredAt,
    rememberedSummary: `A public session about ${topic}.`,
    interpretation: "A modest local encounter worth remembering.",
    strength: "faint",
    relevanceTags: ["community.listening"],
    supersedesMemoryId: null,
  });
  for (const person of [firstPerson, secondPerson]) {
    advanced = recordEventKnowledge(advanced, {
      stableKey: `action:${actionSequence}:knowledge:${person.id}`,
      personId: person.id,
      eventId: listeningEvent.id,
      learnedAt: listeningEvent.occurredAt,
      believedSummary: listeningEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  advanced = recordClaim(advanced, {
    stableKey: `action:${actionSequence}:claim:${firstPerson.id}`,
    speakerPersonId: firstPerson.id,
    eventId: listeningEvent.id,
    madeAt: listeningEvent.occurredAt,
    audience: "limited",
    statement: `The listening session focused on ${topic}.`,
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });

  return advanced;
}

function executeDemoActions(seed: string): World {
  let world = createDemoWorld(seed);
  world = advanceDemoWorld(world, 7);
  world = advanceDemoWorld(world, 14);

  const materializedPersonId = world.personOrder[0];
  if (!materializedPersonId) {
    throw new Error("Demo world did not generate a person to materialize.");
  }

  return materializePerson(world, materializedPersonId);
}

export interface DemoScenarioResult {
  readonly world: World;
  readonly materializedPersonId: EntityId;
  readonly reproducible: boolean;
  readonly snapshotId: EntityId;
}

export function runDemoScenario(
  seedInput = DEFAULT_DEMO_SEED,
): DemoScenarioResult {
  const seed = normalizeSeed(seedInput);
  const world = executeDemoActions(seed);
  const replay = executeDemoActions(seed);
  const materializedPersonId = world.personOrder[0];

  if (!materializedPersonId) {
    throw new Error("Demo world did not generate a person to materialize.");
  }

  const serialized = JSON.stringify(world);

  return {
    world,
    materializedPersonId,
    reproducible: serialized === JSON.stringify(replay),
    snapshotId: createStableId("snapshot", serialized),
  };
}
