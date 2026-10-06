import "./scene-conversation.css";
import { useMemo, useState } from "react";
import {
  personName,
  type EntityId,
  type World,
  type FutureTransitionHandlerRegistry,
} from "../simulation";
import { projectPlayedSceneExchange } from "../presentation/scene-conversation";
import { commitPlayedSceneTurn } from "../presentation/life-conversation";
import { recordedRoomPresence } from "../presentation/recorded-room-presence";
import type { ConversationAddressee } from "../presentation/run-b-conversation";
import type { ConversationSubjectKey } from "../presentation/run-b-conversation-progress";
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
  const scene = useMemo(
    () =>
      addressee === "everyone"
        ? null
        : projectPlayedSceneExchange(world, playerPersonId, addressee),
    [world, playerPersonId, addressee],
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
  if (!scene)
    return (
      <section
        className="pg-talk"
        aria-label="Scene"
        data-testid="scene-conversation"
      >
        <p>This person is no longer here with you.</p>
        <button type="button" onClick={onBack}>
          Return to the room
        </button>
      </section>
    );
  const turn = history === null ? turns.at(-1) : turns[history];
  const choices = scene.replies.filter((reply) =>
    lying
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
        error instanceof Error
          ? error.message
          : "This exchange is no longer current.",
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
        <ConversationScales
          available
          active={lying}
          onToggle={() => setLying((value) => !value)}
        />
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
          {lying &&
          !choices.some((reply) => reply.primitive === "deny-record") ? (
            <p>You have no known fact to deny in this exchange.</p>
          ) : null}
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

/** Lie stays present; selection changes wording, never listener knowledge. */
export function ConversationScales({
  active,
  onToggle,
}: {
  readonly available: boolean;
  readonly active: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="pg-talk-lie-toggle"
      data-testid="talk-lie-toggle"
      aria-label="Show knowingly false replies"
      aria-pressed={active}
      title="Show knowingly false replies"
      onClick={onToggle}
    >
      <img
        src={
          active ? "/ui/kit12/scales-tipped.svg" : "/ui/kit12/scales-level.svg"
        }
        width={34}
        height={34}
        alt=""
        aria-hidden="true"
      />
    </button>
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
