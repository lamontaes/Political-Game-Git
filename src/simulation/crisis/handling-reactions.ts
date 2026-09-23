import { addDays } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { personName } from "../people";
import { closeContactsOf, partyContactsForSubject } from "../press/responses";
import { currentHistoricalCutoff } from "../queries";
import {
  recordEventKnowledge,
  recordRelationshipInteraction,
} from "../records";
import { campaignState, campaigns } from "../campaign-queries";
import { recordSupportLoss, recordSupportShift } from "../campaign-support";
import { electionContestStatus } from "../election-contests";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { crisisRecords } from "./records";
import {
  federalDeclarationWarranted,
  stateRequestWarranted,
} from "./disaster-warrants";
import type {
  DisasterAssessmentRecord,
  DisasterResponseRecord,
  HazardEpisodeRecord,
} from "./types";

/**
 * UNRESEARCHED. How far handling a disaster well or badly moves voters, and
 * for how long they remember it. Blanket game rules, not estimates of
 * retrospective voting on disasters; filed as `disaster-handling-reactions`.
 * A researched table replaces this one under a new version.
 */
export const UNRESEARCHED_DISASTER_HANDLING = {
  version: "disaster-handling-reactions-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /** Contest share moved when it happens during an open race. */
  supportBasisPoints: { failed: 200, sound: 100 },
  /** Starting weight in a later race (850 to 1150 in `campaigns.ts`). */
  laterContestWeight: { failed: -40, sound: 20 },
  memoryDays: 4 * 365,
} as const;

export type HandlingVerdict = "sound" | "failed";

function episodeOf(
  world: World,
  episodeId: EntityId,
): HazardEpisodeRecord | null {
  return (
    crisisRecords(world).find(
      (record): record is HazardEpisodeRecord =>
        record.kind === "hazard-episode" && record.id === episodeId,
    ) ?? null
  );
}

function destroyedHomes(world: World, episodeId: EntityId): number {
  const assessment = crisisRecords(world).find(
    (record): record is DisasterAssessmentRecord =>
      record.kind === "disaster-assessment" && record.episodeId === episodeId,
  );
  return assessment
    ? assessment.destroyed.household + assessment.destroyed.dwelling
    : 0;
}

/**
 * Whether a governor's or President's decision met the game's standard. Asking
 * for help the damage warranted is sound; not asking (declining, or letting the
 * window close) when it was warranted is a failure. Anything else, such as
 * asking when state resources would have done, is judged neither way.
 */
export function handlingVerdict(
  world: World,
  response: DisasterResponseRecord,
): HandlingVerdict | null {
  if (!response.actorPersonId) return null;
  const episode = episodeOf(world, response.episodeId);
  if (!episode) return null;
  const state = stateRequestWarranted(
    episode.magnitude,
    destroyedHomes(world, episode.id),
  );
  const federal = federalDeclarationWarranted(episode.magnitude);
  switch (response.stage) {
    case "state-request":
      return state ? "sound" : null;
    case "no-state-request":
      return state ? "failed" : null;
    case "federal-declared":
      return federal ? "sound" : null;
    case "federal-denied":
      return federal ? "failed" : null;
    default:
      return null;
  }
}

export interface DisasterHandlingJudgment {
  readonly response: DisasterResponseRecord;
  readonly verdict: HandlingVerdict;
}

