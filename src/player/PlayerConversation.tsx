import { useMemo, useState } from "react";

import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../presentation/player-conversation";
import { commitConversationTurn } from "../presentation/run-b-conversation";
import type {
  ConversationAddressee,
  ConversationAudibility,
} from "../presentation/run-b-conversation";
import type { ConversationSubjectKey } from "../presentation/run-b-conversation-progress";
import type { EntityId, World } from "../simulation";

/**
 * Talking to somebody, on whatever the subject is.
 *
 * One surface for every conversation a life can have, rather than one component
 * per subject. The engine underneath has always been general — the same room,
 * the same hearing rules, the same commitment semantics — and the reason a
 * player could only ever have one conversation was that only one screen had
 * been written.
 *
 * Three things here were previously constants in the component and are now
 * choices the player makes: who is being spoken to, how loudly, and which
 * conversation. Each of them is a fact the record already carried and no
 * player could set.
 *
 * Nothing is remembered here that the world could be asked for. The turn
 * ordinal, the progress and whether the exchange is over all come from
 * canonical history, so closing this and reopening it — or saving, reloading
 * and continuing — puts a player back exactly where the world says they are.
 */
export function PlayerConversation({
  world,
  personId,
  subject,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly subject: ConversationSubjectKey;
  readonly onWorldChange: (world: World) => void;
}) {
  const [addressee, setAddressee] = useState<ConversationAddressee | null>(
    null,
  );
  const [audibility, setAudibility] =
    useState<ConversationAudibility>("normal");
  const [said, setSaid] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);

  const view = useMemo(
    () =>
      projectPlayerConversation(world, personId, subject, {
        addressee: addressee ?? undefined,
        audibility,
      }),
    [world, personId, subject, addressee, audibility],
  );

  if (!view) return null;

  return (
    <div
      className="game-conversation"
      data-testid={`conversation-${subject}`}
      data-audibility={view.audibility}
      data-addressee={String(view.addressee)}
    >
      <p className="game-band" data-testid="conversation-topic">
        {view.topicLabel}
      </p>
      <p className="game-note" data-testid="conversation-briefing">
        {view.briefing}
      </p>
      <p className="game-scene" data-testid="conversation-beat">
        {said ?? view.openingLine}
      </p>

      {view.settled ? (
        <p className="game-note" data-testid="conversation-closed">
          That is settled for now.
        </p>
      ) : (
        <>
          {view.addressees.length > 1 ? (
            <div
              className="game-conversation-controls"
              data-testid="conversation-addressees"
            >
              <span className="game-band">Who you are talking to</span>
              {view.addressees.map((choice) => (
                <button
                  key={String(choice.key)}
                  type="button"
                  className="game-choice-chip"
                  aria-pressed={choice.key === view.addressee}
                  data-selected={choice.key === view.addressee}
                  data-testid={`addressee-${String(choice.key)}`}
                  onClick={() => {
                    setAddressee(choice.key);
                    setSaid(null);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="game-conversation-controls"
            data-testid="conversation-audibility"
          >
            <span className="game-band">How you say it</span>
            {view.audibilities.map((choice) => (
              <button
                key={choice.key}
                type="button"
                className="game-choice-chip"
                aria-pressed={choice.key === view.audibility}
                data-selected={choice.key === view.audibility}
                data-testid={`audibility-${choice.key}`}
                disabled={!choice.available}
                title={choice.unavailableReason ?? choice.description}
                onClick={() => {
                  setAudibility(choice.key);
                  setSaid(null);
                }}
              >
                {choice.label}
              </button>
            ))}
          </div>

          {/*
            The room's own reason, rather than a control that is greyed out and
            explains nothing. A player who cannot say something privately is
            told what is stopping them.
          */}
          {view.audibilities.some(
            (choice) => !choice.available && choice.unavailableReason,
          ) ? (
            <p className="game-note" data-testid="audibility-unavailable">
              {
                view.audibilities.find(
                  (choice) => !choice.available && choice.unavailableReason,
                )!.unavailableReason
              }
            </p>
          ) : null}

          {view.listenerNames.length > 0 ? (
            <p className="game-note" data-testid="conversation-hearing">
              {view.listenerNames.join(" and ")}{" "}
              {view.listenerNames.length === 1 ? "hears" : "hear"} this.
            </p>
          ) : (
            <p className="game-note" data-testid="conversation-hearing">
              Nobody else hears this.
            </p>
          )}

          {trouble ? <p className="game-problem">{trouble}</p> : null}

          {view.intents.length > 0 ? (
            <div className="game-choices" data-testid="conversation-intents">
              {view.intents.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  data-testid={`intent-${option.key}`}
                  onClick={() => {
                    try {
                      const result = commitConversationTurn(world, {
                        session: view.session,
                        room: view.room,
                        progress: view.progress,
                        turnOrdinal: view.turnOrdinal,
                        addressee: view.addressee,
                        audibility: view.audibility,
                        intent: option.key,
                      });
                      onWorldChange(result.world);
                      setSaid(
                        result.presentation.beat?.dialogue ??
                          result.presentation.roomNarration,
                      );
                      setTrouble(null);
                    } catch (error) {
                      setTrouble(
                        error instanceof Error
                          ? error.message
                          : "That did not come out right.",
                      );
                    }
                  }}
                >
                  {option.label}
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="game-note" data-testid="conversation-closed">
              There is nothing more to say about it right now.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Every conversation this life can currently have.
 *
 * Which ones appear is decided by the world: a character with nobody at home
 * has no kitchen conversation, one who has left school has no corridor, and one
 * whose street the world has never populated has no doorstep. None of them is
 * announced as unavailable, because a list of conversations a player cannot
 * have is a list of things the game is not doing.
 */
export function PlayerConversations({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const available = useMemo(
    () => availablePlayerConversations(world, personId),
    [world, personId],
  );
  if (available.length === 0) return null;

  return (
    <div data-testid="conversations">
      {available.map((entry) => (
        <PlayerConversation
          key={entry.subject}
          world={world}
          personId={personId}
          subject={entry.subject}
          onWorldChange={onWorldChange}
        />
      ))}
    </div>
  );
}
