import { ageOnDate, isoDateFromParts, makeIsoDate } from "./dates";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import { createStableId } from "./ids";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "./life";
import { SYNTHETIC_MIND_IDS } from "./mind-catalog";
import {
  createMindProvenance,
  recordGoalState,
  recordPersonalValue,
  recordPersonalityTendency,
} from "./mind";
import { createLightweightPerson, personName } from "./people";
import { SYNTHETIC_POLICY_IDS } from "./policy";
import {
  createFormationContext,
  recordPrivateBelief,
  recordPropositionExposure,
} from "./politics";
import {
  createDwelling,
  createHousingTenure,
  createResourcePosition,
  makeCurrencyCode,
  startDwellingOccupancy,
} from "./resources";
import { recordEventKnowledge, recordMemory } from "./records";
import type {
  BeliefPosition,
  EntityId,
  Jurisdiction,
  LifeRecordProvenance,
  World,
} from "./types";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "./world";

export const LIFE_START_MIN_AGE = 6;
export const LIFE_START_MAX_AGE = 80;
export type LifeStartAge = number;
export type LifeStartDepth = "play-from-here" | "build-my-history";
export type LifeStartHouseholdKind = "family" | "shared" | "alone";
export type LifeStartHousingKind =
  "unknown" | "family-home" | "renting" | "owning" | "hosted";
export type LifeStartFriendAnswer = "truth" | "loyalty" | "stay-out" | "skip";
export type LifeStartRiskAnswer = "safe" | "risk" | "learn-more" | "skip";
export type LifeStartPolicyAnswer = BeliefPosition | "skip";

export interface LifeStartPlace {
  readonly key: string;
  readonly displayName: string;
  readonly shortName: string;
  readonly sourceName: string;
  readonly description: string;
  readonly jurisdiction: Jurisdiction;
  readonly timeZone:
    "America/New_York" | "America/Chicago" | "America/Los_Angeles";
  readonly utcOffsetMinutes: -300 | -360 | -480;
  readonly politicalCapability: "lexington-demo" | "place-identity-only";
}

const CHICAGO_ID = createStableId(
  "jurisdiction",
  "definition:us-il-chicago-census-place",
);
const LOS_ANGELES_ID = createStableId(
  "jurisdiction",
  "definition:us-ca-los-angeles-census-place",
);

export const LIFE_START_PLACES: readonly LifeStartPlace[] = [
  {
    key: "lexington-kentucky",
    displayName: "Lexington, Kentucky",
    shortName: "Lexington, KY",
    sourceName: "Lexington-Fayette urban county, Kentucky",
    description:
      "Place identity is available. Existing Lexington political play remains capability-gated.",
    jurisdiction: LEXINGTON_DEMO_CONTEXT.jurisdiction,
    timeZone: "America/New_York",
    utcOffsetMinutes: -300,
    politicalCapability: "lexington-demo",
  },
  {
    key: "chicago-illinois",
    displayName: "Chicago, Illinois",
    shortName: "Chicago, IL",
    sourceName: "Chicago city, Illinois",
    description:
      "Real place identity is available; specialized local political rules are not yet modeled.",
    jurisdiction: censusPlace(
      CHICAGO_ID,
      "us-il-chicago-census-place",
      "Chicago city, Illinois",
      "Illinois",
    ),
    timeZone: "America/Chicago",
    utcOffsetMinutes: -360,
    politicalCapability: "place-identity-only",
  },
  {
    key: "los-angeles-california",
    displayName: "Los Angeles, California",
    shortName: "Los Angeles, CA",
    sourceName: "Los Angeles city, California",
    description:
      "Real place identity is available; specialized local political rules are not yet modeled.",
    jurisdiction: censusPlace(
      LOS_ANGELES_ID,
      "us-ca-los-angeles-census-place",
      "Los Angeles city, California",
      "California",
    ),
    timeZone: "America/Los_Angeles",
    utcOffsetMinutes: -480,
    politicalCapability: "place-identity-only",
  },
] as const;

export type LifeStartPlaceKey = (typeof LIFE_START_PLACES)[number]["key"];
export interface LifeStartHistoryAnchor {
  readonly date: string;
  readonly summary: string;
}

