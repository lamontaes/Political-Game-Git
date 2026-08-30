import { ageOnDate, isoDateFromParts, makeIsoDate } from "./dates";
import {
  LEXINGTON_DEMO_CONTEXT,
  LEXINGTON_PLACEHOLDER_ID,
} from "./demo-jurisdiction-context";
import { SYNTHETIC_MIND_IDS } from "./mind-catalog";
import { SYNTHETIC_POLICY_IDS } from "./policy";
import {
  createHousehold,
  createOrganization,
  createWorkRelationship,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "./life";
import {
  createMindProvenance,
  recordGoalState,
  recordPersonalValue,
  recordPersonalityTendency,
} from "./mind";
import {
  createFormationContext,
  recordPrinciple,
  recordPublicPosition,
} from "./politics";
import { personName, createLightweightPerson } from "./people";
import { createResourcePosition, makeCurrencyCode } from "./resources";
import {
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import type { EntityId, LifeRecordProvenance, World } from "./types";
import {
  createWorld,
  createWorldId,
  recordWorldEvent,
  assertWorldIntegrity,
  advanceWorld,
} from "./world";

export type LifeStartAge = 25 | 32 | 40 | 48;

export type LifeStartPartyAffiliation =
  "independent" | "democratic" | "republican";

export type LifeStartBackground =
  | "civic-organizer"
  | "local-business"
  | "neighborhood-advocate"
  | "public-service"
  | "struggling"
  | "middle"
  | "affluent";

export type LifeStartFamilyStructure =
  "single-parent" | "two-parent" | "extended-family";

export type LifeStartDepth = "quick" | "guided" | "full";

export type LifeStartValueKey =
  "family" | "achievement" | "service" | "fairness";

export type LifeStartApproachKey = "cautious" | "risk-seeking";

export interface LifeStartPlace {
  readonly key: string;
  readonly label: string;
  readonly jurisdictionId: EntityId;
  readonly description: string;
  readonly jurisdiction: {
    readonly id: EntityId;
    readonly name: string;
    readonly parentName: string;
  };
}

export const LIFE_START_PLACES: readonly LifeStartPlace[] = [
  {
    key: "lexington-fayette",
    label: "Lexington, Kentucky",
    jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
    description: "Lexington-Fayette Urban County, Kentucky",
    jurisdiction: {
      id: LEXINGTON_PLACEHOLDER_ID,
      name: "Lexington-Fayette",
      parentName: "Kentucky",
    },
  },
];

export type LifeStartPlaceKey = "lexington-fayette";

export interface LifeStartInput {
  readonly givenName: string;
  readonly familyName: string;
  readonly startAge: number;
  readonly partyAffiliation?: LifeStartPartyAffiliation;
  readonly background?: LifeStartBackground;
  readonly depth?: LifeStartDepth;
  readonly familyStructure?: LifeStartFamilyStructure;
  readonly birthplace?: LifeStartPlaceKey;
  readonly hometown?: LifeStartPlaceKey;
  readonly currentResidence?: LifeStartPlaceKey;
  readonly declaredValue?: LifeStartValueKey;
  readonly declaredApproach?: LifeStartApproachKey;
  readonly seed?: string;
}

export type LifeActionKey =
  | "talk-ally"
  | "attend-forum"
  | "review-issues"
  | "explore-campaign"
  | "focus-work";

export interface LifeAction {
  readonly key: LifeActionKey;
  readonly label: string;
  readonly category: string;
  readonly description: string;
  readonly days: number;
}

export interface LifeWorldSummary {
  readonly name: string;
  readonly age: number;
  readonly currentDate: string;
  readonly currentResidence: string;
  readonly lifeStage: string;
  readonly householdLabel: string;
  readonly familyNames: readonly string[];
  readonly workLabel: string | null;
  readonly educationLabel: string | null;
  readonly resourceLabel: string;
  readonly birthplace: string;
  readonly hometown: string;
  readonly recentHistory: readonly string[];
  readonly politicalOutlook: string;
}

const DEFAULT_START_SEED = "first-session-lexington-v1";

export function createLifeStartWorld(input: LifeStartInput): World {
  const givenName = input.givenName.trim();
  const familyName = input.familyName.trim();
  if (!givenName || !familyName) {
    throw new Error("Character setup requires a given and family name.");
  }
  const startAge = Math.max(18, Math.min(90, Math.floor(input.startAge || 32)));
  const partyAffiliation: LifeStartPartyAffiliation =
    input.partyAffiliation ?? "independent";
  const background: LifeStartBackground =
    input.background ?? "neighborhood-advocate";
  const declaredValue: LifeStartValueKey = input.declaredValue ?? "service";
  const declaredApproach: LifeStartApproachKey =
    input.declaredApproach ?? "cautious";

  const seed =
    input.seed?.trim() ||
    `${DEFAULT_START_SEED}:${givenName.toLowerCase()}-${familyName.toLowerCase()}`;
  const context = LEXINGTON_DEMO_CONTEXT;
  const jurisdiction = context.jurisdiction;
  const currentDate = makeIsoDate(context.initialMoment.date);
  const worldId = createWorldId(seed);

  // Calculate coherent birth date based on startAge
  const [currentYear, currentMonth, currentDay] = currentDate
    .split("-")
    .map(Number);
  const birthDate = isoDateFromParts(
    (currentYear ?? 2026) - startAge,
    currentMonth ?? 2,
    currentDay ?? 1,
  );

  // Generate the player character as Person 0
  const playerPerson = createLightweightPerson({
    worldId,
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: jurisdiction.id,
    birthplaceJurisdictionId: jurisdiction.id,
    identity: {
      givenName,
      familyName,
      birthDate,
    },
  });

  // Generate 5 community people in Lexington
  const communityPeople = Array.from({ length: 5 }, (_, idx) =>
    createLightweightPerson({
      worldId,
      worldSeed: seed,
      index: idx + 1,
      currentDate,
      homeJurisdictionId: jurisdiction.id,
      birthplaceJurisdictionId: jurisdiction.id,
    }),
  );

  const people = [playerPerson, ...communityPeople];

  let world = createWorld({
    seed,
    currentDate,
    currentMoment: context.initialMoment,
    jurisdictions: [jurisdiction],
    people,
  });

  // Assign player control
  world = {
    ...world,
    control: {
      kind: "person",
      personId: playerPerson.id,
    },
  };

  const lifeProvenance: LifeRecordProvenance = {
    kind: "authored",
    note: "Player-authored first session character foundation.",
  };

  // 1. Initial World Event
  world = recordWorldEvent(world, {
    stableKey: `life-start:entry:${playerPerson.id}`,
    type: "person.life-entry",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [playerPerson.id, jurisdiction.id],
    participants: [
      {
        personId: playerPerson.id,
        role: "focus:subject",
        detail: "Player character entered active life in Lexington",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["life.entry", "player.start"],
    summary: `${personName(playerPerson)} is established in Lexington, Kentucky as a ${formatBackgroundTitle(background)}.`,
    context: {
      location: {
        jurisdictionId: jurisdiction.id,
        label: jurisdiction.name,
        setting: "Lexington community setting",
      },
      socialContext: "Beginning of player civic journey in Fayette County.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  // 2. Household & Location
  world = createHousehold(world, {
    stableKey: `life-start:household:${playerPerson.id}`,
    formedAt: world.currentDate,
    label: `${familyName} Residence`,
    provenance: lifeProvenance,
  });
  const household = world.history.households.at(-1);
  if (household) {
    world = recordHouseholdLocation(world, {
      stableKey: `life-start:household-loc:${household.id}`,
      householdId: household.id,
      effectiveAt: world.currentDate,
      jurisdictionId: jurisdiction.id,
      label: "Lexington neighborhood home",
      kind: "residence:community-base",
      provenance: lifeProvenance,
      supersedesLocationId: null,
    });
    world = startHouseholdMembership(world, {
      stableKey: `life-start:membership:${playerPerson.id}`,
      personId: playerPerson.id,
      householdId: household.id,
      startedAt: world.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: lifeProvenance,
    });
  }

  // 3. Organization & Work Relationship based on background
  const { orgName, workTitle, initialFunds } = backgroundDetails(
    background,
    familyName,
  );
  world = createOrganization(world, {
    stableKey: `life-start:org:${playerPerson.id}`,
    formedAt: "2020-01-01",
    provenance: lifeProvenance,
    initialProfile: {
      name: orgName,
      classification: "community:makerspace-cooperative",
      locationJurisdictionId: jurisdiction.id,
    },
  });
  const organization = world.history.organizations.at(-1);
  if (organization) {
    world = createWorkRelationship(world, {
      stableKey: `life-start:work:${playerPerson.id}`,
      personId: playerPerson.id,
      organizationId: organization.id,
      startedAt: world.currentDate,
      kind: "employment:staff",
      compensation: "paid",
      authority: "self-directed",
      dependency: "independent",
      economicRisk: "organization-borne",
      provenance: lifeProvenance,
      initialRole: {
        title: workTitle,
        occupationClassification: "profession:policy-analysis",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 45 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
  }

  // 4. Initial Resource Position (Liquid funds)
  world = createResourcePosition(world, {
    stableKey: `life-start:resources:${playerPerson.id}`,
    owner: { kind: "person", personId: playerPerson.id },
    openedAt: world.currentDate,
    openingBalance: {
      minorUnits: initialFunds * 100,
      currency: makeCurrencyCode("USD"),
    },
    provenance: lifeProvenance,
  });

  // 5. Mind Catalog & Outlook Setup
  const allyPerson = communityPeople[0] ?? playerPerson;

  // Personal Value
  world = recordPersonalValue(world, {
    stableKey: `life-start:value:${playerPerson.id}`,
    personId: playerPerson.id,
    valueId: SYNTHETIC_MIND_IDS.values.compassion,
    recordedAt: world.currentDate,
    orientation: "embraces",
    strength: "strong",
    salience: "high",
    qualification: formatValueQualification(declaredValue),
    provenance: createMindProvenance("player-choice", {
      note: `Player selected primary value: ${declaredValue}`,
    }),
    supersedesValueId: null,
  });

  // Personality Tendency
  world = recordPersonalityTendency(world, {
    stableKey: `life-start:tendency:${playerPerson.id}`,
    personId: playerPerson.id,
    tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
    recordedAt: world.currentDate,
    expressionKey: declaredApproach === "risk-seeking" ? "bold" : "cautious",
    strength: "moderate",
    confidence: "high",
    scopeTags: ["decision.civic", "decision.career"],
    provenance: createMindProvenance("player-choice", {
      note: `Player chosen approach: ${declaredApproach}`,
    }),
    supersedesTendencyId: null,
  });

  // Goal
  world = recordGoalState(world, {
    stableKey: `life-start:goal:${playerPerson.id}`,
    goalKey: "explore-civic-involvement",
    personId: playerPerson.id,
    recordedAt: world.currentDate,
    objective:
      "Understand community concerns and consider getting involved in Lexington municipal issues.",
    domain: "community-learning",
    scope: context.goalScope,
    priority: "high",
    status: "active",
    targetEntityId: jurisdiction.id,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("player-choice", {
      note: "Initial first-session civic goal.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });

  // Political Principle & Public Stance
  world = recordPrinciple(world, {
    stableKey: `life-start:principle:${playerPerson.id}`,
    personId: playerPerson.id,
    principleId: SYNTHETIC_POLICY_IDS.principles.reduceInequality,
    formedAt: world.currentDate,
    stance: partyAffiliation === "republican" ? "conflicted" : "endorses",
    conviction: "moderate",
    flexibility: "conditional",
    qualification: formatAffiliationPrinciple(partyAffiliation),
    formation: createFormationContext("reflection:initial", {
      note: `Initial outlook from party choice: ${partyAffiliation}`,
    }),
    supersedesPrincipleRecordId: null,
  });

  world = recordPublicPosition(world, {
    stableKey: `life-start:public-stance:${playerPerson.id}`,
    personId: playerPerson.id,
    propositionId: SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
    statedAt: world.currentDate,
    stance: "undecided",
    statement: `As an engaged Lexington resident, I'm actively listening to neighbors on key local priorities.`,
    audience: "public",
    venue: "Lexington Community Forum",
    sourceEventId: null,
    supersedesPublicPositionId: null,
  });

  // 6. Initial Relationship with a local ally
  if (allyPerson.id !== playerPerson.id) {
    world = recordWorldEvent(world, {
      stableKey: `life-start:ally-dialogue:${playerPerson.id}:${allyPerson.id}`,
      type: "community.conversation",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: jurisdiction.id,
      involvedEntityIds: [playerPerson.id, allyPerson.id, jurisdiction.id],
      participants: [
        {
          personId: playerPerson.id,
          role: "agency:actor",
          detail: "Discussing neighborhood priorities",
        },
        {
          personId: allyPerson.id,
          role: "presence:participant",
          detail: "Community colleague",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["relationship.community-ally", "civic.connection"],
      summary: `${personName(playerPerson)} met with ${personName(allyPerson)} to discuss local neighborhood priorities.`,
      context: {
        location: {
          jurisdictionId: jurisdiction.id,
          label: jurisdiction.name,
          setting: "Lexington neighborhood cafe",
        },
        socialContext: "Initial community dialogue.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const allyEvent = world.history.events.at(-1);

    if (allyEvent) {
      world = recordRelationshipInteraction(world, {
        stableKey: `life-start:relationship:${playerPerson.id}:${allyPerson.id}`,
        personIds: [playerPerson.id, allyPerson.id],
        eventId: allyEvent.id,
        occurredAt: world.currentDate,
        kind: "experience:shared",
        change: "formed",
        significance: "meaningful",
        summary: `${personName(playerPerson)} and ${personName(allyPerson)} are trusted local colleagues and community contacts.`,
        tags: ["relationship.community-ally", "civic.connection"],
      });

      world = recordMemory(world, {
        stableKey: `life-start:memory:${playerPerson.id}:ally`,
        personId: playerPerson.id,
        eventId: allyEvent.id,
        formedAt: world.currentDate,
        rememberedSummary: `Discussed local neighborhood concerns with ${personName(allyPerson)}.`,
        interpretation: `${personName(allyPerson)} suggested looking closely at upcoming Urban County Council priorities.`,
        strength: "moderate",
        relevanceTags: ["community.ally", "civic.opportunity"],
        supersedesMemoryId: null,
      });
    }
  }

  assertWorldIntegrity(world);
  return world;
}

export function summarizeLifeWorld(
  world: World,
  playerPersonId: EntityId,
): LifeWorldSummary {
  const player = world.people[playerPersonId];
  if (!player) {
    throw new Error(`Player person not found in world: ${playerPersonId}`);
  }
  const age = ageOnDate(player.birthDate, world.currentDate);
  const fullName = `${player.givenName} ${player.familyName}`;

  const lifeStage =
    age >= 45
      ? "Established Adult"
      : age >= 35
        ? "Mid-Career Adult"
        : age >= 25
          ? "Young Professional"
          : "Adult";

  // Households
  const memberships = world.history.householdMemberships.filter(
    (m) => m.personId === playerPersonId,
  );
  const householdId = memberships[0]?.householdId;
  const household = householdId
    ? world.history.households.find((h) => h.id === householdId)
    : undefined;
  const householdLabel = household?.label ?? "Lexington Residence";

  // Work
  const work = world.history.workRelationships.find(
    (w) => w.personId === playerPersonId,
  );
  const orgProfile = work?.organizationId
    ? world.history.organizationProfiles.find(
        (p) => p.organizationId === work.organizationId,
      )
    : undefined;
  const workRole = world.history.workRoles.find(
    (r) => r.workRelationshipId === work?.id,
  );
  const workLabel = workRole
    ? `${workRole.title}${orgProfile?.name ? ` · ${orgProfile.name}` : ""}`
    : "Independent Community Member";

  // Resources
  const position = world.history.resourcePositions.find(
    (p) => p.owner.kind === "person" && p.owner.personId === playerPersonId,
  );
  const funds = position
    ? Math.floor(position.openingBalance.minorUnits / 100)
    : 5000;
  const resourceLabel = `$${funds.toLocaleString()} available funds`;

  // History entries
  const recentEvents = world.history.events
    .filter((e) => e.involvedEntityIds.includes(playerPersonId))
    .slice(-4)
    .reverse()
    .map((e) => e.summary);

  // Political principle
  const principle = world.history.principles.find(
    (p) => p.personId === playerPersonId,
  );
  const politicalOutlook =
    principle?.qualification ?? "Engaged Community Resident";

  return {
    name: fullName,
    age,
    currentDate: world.currentDate,
    currentResidence: "Lexington, Kentucky",
    lifeStage,
    householdLabel,
    familyNames: [],
    workLabel,
    educationLabel: "University of Kentucky Alum",
    resourceLabel,
    birthplace: "Lexington, Kentucky",
    hometown: "Lexington, Kentucky",
    recentHistory:
      recentEvents.length > 0
        ? recentEvents
        : [`${fullName} began their civic journey in Lexington.`],
    politicalOutlook,
  };
}

export function availableLifeActions(
  world: World,
  playerPersonId: EntityId,
): readonly LifeAction[] {
  if (!world.people[playerPersonId]) {
    return [];
  }
  return [
    {
      key: "talk-ally",
      label: "Talk with a trusted community ally",
      category: "Relationship & Counsel",
      description:
        "Meet with a trusted local colleague to discuss neighborhood concerns and get candid feedback on getting more involved.",
      days: 1,
    },
    {
      key: "attend-forum",
      label: "Attend neighborhood council forum",
      category: "Civic Participation",
      description:
        "Join fellow residents at the local community center to hear about upcoming municipal zoning and transit decisions.",
      days: 2,
    },
    {
      key: "review-issues",
      label: "Review local municipal reports",
      category: "Policy & Inquiry",
      description:
        "Examine recent Fayette County budget briefs and housing affordability proposals to understand the core civic tradeoffs.",
      days: 2,
    },
    {
      key: "explore-campaign",
      label: "Test the waters for City Council",
      category: "Political Opportunity",
      description:
        "Sound out neighborhood leaders and friends about what an Urban County Council candidacy would require.",
      days: 3,
    },
    {
      key: "focus-work",
      label: "Focus on daily work and household",
      category: "Daily Life",
      description:
        "Dedicate time to professional responsibilities and home life, keeping local politics at a comfortable distance.",
      days: 3,
    },
  ];
}

export function performLifeAction(
  world: World,
  playerPersonId: EntityId,
  actionKey: LifeActionKey,
): World {
  const player = world.people[playerPersonId];
  if (!player) {
    throw new Error(`Player person not found: ${playerPersonId}`);
  }
  const actions = availableLifeActions(world, playerPersonId);
  const action = actions.find((a) => a.key === actionKey);
  if (!action) {
    throw new Error(`Unknown life action: ${actionKey}`);
  }

  // Advance simulation by the action's duration
  let next = advanceWorld(world, action.days);
  const jurisdictionId = LEXINGTON_PLACEHOLDER_ID;
  const actionSeq = next.actionSequence;
  const allyId =
    next.personOrder.find((id) => id !== playerPersonId) ?? playerPersonId;
  const ally = next.people[allyId];

  // Record historical event based on action
  let eventSummary = "";
  let eventType: `${string}.${string}` = "community.conversation";
  let memoryText = "";

  switch (actionKey) {
    case "talk-ally":
      eventSummary = `${personName(player)} spoke with ${ally ? personName(ally) : "a trusted colleague"} about neighborhood priorities and local civic leadership.`;
      eventType = "community.conversation";
      memoryText = `Encouraging conversation with ${ally ? personName(ally) : "a friend"}, who highlighted the need for responsive local representation.`;
      break;
    case "attend-forum":
      eventSummary = `${personName(player)} attended a crowded neighborhood forum on Lexington housing and transit.`;
      eventType = "community.forum";
      memoryText = `Attended the forum; heard clear dissatisfaction from neighbors regarding development decisions.`;
      break;
    case "review-issues":
      eventSummary = `${personName(player)} reviewed recent Lexington-Fayette municipal reports on infrastructure and local investments.`;
      eventType = "civic.inquiry";
      memoryText = `Gained valuable clarity on city budget priorities and key council responsibilities.`;
      break;
    case "explore-campaign":
      eventSummary = `${personName(player)} quietly tested the waters with community members regarding a potential run for Urban County Council.`;
      eventType = "political.exploratory";
      memoryText = `Initial feedback from local leaders was genuinely receptive to fresh civic leadership.`;
      break;
    case "focus-work":
      eventSummary = `${personName(player)} focused on daily professional responsibilities and personal priorities in Lexington.`;
      eventType = "life.daily-routine";
      memoryText = `Maintained steady progress in work and personal balance.`;
      break;
  }

  next = recordWorldEvent(next, {
    stableKey: `action:${actionSeq}:${actionKey}:${next.currentDate}`,
    type: eventType,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: [
      playerPersonId,
      jurisdictionId,
      ...(ally ? [ally.id] : []),
    ],
    participants: [
      {
        personId: playerPersonId,
        role: "agency:actor",
        detail: action.label,
      },
      ...(ally && ally.id !== playerPersonId
        ? [
            {
              personId: ally.id,
              role: "presence:participant" as const,
              detail: "Community peer",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["life.action", actionKey],
    summary: eventSummary,
    context: {
      location: {
        jurisdictionId,
        label: "Lexington, Kentucky",
        setting: "Community environment",
      },
      socialContext: "First-session player exploratory choice.",
      pressure: null,
      choice: action.label,
      motivation: "Civic engagement and life balance.",
      immediateReaction: "Completed successfully.",
    },
  });

  const event = next.history.events.at(-1);
  if (!event) {
    throw new Error("Action event was not recorded.");
  }

  // Record memory
  next = recordMemory(next, {
    stableKey: `action:${actionSeq}:memory:${playerPersonId}`,
    personId: playerPersonId,
    eventId: event.id,
    formedAt: next.currentDate,
    rememberedSummary: memoryText,
    interpretation: action.description,
    strength: "moderate",
    relevanceTags: ["life.action", actionKey],
    supersedesMemoryId: null,
  });

  // Record knowledge
  next = recordEventKnowledge(next, {
    stableKey: `action:${actionSeq}:knowledge:${playerPersonId}`,
    personId: playerPersonId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: eventSummary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });

  if (
    ally &&
    ally.id !== playerPersonId &&
    (actionKey === "talk-ally" || actionKey === "explore-campaign")
  ) {
    next = recordRelationshipInteraction(next, {
      stableKey: `action:${actionSeq}:interaction:${playerPersonId}:${ally.id}`,
      personIds: [playerPersonId, ally.id],
      eventId: event.id,
      occurredAt: next.currentDate,
      kind: "experience:shared",
      change: "strengthened",
      significance: "meaningful",
      summary: `${personName(player)} discussed community affairs with ${personName(ally)}.`,
      tags: ["community.dialogue"],
    });
  }

  assertWorldIntegrity(next);
  return next;
}

function backgroundDetails(
  background: LifeStartBackground,
  familyName: string,
): { orgName: string; workTitle: string; initialFunds: number } {
  switch (background) {
    case "civic-organizer":
      return {
        orgName: "Lexington Community Action Network",
        workTitle: "Civic Outreach Coordinator",
        initialFunds: 5500,
      };
    case "local-business":
      return {
        orgName: `${familyName} Consulting & Services`,
        workTitle: "Managing Principal",
        initialFunds: 12000,
      };
    case "public-service":
      return {
        orgName: "Fayette Public Programs Initiative",
        workTitle: "Program Analyst",
        initialFunds: 7500,
      };
    case "struggling":
      return {
        orgName: "Bluegrass Service Workers Cooperative",
        workTitle: "Service Specialist",
        initialFunds: 2400,
      };
    case "affluent":
      return {
        orgName: "Lexington Strategic Advisory Group",
        workTitle: "Senior Director",
        initialFunds: 28000,
      };
    case "middle":
    case "neighborhood-advocate":
    default:
      return {
        orgName: "Neighborhood Alliance of Lexington",
        workTitle: "Community Advocate",
        initialFunds: 6800,
      };
  }
}

function formatBackgroundTitle(background: LifeStartBackground): string {
  switch (background) {
    case "civic-organizer":
      return "community organizer";
    case "local-business":
      return "local business professional";
    case "public-service":
      return "public service professional";
    case "struggling":
      return "working resident";
    case "affluent":
      return "experienced professional";
    case "neighborhood-advocate":
    default:
      return "neighborhood advocate";
  }
}

function formatValueQualification(value: LifeStartValueKey): string {
  switch (value) {
    case "family":
      return "Committed to family stability and intergenerational security.";
    case "achievement":
      return "Focused on measurable accomplishment and diligent work.";
    case "fairness":
      return "Committed to transparent rules and equal treatment.";
    case "service":
    default:
      return "Dedicated to active public service and mutual support.";
  }
}

function formatAffiliationPrinciple(
  affiliation: LifeStartPartyAffiliation,
): string {
  switch (affiliation) {
    case "democratic":
      return "Broadly aligned with community investments, public services, and neighborhood equity.";
    case "republican":
      return "Broadly aligned with fiscal responsibility, economic vitality, and local stewardship.";
    case "independent":
    default:
      return "Independent approach focused on pragmatic local solutions for Lexington.";
  }
}
