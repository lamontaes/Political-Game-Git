import type {
  ConversationAddressee,
  ConversationAudibility,
  ConversationDialogueBeat,
  ConversationPresentationResult,
  ConversationSessionDescriptor,
} from "./run-b-conversation";
import type { RunBConversationProgress } from "./run-b-conversation-progress";

export interface ConversationTranscriptEntry {
  readonly ordinal: number;
  readonly playerIntent: string;
  readonly playerActionDescription: string;
  readonly response: ConversationDialogueBeat | null;
  readonly roomNarration: string | null;
  readonly hearingDescription: string;
}

export interface RunBConversationState {
  readonly mode: "closed" | "open" | "collapsed";
  readonly session: ConversationSessionDescriptor | null;
  readonly progress: RunBConversationProgress | null;
  readonly addressee: ConversationAddressee | null;
  readonly audibility: ConversationAudibility;
  readonly transcriptOpen: boolean;
  readonly transcriptCursor: number;
  readonly currentBeat: ConversationDialogueBeat | null;
  readonly currentRoomNarration: string | null;
  readonly committedTurnCount: number;
  readonly transcript: readonly ConversationTranscriptEntry[];
}

export type RunBConversationAction =
  | {
      readonly type: "open";
      readonly session: ConversationSessionDescriptor;
      readonly progress: RunBConversationProgress;
      readonly addressee: ConversationAddressee;
      readonly openingBeat: ConversationDialogueBeat;
    }
  | {
      readonly type: "switch-addressee";
      readonly addressee: ConversationAddressee;
      readonly openingBeat: ConversationDialogueBeat;
    }
  | {
      readonly type: "set-audibility";
      readonly audibility: ConversationAudibility;
    }
  | { readonly type: "toggle-transcript" }
  | { readonly type: "previous-transcript-entry" }
  | { readonly type: "next-transcript-entry" }
  | { readonly type: "toggle-collapsed" }
  | {
      readonly type: "apply-turn";
      readonly turnOrdinal: number;
      readonly progress: RunBConversationProgress;
      readonly presentation: ConversationPresentationResult;
    }
  | { readonly type: "close" };

export function createRunBConversationState(): RunBConversationState {
  return {
    mode: "closed",
    session: null,
    progress: null,
    addressee: null,
    audibility: "normal",
    transcriptOpen: false,
    transcriptCursor: 0,
    currentBeat: null,
    currentRoomNarration: null,
    committedTurnCount: 0,
    transcript: [],
  };
}

export function runBConversationReducer(
  state: RunBConversationState,
  action: RunBConversationAction,
): RunBConversationState {
  switch (action.type) {
    case "open":
      return {
        mode: "open",
        session: action.session,
        progress: action.progress,
        addressee: action.addressee,
        audibility: "normal",
        transcriptOpen: false,
        transcriptCursor: 0,
        currentBeat: action.openingBeat,
        currentRoomNarration: null,
        committedTurnCount: 0,
        transcript: [],
      };
    case "switch-addressee":
      return state.session
        ? {
            ...state,
            mode: "open",
            addressee: action.addressee,
            currentBeat: action.openingBeat,
            currentRoomNarration: null,
          }
        : state;
    case "set-audibility":
      return state.session
        ? { ...state, audibility: action.audibility }
        : state;
    case "toggle-transcript":
      return state.mode === "open"
        ? {
            ...state,
            transcriptOpen: !state.transcriptOpen,
            transcriptCursor:
              state.transcript.length === 0 ? 0 : state.transcript.length - 1,
          }
        : state;
    case "previous-transcript-entry":
      return state.transcriptOpen
        ? {
            ...state,
            transcriptCursor: Math.max(0, state.transcriptCursor - 1),
          }
        : state;
    case "next-transcript-entry":
      return state.transcriptOpen
        ? {
            ...state,
            transcriptCursor: Math.min(
              Math.max(0, state.transcript.length - 1),
              state.transcriptCursor + 1,
            ),
          }
        : state;
    case "toggle-collapsed":
      if (!state.session) return state;
      return {
        ...state,
        mode: state.mode === "collapsed" ? "open" : "collapsed",
        transcriptOpen: false,
      };
    case "apply-turn":
      if (
        state.mode !== "open" ||
        action.turnOrdinal !== state.committedTurnCount + 1
      ) {
        return state;
      }
      return {
        ...state,
        currentBeat: action.presentation.beat,
        currentRoomNarration: action.presentation.roomNarration,
        progress: action.progress,
        committedTurnCount: action.turnOrdinal,
        transcript: [
          ...state.transcript,
          {
            ordinal: action.turnOrdinal,
            playerIntent: action.presentation.playerIntentLabel,
            playerActionDescription:
              action.presentation.playerActionDescription,
            response: action.presentation.beat,
            roomNarration: action.presentation.roomNarration,
            hearingDescription: action.presentation.hearingDescription,
          },
        ],
      };
    case "close":
      return createRunBConversationState();
  }
}
