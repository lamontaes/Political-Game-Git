import { useEffect, useRef } from "react";

import { personName, type World } from "../simulation";
import {
  availableConversationIntents,
  describeConversationHearing,
  openingConversationBeat,
  RUN_B_AUDIBILITY_OPTIONS,
  RUN_B_BRIEFING_CONTEXT,
  type ConversationAddressee,
  type ConversationIntent,
  type ConversationRoomContext,
} from "../presentation/run-b-conversation";
import type {
  RunBConversationAction,
  RunBConversationState,
} from "../presentation/run-b-conversation-state";
import type { RunBScenePersonContext } from "../presentation/run-b-fixture";

interface ConversationStripProps {
  readonly world: World;
  readonly room: ConversationRoomContext;
  readonly scenePeople: readonly RunBScenePersonContext[];
  readonly state: RunBConversationState;
  readonly dispatch: (action: RunBConversationAction) => void;
  readonly onCommit: (intent: ConversationIntent) => void;
}

export function ConversationStrip({
  world,
  room,
  scenePeople,
  state,
  dispatch,
  onCommit,
}: ConversationStripProps) {
  const firstIntentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.mode === "open" && state.committedTurnCount === 0) {
      firstIntentRef.current?.focus();
    }
  }, [state.mode, state.committedTurnCount]);

  if (!state.session || state.addressee === null) {
    return null;
  }

  const addresseeOptions: readonly {
    readonly key: ConversationAddressee;
    readonly label: string;
  }[] = [
    ...scenePeople.map((person) => ({
      key: person.personId,
      label: world.people[person.personId]?.familyName ?? "Colleague",
    })),
    { key: "everyone", label: "Everyone" },
  ];

  function switchAddressee(addressee: ConversationAddressee) {
    dispatch({
      type: "switch-addressee",
      addressee,
      openingBeat: openingConversationBeat(world, room, addressee),
    });
  }

  if (state.mode === "collapsed") {
    return (
      <aside
        className="conversation-strip conversation-strip--collapsed civic-glass"
        aria-label="Collapsed office conversation"
        data-testid="conversation-strip"
        data-conversation-mode="collapsed"
      >
        <div>
          <span>Conversation paused</span>
          <strong>{addresseeLabel(world, state.addressee)}</strong>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "toggle-collapsed" })}
        >
          Resume
        </button>
        <button
          type="button"
          className="conversation-icon-button"
          aria-label="Close conversation"
          onClick={() => dispatch({ type: "close" })}
        >
          ×
        </button>
      </aside>
    );
  }

  const hearingDescription = describeConversationHearing(
    world,
    room,
    state.addressee,
    state.audibility,
  );
  const hearingContext =
    !room.privateAvailable && room.privateUnavailableReason
      ? `${hearingDescription} ${room.privateUnavailableReason}`
      : hearingDescription;
  const listenAvailable =
    state.transcript.filter((entry) => entry.playerIntent === "Listen").length <
    2;
  const intents = availableConversationIntents(state.addressee, {
    listenAvailable,
  });
  const player = world.people[room.playerPersonId];
  if (!player) {
    throw new Error("Conversation player is missing from the current World.");
  }

  return (
    <aside
      className="conversation-strip civic-glass"
      aria-labelledby="conversation-strip-title"
      data-testid="conversation-strip"
      data-conversation-mode="open"
    >
      <header className="conversation-strip-header">
        <div>
          <p className="conversation-kicker">
            You — {personName(player)} · In the room
          </p>
          <h2 id="conversation-strip-title">Office conversation</h2>
        </div>
        <p className="conversation-topic-context">
          <strong>Briefing question ·</strong> {RUN_B_BRIEFING_CONTEXT}
        </p>
        <div className="conversation-window-actions">
          <button
            type="button"
            aria-label="Collapse conversation"
            onClick={() => dispatch({ type: "toggle-collapsed" })}
          >
            Collapse
          </button>
          <button
            type="button"
            className="conversation-icon-button"
            aria-label="Close conversation"
            onClick={() => dispatch({ type: "close" })}
          >
            ×
          </button>
        </div>
      </header>

      <div className="conversation-controls-row">
        <div
          className="conversation-segmented-control"
          role="group"
          aria-label="Current addressee"
        >
          {addresseeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={state.addressee === option.key}
              onClick={() => switchAddressee(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div
          className="conversation-segmented-control conversation-audibility"
          role="group"
          aria-label="Audibility"
        >
          {RUN_B_AUDIBILITY_OPTIONS.map((audibility) => (
            <button
              key={audibility}
              type="button"
              aria-pressed={state.audibility === audibility}
              disabled={audibility === "private" && !room.privateAvailable}
              aria-describedby={
                audibility === "private" && !room.privateAvailable
                  ? "conversation-hearing-context"
                  : undefined
              }
              onClick={() => dispatch({ type: "set-audibility", audibility })}
            >
              {audibility[0]!.toUpperCase() + audibility.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p
        id="conversation-hearing-context"
        className="conversation-hearing-context"
        data-testid="conversation-hearing-context"
      >
        {hearingContext}
      </p>

      <div className="conversation-beat" aria-live="polite">
        {state.currentBeat ? (
          <>
            <p>{state.currentBeat.speakerName}</p>
            <blockquote>{state.currentBeat.dialogue}</blockquote>
          </>
        ) : (
          <p className="conversation-room-narration">
            {state.currentRoomNarration}
          </p>
        )}
      </div>

      <div className="conversation-intents" aria-label="Response intents">
        {intents.map((intent, index) => (
          <button
            key={intent.key}
            ref={index === 0 ? firstIntentRef : undefined}
            type="button"
            onClick={() => onCommit(intent.key)}
          >
            <span>{intent.label}</span>
          </button>
        ))}
      </div>

      <div className="conversation-transcript-controls">
        <button
          type="button"
          aria-expanded={state.transcriptOpen}
          aria-controls="conversation-transcript"
          onClick={() => dispatch({ type: "toggle-transcript" })}
        >
          {state.transcriptOpen ? "Hide transcript" : "Show transcript"}
        </button>
        <span>
          {state.committedTurnCount === 0
            ? "No committed turns"
            : `${state.committedTurnCount} committed ${
                state.committedTurnCount === 1 ? "turn" : "turns"
              }`}
        </span>
      </div>
      {state.transcriptOpen ? (
        <div
          id="conversation-transcript"
          className="conversation-transcript"
          data-testid="conversation-transcript"
        >
          {state.transcript.length === 0 ? (
            <p>No substantive turns yet.</p>
          ) : (
            <ol>
              {state.transcript.map((entry) => (
                <li key={entry.ordinal} data-player-intent={entry.playerIntent}>
                  <span
                    className={
                      entry.playerIntent === "Listen"
                        ? "conversation-listen-action"
                        : undefined
                    }
                  >
                    {entry.playerActionDescription}
                  </span>
                  {entry.response ? (
                    <>
                      <strong>{entry.response.speakerName}</strong>
                      <p>{entry.response.dialogue}</p>
                    </>
                  ) : null}
                  {entry.roomNarration ? (
                    <p className="conversation-room-narration">
                      {entry.roomNarration}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function addresseeLabel(
  world: World,
  addressee: ConversationAddressee,
): string {
  if (addressee === "everyone") return "Everyone";
  return world.people[addressee]?.familyName ?? "Colleague";
}
