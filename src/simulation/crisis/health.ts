import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { recordEventKnowledge } from "../records";
import type {
  EntityId,
  EventVisibility,
  FutureTransitionHandler,
  IsoDate,
  PersonFunctionalCapacityStatus,
  World,
} from "../types";
import {
  isPersonAliveAt,
  personFunctionalCapacityAt,
  recordPersonFunctionalCapacity,
} from "../vitality";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { recordOfficialContinuity } from "./continuity";
import { MULTIPLIER_ONE } from "./hazard";
import { crisisMortalityWindowAt, scheduleMortalityWithin } from "./mortality";
import { publicOfficesHeldBy } from "./offices";
import {
  activeHealthEpisodes,
  latestHealthDisclosure,
  latestHealthState,
} from "./health-queries";
import {
  appendCrisisRecord,
  crisisRecordId,
  crisisRecords,
  healthAccessRank,
} from "./records";
import {
  CRISIS_PROVISIONAL_POLICY,
  type FunctionalLimitation,
  type HealthAccess,
  type HealthCourseStep,
  type HealthEpisodeOrigin,
  type HealthEpisodeRecord,
  type HealthSeverity,
  type HealthState,
} from "./types";

/**
 * K2 health and incapacity.
 *
 * An episode is a represented health fact about one person. Onset, state,
 * functional limitation and disclosure are separate dated records. A
 * diagnosis never changes office by itself; only a functional incapacity
 * that the responsible institution knows about produces a continuity notice.
 * Without a researched condition pack the episode is a labeled simulation
 * episode: no disease name, no prognosis, no predicted death day.
 */

export const HEALTH_REVIEW_KEY = "crisis:health-review" as const;
export const NPC_DISCLOSURE_KEY = "crisis:health-disclosure-review" as const;

/**
 * Authored first-playable courses (crunch46-provisional-v1). They describe a
 * recovery path for a labeled simulation episode; they are not clinical data.
 * Death is never scripted here: it comes from the hazard model or from an
 * explicit injury outcome.
 */
export const PROVISIONAL_SIMULATION_COURSES: Readonly<
  Record<HealthSeverity, readonly HealthCourseStep[]>
> = {
  acute: [
    { afterDays: 7, state: "recovering", functionalLimitation: "limited" },
    { afterDays: 21, state: "recovered", functionalLimitation: "none" },
  ],
  serious: [
    { afterDays: 30, state: "recovering", functionalLimitation: "limited" },
    { afterDays: 90, state: "recovered", functionalLimitation: "none" },
  ],
  chronic: [],
};

export interface BeginHealthEpisodeInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly severity: HealthSeverity;
  readonly initialLimitation: FunctionalLimitation;
  readonly origin: HealthEpisodeOrigin;
  readonly causalParentIds: readonly EntityId[];
  /** Who already knows at onset. Defaults to the person alone. */
  readonly initialAccess?: HealthAccess;
  readonly initialRecipientIds?: readonly EntityId[];
  /** Hazard change while active; defaults to no represented change. */
  readonly hazard?: { readonly micros: number; readonly basis: string };
  readonly course?: readonly HealthCourseStep[];
}

const LIMITATION_CAPACITY: Record<
  FunctionalLimitation,
  PersonFunctionalCapacityStatus
> = {
  none: "capable",
  limited: "limited",
  incapacitated: "incapacitated",
};

export function visibilityForAccess(access: HealthAccess): EventVisibility {
  return access === "public"
    ? "public"
    : access === "private"
      ? "private"
      : "limited";
}

function episodeRecord(world: World, episodeId: EntityId): HealthEpisodeRecord {
  const record = crisisRecords(world).find((r) => r.id === episodeId);
  if (!record || record.kind !== "health-episode")
    throw new Error(`Unknown health episode: ${episodeId}`);
  return record;
}

function institutionKnows(world: World, personId: EntityId): boolean {
  return activeHealthEpisodes(world, personId).some(
    (episode) =>
      healthAccessRank(
        latestHealthDisclosure(world, episode.id)?.access ?? "private",
      ) >= healthAccessRank("official"),
  );
}

