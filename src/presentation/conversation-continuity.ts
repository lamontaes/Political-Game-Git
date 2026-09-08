import type { EntityId, World } from "../simulation";
import {
  advanceHouseholdObligation,
  advanceNeighborhoodMeeting,
  advanceSchoolProject,
  conversationCommitContract,
} from "./conversation-subjects";
import {
  createHouseholdObligationProgress,
  createNeighborhoodMeetingProgress,
  createSchoolProjectProgress,
  isHouseholdObligationConversationProgress,
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

/** The initial state of each subject, before anything has been said. */
function openingProgress(
  subject: ConversationSubjectKey,
): ConversationProgress | null {
  switch (subject) {
    case "household-obligation":
      return createHouseholdObligationProgress();
    case "school-project-share":
      return createSchoolProjectProgress();
    case "neighborhood-meeting-notice":
      return createNeighborhoodMeetingProgress();
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
  if (isHouseholdObligationConversationProgress(progress)) {
    return advanceHouseholdObligation(progress, turn.intent, turn.outcome);
  }
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
  const opening = openingProgress(subject);
  if (!opening) return [];
  const contract = conversationCommitContract(opening);
  return world.history.events
    .filter(
      (event) =>
        event.type === contract.eventType &&
        event.tags.includes(contract.subjectTag) &&
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
  let progress = openingProgress(subject);
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
  const opening = openingProgress(subject);
  if (!opening) return null;
  const contract = conversationCommitContract(opening);
  const turns = world.history.events
    .filter(
      (event) =>
        event.type === contract.eventType &&
        event.tags.includes(contract.subjectTag) &&
        event.involvedEntityIds.includes(personId) &&
        event.occurredAt === world.currentDate,
    )
    .sort((left, right) => left.sequence - right.sequence);
  return turns[0]?.sequence ?? null;
}
