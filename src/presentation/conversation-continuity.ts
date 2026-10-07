import {
  currentLifeCutoff,
  kinshipRelationshipsAt,
  recordedWorkOverlapIntervals,
  workRelationshipHistoryForPerson,
} from "../simulation/life-queries";
import { recordsByKey } from "../simulation/history-index";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  activeSceneBinding,
  familyOfSubject,
  isContextualSceneSubject,
  replaySceneProgress,
  sceneTurnTag,
} from "./contextual-scenes";
import {
  contextualSceneContract,
  advanceNeighborhoodMeeting,
  advanceSchoolProject,
  conversationCommitContract,
  conversationCommitContractForSubject,
} from "./conversation-subjects";
import {
  createLifeTalkProgress,
  createNeighborhoodMeetingProgress,
  isNeighborhoodMeetingConversationProgress,
  isSchoolProjectConversationProgress,
} from "./run-b-conversation-progress";
import type {
  ConversationProgress,
  ConversationSubjectKey,
} from "./run-b-conversation-progress";
import type { ConversationOutcome } from "./conversation-consequences";

/**
 * Where a conversation had actually got to.
 *
 * Progress used to live in React state, so closing the screen and reopening it
 * — or saving, reloading and continuing — put the player back at turn one of a
 * conversation the world had already recorded them finishing. The obligation
 * reopened; the question got asked again; the record and the screen disagreed
 * about what had happened.
 *
 * There is no second store here. Every turn already writes a canonical event
 * carrying the subject it belongs to and the intent that was chosen, so the
 * state is not remembered at all — it is derived, by replaying those intents
 * through the same subject logic that produced them. A world that has the
 * history has the progress, which is what makes reload work rather than a
 * separate thing that has to be kept in step.
 */

/** The fixed vocabulary a subject's turns are recorded in. */
function subjectContract(subject: ConversationSubjectKey) {
  if (isContextualSceneSubject(subject)) {
    return contextualSceneContract(subject);
  }
  if (subject === "school-project-share")
    return conversationCommitContractForSubject(subject);
  const opening = openingProgress(subject);
  return opening ? conversationCommitContract(opening) : null;
}

/**
 * For a contextual subject, the tag of the scene currently offered: its turns
 * are that scene's, not every scene the family ever had. `false` when the
 * family has no scene now; `null` for every other subject.
 */
function contextualSceneTag(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
): string | null | false {
  if (!isContextualSceneSubject(subject)) return null;
  const bound = activeSceneBinding(world, personId, familyOfSubject(subject));
  return bound ? sceneTurnTag(bound.eventId) : false;
}

/** The initial state of each subject, before anything has been said. */
function openingProgress(
  subject: ConversationSubjectKey,
  world?: World,
): ConversationProgress | null {
  switch (subject) {
    case "school-project-share":
      // Historical turns remain readable, but do not invent an assignment
      // to reopen a topic unsupported by current saved records.
      return null;
    case "neighborhood-meeting-notice":
      return createNeighborhoodMeetingProgress(world);
    case "life-talk":
      return createLifeTalkProgress();
    default:
      // The office and legislative families carry richer opening state that is
      // built by their own fixtures; nothing here invents it for them.
      return null;
  }
}

function advance(
  progress: ConversationProgress,
  turn: RecordedConversationTurn,
): ConversationProgress {
  if (isSchoolProjectConversationProgress(progress)) {
    return advanceSchoolProject(progress, turn.intent, turn.outcome);
  }
  if (isNeighborhoodMeetingConversationProgress(progress)) {
    return advanceNeighborhoodMeeting(progress, turn.intent, turn.outcome);
  }
  return progress;
}

const INTENT_TAG_PREFIX = "conversation.intent.";
const OUTCOME_TAG_PREFIX = "conversation.outcome.";
const SESSION_TAG_PREFIX = "conversation.session.";

/** One recorded turn, as the record itself describes it. */
export interface RecordedConversationTurn {
  readonly eventId: EntityId;
  readonly sessionKey: string | null;
  readonly intent: string;
  /**
   * How it landed.
   *
   * Older records predate the outcome tag and cannot say. `continued` is the
   * reading that changes nothing about how a turn advances, so a save written
   * before the tag existed replays exactly as it did then.
   */
  readonly outcome: ConversationOutcome;
}

/**
 * The turns already recorded for this subject, in the order they happened.
 *
 * Read from canonical history by the event type and subject tag the subject
 * itself declares, so a subject that changes its vocabulary does not need this
 * module edited.
 */
export function recordedConversationTurns(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
): readonly RecordedConversationTurn[] {
  const contract = subjectContract(subject);
  if (!contract) return [];
  const sceneTag = contextualSceneTag(world, personId, subject);
  if (sceneTag === false) return [];
  return world.history.events
    .filter(
      (event) =>
        event.type === contract.eventType &&
        event.tags.includes(contract.subjectTag) &&
        (sceneTag === null || event.tags.includes(sceneTag)) &&
        event.involvedEntityIds.includes(personId),
    )
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((event) => {
      const intentTag = event.tags.find((candidate) =>
        candidate.startsWith(INTENT_TAG_PREFIX),
      );
      if (!intentTag) return [];
      const outcomeTag = event.tags.find((candidate) =>
        candidate.startsWith(OUTCOME_TAG_PREFIX),
      );
      const sessionTag = event.tags.find((candidate) =>
        candidate.startsWith(SESSION_TAG_PREFIX),
      );
      return [
        {
          eventId: event.id,
          sessionKey: sessionTag
            ? sessionTag.slice(SESSION_TAG_PREFIX.length)
            : null,
          intent: intentTag.slice(INTENT_TAG_PREFIX.length),
          outcome: (outcomeTag
            ? outcomeTag.slice(OUTCOME_TAG_PREFIX.length)
            : "continued") as ConversationOutcome,
        },
      ];
    });
}