function strongestAccess(world: World, personId: EntityId): HealthAccess {
  let best: HealthAccess = "private";
  for (const episode of activeHealthEpisodes(world, personId)) {
    const access =
      latestHealthDisclosure(world, episode.id)?.access ?? "private";
    if (healthAccessRank(access) > healthAccessRank(best)) best = access;
  }
  return best;
}

function healthEvent(
  world: World,
  input: {
    readonly stableKey: string;
    readonly type: `${string}.${string}`;
    readonly personId: EntityId;
    readonly effectiveAt: IsoDate;
    readonly visibility: EventVisibility;
    readonly summary: string;
    readonly tags: readonly string[];
  },
): { world: World; eventId: EntityId } {
  const person = world.people[input.personId]!;
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: input.effectiveAt,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [
      { personId: input.personId, role: "focus:patient", detail: null },
    ],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: ["crisis", "crisis.health", ...input.tags],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

/** Writes capacity and any resulting continuity notice for a limitation. */
function applyLimitation(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly limitation: FunctionalLimitation;
    readonly effectiveAt: IsoDate;
    readonly sourceEntityId: EntityId;
  },
): { world: World; capacityRecordId: EntityId | null } {
  const wanted = LIMITATION_CAPACITY[input.limitation];
  const current =
    personFunctionalCapacityAt(world, input.personId, {
      asOfDate: input.effectiveAt,
      historySequenceExclusive: world.history.nextSequence,
    }) ?? "capable";
  if (current === wanted) return { world, capacityRecordId: null };
  const before = world;
  const next = recordPersonFunctionalCapacity(world, {
    stableKey: `${input.stableKey}:capacity`,
    personId: input.personId,
    effectiveAt: input.effectiveAt,
    status: wanted,
    reasonKey: "crisis-health:episode",
    sourceEntityIds: [input.sourceEntityId],
    summary:
      wanted === "incapacitated"
        ? "Unable to carry out ordinary work because of a health episode."
        : wanted === "limited"
          ? "Able to work with limits during a health episode."
          : "Able to carry out ordinary work again.",
    provenance: { kind: "simulated", sourceEntityIds: [input.sourceEntityId] },
  });
  const capacityRecordId = next.history.personFunctionalCapacities.at(-1)!.id;
  let result = next;
  const knows = institutionKnows(before, input.personId);
  if (knows && wanted === "incapacitated")
    result = recordOfficialContinuity(
      before,
      next,
      input.personId,
      "incapacity-began",
      {
        visibility: visibilityForAccess(
          strongestAccess(before, input.personId),
        ),
        sourceRecordId: capacityRecordId,
      },
    );
  else if (knows && current === "incapacitated")
    result = recordOfficialContinuity(
      before,
      next,
      input.personId,
      "incapacity-ended",
      {
        visibility: visibilityForAccess(
          strongestAccess(before, input.personId),
        ),
        sourceRecordId: capacityRecordId,
      },
    );
  return { world: result, capacityRecordId };
}

function refreshMortality(
  world: World,
  personId: EntityId,
  sourceEntityId: EntityId,
): World {
  const window = crisisMortalityWindowAt(world, world.currentDate);
  if (!window) return world;
  return scheduleMortalityWithin(
    world,
    personId,
    world.currentDate,
    window.windowEnd,
    {
      sourceEntityId,
    },
  );
}