export const LIFE_START_POLICY_QUESTIONS = [
  {
    key: "collective-bargaining",
    propositionId: SYNTHETIC_POLICY_IDS.propositions.collectiveBargaining,
    question:
      "Should the law strengthen protections for collective bargaining?",
  },
  {
    key: "clean-electricity",
    propositionId: SYNTHETIC_POLICY_IDS.propositions.cleanElectricity,
    question:
      "Should electricity providers meet an increasing clean-generation standard?",
  },
] as const;
export type LifeStartPolicyKey =
  (typeof LIFE_START_POLICY_QUESTIONS)[number]["key"];

export interface LifeStartInput {
  readonly givenName: string;
  readonly familyName: string;
  readonly startAge: number;
  readonly depth?: LifeStartDepth;
  readonly birthplace?: LifeStartPlaceKey;
  readonly hometown?: LifeStartPlaceKey;
  readonly currentResidence?: LifeStartPlaceKey;
  readonly householdKind?: LifeStartHouseholdKind;
  readonly housingKind?: LifeStartHousingKind;
  readonly startingFundsUsd?: number | null;
  readonly historyAnchors?: readonly LifeStartHistoryAnchor[];
  readonly friendAnswer?: LifeStartFriendAnswer;
  readonly riskAnswer?: LifeStartRiskAnswer;
  readonly policyAnswers?: Readonly<
    Partial<Record<LifeStartPolicyKey, LifeStartPolicyAnswer>>
  >;
  readonly seed?: string;
}

export type LifeActionKey =
  | "personal-project"
  | "continue-project"
  | "relationships"
  | "learning"
  | "community"
  | "work"
  | "politics";
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
  readonly housingLabel: string;
  readonly workLabel: string | null;
  readonly educationLabel: string | null;
  readonly resourceLabel: string;
  readonly birthplace: string;
  readonly hometown: string;
  readonly recentHistory: readonly string[];
  readonly politicalOutlook: string;
  readonly politicalCapability: "available" | "not-modeled";
}

export function lifeStartPlace(key: LifeStartPlaceKey): LifeStartPlace {
  const place = LIFE_START_PLACES.find((item) => item.key === key);
  if (!place) throw new Error(`Unknown starting place: ${key}`);
  return place;
}

export function lifeStartPlaceByJurisdictionId(
  jurisdictionId: EntityId,
): LifeStartPlace | null {
  return (
    LIFE_START_PLACES.find(
      (place) => place.jurisdiction.id === jurisdictionId,
    ) ?? null
  );
}