/** The intents alone, for callers that only need to count turns. */
export function recordedConversationIntents(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
): readonly string[] {
  return recordedConversationTurns(world, personId, subject).map(
    (turn) => turn.intent,
  );
}

/**
 * The conversation as the world left it.
 *
 * Returns the opening state when nothing has been said yet, so a caller does
 * not have to know the difference between "not started" and "not saved".
 */
export function conversationProgressFromHistory(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
): ConversationProgress | null {
  if (isContextualSceneSubject(subject)) {
    // A contextual scene's progress belongs to its saved binding, and is
    // replayed from that binding's own turns.
    const bound = activeSceneBinding(world, personId, familyOfSubject(subject));
    return bound ? replaySceneProgress(world, bound) : null;
  }
  let progress = openingProgress(subject, world);
  if (!progress) return null;
  for (const turn of recordedConversationTurns(world, personId, subject)) {
    try {
      progress = advance(progress, turn);
    } catch {
      // An intent this subject no longer offers is history that cannot be
      // replayed. The conversation stops where it stopped making sense rather
      // than throwing away the save.
      break;
    }
  }
  return progress;
}

/**
 * Whether this conversation is over.
 *
 * Asked of the world rather than of a turn counter, so a settled obligation
 * stays settled across a reload instead of being offered again from the top.
 */
export function conversationSettled(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
): boolean {
  const progress = conversationProgressFromHistory(world, personId, subject);
  if (!progress) return false;
  return "phase" in progress && progress.phase === "settled";
}

/**
 * Where the conversation currently in progress began.
 *
 * A session descriptor keys itself off the history frontier at the moment it is
 * built, which is correct for opening a conversation and wrong for continuing
 * one: rebuilt after every turn, it produced a new session key each time, and
 * five turns of one exchange claimed to be five separate conversations. Any
 * surface that groups by session — the journal does — then showed five entries
 * for one evening.
 *
 * The frontier a continuing session needs is the one its first turn was written
 * at, which is exactly that turn's own sequence. Returns null when there is
 * nothing in progress, or when the last turn was on an earlier day: a
 * conversation resumed a week later is a new conversation, and saying otherwise
 * would put two evenings under one heading.
 */
export function openConversationSessionStart(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
): number | null {
  const contract = subjectContract(subject);
  if (!contract) return null;
  const sceneTag = contextualSceneTag(world, personId, subject);
  if (sceneTag === false) return null;
  const turns = world.history.events
    .filter(
      (event) =>
        event.type === contract.eventType &&
        event.tags.includes(contract.subjectTag) &&
        (sceneTag === null || event.tags.includes(sceneTag)) &&
        event.involvedEntityIds.includes(personId) &&
        event.occurredAt === world.currentDate,
    )
    .sort((left, right) => left.sequence - right.sequence);
  return turns[0]?.sequence ?? null;
}

export type RecognitionReason =
  | {
      readonly kind: "family";
      readonly relationshipKind: string;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly kind: "past-work";
      readonly organizationId: EntityId;
      readonly startedAt: IsoDate;
      readonly endedAt: IsoDate | null;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly kind: "shared-event";
      readonly occurredAt: IsoDate;
      readonly sourceRecordIds: readonly EntityId[];
    };

/** Historical recognition is evidence, never friendship, attendance or law knowledge.
 * The same query works for any recorded pair, including a clerk and a parent. */
export function recognizes(
  world: World,
  aId: EntityId,
  bId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly RecognitionReason[] {
  if (
    aId === bId ||
    !world.people[aId] ||
    !world.people[bId] ||
    asOf > world.currentDate
  )
    return [];
  const cutoff = { ...currentLifeCutoff(world), asOfDate: asOf };
  const reasons: RecognitionReason[] = [];
  for (const family of kinshipRelationshipsAt(world, aId, cutoff)) {
    if (family.personIds.includes(bId))
      reasons.push({
        kind: "family",
        relationshipKind: family.kind,
        sourceRecordIds: [family.id],
      });
  }
  const leftWork = workRelationshipHistoryForPerson(world, aId, cutoff);
  const rightWork = workRelationshipHistoryForPerson(world, bId, cutoff);
  for (const left of leftWork) {
    if (!left.organizationId) continue;
    for (const right of rightWork) {
      for (const interval of recordedWorkOverlapIntervals(
        world,
        left,
        right,
        cutoff,
      )) {
        reasons.push({
          kind: "past-work",
          organizationId: left.organizationId,
          ...interval,
        });
      }
    }
  }
  for (const event of recordsByKey(
    world.history.events,
    "scene-recognition:participants",
    (row) => row.participants.map((person) => person.personId),
    aId,
  )) {
    if (
      event.sequence >= cutoff.historySequenceExclusive ||
      event.occurredAt > asOf ||
      event.recordedAt > asOf
    )
      continue;
    const actualRole = (id: EntityId) =>
      event.participants.some(
        (person) =>
          person.personId === id &&
          /^(?:presence:participant|agency:|coordination:)/.test(person.role),
      );
    if (actualRole(aId) && actualRole(bId))
      reasons.push({
        kind: "shared-event",
        occurredAt: event.occurredAt,
        sourceRecordIds: [event.id],
      });
  }
  return reasons;
}