function scheduleCourse(
  world: World,
  episodeId: EntityId,
  personId: EntityId,
  onsetAt: IsoDate,
  course: readonly HealthCourseStep[],
  stepIndex: number,
): World {
  const step = course[stepIndex];
  if (!step) return world;
  const dueAt = addDays(onsetAt, step.afterDays);
  if (dueAt <= world.currentDate) return world;
  return scheduleFutureDueItem(world, {
    stableKey: `crisis:health:review:${episodeId}:${stepIndex}`,
    dueAt,
    transitionKey: HEALTH_REVIEW_KEY,
    entityIds: [personId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${CRISIS_PROVISIONAL_POLICY} simulation course step ${stepIndex} of ${episodeId}`,
    },
  });
}

export function beginHealthEpisode(
  world: World,
  input: BeginHealthEpisodeInput,
): World {
  const person = world.people[input.personId];
  if (!person) throw new Error(`Missing health person: ${input.personId}`);
  const onsetAt = world.currentDate;
  if (
    !isPersonAliveAt(world, input.personId, {
      asOfDate: onsetAt,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    throw new Error("A deceased person cannot begin a health episode.");
  if (input.origin.kind === "condition-pack")
    throw new Error(
      "No researched condition pack is installed; named conditions are unavailable.",
    );
  const hazard = input.hazard ?? {
    micros: MULTIPLIER_ONE,
    basis: "No represented change to all-cause hazard.",
  };
  const access = input.initialAccess ?? "private";
  const course = input.course ?? PROVISIONAL_SIMULATION_COURSES[input.severity];
  for (const [index, step] of course.entries())
    if (
      !Number.isSafeInteger(step.afterDays) ||
      step.afterDays <= (course[index - 1]?.afterDays ?? 0)
    )
      throw new Error("A health course must move strictly forward in days.");
  const visibility = visibilityForAccess(access);
  const key = `crisis:health:${input.stableKey}`;
  const began = healthEvent(world, {
    stableKey: `${key}:event`,
    type: "health.episode-began",
    personId: input.personId,
    effectiveAt: onsetAt,
    visibility,
    summary:
      input.severity === "acute"
        ? "Became acutely unwell."
        : input.severity === "serious"
          ? "Became seriously unwell."
          : "Began living with a long-term health condition.",
    tags: [`severity:${input.severity}`],
  });
  let next = appendCrisisRecord(began.world, {
    kind: "health-episode",
    stableKey: key,
    effectiveAt: onsetAt,
    causalParentIds: input.causalParentIds,
    visibility,
    eventId: began.eventId,
    personId: input.personId,
    label: "simulation-episode",
    conditionKey: null,
    severity: input.severity,
    origin: input.origin,
    hazardMultiplierMicros: hazard.micros,
    hazardBasis: hazard.basis,
    course,
  });
  const episodeId = crisisRecordId(next, key);
  next = appendCrisisRecord(next, {
    kind: "health-disclosure",
    stableKey: `${key}:disclosure:initial`,
    effectiveAt: onsetAt,
    causalParentIds: [episodeId],
    visibility: "private",
    eventId: null,
    episodeId,
    personId: input.personId,
    access,
    recipientIds: [...(input.initialRecipientIds ?? [])].sort(),
    decidedByPersonId: null,
  });
  next = teachRecipients(
    next,
    began.eventId,
    input.personId,
    input.initialRecipientIds ?? [],
    onsetAt,
    key,
  );
  const limited = applyLimitation(next, {
    stableKey: `${key}:onset`,
    personId: input.personId,
    limitation: input.initialLimitation,
    effectiveAt: onsetAt,
    sourceEntityId: episodeId,
  });
  next = appendCrisisRecord(limited.world, {
    kind: "health-state",
    stableKey: `${key}:state:onset`,
    effectiveAt: onsetAt,
    causalParentIds: [episodeId],
    visibility: "private",
    eventId: null,
    episodeId,
    personId: input.personId,
    state:
      input.initialLimitation === "incapacitated"
        ? "temporarily-incapacitated"
        : input.severity,
    functionalLimitation: input.initialLimitation,
    capacityRecordId: limited.capacityRecordId,
  });
  next = scheduleCourse(next, episodeId, input.personId, onsetAt, course, 0);
  if (
    input.initialLimitation === "incapacitated" &&
    healthAccessRank(access) < healthAccessRank("official") &&
    !(
      world.control.kind === "person" &&
      world.control.personId === input.personId
    ) &&
    publicOfficesHeldBy(world, input.personId).length > 0
  )
    next = scheduleFutureDueItem(next, {
      stableKey: `${key}:npc-disclosure:due`,
      dueAt: addDays(onsetAt, 1),
      transitionKey: NPC_DISCLOSURE_KEY,
      entityIds: [input.personId],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: `${CRISIS_PROVISIONAL_POLICY} officeholder staff notification for ${episodeId}`,
      },
    });
  if (hazard.micros !== MULTIPLIER_ONE)
    next = refreshMortality(next, input.personId, episodeId);
  assertWorldIntegrity(next);
  return next;
}

function teachRecipients(
  world: World,
  eventId: EntityId,
  personId: EntityId,
  recipients: readonly EntityId[],
  learnedAt: IsoDate,
  key: string,
): World {
  let next = world;
  for (const recipient of [...recipients].sort()) {
    if (recipient === personId) continue;
    const stableKey = `${key}:knows:${recipient}:${eventId}`;
    if (next.history.knowledge.some((k) => k.stableKey === stableKey)) continue;
    next = recordEventKnowledge(next, {
      stableKey,
      personId: recipient,
      eventId,
      learnedAt,
      believedSummary: "Learned about a health episode.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: personId, claimId: null },
    });
  }
  return next;
}

export interface ChangeHealthStateInput {
  readonly stableKey: string;
  readonly episodeId: EntityId;
  readonly state: Exclude<HealthState, "deceased">;
  readonly functionalLimitation: FunctionalLimitation;
  readonly causalParentIds?: readonly EntityId[];
}

export function changeHealthState(
  world: World,
  input: ChangeHealthStateInput,
): World {
  const episode = episodeRecord(world, input.episodeId);
  const prior = latestHealthState(world, episode.id);
  if (prior?.state === "recovered" || prior?.state === "deceased")
    throw new Error("This health episode has already ended.");
  const effectiveAt = world.currentDate;
  const key = `${episode.stableKey}:state:${input.stableKey}`;
  const limited = applyLimitation(world, {
    stableKey: key,
    personId: episode.personId,
    limitation: input.functionalLimitation,
    effectiveAt,
    sourceEntityId: episode.id,
  });
  let next = appendCrisisRecord(limited.world, {
    kind: "health-state",
    stableKey: key,
    effectiveAt,
    causalParentIds: [episode.id, ...(input.causalParentIds ?? [])],
    visibility: "private",
    eventId: null,
    episodeId: episode.id,
    personId: episode.personId,
    state: input.state,
    functionalLimitation: input.functionalLimitation,
    capacityRecordId: limited.capacityRecordId,
  });
  if (
    input.state === "recovered" &&
    episode.hazardMultiplierMicros !== MULTIPLIER_ONE
  )
    next = refreshMortality(next, episode.personId, episode.id);
  assertWorldIntegrity(next);
  return next;
}

export interface DiscloseHealthInput {
  readonly stableKey: string;
  readonly episodeId: EntityId;
  readonly access: Exclude<HealthAccess, "private">;
  readonly recipientIds: readonly EntityId[];
  readonly decidedByPersonId: EntityId | null;
}

export function discloseHealthEpisode(
  world: World,
  input: DiscloseHealthInput,
): World {
  const episode = episodeRecord(world, input.episodeId);
  const prior = latestHealthDisclosure(world, episode.id);
  if (prior && healthAccessRank(input.access) < healthAccessRank(prior.access))
    throw new Error("Disclosed health information cannot become less known.");
  const before = world;
  const effectiveAt = world.currentDate;
  const key = `${episode.stableKey}:disclosure:${input.stableKey}`;
  const visibility = visibilityForAccess(input.access);
  const disclosed = healthEvent(world, {
    stableKey: `${key}:event`,
    type: "health.episode-disclosed",
    personId: episode.personId,
    effectiveAt,
    visibility,
    summary:
      input.access === "public"
        ? "A health episode was made public."
        : "A health episode was shared with the people responsible.",
    tags: [`access:${input.access}`],
  });
  let next = appendCrisisRecord(disclosed.world, {
    kind: "health-disclosure",
    stableKey: key,
    effectiveAt,
    causalParentIds: [episode.id],
    visibility,
    eventId: disclosed.eventId,
    episodeId: episode.id,
    personId: episode.personId,
    access: input.access,
    recipientIds: [...input.recipientIds].sort(),
    decidedByPersonId: input.decidedByPersonId,
  });
  next = teachRecipients(
    next,
    disclosed.eventId,
    episode.personId,
    input.recipientIds,
    effectiveAt,
    key,
  );
  // An incapacity the institution did not know about becomes an official matter now.
  const capacity = personFunctionalCapacityAt(next, episode.personId, {
    asOfDate: effectiveAt,
    historySequenceExclusive: next.history.nextSequence,
  });
  if (
    capacity === "incapacitated" &&
    !institutionKnows(before, episode.personId) &&
    healthAccessRank(input.access) >= healthAccessRank("official")
  ) {
    const capacityRecord = next.history.personFunctionalCapacities
      .filter((record) => record.personId === episode.personId)
      .at(-1)!;
    next = recordOfficialContinuity(
      before,
      next,
      episode.personId,
      "incapacity-began",
      {
        visibility,
        effectiveAt: capacityRecord.effectiveAt,
        sourceRecordId: capacityRecord.id,
        extraParentIds: [crisisRecordId(next, key)],
      },
    );
  }
  assertWorldIntegrity(next);
  return next;
}

export const healthReviewHandler: FutureTransitionHandler = (world, item) => {
  const match = /^crisis:health:review:(.+):(\d+)$/.exec(item.stableKey);
  const episode = match ? episodeRecord(world, match[1] as EntityId) : null;
  const index = match ? Number(match[2]) : -1;
  const state = episode ? latestHealthState(world, episode.id) : null;
  if (
    !episode ||
    !state ||
    state.state === "recovered" ||
    state.state === "deceased"
  )
    return {
      world,
      status: "cancelled",
      reasonKey: "crisis:episode-ended",
      context: "The episode had already ended.",
      outcomeEventId: null,
    };
  const course = episode.course;
  const step = course[index]!;
  let next = changeHealthState(world, {
    stableKey: `course-${index}`,
    episodeId: episode.id,
    state: step.state,
    functionalLimitation: step.functionalLimitation,
    causalParentIds: [item.id],
  });
  next = scheduleCourse(
    next,
    episode.id,
    episode.personId,
    episode.effectiveAt,
    course,
    index + 1,
  );
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:health-review",
    context: step.state,
    outcomeEventId: null,
  };
};

/**
 * An incapacitated NPC officeholder's staff learn of it the next day. The
 * player's own disclosure is the player's decision and is never automated.
 */
export const npcHealthDisclosureHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const personId = item.entityIds[0]!;
  const episode = activeHealthEpisodes(world, personId).find(
    (candidate) =>
      item.stableKey === `${candidate.stableKey}:npc-disclosure:due`,
  );
  const capacity = personFunctionalCapacityAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (
    !episode ||
    capacity !== "incapacitated" ||
    healthAccessRank(
      latestHealthDisclosure(world, episode.id)?.access ?? "private",
    ) >= healthAccessRank("official") ||
    (world.control.kind === "person" && world.control.personId === personId)
  )
    return {
      world,
      status: "cancelled",
      reasonKey: "crisis:disclosure-not-needed",
      context: null,
      outcomeEventId: null,
    };
  const next = discloseHealthEpisode(world, {
    stableKey: "npc-staff",
    episodeId: episode.id,
    access: "official",
    recipientIds: [],
    decidedByPersonId: null,
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:health-disclosure",
    context: "official",
    outcomeEventId: next.history.events.find(
      (event) =>
        event.stableKey === `${episode.stableKey}:disclosure:npc-staff:event`,
    )!.id,
  };
};

export function healthDecisionsFor(world: World, personId: EntityId) {
  return activeHealthEpisodes(world, personId).map((episode) => ({
    episodeId: episode.id,
    severity: episode.severity,
    label: episode.label,
    state: latestHealthState(world, episode.id)?.state ?? episode.severity,
    access: latestHealthDisclosure(world, episode.id)?.access ?? "private",
    canDisclose: (["specific-people", "official", "public"] as const).filter(
      (access) =>
        healthAccessRank(access) >
        healthAccessRank(
          latestHealthDisclosure(world, episode.id)?.access ?? "private",
        ),
    ),
  }));
}