export function createLifeStartWorld(input: LifeStartInput): World {
  const givenName = input.givenName.trim();
  const familyName = input.familyName.trim();
  if (!givenName || !familyName) {
    throw new Error("Character setup requires a first and last name.");
  }
  const startAge = Math.floor(input.startAge);
  if (
    !Number.isSafeInteger(startAge) ||
    startAge < LIFE_START_MIN_AGE ||
    startAge > LIFE_START_MAX_AGE
  ) {
    throw new Error(
      `Starting age must be between ${LIFE_START_MIN_AGE} and ${LIFE_START_MAX_AGE}.`,
    );
  }
  const birthplace = lifeStartPlace(input.birthplace ?? "lexington-kentucky");
  const hometown = lifeStartPlace(input.hometown ?? "lexington-kentucky");
  const residence = lifeStartPlace(
    input.currentResidence ?? "lexington-kentucky",
  );
  const depth = input.depth ?? "play-from-here";
  const householdKind =
    input.householdKind ?? (startAge < 18 ? "family" : "alone");
  if (startAge < 18 && householdKind === "alone") {
    throw new Error(
      "A child or teenager needs a family or shared household start.",
    );
  }
  const housingKind = input.housingKind ?? "unknown";
  const startingFundsUsd = normalizeFunds(input.startingFundsUsd);
  const historyAnchors =
    depth === "build-my-history" ? normalizeAnchors(input.historyAnchors) : [];
  const policyAnswers = input.policyAnswers ?? {};
  const seed =
    input.seed?.trim() ||
    `first-session-life-v2:${JSON.stringify({
      givenName,
      familyName,
      startAge,
      birthplace: birthplace.key,
      hometown: hometown.key,
      residence: residence.key,
      depth,
      householdKind,
      housingKind,
      startingFundsUsd,
      historyAnchors,
      friendAnswer: input.friendAnswer ?? "skip",
      riskAnswer: input.riskAnswer ?? "skip",
      policyAnswers,
    })}`;
  const currentDate = makeIsoDate(LEXINGTON_DEMO_CONTEXT.initialMoment.date);
  const [year, month, day] = currentDate.split("-").map(Number);
  const birthDate = isoDateFromParts(
    (year ?? 2026) - startAge,
    month ?? 1,
    day ?? 5,
  );
  const worldId = createWorldId(seed);
  const player = createLightweightPerson({
    worldId,
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: residence.jurisdiction.id,
    birthplaceJurisdictionId: birthplace.jurisdiction.id,
    identity: { givenName, familyName, birthDate },
  });
  let world = createWorld({
    seed,
    currentDate,
    currentMoment: {
      date: currentDate,
      minuteOfDay: 9 * 60,
      timeZone: residence.timeZone,
      utcOffsetMinutes: residence.utcOffsetMinutes,
    },
    jurisdictions: LIFE_START_PLACES.map((place) => place.jurisdiction),
    people: [player],
    control: { kind: "person", personId: player.id },
  });
  const authored: LifeRecordProvenance = {
    kind: "authored",
    note: "Established from the player's new-game choices.",
  };
  world = recordHometown(world, player.id, hometown);
  world = establishHousehold(
    world,
    player.id,
    familyName,
    residence,
    householdKind,
    housingKind,
    authored,
  );
  if (startingFundsUsd !== null) {
    world = createResourcePosition(world, {
      stableKey: `life-start:resources:${player.id}`,
      owner: { kind: "person", personId: player.id },
      openedAt: currentDate,
      openingBalance: {
        minorUnits: startingFundsUsd * 100,
        currency: makeCurrencyCode("USD"),
      },
      provenance: authored,
    });
  }
  for (const [index, anchor] of historyAnchors.entries()) {
    world = recordHistoryAnchor(world, player.id, residence, anchor, index);
  }
  world = applySituationalEvidence(
    world,
    player.id,
    input.friendAnswer ?? "skip",
    input.riskAnswer ?? "skip",
  );
  world = applyPolicyAnswers(world, player.id, policyAnswers);
  assertWorldIntegrity(world);
  return world;
}

export function summarizeLifeWorld(
  world: World,
  playerPersonId: EntityId,
): LifeWorldSummary {
  const player = world.people[playerPersonId];
  if (!player) throw new Error(`Player person not found: ${playerPersonId}`);
  const age = ageOnDate(player.birthDate, world.currentDate);
  const birthplace = player.establishedFacts.find(
    (fact) => fact.kind === "birthplace",
  );
  const hometown = world.history.events.find(
    (event) =>
      event.involvedEntityIds.includes(playerPersonId) &&
      event.tags.includes("life.hometown"),
  );
  const membership = world.history.householdMemberships.find(
    (item) => item.personId === playerPersonId,
  );
  const household = membership
    ? world.history.households.find(
        (item) => item.id === membership.householdId,
      )
    : null;
  const tenure = world.history.housingTenures.find(
    (item) =>
      item.holder.kind === "household" &&
      item.holder.householdId === household?.id,
  );
  const position = world.history.resourcePositions.find(
    (item) =>
      item.owner.kind === "person" && item.owner.personId === playerPersonId,
  );
  const beliefCount = world.history.privateBeliefs.filter(
    (item) => item.personId === playerPersonId,
  ).length;
  const recentHistory = world.history.events
    .filter(
      (event) =>
        event.involvedEntityIds.includes(playerPersonId) &&
        !event.tags.includes("life.hometown"),
    )
    .slice(-5)
    .reverse()
    .map((event) => event.summary);
  const residencePlace = lifeStartPlaceByJurisdictionId(
    player.homeJurisdictionId,
  );
  return {
    name: personName(player),
    age,
    currentDate: world.currentDate,
    currentResidence: displayPlace(world, player.homeJurisdictionId),
    lifeStage: lifeStageForAge(age),
    householdLabel: household?.label ?? "Household not established",
    housingLabel: tenure
      ? housingLabel(tenure.kind)
      : "Housing details unknown",
    workLabel: null,
    educationLabel: null,
    resourceLabel: position
      ? `$${Math.floor(
          position.openingBalance.minorUnits / 100,
        ).toLocaleString()} available`
      : "Resources not established",
    birthplace: birthplace?.jurisdictionId
      ? displayPlace(world, birthplace.jurisdictionId)
      : "Unknown",
    hometown: hometown?.jurisdictionId
      ? displayPlace(world, hometown.jurisdictionId)
      : "Unknown",
    recentHistory,
    politicalOutlook:
      beliefCount === 0
        ? "No political views established"
        : `${beliefCount} private view${beliefCount === 1 ? "" : "s"} recorded`,
    politicalCapability:
      residencePlace?.politicalCapability === "lexington-demo"
        ? "available"
        : "not-modeled",
  };
}

