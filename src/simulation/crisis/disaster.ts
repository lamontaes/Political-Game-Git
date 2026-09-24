import { addDays, daysBetween } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  householdLocationAt,
  organizationProfileAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandler,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt, recordPersonDeath } from "../vitality";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { recordOfficialContinuity } from "./continuity";
import {
  federalDeclarationWarranted,
  stateRequestWarranted,
} from "./disaster-warrants";
import { beginHealthEpisode } from "./health";
import { closeHealthEpisodesForDeath } from "./health-queries";
import { currentGovernorOf, currentPresidentOf } from "./offices";
import { appendCrisisRecord, crisisRecordId, crisisRecords } from "./records";
import {
  CRISIS_PROVISIONAL_POLICY,
  type DisasterAssessmentRecord,
  type DisasterDamageLevel,
  type DisasterDamageRecord,
  type DisasterResponseRecord,
  type DisasterResponseStage,
  type DisasterTargetKind,
  type HazardEpisodeRecord,
  type HazardFamily,
  type HazardMagnitude,
  type RepairProgressRecord,
} from "./types";

/**
 * K4 disaster: flood and severe-storm first complete chain.
 *
 * hazard → damage to represented records → local response → governor request
 * (or none) → federal decision (or none) → finite repair queue → follow-up.
 * A declaration never creates damage, approval never repairs instantly, and a
 * denial never erases the event. Money is GOVERNING's: CRISIS records the
 * decision and the programs, never an amount.
 */

export const DISASTER_STATE_REVIEW_KEY =
  "crisis:disaster-state-review" as const;
export const DISASTER_FEDERAL_REVIEW_KEY =
  "crisis:disaster-federal-review" as const;
export const DISASTER_REPAIR_CYCLE_KEY =
  "crisis:disaster-repair-cycle" as const;

const MICRO = 1_000_000;

/**
 * crunch46-provisional-v1 authored disaster policy. First-playable balancing
 * values, not empirical damage curves or FEMA thresholds.
 */
export const PROVISIONAL_DISASTER_POLICY = Object.freeze({
  version: CRISIS_PROVISIONAL_POLICY,
  /** Share of exposed homes damaged, and destroyed given damaged (millionths). */
  homeDamage: {
    minor: { damaged: 50_000, destroyedGivenDamaged: 0 },
    moderate: { damaged: 150_000, destroyedGivenDamaged: 50_000 },
    major: { damaged: 350_000, destroyedGivenDamaged: 150_000 },
    catastrophic: { damaged: 600_000, destroyedGivenDamaged: 300_000 },
  } satisfies Record<
    HazardMagnitude,
    { damaged: number; destroyedGivenDamaged: number }
  >,
  /** Share of located organizations interrupted, and for how many days. */
  serviceInterruption: {
    minor: { share: 100_000, days: 1 },
    moderate: { share: 300_000, days: 3 },
    major: { share: 600_000, days: 10 },
    catastrophic: { share: 900_000, days: 30 },
  } satisfies Record<HazardMagnitude, { share: number; days: number }>,
  /** Chance a resident of a damaged home is injured; doubled if destroyed. */
  injuryGivenDamagedHome: {
    minor: 0,
    moderate: 30_000,
    major: 80_000,
    catastrophic: 150_000,
  } satisfies Record<HazardMagnitude, number>,
  /** Chance a resident of a destroyed home dies. */
  deathGivenDestroyedHome: {
    minor: 0,
    moderate: 0,
    major: 10_000,
    catastrophic: 40_000,
  } satisfies Record<HazardMagnitude, number>,
  repairUnits: { damaged: 2, destroyed: 8 },
  /** Repair effort units completed per weekly cycle for one episode. */
  weeklyCapacity: { local: 2, federalAssisted: 6 },
  stateReviewAfterDays: 3,
  federalReviewAfterDays: 10,
  /** Governor request window: 44 CFR 206.36(a), 30 days from the incident. */
  stateRequestWindowDays: 30,
  federalPrograms: {
    minor: ["public-assistance"],
    moderate: ["public-assistance"],
    major: ["public-assistance", "individual-assistance"],
    catastrophic: [
      "public-assistance",
      "individual-assistance",
      "hazard-mitigation",
    ],
  } satisfies Record<HazardMagnitude, readonly string[]>,
});

