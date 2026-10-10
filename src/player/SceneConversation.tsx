import "./scene-conversation.css";
import { useMemo, useState } from "react";
import {
  personName,
  type EntityId,
  type World,
  type FutureTransitionHandlerRegistry,
} from "../simulation";
import { projectPlayedSceneExchange } from "../presentation/scene-conversation";
import {
  commitLifeConversation,
  commitPlayedSceneTurn,
  projectLifeConversation,
  type LifeTalkIntent,
} from "../presentation/life-conversation";
import { recordedRoomPresence } from "../presentation/recorded-room-presence";
import type { ConversationAddressee } from "../presentation/run-b-conversation";
import type { ConversationSubjectKey } from "../presentation/run-b-conversation-progress";
import { LieButton } from "./LieButton";
import { PersonPortrait } from "./PersonPortrait";

export const FAREWELL_INTENT = "leave";
export const FAREWELL_HOLD_MS = 1400;

/** Shared scene consumer. All offered words and participants come from records. */
export function SceneConversation({
  world,
  playerPersonId,
  addressee,
  onWorldChange,
  onChange,
  onBack,
}: {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly subject: ConversationSubjectKey;
  readonly addressee: ConversationAddressee;
  readonly onWorldChange: (world: World) => void;
  readonly onChange: (next: {
    readonly subject: ConversationSubjectKey;
    readonly addressee: ConversationAddressee;
  }) => void;
  readonly onBack: () => void;
  readonly presentPersonIds?: readonly EntityId[];
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [lying, setLying] = useState(false);
  const [history, setHistory] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /** Ordinary-talk choices the writer refused; hidden, never explained. */
  const [dropped, setDropped] = useState<readonly string[]>([]);
  const scene = useMemo(
    () =>
      addressee === "everyone"
        ? null
        : projectPlayedSceneExchange(world, playerPersonId, addressee),
    [world, playerPersonId, addressee],
  );
  /*
   * Ordinary talk with someone in the room (coworker, family at home) is the
   * life-talk writer, not a recorded played-scene exchange. Without this
   * branch a person the room shows could never be spoken to.
   */
  const life = useMemo(
    () =>
      scene || addressee === "everyone"
        ? null
        : projectLifeConversation(world, playerPersonId, addressee),
    [scene, world, playerPersonId, addressee],
  );
  const turns = useMemo(
    () =>
      world.history.events.filter(
        (event) =>
          event.type === "life.conversation" &&
          event.occurredAt <= world.currentDate &&
          event.recordedAt <= world.currentDate &&
          event.sequence < world.history.nextSequence &&
          event.participants.some(
            (person) => person.personId === playerPersonId,
          ) &&
          event.participants.some((person) => person.personId === addressee),
      ),
    [world, playerPersonId, addressee],
  );
  if (!scene && life && addressee !== "everyone") {
    const last = life.transcript.at(-1);
    const speak = (intent: LifeTalkIntent) => {
      try {
        const next = commitLifeConversation(world, {
          playerPersonId,
          personId: addressee,
          intent,
          revision: life.revision,
        });
        onWorldChange(next);
        if (intent === FAREWELL_INTENT) onBack();
      } catch {
        setDropped((rows) => [...rows, intent]);
      }
    };
    return (
      <section
        className="pg-talk"
        aria-label="Scene conversation"
        data-testid="scene-conversation"
        data-dropped-choices={dropped
          .map((key) => `life-talk:choice-unavailable:${key}`)
          .join(" ")}
      >
        <div className="pg-talk-head">
          <div className="pg-talk-faces">
            <PersonPortrait world={world} personId={addressee} size="small" />
          </div>
        </div>
        {last ? (
          <div data-testid="talk-exchange">
            <p className="pg-talk-you" data-testid="talk-you">
              {last.action}
            </p>
            <p className="pg-talk-line" data-testid="talk-reply">
              {last.reply}
            </p>
          </div>
        ) : null}
        <div className="pg-reply-row">
          {/* Ordinary talk offers no lie yet; the button keeps its place. */}
          <LieButton available={false} active={false} onToggle={() => {}} />
          <div className="pg-talk-choices">
            {life.intents
              .filter((option) => !dropped.includes(option.key))
              .map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="pg-talk-choice"
                  data-testid="life-talk-choice"
                  onClick={() => speak(option.key as LifeTalkIntent)}
                >
                  {option.label}
                </button>
              ))}
          </div>
        </div>
        <div className="pg-talk-controls">
          <button type="button" onClick={onBack}>
            Return to the room
          </button>
        </div>
      </section>
    );
  }
  if (!scene)
    return (
      <section
        className="pg-talk"
        aria-label="Scene"
        data-testid="scene-conversation"
      >
        <p data-problem="addressee-gone" />
        <button type="button" onClick={onBack}>
          Return to the room
        </button>
      </section>
    );
  const turn = history === null ? turns.at(-1) : turns[history];
  // A lie here is a recorded denial; with none offered the Lie button rests.
  const canLie = scene.replies.some(
    (reply) => reply.primitive === "deny-record",
  );
  const choices = scene.replies.filter((reply) =>
    lying && canLie
      ? reply.primitive === "deny-record" || reply.primitive === "depart"
      : reply.primitive !== "deny-record",
  );
  const say = (key: string) => {
    try {
      const next = commitPlayedSceneTurn(world, {
        playerPersonId,
        addresseePersonId: scene.addresseePersonId,
        replyKey: key,
        snapshot: scene.snapshot,
      });
      onWorldChange(next);
      setHistory(null);
      setFailure(null);
      if (
        scene.replies.find((reply) => reply.key === key)?.primitive === "depart"
      )
        onBack();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "exchange-not-current",
      );
    }
  };
  return (
    <section
      className="pg-talk"
      aria-label="Scene conversation"
      data-testid="scene-conversation"
      data-scene-presence={scene.presenceEventId}
    >
      <div className="pg-talk-head">
        <div className="pg-talk-faces">
          {scene.participantPersonIds
            .filter((id) => id !== playerPersonId)
            .map((id) => (
              <button
                key={id}
                type="button"
                className="pg-talk-face"
                aria-label={`Talk to ${personName(world.people[id]!)}`}
                aria-pressed={id === scene.addresseePersonId}
                data-speaking={id === scene.addresseePersonId}
                onClick={() => {
                  setHistory(null);
                  onChange({ subject: "life-talk", addressee: id });
                }}
              >
                <PersonPortrait world={world} personId={id} size="small" />
              </button>
            ))}
        </div>
        <strong>{personName(world.people[scene.addresseePersonId]!)}</strong>
      </div>
      {turn ? (
        <div data-testid="talk-exchange">
          <p className="pg-talk-you" data-testid="talk-you">
            {turn.context.choice}
          </p>
          {turn.context.immediateReaction ? (
            <p className="pg-talk-line" data-testid="talk-reply">
              {turn.context.immediateReaction}
            </p>
          ) : null}
        </div>
      ) : (
        scene.contributions
          .filter((line) => line.speakerPersonId === scene.addresseePersonId)
          .map((line) => (
            <p
              key={line.sourceEventId}
              className="pg-talk-line"
              data-testid="talk-reply"
            >
              {line.line.text}
            </p>
          ))
      )}
      {history === null ? (
        <div className="pg-reply-row">
          <LieButton
            available={canLie}
            active={lying}
            onToggle={() => setLying((value) => !value)}
          />
          <div className="pg-talk-choices">
            {choices.map((reply) => (
              <button
                key={reply.key}
                type="button"
                className="pg-talk-choice"
                data-testid="scene-record-reply"
                data-source-event={reply.sourceEventId}
                onClick={() => say(reply.key)}
              >
                {reply.line.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {failure ? <p role="status">{failure}</p> : null}
      <div className="pg-talk-controls">
        <button
          type="button"
          onClick={() =>
            setHistory(history === null ? Math.max(0, turns.length - 1) : null)
          }
          disabled={turns.length === 0}
        >
          History
        </button>
        {history !== null ? (
          <>
            <button
              type="button"
              disabled={history === 0}
              onClick={() =>
                setHistory((value) => Math.max(0, (value ?? 0) - 1))
              }
            >
              Earlier
            </button>
            <button
              type="button"
              disabled={history >= turns.length - 1}
              onClick={() =>
                setHistory((value) =>
                  Math.min(turns.length - 1, (value ?? 0) + 1),
                )
              }
            >
              Later
            </button>
          </>
        ) : null}
        <button type="button" onClick={onBack}>
          Return to the room
        </button>
      </div>
    </section>
  );
}

/** Actual present people only; selecting a name retains that exact addressee. */
export function ConversationStarters({
  world,
  personId,
  onStart,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly presentPersonIds: readonly EntityId[];
  readonly onStart: (
    addresseePersonId: EntityId,
    subject: ConversationSubjectKey,
  ) => void;
}) {
  const presence = recordedRoomPresence(world, personId);
  const people =
    presence?.personIds.filter(
      (id) =>
        id !== personId && projectPlayedSceneExchange(world, personId, id),
    ) ?? [];
  return people.length ? (
    <section aria-label="People here" data-testid="conversations">
      {people.map((id) => (
        <button
          type="button"
          key={id}
          className="ui-action ui-action--subtle"
          onClick={() => onStart(id, "life-talk")}
        >
          {personName(world.people[id]!)}
        </button>
      ))}
    </section>
  ) : null;
}