export function availableLifeActions(
  world: World,
  playerPersonId: EntityId,
): readonly LifeAction[] {
  const player = world.people[playerPersonId];
  if (!player) return [];
  const age = ageOnDate(player.birthDate, world.currentDate);
  const hasProject = world.history.events.some(
    (event) =>
      event.involvedEntityIds.includes(playerPersonId) &&
      event.tags.includes("life.personal-project"),
  );
  const actions: LifeAction[] = [
    hasProject
      ? action(
          "continue-project",
          "Keep going with your project",
          "Personal goal",
          "Build on the choice you made and give it another day of attention.",
          1,
        )
      : action(
          "personal-project",
          age < 13
            ? "Choose something to make or practice"
            : "Start a personal project",
          "Personal goal",
          "Pick a direction of your own and make a real beginning.",
          1,
        ),
    action(
      "relationships",
      age < 18
        ? "Make time for someone important"
        : "Make time for relationships",
      "Relationships",
      "Set aside time for the people who matter in your life.",
      1,
    ),
    action(
      "learning",
      age < 18
        ? "Explore something you want to learn"
        : "Look into education or training",
      "Learning",
      "Find out what options are open without assuming a school or program.",
      2,
    ),
  ];
  if (age >= 13) {
    actions.push(
      action(
        "community",
        "Find a way to help locally",
        "Community",
        "Look for a concrete way to take part where you live.",
        2,
      ),
    );
  }
  if (age >= 18) {
    actions.push(
      action(
        "work",
        "Explore work opportunities",
        "Work",
        "Look at possible work without assuming a job you never chose.",
        2,
      ),
      action(
        "politics",
        "Explore public life",
        "Politics",
        "Learn what political involvement could mean here. No party or candidacy is assumed.",
        2,
      ),
    );
  }
  return actions;
}