/** Judged decisions by `personId` still inside the memory window. Read-only. */
export function rememberedDisasterHandling(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly DisasterHandlingJudgment[] {
  return crisisRecords(world).flatMap((record) => {
    if (
      record.kind !== "disaster-response" ||
      record.actorPersonId !== personId ||
      record.effectiveAt > asOf ||
      addDays(record.effectiveAt, UNRESEARCHED_DISASTER_HANDLING.memoryDays) <
        asOf
    )
      return [];
    const verdict = handlingVerdict(world, record);
    return verdict ? [{ response: record, verdict }] : [];
  });
}

/** What remembered handling adds to a later race's starting weight. */
export function disasterHandlingWeight(
  world: World,
  personId: EntityId,
  asOf: IsoDate,
): number {
  return rememberedDisasterHandling(world, personId, asOf).reduce(
    (sum, judgment) =>
      sum + UNRESEARCHED_DISASTER_HANDLING.laterContestWeight[judgment.verdict],
    0,
  );
}

type Reaction = "praise" | "criticize" | "defend" | "no-action";

const LABELS: Readonly<Record<Reaction, string>> = {
  praise: "Speak well of how it was handled",
  criticize: "Criticize how it was handled",
  defend: "Defend how it was handled",
  "no-action": "Say nothing",
};

/**
 * What a judged disaster decision does beyond its own record: voters in any
 * open race the decision-maker is running in move toward or away from them,
 * and, for the played character, their family, household and party
 * organizers, who read the public record, each decide what to say about it. Before this, a governor could let
 * thirteen requests for federal help lapse and the only trace was a line in
 * the paper (Nevada replay, 2026-09-22).
 *
 * The standard is the game's own (`handlingVerdict`); the sizes are
 * UNRESEARCHED. What the President or national press say when asked about a
 * state's handling is not built: filed as `disaster-handling-reactions`.
 */
export function applyDisasterHandlingReactions(
  world: World,
  response: DisasterResponseRecord,
): World {
  const verdict = handlingVerdict(world, response);
  const personId = response.actorPersonId;
  if (!verdict || !personId || !world.people[personId]) return world;
  const event = world.history.events.find(
    (candidate) => candidate.id === response.eventId,
  );
  if (!event) return world;
  let next = world;
  for (const campaign of campaigns(next)) {
    if (
      !campaign.candidateSupportScopes.some(
        (scope) => scope.candidatePersonId === personId,
      ) ||
      campaign.candidateSupportScopes.length < 2 ||
      campaignState(next, campaign.id).status !== "active" ||
      electionContestStatus(next, campaign.contestId) !== "pending"
    )
      continue;
    const input = {
      stableKeyBase: `${response.stableKey}:handling-support:${campaign.id}`,
      sourceEntityIds: [event.id],
    };
    const size = UNRESEARCHED_DISASTER_HANDLING.supportBasisPoints[verdict];
    next =
      verdict === "failed"
        ? recordSupportLoss(next, campaign, {
            ...input,
            loserPersonId: personId,
            lossBasisPoints: size,
          }).world
        : recordSupportShift(next, campaign, {
            ...input,
            gainerPersonId: personId,
            gainBasisPoints: size,
          }).world;
  }
  // The people around a governor the player does not control are not asked
  // what they think: nobody reads it, and asking every one of them after every
  // disaster in every state is where long saves slow down.
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return next;
  const readers = [
    ...partyContactsForSubject(next, personId).map(
      (id) => [id, "party"] as const,
    ),
    ...closeContactsOf(next, personId).map((id) => [id, "contact"] as const),
  ].filter(
    ([id], index, all) =>
      id !== personId &&
      next.people[id] &&
      all.findIndex(([other]) => other === id) === index,
  );
  for (const [readerId, role] of readers) {
    next = react(next, { response, event, verdict, personId, readerId, role });
  }
  return next;
}

/**
 * UNRESEARCHED. How long after a decision the weekly sweep still reacts to
 * it. Longer than a week so no decision falls between two sweeps; decisions
 * made before this existed are not reacted to after the fact.
 */
const REACTION_WINDOW_DAYS = 14;

const JUDGED_EVENT = "crisis.disaster-reaction-settled";

/**
 * Reacts once to each judged disaster decision made in the last two weeks.
 * Run by the weekly press sweep, the same tick that puts the decision in the
 * paper; a marker event keeps a decision from being reacted to twice.
 */
export function applyPendingDisasterHandlingReactions(world: World): World {
  let next = world;
  const since = addDays(world.currentDate, -REACTION_WINDOW_DAYS);
  for (const record of crisisRecords(world)) {
    if (
      record.kind !== "disaster-response" ||
      record.effectiveAt < since ||
      record.effectiveAt > world.currentDate ||
      !record.actorPersonId
    )
      continue;
    const stableKey = `${record.stableKey}:handling-judged`;
    if (next.history.events.some((event) => event.stableKey === stableKey))
      continue;
    next = applyDisasterHandlingReactions(next, record);
    const decided = next.history.events.find(
      (event) => event.id === record.eventId,
    );
    next = recordWorldEvent(next, {
      stableKey,
      type: JUDGED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: decided?.jurisdictionId ?? null,
      involvedEntityIds: [record.actorPersonId],
      participants: [
        {
          personId: record.actorPersonId,
          role: "focus:decision-maker",
          detail: "Made the decision",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [UNRESEARCHED_DISASTER_HANDLING.version, "time-neutral"],
      summary: "The reaction to a disaster decision was settled.",
      context: {
        location: null,
        socialContext: decided?.summary ?? null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  return next;
}

function react(
  world: World,
  input: {
    readonly response: DisasterResponseRecord;
    readonly event: HistoricalEvent;
    readonly verdict: HandlingVerdict;
    readonly personId: EntityId;
    readonly readerId: EntityId;
    readonly role: "party" | "contact";
  },
): World {
  const key = `${input.response.stableKey}:handling-reaction:${input.readerId}`;
  let next = recordEventKnowledge(world, {
    stableKey: `${key}:read`,
    personId: input.readerId,
    eventId: input.event.id,
    learnedAt: world.currentDate,
    believedSummary: input.event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "public-record", reference: "Disaster response" },
  });
  const options: readonly Reaction[] =
    input.verdict === "sound"
      ? ["praise", "no-action"]
      : ["criticize", "defend", "no-action"];
  const evaluation = evaluateDecision(next, {
    stableKey: `${key}:decision`,
    decisionType: `crisis.${input.role}-handling-reaction`,
    actorPersonId: input.readerId,
    cutoff: currentHistoricalCutoff(next),
    subject: {
      kind: "context:disaster-response",
      key: input.response.stableKey,
      entityId: input.event.id,
    },
    options: options.map((option) => ({
      key: option,
      label: LABELS[option],
      description: LABELS[option],
    })),
    constraints: [],
    considerations: [
      {
        stableKey: "crisis:what-was-decided",
        optionKey: input.verdict === "sound" ? "praise" : "criticize",
        sourceType: "context:own-knowledge",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation:
          input.verdict === "sound"
            ? "Federal help was asked for when the damage called for it."
            : "Federal help was not asked for when the damage called for it.",
        sourceRefs: [],
      },
      ...(input.verdict === "failed"
        ? [
            {
              stableKey: "crisis:loyalty",
              optionKey: "defend",
              sourceType: "context:relationship" as const,
              direction: "supports" as const,
              importance: "moderate" as const,
              confidence: "medium" as const,
              explanation:
                input.role === "party"
                  ? "They belong to the same party."
                  : "They are family or share a home.",
              sourceRefs: [],
            },
          ]
        : []),
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  const reaction = (evaluation.selectedOptionKey ?? "no-action") as Reaction;
  if (reaction === "no-action") return next;
  const reader = personName(next.people[input.readerId]!);
  const subject = personName(next.people[input.personId]!);
  const summary =
    reaction === "praise"
      ? `${reader} spoke well of how ${subject} handled the disaster.`
      : reaction === "criticize"
        ? `${reader} criticized how ${subject} handled the disaster.`
        : `${reader} defended how ${subject} handled the disaster.`;
  next = recordWorldEvent(next, {
    stableKey: `${key}:event`,
    type: `crisis.handling-${reaction}`,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: input.event.jurisdictionId,
    involvedEntityIds: [input.readerId, input.personId],
    participants: [
      {
        personId: input.readerId,
        role: `agency:${input.role}-responder`,
        detail: LABELS[reaction],
      },
      {
        personId: input.personId,
        role: "focus:decision-maker",
        detail: "Made the decision",
      },
    ],
    personFactConstraints: [],
    // A party organizer speaks in public; family says it to them.
    visibility: input.role === "party" ? "public" : "limited",
    tags: [
      UNRESEARCHED_DISASTER_HANDLING.version,
      `crisis.handling:${input.verdict}`,
      "time-neutral",
    ],
    summary,
    context: {
      location: null,
      socialContext: input.event.summary,
      pressure: null,
      choice: reaction,
      motivation: null,
      immediateReaction: null,
    },
  });
  const reacted = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${key}:subject-knows`,
    personId: input.personId,
    eventId: reacted.id,
    learnedAt: next.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return recordRelationshipInteraction(next, {
    stableKey: `${key}:relationship`,
    personIds: [input.readerId, input.personId],
    eventId: reacted.id,
    occurredAt: next.currentDate,
    kind: `exchange:disaster-handling-${reaction}`,
    change: reaction === "criticize" ? "strained" : "maintained",
    significance: reaction === "criticize" ? "meaningful" : "minor",
    summary,
    tags: ["crisis.handling-reaction"],
  });
}