export interface DeclareHazardEpisodeInput {
  readonly stableKey: string;
  readonly family: HazardFamily;
  readonly magnitude: HazardMagnitude;
  readonly stateUsps: string;
  readonly jurisdictionIds: readonly EntityId[];
  readonly durationDays: number;
  /** Why this episode exists: a declared scenario, a sourced template, a test. */
  readonly basis: string;
  readonly sourceReference: string | null;
}

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function episodeOf(world: World, episodeId: EntityId): HazardEpisodeRecord {
  const record = crisisRecords(world).find((r) => r.id === episodeId);
  if (!record || record.kind !== "hazard-episode")
    throw new Error(`Unknown hazard episode: ${episodeId}`);
  return record;
}

function draw(world: World, episode: HazardEpisodeRecord, key: string): number {
  return new SeededRng("crisis-disaster-v1")
    .fork(JSON.stringify(["crisis-disaster-v1", world.seed, episode.id, key]))
    .integer(0, MICRO);
}

function crisisEvent(
  world: World,
  input: {
    readonly stableKey: string;
    readonly type: `${string}.${string}`;
    readonly jurisdictionId: EntityId;
    readonly involvedEntityIds: readonly EntityId[];
    readonly participants?: readonly {
      personId: EntityId;
      role: `agency:${string}`;
      detail: string | null;
    }[];
    readonly tags: readonly string[];
    readonly summary: string;
  },
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [...new Set(input.involvedEntityIds)].sort(),
    participants: [...(input.participants ?? [])],
    personFactConstraints: [],
    visibility: "public",
    tags: ["crisis", "crisis.disaster", ...input.tags],
    summary: input.summary,
    context: EMPTY_CONTEXT,
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

export interface HazardExposure {
  readonly households: readonly { id: EntityId; jurisdictionId: EntityId }[];
  readonly dwellings: readonly { id: EntityId; jurisdictionId: EntityId }[];
  readonly organizations: readonly {
    id: EntityId;
    jurisdictionId: EntityId;
  }[];
}

/** Represented records located in the affected jurisdictions today. */
export function hazardExposure(
  world: World,
  jurisdictionIds: readonly EntityId[],
): HazardExposure {
  const affected = new Set(jurisdictionIds);
  const households = world.history.households.flatMap((household) => {
    const location = householdLocationAt(world, household.id);
    return location && affected.has(location.jurisdictionId)
      ? [{ id: household.id, jurisdictionId: location.jurisdictionId }]
      : [];
  });
  const dwellings = world.history.dwellings.flatMap((dwelling) =>
    affected.has(dwelling.jurisdictionId) &&
    dwelling.establishedAt <= world.currentDate
      ? [{ id: dwelling.id, jurisdictionId: dwelling.jurisdictionId }]
      : [],
  );
  const organizations = world.history.organizations.flatMap((organization) => {
    const profile = organizationProfileAt(world, organization.id);
    return profile?.locationJurisdictionId &&
      affected.has(profile.locationJurisdictionId)
      ? [
          {
            id: organization.id,
            jurisdictionId: profile.locationJurisdictionId,
          },
        ]
      : [];
  });
  return { households, dwellings, organizations };
}

function homeLevel(
  world: World,
  episode: HazardEpisodeRecord,
  key: string,
): DisasterDamageLevel | null {
  const policy = PROVISIONAL_DISASTER_POLICY.homeDamage[episode.magnitude];
  if (draw(world, episode, `${key}:damaged`) >= policy.damaged) return null;
  return draw(world, episode, `${key}:destroyed`) < policy.destroyedGivenDamaged
    ? "destroyed"
    : "damaged";
}

/**
 * Declares a hazard episode on the current day and applies its immediate
 * consequences. The caller supplies magnitude and geography explicitly.
 */
export function declareHazardEpisode(
  world: World,
  input: DeclareHazardEpisodeInput,
): World {
  if (input.jurisdictionIds.length === 0)
    throw new Error("A hazard episode needs at least one jurisdiction.");
  for (const id of input.jurisdictionIds)
    if (!world.jurisdictions[id])
      throw new Error(`Unknown hazard jurisdiction: ${id}`);
  if (!/^[A-Z]{2}$/.test(input.stateUsps))
    throw new Error("A hazard episode needs a two-letter state code.");
  if (!Number.isSafeInteger(input.durationDays) || input.durationDays < 1)
    throw new Error("A hazard episode lasts at least one day.");
  if (!input.basis.trim())
    throw new Error("A hazard episode must state why it exists.");
  const key = `crisis:disaster:${input.stableKey}`;
  const jurisdictionIds = [...input.jurisdictionIds].sort();
  const occurred = crisisEvent(world, {
    stableKey: `${key}:event`,
    type: "crisis.hazard-occurred",
    jurisdictionId: jurisdictionIds[0]!,
    involvedEntityIds: jurisdictionIds,
    tags: [`hazard:${input.family}`, `magnitude:${input.magnitude}`],
    summary:
      input.family === "flood"
        ? `Flooding struck the area (${input.magnitude}).`
        : `A severe storm struck the area (${input.magnitude}).`,
  });
  let next = appendCrisisRecord(occurred.world, {
    kind: "hazard-episode",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [],
    visibility: "public",
    eventId: occurred.eventId,
    family: input.family,
    magnitude: input.magnitude,
    stateUsps: input.stateUsps,
    jurisdictionIds,
    endsAt: addDays(world.currentDate, input.durationDays),
    basis: input.basis,
    sourceReference: input.sourceReference,
  });
  const episode = episodeOf(next, crisisRecordId(next, key));
  next = applyDamage(next, episode);
  next = recordResponse(next, episode, {
    stage: "local-response",
    actor: null,
    decidedBy: "institution",
    reason: "Local emergency services responded to the reported damage.",
    programs: [],
    eventType: "crisis.disaster-local-response",
    summary: "Local emergency services responded and began assessing damage.",
  });
  next = scheduleEpisodeItem(
    next,
    episode,
    DISASTER_STATE_REVIEW_KEY,
    "state-review:0",
    PROVISIONAL_DISASTER_POLICY.stateReviewAfterDays,
  );
  next = scheduleEpisodeItem(
    next,
    episode,
    DISASTER_REPAIR_CYCLE_KEY,
    "repair:1",
    7,
  );
  assertWorldIntegrity(next);
  return next;
}

function scheduleEpisodeItem(
  world: World,
  episode: HazardEpisodeRecord,
  transitionKey: `${string}:${string}`,
  suffix: string,
  afterDays: number,
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${episode.stableKey}:${suffix}:due`,
    dueAt: addDays(world.currentDate, Math.max(1, afterDays)),
    transitionKey,
    entityIds: [episode.id],
    jurisdictionId: episode.jurisdictionIds[0]!,
    provenance: { kind: "simulated", sourceEntityIds: [episode.id] },
  });
}

type Counts = Record<DisasterTargetKind, number>;

function applyDamage(world: World, episode: HazardEpisodeRecord): World {
  const exposure = hazardExposure(world, episode.jurisdictionIds);
  const policy = PROVISIONAL_DISASTER_POLICY;
  let next = world;
  const damaged: Counts = { household: 0, dwelling: 0, organization: 0 };
  const destroyed: Counts = { household: 0, dwelling: 0, organization: 0 };
  const injured: EntityId[] = [];
  const deceased: EntityId[] = [];
  let totalUnits = 0;
  const addDamage = (
    targetKind: DisasterTargetKind,
    target: { id: EntityId; jurisdictionId: EntityId },
    level: DisasterDamageLevel,
    units: number,
  ): EntityId => {
    const stableKey = `${episode.stableKey}:damage:${target.id}`;
    next = appendCrisisRecord(next, {
      kind: "disaster-damage",
      stableKey,
      effectiveAt: episode.effectiveAt,
      causalParentIds: [episode.id],
      visibility: "limited",
      eventId: null,
      episodeId: episode.id,
      targetKind,
      targetId: target.id,
      jurisdictionId: target.jurisdictionId,
      level,
      repairUnits: units,
    });
    if (level === "destroyed") destroyed[targetKind] += 1;
    else damaged[targetKind] += 1;
    if (level !== "service-interrupted") totalUnits += units;
    return crisisRecordId(next, stableKey);
  };
  const homeUnits = (level: DisasterDamageLevel) =>
    level === "destroyed"
      ? policy.repairUnits.destroyed
      : policy.repairUnits.damaged;

  for (const dwelling of exposure.dwellings) {
    const level = homeLevel(next, episode, `dwelling:${dwelling.id}`);
    if (level) addDamage("dwelling", dwelling, level, homeUnits(level));
  }
  for (const household of exposure.households) {
    const level = homeLevel(next, episode, `household:${household.id}`);
    if (!level) continue;
    const damageId = addDamage("household", household, level, homeUnits(level));
    const cutoff = {
      asOfDate: next.currentDate,
      historySequenceExclusive: next.history.nextSequence,
    };
    const residents = peopleInHouseholdAt(next, household.id, cutoff).filter(
      (personId) => isPersonAliveAt(next, personId, cutoff),
    );
    for (const personId of residents) {
      const deathChance =
        level === "destroyed"
          ? policy.deathGivenDestroyedHome[episode.magnitude]
          : 0;
      if (draw(next, episode, `death:${personId}`) < deathChance) {
        const before = next;
        next = recordPersonDeath(next, {
          stableKey: `${episode.stableKey}:death:${personId}`,
          personId,
          diedAt: next.currentDate,
          causeKey: `crisis-injury:${episode.family}`,
          sourceEntityIds: [damageId],
          summary:
            "Died of injuries suffered when the disaster struck their home.",
          provenance: { kind: "simulated", sourceEntityIds: [damageId] },
        });
        const death = next.history.personDeaths.at(-1)!;
        next = closeHealthEpisodesForDeath(next, personId, death.id);
        next = recordOfficialContinuity(before, next, personId, "death");
        deceased.push(personId);
        continue;
      }
      const injuryChance =
        policy.injuryGivenDamagedHome[episode.magnitude] *
        (level === "destroyed" ? 2 : 1);
      if (draw(next, episode, `injury:${personId}`) < injuryChance) {
        const serious =
          draw(next, episode, `injury-severity:${personId}`) < MICRO / 3;
        next = beginHealthEpisode(next, {
          stableKey: `${episode.stableKey}:injury:${personId}`,
          personId,
          severity: serious ? "serious" : "acute",
          initialLimitation: serious ? "incapacitated" : "limited",
          origin: { kind: "injury", sourceRecordId: damageId },
          causalParentIds: [damageId],
          initialAccess: "specific-people",
          initialRecipientIds: residents.filter((other) => other !== personId),
        });
        injured.push(personId);
      }
    }
  }
  for (const organization of exposure.organizations) {
    const service = policy.serviceInterruption[episode.magnitude];
    if (draw(next, episode, `organization:${organization.id}`) < service.share)
      addDamage(
        "organization",
        organization,
        "service-interrupted",
        service.days,
      );
  }
  return appendCrisisRecord(next, {
    kind: "disaster-assessment",
    stableKey: `${episode.stableKey}:assessment`,
    effectiveAt: episode.effectiveAt,
    causalParentIds: [episode.id],
    visibility: "limited",
    eventId: null,
    episodeId: episode.id,
    exposed: {
      household: exposure.households.length,
      dwelling: exposure.dwellings.length,
      organization: exposure.organizations.length,
    },
    damaged,
    destroyed,
    injuredPersonIds: injured.sort(),
    deceasedPersonIds: deceased.sort(),
    totalRepairUnits: totalUnits,
  });
}

export function disasterResponses(
  world: World,
  episodeId: EntityId,
): readonly DisasterResponseRecord[] {
  return crisisRecords(world).filter(
    (record): record is DisasterResponseRecord =>
      record.kind === "disaster-response" && record.episodeId === episodeId,
  );
}

export function disasterAssessment(
  world: World,
  episodeId: EntityId,
): DisasterAssessmentRecord | null {
  return (
    crisisRecords(world).find(
      (record): record is DisasterAssessmentRecord =>
        record.kind === "disaster-assessment" && record.episodeId === episodeId,
    ) ?? null
  );
}

function hasStage(
  world: World,
  episodeId: EntityId,
  stages: readonly DisasterResponseStage[],
): boolean {
  return disasterResponses(world, episodeId).some((record) =>
    stages.includes(record.stage),
  );
}

interface Actor {
  readonly personId: EntityId;
  readonly officeKey: string;
}

function recordResponse(
  world: World,
  episode: HazardEpisodeRecord,
  input: {
    readonly stage: DisasterResponseStage;
    readonly actor: Actor | null;
    readonly decidedBy: DisasterResponseRecord["decidedBy"];
    readonly reason: string;
    readonly programs: readonly string[];
    readonly eventType: `${string}.${string}`;
    readonly summary: string;
  },
): World {
  const key = `${episode.stableKey}:response:${input.stage}`;
  const event = crisisEvent(world, {
    stableKey: `${key}:event`,
    type: input.eventType,
    jurisdictionId: episode.jurisdictionIds[0]!,
    involvedEntityIds: [
      episode.id,
      ...(input.actor ? [input.actor.personId] : []),
    ],
    participants: input.actor
      ? [
          {
            personId: input.actor.personId,
            role: "agency:decision-maker",
            detail: input.actor.officeKey,
          },
        ]
      : [],
    tags: [
      `response:${input.stage}`,
      ...input.programs.map((program) => `program:${program}`),
    ],
    summary: input.summary,
  });
  // What voters and the people around the decision-maker make of it is
  // judged from this record by the weekly press sweep
  // (`applyPendingDisasterHandlingReactions`), not here: calling it from
  // this module put the whole relationship graph inside the transition
  // registry's own import cycle.
  return appendCrisisRecord(event.world, {
    kind: "disaster-response",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [episode.id],
    visibility: "public",
    eventId: event.eventId,
    episodeId: episode.id,
    stage: input.stage,
    actorPersonId: input.actor?.personId ?? null,
    officeKey: input.actor?.officeKey ?? null,
    decidedBy: input.decidedBy,
    reason: input.reason,
    programs: [...input.programs],
  });
}

function controlledBy(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function requestDeadline(episode: HazardEpisodeRecord): IsoDate {
  return addDays(
    episode.effectiveAt,
    PROVISIONAL_DISASTER_POLICY.stateRequestWindowDays,
  );
}

/**
 * Whether a disaster left nothing a federal request could answer: no home or
 * building damaged or destroyed, no one hurt, and below the game's own
 * standard for asking. The played governor is not asked about one.
 *
 * UNRESEARCHED placeholder: whether a governor ever requests a declaration
 * with nothing damaged is filed as `disaster-request-with-no-damage`.
 */
function nothingToRequest(world: World, episode: HazardEpisodeRecord): boolean {
  const assessment = disasterAssessment(world, episode.id);
  if (!assessment) return false;
  if (
    stateRequestWarranted(
      episode.magnitude,
      assessment.destroyed.household + assessment.destroyed.dwelling,
    )
  )
    return false;
  const sum = (counts: Readonly<Record<string, number>>) =>
    Object.values(counts).reduce((total, count) => total + count, 0);
  return (
    sum(assessment.damaged) === 0 &&
    sum(assessment.destroyed) === 0 &&
    assessment.injuredPersonIds.length === 0 &&
    assessment.deceasedPersonIds.length === 0
  );
}

/** The governor's decision, made by the player who holds that office. */
export function decideStateDisasterRequest(
  world: World,
  episodeId: EntityId,
  choice: "request" | "decline",
): World {
  const episode = episodeOf(world, episodeId);
  const governor = currentGovernorOf(world, episode.stateUsps);
  if (!governor || !controlledBy(world, governor.personId))
    throw new Error("Only the governor may make this request.");
  if (hasStage(world, episode.id, ["state-request", "no-state-request"]))
    throw new Error("The request decision has already been made.");
  if (world.currentDate > requestDeadline(episode))
    throw new Error("The window for a federal request has closed.");
  const next = applyStateDecision(world, episode, governor, choice, "player");
  assertWorldIntegrity(next);
  return next;
}

function applyStateDecision(
  world: World,
  episode: HazardEpisodeRecord,
  governor: Actor | null,
  choice: "request" | "decline",
  decidedBy: DisasterResponseRecord["decidedBy"],
  reason?: string,
): World {
  if (choice === "decline" || !governor)
    return recordResponse(world, episode, {
      stage: "no-state-request",
      actor: governor,
      decidedBy,
      reason: reason ?? "The governor did not request federal assistance.",
      programs: [],
      eventType: "crisis.disaster-no-federal-request",
      summary: "The state did not ask for a federal disaster declaration.",
    });
  const next = recordResponse(world, episode, {
    stage: "state-request",
    actor: governor,
    decidedBy,
    reason:
      reason ?? "The governor requested a federal major-disaster declaration.",
    programs: [],
    eventType: "crisis.disaster-federal-request",
    summary:
      "The governor asked the President for a federal disaster declaration.",
  });
  return scheduleEpisodeItem(
    next,
    episode,
    DISASTER_FEDERAL_REVIEW_KEY,
    "federal-review:0",
    PROVISIONAL_DISASTER_POLICY.federalReviewAfterDays,
  );
}

/** The President's decision, made by the player who holds that office. */
export function decideFederalDisasterDeclaration(
  world: World,
  episodeId: EntityId,
  choice: "declare" | "deny",
): World {
  const episode = episodeOf(world, episodeId);
  const president = currentPresidentOf(world);
  if (!president || !controlledBy(world, president.personId))
    throw new Error("Only the President may decide this request.");
  if (!hasStage(world, episode.id, ["state-request"]))
    throw new Error("There is no pending state request.");
  if (hasStage(world, episode.id, ["federal-declared", "federal-denied"]))
    throw new Error("The request has already been decided.");
  const next = applyFederalDecision(
    world,
    episode,
    president,
    choice,
    "player",
  );
  assertWorldIntegrity(next);
  return next;
}

function applyFederalDecision(
  world: World,
  episode: HazardEpisodeRecord,
  president: Actor,
  choice: "declare" | "deny",
  decidedBy: DisasterResponseRecord["decidedBy"],
): World {
  const declared = choice === "declare";
  return recordResponse(world, episode, {
    stage: declared ? "federal-declared" : "federal-denied",
    actor: president,
    decidedBy,
    reason: declared
      ? "The President declared a major disaster for the affected area."
      : "The President denied the request; state and local resources continue.",
    programs: declared
      ? PROVISIONAL_DISASTER_POLICY.federalPrograms[episode.magnitude]
      : [],
    eventType: declared
      ? "crisis.disaster-declared"
      : "crisis.disaster-declaration-denied",
    summary: declared
      ? "The President declared a major disaster, making federal assistance available."
      : "The President denied the request for a federal disaster declaration.",
  });
}

function settled(
  world: World,
  status: "resolved" | "cancelled",
  context: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status,
    reasonKey:
      status === "resolved"
        ? "crisis:disaster-review"
        : "crisis:disaster-review-not-needed",
    context,
    outcomeEventId: null,
  };
}

function itemIndex(item: FutureDueItem): number {
  return Number(/:(\d+):due$/.exec(item.stableKey)?.[1] ?? 0);
}

export const disasterStateReviewHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const episode = episodeOf(world, item.entityIds[0]!);
  if (hasStage(world, episode.id, ["state-request", "no-state-request"]))
    return settled(world, "cancelled", "Already decided.");
  const governor = currentGovernorOf(world, episode.stateUsps);
  if (!governor)
    return settled(
      applyStateDecision(
        world,
        episode,
        null,
        "decline",
        "institution",
        "No governor is recorded for this state, so no request was made.",
      ),
      "resolved",
      "no-governor",
    );
  const deadline = requestDeadline(episode);
  if (controlledBy(world, governor.personId)) {
    if (nothingToRequest(world, episode))
      return settled(
        applyStateDecision(
          world,
          episode,
          null,
          "decline",
          "institution",
          "Nothing was damaged and no one was hurt, so no request was made.",
        ),
        "resolved",
        "nothing-damaged",
      );
    if (world.currentDate >= deadline)
      return settled(
        applyStateDecision(
          world,
          episode,
          governor,
          "decline",
          "lapse",
          "The request window closed without a decision.",
        ),
        "resolved",
        "lapse",
      );
    return settled(
      scheduleEpisodeItem(
        world,
        episode,
        DISASTER_STATE_REVIEW_KEY,
        `state-review:${itemIndex(item) + 1}`,
        Math.min(7, daysBetween(world.currentDate, deadline)),
      ),
      "resolved",
      "awaiting-player",
    );
  }
  const assessment = disasterAssessment(world, episode.id)!;
  const destroyedHomes =
    assessment.destroyed.household + assessment.destroyed.dwelling;
  const request = stateRequestWarranted(episode.magnitude, destroyedHomes);
  return settled(
    applyStateDecision(
      world,
      episode,
      governor,
      request ? "request" : "decline",
      "npc-rule",
      request
        ? "Damage exceeded what the state expected to handle alone."
        : "The governor judged state and local resources sufficient.",
    ),
    "resolved",
    request ? "request" : "decline",
  );
};

export const disasterFederalReviewHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const episode = episodeOf(world, item.entityIds[0]!);
  if (hasStage(world, episode.id, ["federal-declared", "federal-denied"]))
    return settled(world, "cancelled", "Already decided.");
  const president = currentPresidentOf(world);
  if (!president) {
    if (hasStage(world, episode.id, ["federal-not-requested"]))
      return settled(world, "cancelled", "Already recorded as undecided.");
    return settled(
      recordResponse(world, episode, {
        stage: "federal-not-requested",
        actor: null,
        decidedBy: "institution",
        reason: "No President is recorded, so the request cannot be decided.",
        programs: [],
        eventType: "crisis.disaster-request-undecided",
        summary: "The request for a federal declaration remains undecided.",
      }),
      "resolved",
      "no-president",
    );
  }
  if (controlledBy(world, president.personId))
    return settled(
      scheduleEpisodeItem(
        world,
        episode,
        DISASTER_FEDERAL_REVIEW_KEY,
        `federal-review:${itemIndex(item) + 1}`,
        7,
      ),
      "resolved",
      "awaiting-player",
    );
  const declare = federalDeclarationWarranted(episode.magnitude);
  return settled(
    applyFederalDecision(
      world,
      episode,
      president,
      declare ? "declare" : "deny",
      "npc-rule",
    ),
    "resolved",
    declare ? "declare" : "deny",
  );
};

function latestRepair(
  world: World,
  damageId: EntityId,
): RepairProgressRecord | null {
  return (
    crisisRecords(world)
      .filter(
        (record): record is RepairProgressRecord =>
          record.kind === "repair-progress" && record.damageId === damageId,
      )
      .at(-1) ?? null
  );
}

/** Remaining repair work for an episode, oldest damage first. */
export function disasterRepairQueue(
  world: World,
  episodeId: EntityId,
): readonly { damage: DisasterDamageRecord; remainingUnits: number }[] {
  return crisisRecords(world).flatMap((record) => {
    if (
      record.kind !== "disaster-damage" ||
      record.episodeId !== episodeId ||
      record.level === "service-interrupted"
    )
      return [];
    const remaining =
      latestRepair(world, record.id)?.remainingUnits ?? record.repairUnits;
    return remaining > 0 ? [{ damage: record, remainingUnits: remaining }] : [];
  });
}

export const disasterRepairCycleHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const episode = episodeOf(world, item.entityIds[0]!);
  const federal = hasStage(world, episode.id, ["federal-declared"]);
  const policy = PROVISIONAL_DISASTER_POLICY.weeklyCapacity;
  let capacity = policy.local + (federal ? policy.federalAssisted : 0);
  let next = world;
  const cycle = itemIndex(item);
  for (const entry of disasterRepairQueue(world, episode.id)) {
    if (capacity <= 0) break;
    const applied = Math.min(capacity, entry.remainingUnits);
    capacity -= applied;
    next = appendCrisisRecord(next, {
      kind: "repair-progress",
      stableKey: `${episode.stableKey}:repair:${cycle}:${entry.damage.id}`,
      effectiveAt: next.currentDate,
      causalParentIds: [entry.damage.id],
      visibility: "limited",
      eventId: null,
      episodeId: episode.id,
      damageId: entry.damage.id,
      unitsApplied: applied,
      remainingUnits: entry.remainingUnits - applied,
      funding: federal ? "federal-assisted" : "local",
    });
  }
  const decisionsPending = !hasStage(next, episode.id, [
    "no-state-request",
    "federal-declared",
    "federal-denied",
    "federal-not-requested",
  ]);
  if (disasterRepairQueue(next, episode.id).length > 0 || decisionsPending)
    return settled(
      scheduleEpisodeItem(
        next,
        episode,
        DISASTER_REPAIR_CYCLE_KEY,
        `repair:${cycle + 1}`,
        7,
      ),
      "resolved",
      "repairs-continue",
    );
  const assessment = disasterAssessment(next, episode.id)!;
  next = recordResponse(next, episode, {
    stage: "follow-up",
    actor: null,
    decidedBy: "institution",
    reason: `Recorded repairs were complete after ${cycle} weekly cycle(s).`,
    programs: [],
    eventType: "crisis.disaster-recovery-reviewed",
    summary:
      assessment.totalRepairUnits === 0
        ? "Officials reviewed the disaster; no recorded homes needed rebuilding."
        : "Officials reviewed the recovery after recorded repairs were completed.",
  });
  return settled(next, "resolved", "recovered");
};

export interface PendingDisasterDecision {
  readonly episodeId: EntityId;
  readonly sequence: number;
  readonly decision: "state-request" | "federal-declaration";
}

/** Disaster decisions waiting on the controlled person. */
export function pendingDisasterDecisions(
  world: World,
): readonly PendingDisasterDecision[] {
  if (world.control.kind !== "person") return [];
  const personId = world.control.personId;
  const president = currentPresidentOf(world);
  return crisisRecords(world).flatMap((record): PendingDisasterDecision[] => {
    if (record.kind !== "hazard-episode") return [];
    const governor = currentGovernorOf(world, record.stateUsps);
    if (
      governor?.personId === personId &&
      !hasStage(world, record.id, ["state-request", "no-state-request"]) &&
      world.currentDate <= requestDeadline(record) &&
      !nothingToRequest(world, record)
    )
      return [
        {
          episodeId: record.id,
          sequence: record.sequence,
          decision: "state-request",
        },
      ];
    const request = disasterResponses(world, record.id).find(
      (response) => response.stage === "state-request",
    );
    if (
      president?.personId === personId &&
      request &&
      !hasStage(world, record.id, ["federal-declared", "federal-denied"])
    )
      return [
        {
          episodeId: record.id,
          sequence: request.sequence,
          decision: "federal-declaration",
        },
      ];
    return [];
  });
}
