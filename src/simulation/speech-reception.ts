import { campaignForContest } from "./campaign-queries";
import { evaluateDecision } from "./decisions";
import { recordById, recordsByStringField } from "./history-index";
import {
  activePartnershipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  workStatusAt,
} from "./life-queries";
import { personName } from "./people";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordEventKnowledge } from "./records";
import { relationshipHistory } from "./queries";
import { readRelationshipStanding } from "./relationship-standing";
import { recordWorldEvent } from "./world";
import { ensureSpeechRetellingSchedule } from "./speech-retelling";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  HistoricalEvent,
  World,
} from "./types";

/**
 * Who heard a speech, and how they took it (design D-3, steps 4 and 5).
 *
 * A speech is heard by people who were actually there, never by a crowd the
 * game makes up. Each witness learns of it firsthand, and each decides for
 * themselves how to react, through the same decision machinery people use
 * for anything else: how they stand with the speaker, what kind of person
 * they are, and what the moment was. Their answers are added up into the
 * room's response, which is recorded. No share of any audience is set to
 * cheer.
 */

export const SPEECH_RECEPTION_EVENT = "speech.reception";
export const SPEECH_OF_TAG = "speech.of:";
export const SPEECH_REACTIONS_TAG = "speech.reactions.v1:";

export const SPEECH_REACTIONS = [
  "cheered",
  "applauded",
  "stayed-quiet",
] as const;
export type SpeechReaction = (typeof SPEECH_REACTIONS)[number];

export type SpeechReactionCounts = Readonly<Record<SpeechReaction, number>>;

const BAND_IMPORTANCE: Readonly<Record<string, DecisionImportance>> = {
  slight: "slight",
  marked: "moderate",
  strong: "strong",
};

/** The people this person lives with now, from the household record. */
export function householdmatesOf(world: World, personId: EntityId): EntityId[] {
  const ids = new Set<EntityId>();
  for (const { household } of householdMembershipsAt(world, personId))
    for (const other of recordsByStringField(
      world.history.householdMemberships,
      "householdId",
      household.id,
    ))
      if (
        other.personId !== personId &&
        householdMembershipsAt(world, other.personId).some(
          (active) => active.household.id === household.id,
        )
      )
        ids.add(other.personId);
  return [...ids].sort();
}

/**
 * Family and close friends who live in the same place as the speaker: their
 * parents, children, brothers and sisters, partner, and anyone whose recorded
 * warmth toward them is marked or strong. These are people the records
 * already hold, so a room is never filled with people the game makes up.
 */
export function familyAndFriendsNearby(
  world: World,
  speakerId: EntityId,
): EntityId[] {
  const home = world.people[speakerId]?.homeJurisdictionId;
  if (!home) return [];
  const ids = new Set<EntityId>();
  for (const kinship of kinshipRelationshipsAt(world, speakerId))
    if (
      kinship.kind === "lineal:parent-child" ||
      kinship.kind === "collateral:sibling"
    )
      ids.add(kinship.personIds.find((id) => id !== speakerId)!);
  for (const partnership of activePartnershipsAt(world, speakerId))
    for (const id of partnership.personIds) if (id !== speakerId) ids.add(id);
  const reviewed = new Set<EntityId>();
  // The speaker's own interactions, from the per-person grouping.
  for (const interaction of relationshipHistory(world, speakerId)) {
    const other = interaction.personIds.find((id) => id !== speakerId);
    if (!other || ids.has(other) || reviewed.has(other)) continue;
    reviewed.add(other);
    const warmth = readRelationshipStanding(world, other, speakerId).readings
      .warmth;
    if (
      !warmth.adverse &&
      (warmth.band === "marked" || warmth.band === "strong")
    )
      ids.add(other);
  }
  return [...ids].filter((id) => world.people[id]?.homeJurisdictionId === home);
}

/**
 * Who was in the room on election night, from the record: the people who
 * live with the candidate, family and close friends from the same place, and
 * the campaign's own staff. Nobody else is placed there. A person who has
 * died or is the speaker is not a witness.
 */
export function electionNightWitnesses(
  world: World,
  speakerId: EntityId,
  contestId: EntityId,
): EntityId[] {
  const household = householdmatesOf(world, speakerId);
  const nearby = familyAndFriendsNearby(world, speakerId);
  const campaign = campaignForContest(world, contestId);
  const staff =
    campaign?.candidatePersonId === speakerId
      ? campaign.staffWorkRelationshipIds.flatMap((workId) => {
          const work = recordById(world.history.workRelationships, workId);
          return work && workStatusAt(world, work.id)?.status === "active"
            ? [work.personId]
            : [];
        })
      : [];
  return [...new Set([...household, ...nearby, ...staff])]
    .filter(
      (id) =>
        world.people[id] !== undefined &&
        !world.history.personDeaths.some(
          (death) => death.personId === id && death.diedAt <= world.currentDate,
        ),
    )
    .sort();
}