export function performLifeAction(
  world: World,
  playerPersonId: EntityId,
  actionKey: LifeActionKey,
): World {
  const player = world.people[playerPersonId];
  if (!player) throw new Error(`Player person not found: ${playerPersonId}`);
  const selected = availableLifeActions(world, playerPersonId).find(
    (item) => item.key === actionKey,
  );
  if (!selected) {
    throw new Error(`Life action is not currently available: ${actionKey}`);
  }
  let next = advanceWorld(world, selected.days);
  const outcome = actionOutcome(
    actionKey,
    personName(player),
    displayPlace(next, player.homeJurisdictionId),
  );
  next = recordWorldEvent(next, {
    stableKey: `life-action:${next.actionSequence}:${actionKey}:${next.currentDate}`,
    type: outcome.type,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: player.homeJurisdictionId,
    involvedEntityIds: [playerPersonId, player.homeJurisdictionId],
    participants: [
      {
        personId: playerPersonId,
        role: "agency:actor",
        detail: selected.label,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.action", outcome.tag],
    summary: outcome.summary,
    context: {
      location: {
        jurisdictionId: player.homeJurisdictionId,
        label: displayPlace(next, player.homeJurisdictionId),
        setting: "Everyday life",
      },
      socialContext: "A player-initiated life choice.",
      pressure: null,
      choice: selected.label,
      motivation: null,
      immediateReaction: outcome.reaction,
    },
  });
  const event = next.history.events.at(-1);
  if (!event) throw new Error("Life action event was not recorded.");
  next = recordMemory(next, {
    stableKey: `life-action:${next.actionSequence}:memory:${playerPersonId}`,
    personId: playerPersonId,
    eventId: event.id,
    formedAt: next.currentDate,
    rememberedSummary: outcome.summary,
    interpretation: outcome.reaction,
    strength: "moderate",
    relevanceTags: ["life.action", outcome.tag],
    supersedesMemoryId: null,
  });
  next = recordEventKnowledge(next, {
    stableKey: `life-action:${next.actionSequence}:knowledge:${playerPersonId}`,
    personId: playerPersonId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: outcome.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  if (actionKey === "personal-project") {
    next = recordGoalState(next, {
      stableKey: `life-action:goal:${playerPersonId}:personal-project`,
      goalKey: "personal-project",
      personId: playerPersonId,
      recordedAt: next.currentDate,
      objective:
        "Continue the personal project begun during the first session.",
      domain: "personal-development",
      scope: "Personal life",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: createMindProvenance("player-choice", {
        sourceRefs: [{ kind: "historical-event", eventId: event.id }],
        note: "Goal created by a played choice.",
      }),
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
  }
  assertWorldIntegrity(next);
  return next;
}

function establishHousehold(
  world: World,
  playerId: EntityId,
  familyName: string,
  residence: LifeStartPlace,
  householdKind: LifeStartHouseholdKind,
  housingKind: LifeStartHousingKind,
  provenance: LifeRecordProvenance,
): World {
  const label =
    householdKind === "family"
      ? `${familyName} family household`
      : householdKind === "shared"
        ? "Shared household"
        : `${familyName} household`;
  let next = createHousehold(world, {
    stableKey: `life-start:household:${playerId}`,
    formedAt: world.currentDate,
    label,
    provenance,
  });
  const household = next.history.households.at(-1);
  if (!household) throw new Error("Starting household was not created.");
  next = recordHouseholdLocation(next, {
    stableKey: `life-start:household-location:${household.id}`,
    householdId: household.id,
    effectiveAt: world.currentDate,
    jurisdictionId: residence.jurisdiction.id,
    label: `Current home in ${residence.displayName}`,
    kind: "residence:current-home",
    provenance,
    supersedesLocationId: null,
  });
  next = startHouseholdMembership(next, {
    stableKey: `life-start:household-membership:${playerId}`,
    personId: playerId,
    householdId: household.id,
    startedAt: world.currentDate,
    residenceRole: householdKind === "shared" ? "shared" : "primary",
    kind: householdKind === "shared" ? "resident:shared" : "resident:member",
    provenance,
  });
  if (housingKind === "unknown") return next;
  next = createDwelling(next, {
    stableKey: `life-start:dwelling:${playerId}`,
    establishedAt: world.currentDate,
    jurisdictionId: residence.jurisdiction.id,
    locationLabel: `Current home in ${residence.displayName}`,
    classification: "residential:unspecified",
    provenance,
  });
  const dwelling = next.history.dwellings.at(-1);
  if (!dwelling) throw new Error("Starting dwelling was not created.");
  next = startDwellingOccupancy(next, {
    stableKey: `life-start:occupancy:${playerId}`,
    occupant: { kind: "household", householdId: household.id },
    dwellingId: dwelling.id,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: housingKind === "hosted" ? "hosted:household" : "residence:household",
    provenance,
  });
  return createHousingTenure(next, {
    stableKey: `life-start:tenure:${playerId}`,
    holder: { kind: "household", householdId: household.id },
    dwellingId: dwelling.id,
    startedAt: world.currentDate,
    kind:
      housingKind === "owning"
        ? "ownership:household"
        : housingKind === "renting"
          ? "lease:household"
          : "hosted:household",
    context:
      housingKind === "family-home"
        ? "Player selected a family home arrangement."
        : null,
    provenance,
  });
}

function recordHometown(
  world: World,
  playerId: EntityId,
  hometown: LifeStartPlace,
): World {
  return recordWorldEvent(world, {
    stableKey: `life-start:hometown:${playerId}`,
    type: "person.hometown-established",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: hometown.jurisdiction.id,
    involvedEntityIds: [playerId, hometown.jurisdiction.id],
    participants: [
      {
        personId: playerId,
        role: "focus:subject",
        detail: "Hometown identity",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.hometown", "provenance.player-choice"],
    summary: `${personName(
      world.people[playerId]!,
    )} identifies ${hometown.displayName} as their hometown.`,
    context: {
      location: {
        jurisdictionId: hometown.jurisdiction.id,
        label: hometown.displayName,
        setting: "Hometown identity",
      },
      socialContext: "Established during character creation.",
      pressure: null,
      choice: hometown.displayName,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function recordHistoryAnchor(
  world: World,
  playerId: EntityId,
  residence: LifeStartPlace,
  anchor: LifeStartHistoryAnchor,
  index: number,
): World {
  const date = makeIsoDate(anchor.date);
  const player = world.people[playerId]!;
  if (date < player.birthDate || date > world.currentDate) {
    throw new Error(
      "A history anchor must fall within the character's life so far.",
    );
  }
  return recordWorldEvent(world, {
    stableKey: `life-start:history-anchor:${playerId}:${index}`,
    type: "person.authored-history-anchor",
    occurredAt: date,
    recordedAt: world.currentDate,
    jurisdictionId: residence.jurisdiction.id,
    involvedEntityIds: [playerId, residence.jurisdiction.id],
    participants: [
      {
        personId: playerId,
        role: "focus:subject",
        detail: "Player-authored life history",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.history-anchor", "provenance.player-choice"],
    summary: anchor.summary,
    context: {
      location: null,
      socialContext: "Explicitly established by the player before play.",
      pressure: null,
      choice: anchor.summary,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function applySituationalEvidence(
  world: World,
  playerId: EntityId,
  friendAnswer: LifeStartFriendAnswer,
  riskAnswer: LifeStartRiskAnswer,
): World {
  let next = world;
  const provenance = (note: string) =>
    createMindProvenance("player-choice", {
      note: `${note} Weak initial evidence; later behavior may change it.`,
    });
  if (friendAnswer === "truth" || friendAnswer === "loyalty") {
    next = recordPersonalValue(next, {
      stableKey: `life-start:situation:friend:${playerId}`,
      personId: playerId,
      valueId:
        friendAnswer === "truth"
          ? SYNTHETIC_MIND_IDS.values.honesty
          : SYNTHETIC_MIND_IDS.values.loyalty,
      recordedAt: world.currentDate,
      orientation: "embraces",
      strength: "subtle",
      salience: "low",
      qualification: "One situational answer supplied weak starting evidence.",
      provenance: provenance(`Friend-in-trouble answer: ${friendAnswer}.`),
      supersedesValueId: null,
    });
  } else if (friendAnswer === "stay-out") {
    next = recordPersonalityTendency(next, {
      stableKey: `life-start:situation:friend:${playerId}`,
      personId: playerId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.conflictApproach,
      recordedAt: world.currentDate,
      expressionKey: "conflict-averse",
      strength: "subtle",
      confidence: "low",
      scopeTags: ["situation.friend-trouble"],
      provenance: provenance("Friend-in-trouble answer: stay out."),
      supersedesTendencyId: null,
    });
  }
  if (riskAnswer === "safe" || riskAnswer === "risk") {
    next = recordPersonalityTendency(next, {
      stableKey: `life-start:situation:risk:${playerId}`,
      personId: playerId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: world.currentDate,
      expressionKey: riskAnswer === "safe" ? "cautious" : "risk-seeking",
      strength: "subtle",
      confidence: "low",
      scopeTags: ["situation.uncertain-path"],
      provenance: provenance(`Uncertain-path answer: ${riskAnswer}.`),
      supersedesTendencyId: null,
    });
  } else if (riskAnswer === "learn-more") {
    next = recordPersonalityTendency(next, {
      stableKey: `life-start:situation:risk:${playerId}`,
      personId: playerId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.curiosity,
      recordedAt: world.currentDate,
      expressionKey: "curious",
      strength: "subtle",
      confidence: "low",
      scopeTags: ["situation.uncertain-path"],
      provenance: provenance("Uncertain-path answer: gather more information."),
      supersedesTendencyId: null,
    });
  }
  return next;
}

function applyPolicyAnswers(
  world: World,
  playerId: EntityId,
  answers: Readonly<Partial<Record<LifeStartPolicyKey, LifeStartPolicyAnswer>>>,
): World {
  let next = world;
  for (const question of LIFE_START_POLICY_QUESTIONS) {
    const answer = answers[question.key] ?? "skip";
    if (answer === "skip") continue;
    next = recordPropositionExposure(next, {
      stableKey: `life-start:policy-exposure:${playerId}:${question.key}`,
      personId: playerId,
      propositionId: question.propositionId,
      encounteredAt: world.currentDate,
      summary: question.question,
      provenance: {
        kind: "manual",
        note: "The player answered this proposition directly during character creation.",
      },
    });
    const exposure = next.history.propositionExposures.at(-1);
    next = recordPrivateBelief(next, {
      stableKey: `life-start:private-belief:${playerId}:${question.key}`,
      personId: playerId,
      propositionId: question.propositionId,
      formedAt: world.currentDate,
      position: answer,
      conviction: "tentative",
      salience: "low",
      flexibility: "open",
      rationale:
        "Direct answer supplied by the player; no party affiliation was inferred.",
      formation: createFormationContext("reflection:initial", {
        propositionExposureIds: exposure ? [exposure.id] : [],
        note: "Direct new-game proposition answer.",
      }),
      supersedesBeliefId: null,
    });
  }
  return next;
}

function actionOutcome(
  key: LifeActionKey,
  name: string,
  place: string,
): {
  type: `${string}.${string}`;
  tag: string;
  summary: string;
  reaction: string;
} {
  switch (key) {
    case "personal-project":
      return {
        type: "life.personal-project-started",
        tag: "life.personal-project",
        summary: `${name} began a personal project in ${place}.`,
        reaction:
          "A personal goal is now active, and continuing it is available.",
      };
    case "continue-project":
      return {
        type: "life.personal-project-continued",
        tag: "life.personal-project-followup",
        summary: `${name} spent another day advancing their personal project.`,
        reaction: "The project moved forward through played action.",
      };
    case "relationships":
      return {
        type: "life.relationship-time",
        tag: "life.relationship-direction",
        summary: `${name} made time for an important relationship.`,
        reaction:
          "The time is remembered without inventing another person's identity or response.",
      };
    case "learning":
      return {
        type: "life.learning-options-explored",
        tag: "life.learning-direction",
        summary: `${name} explored education and learning options in ${place}.`,
        reaction:
          "Possible next steps became clearer; no enrollment was assumed.",
      };
    case "community":
      return {
        type: "community.options-explored",
        tag: "life.community-direction",
        summary: `${name} looked for a concrete way to help locally in ${place}.`,
        reaction: "Community involvement is now part of the played history.",
      };
    case "work":
      return {
        type: "life.work-options-explored",
        tag: "life.work-direction",
        summary: `${name} explored work opportunities in ${place}.`,
        reaction:
          "Work possibilities were explored without inventing employment.",
      };
    case "politics":
      return {
        type: "political.involvement-explored",
        tag: "life.politics-direction",
        summary: `${name} began exploring public life in ${place}.`,
        reaction:
          "Political interest is now part of the played history; no party, candidacy, or office was assumed.",
      };
  }
}

function action(
  key: LifeActionKey,
  label: string,
  category: string,
  description: string,
  days: number,
): LifeAction {
  return { key, label, category, description, days };
}

function lifeStageForAge(age: number): string {
  if (age < 13) return "Childhood";
  if (age < 18) return "Teenage years";
  if (age < 25) return "Young adulthood";
  if (age < 40) return "Adulthood";
  if (age < 65) return "Midlife";
  return "Later adulthood";
}

function displayPlace(world: World, jurisdictionId: EntityId): string {
  return (
    lifeStartPlaceByJurisdictionId(jurisdictionId)?.displayName ??
    world.jurisdictions[jurisdictionId]?.name ??
    "Unknown"
  );
}

function housingLabel(kind: string): string {
  if (kind.startsWith("ownership:")) return "Household-owned home";
  if (kind.startsWith("lease:")) return "Rented home";
  if (kind.startsWith("hosted:")) return "Hosted or family home";
  return "Current home";
}

function normalizeFunds(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000) {
    throw new Error(
      "Starting funds must be a whole dollar amount from 0 to 100,000,000.",
    );
  }
  return value;
}

function normalizeAnchors(
  anchors: readonly LifeStartHistoryAnchor[] | undefined,
): readonly LifeStartHistoryAnchor[] {
  return (anchors ?? [])
    .map((anchor) => ({
      date: anchor.date.trim(),
      summary: anchor.summary.trim(),
    }))
    .filter((anchor) => anchor.date.length > 0 && anchor.summary.length > 0)
    .slice(0, 3);
}

function censusPlace(
  id: EntityId,
  slug: string,
  name: string,
  parentName: string,
): Jurisdiction {
  return {
    id,
    slug,
    name,
    kind: "census-place-candidate",
    parentName,
    provenance: {
      asOf: makeIsoDate("2020-04-01"),
      source:
        "U.S. Census Bureau, 2020 Census Gazetteer Files (place identity only)",
      jurisdiction: id,
      status: "candidate",
    },
  };
}