/** How one witness took a speech; the same reasons give the same answer. */
export function speechReactionOf(
  world: World,
  speech: HistoricalEvent,
  speakerId: EntityId,
  witnessId: EntityId,
  occasion: "victory" | "concession",
): SpeechReaction {
  const key = `${speech.stableKey}:reaction:${witnessId}`;
  const considerations: DecisionConsideration[] = [
    {
      stableKey: `${key}:came`,
      optionKey: "applauded",
      sourceType: "context:came-to-hear",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "They came to hear the speech.",
      sourceRefs: [],
    },
  ];
  if (occasion === "concession")
    considerations.push({
      stableKey: `${key}:lost`,
      optionKey: "stayed-quiet",
      sourceType: "context:race-lost",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "The race was lost.",
      sourceRefs: [],
    });
  const standing = readRelationshipStanding(world, witnessId, speakerId);
  const warmth = standing.readings.warmth;
  if (warmth.band !== "none" && warmth.basis.length > 0)
    considerations.push({
      stableKey: `${key}:warmth`,
      optionKey: warmth.adverse ? "stayed-quiet" : "cheered",
      sourceType: "social:warmth",
      direction: "supports",
      importance: BAND_IMPORTANCE[warmth.band] ?? "slight",
      confidence: "high",
      explanation: warmth.adverse
        ? "They have little warmth for the speaker."
        : "They are fond of the speaker.",
      sourceRefs: warmth.basis.slice(-2).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  const tension = standing.readings.tension;
  if (tension.band !== "none" && tension.basis.length > 0)
    considerations.push({
      stableKey: `${key}:tension`,
      optionKey: "stayed-quiet",
      sourceType: "social:tension",
      direction: "supports",
      importance: BAND_IMPORTANCE[tension.band] ?? "slight",
      confidence: "high",
      explanation: "Something between them has not been settled.",
      sourceRefs: tension.basis.slice(-2).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  considerations.push(
    ...traitConsiderations(world, witnessId, key, [
      {
        optionKey: "cheered",
        trait: "sociability",
        pole: "high",
        explanation: "They are outgoing and let it show.",
      },
      {
        optionKey: "applauded",
        trait: "sociability",
        pole: "low",
        explanation: "They are reserved, even when pleased.",
      },
    ]),
  );
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "speech.react",
    actorPersonId: witnessId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:speech", key: speech.id, entityId: null },
    options: [
      { key: "cheered", label: "Cheer", description: "Cheer out loud." },
      { key: "applauded", label: "Applaud", description: "Clap politely." },
      {
        key: "stayed-quiet",
        label: "Stay quiet",
        description: "Listen without joining in.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    // No draw (Rule 0): the reasons above decide. When they weigh exactly the
    // same, the engine takes the options in name order, so "applauded" wins a
    // tie. That order is a HARDWIRED rule, not a measured one.
    randomness: "none",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey as SpeechReaction;
}

/** How the room took a recorded speech, or null when nobody was there. */
export function speechReception(
  world: World,
  speech: HistoricalEvent,
): {
  readonly event: HistoricalEvent;
  readonly counts: SpeechReactionCounts;
} | null {
  const tag = `${SPEECH_OF_TAG}${speech.id}`;
  const event = recordsByStringField(
    world.history.events,
    "type",
    SPEECH_RECEPTION_EVENT,
  ).find((row) => row.tags.includes(tag));
  if (!event) return null;
  const counts = event.tags.find((row) => row.startsWith(SPEECH_REACTIONS_TAG));
  if (!counts) return null;
  try {
    return {
      event,
      counts: JSON.parse(counts.slice(SPEECH_REACTIONS_TAG.length)),
    };
  } catch {
    return null;
  }
}

/**
 * Record who heard a speech just given and how each of them took it. Each
 * witness learns of the speech firsthand; the room's response is one event
 * that names every witness and their reaction.
 */
export function recordSpeechReception(
  world: World,
  speech: HistoricalEvent,
  speakerId: EntityId,
  witnessIds: readonly EntityId[],
  occasion: "victory" | "concession",
): World {
  if (witnessIds.length === 0 || speechReception(world, speech)) return world;
  let next = ensurePeopleTraits(world, witnessIds);
  for (const witnessId of witnessIds)
    next = recordEventKnowledge(next, {
      stableKey: `${speech.stableKey}:heard:${witnessId}`,
      personId: witnessId,
      eventId: speech.id,
      learnedAt: next.currentDate,
      believedSummary: speech.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  const reactions = witnessIds.map((witnessId) => ({
    witnessId,
    reaction: speechReactionOf(next, speech, speakerId, witnessId, occasion),
  }));
  const counts: Record<SpeechReaction, number> = {
    cheered: 0,
    applauded: 0,
    "stayed-quiet": 0,
  };
  for (const row of reactions) counts[row.reaction] += 1;
  const speaker = next.people[speakerId]!;
  const described = SPEECH_REACTIONS.filter((reaction) => counts[reaction] > 0)
    .map(
      (reaction) =>
        `${counts[reaction]} ${reaction === "stayed-quiet" ? "stayed quiet" : reaction}`,
    )
    .join(", ");
  const received = recordWorldEvent(next, {
    stableKey: `${speech.stableKey}:reception`,
    type: SPEECH_RECEPTION_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: speech.jurisdictionId,
    involvedEntityIds: [speakerId, ...witnessIds],
    participants: [
      { personId: speakerId, role: "focus:subject", detail: "Gave the speech" },
      ...reactions.map((row) => ({
        personId: row.witnessId,
        role: "observation:witness" as const,
        detail:
          row.reaction === "stayed-quiet"
            ? "Heard it and stayed quiet"
            : `Heard it and ${row.reaction}`,
      })),
    ],
    personFactConstraints: [],
    visibility: speech.visibility,
    tags: [
      "speech.reception",
      `${SPEECH_OF_TAG}${speech.id}`,
      `${SPEECH_REACTIONS_TAG}${JSON.stringify(counts)}`,
    ],
    summary: `${witnessIds.length} ${witnessIds.length === 1 ? "person" : "people"} heard ${personName(speaker)}'s speech: ${described}.`,
    context: {
      location: speech.context.location,
      socialContext: speech.context.socialContext,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return ensureSpeechRetellingSchedule(received);
}
