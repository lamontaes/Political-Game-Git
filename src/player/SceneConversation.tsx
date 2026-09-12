import "./scene-conversation.css";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../presentation/player-conversation";
import { formatMinute } from "../presentation/player-calendar";
import {
  commitConversationTurn,
  LISTEN_INTENT,
  type ConversationAddressee,
  type ConversationAudibility,
} from "../presentation/run-b-conversation";
import type { ConversationSubjectKey } from "../presentation/run-b-conversation-progress";
import {
  addresseeHeardTurn,
  conversationExchangeTurns,
  conversationHistoryPage,
  conversationRelationship,
  currentExchangeTurn,
  type ConversationExchangeTurn,
} from "../presentation/scene-conversation";
import { personName } from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";
import { PersonPortrait } from "./PersonPortrait";

/**
 * The conversation, as one box in the room.
 *
 * There used to be three ways to show talking to somebody: the scene panel's
 * own inline transcript (the last four exchanges, growing downward under the
 * scene's choices), the full conversation surface opened inside a person's
 * record, and every available conversation stacked one under another in
 * People. The owner met the first of these in the playtest — a list of "Say
 * hello / Hi again" pushing the actual choices out of a scrolling panel.
 *
 * This is the one surface they all open now, and it is the accepted Run B
 * shape: one bounded box that says who you are talking to and who they are to
 * you, their face when the game has one, what is being talked about, what was
 * just said, and what you can say next — with Back, and with earlier turns
 * paged inside the same box instead of piled beneath it.
 *
 * Nothing here decides what anybody says. The choices, the answers, who can
 * hear, whether Listen means anything and what an exchange costs in time all
 * come from the existing conversation engine and its subjects; this component
 * draws their answers and commits the player's choice through the same writer
 * the other surfaces used.
 */
export function SceneConversation({
  world,
  playerPersonId,
  subject,
  addressee,
  onWorldChange,
  onChange,
  onBack,
  transitionHandlers,
}: {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly subject: ConversationSubjectKey;
  /** Who the player is facing. A request: the projection corrects it. */
  readonly addressee: ConversationAddressee;
  readonly onWorldChange: (world: World) => void;
  /** Turning to somebody else, or to another subject with them. */
  readonly onChange: (next: {
    readonly subject: ConversationSubjectKey;
    readonly addressee: ConversationAddressee;
  }) => void;
  readonly onBack: () => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [audibility, setAudibility] =
    useState<ConversationAudibility>("normal");
  const [historyPage, setHistoryPage] = useState<number | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  /*
   * Changing mode replaces the control that was pressed, so focus is moved on
   * purpose: into the history when it opens, back to the control that opened
   * it when it closes. Without this a keyboard player is dropped onto the page
   * body and Escape no longer reaches the box.
   */
  const boxRef = useRef<HTMLElement>(null);
  const wasHistory = useRef(false);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const inHistory = historyPage !== null;
    if (inHistory && !wasHistory.current)
      box
        .querySelector<HTMLElement>('[data-testid="talk-history-close"]')
        ?.focus();
    if (!inHistory && wasHistory.current)
      box
        .querySelector<HTMLElement>('[data-testid="talk-history-open"]')
        ?.focus();
    wasHistory.current = inHistory;
  }, [historyPage]);

  const view = useMemo(
    () =>
      projectPlayerConversation(world, playerPersonId, subject, {
        addressee,
        audibility,
      }),
    [world, playerPersonId, subject, addressee, audibility],
  );
  const facing =
    view && view.addressee !== "everyone" ? (view.addressee as EntityId) : null;
  const turns = useMemo(
    () => conversationExchangeTurns(world, playerPersonId, subject, facing),
    [world, playerPersonId, subject, facing],
  );
  const otherTopics = useMemo(
    () =>
      facing === null
        ? []
        : availablePlayerConversations(world, playerPersonId).filter(
            (entry) =>
              entry.subject !== subject &&
              !entry.settled &&
              entry.room.eligibleAddresseePersonIds.includes(facing),
          ),
    [world, playerPersonId, subject, facing],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    if (historyPage !== null) setHistoryPage(null);
    else onBack();
  };

  /*
   * The person has gone, or the moment that held them has ended. Said, with
   * the way back, rather than an empty box or a quietly substituted stranger.
   */
  if (!view) {
    return (
      <section
        className="pg-talk"
        data-testid="scene-conversation"
        data-state="ended"
        aria-label="Conversation"
        onKeyDown={onKeyDown}
      >
        <p className="pg-talk-line" data-testid="conversation-closed">
          This conversation is over — there is nobody here to carry it on with.
        </p>
        <div className="pg-talk-foot">
          <button
            type="button"
            className="ui-action"
            data-testid="talk-back"
            onClick={onBack}
          >
            ← Back
          </button>
        </div>
      </section>
    );
  }

  const name =
    facing === null ? "Everyone here" : personName(world.people[facing]!);
  const relationship =
    facing === null
      ? null
      : conversationRelationship(world, playerPersonId, facing);
  const current = currentExchangeTurn(turns);
  const history = conversationHistoryPage(turns, historyPage ?? 0);
  const speech = view.intents.filter((option) => option.key !== LISTEN_INTENT);
  const listen = view.intents.find((option) => option.key === LISTEN_INTENT);
  /*
   * The person being spoken to hears it by definition; the line says who ELSE
   * does, which is the thing a volume choice changes.
   */
  const bystanders = view.listenerNames.filter((listener) => listener !== name);
  const privateReason = view.audibilities.find(
    (choice) => !choice.available && choice.unavailableReason,
  )?.unavailableReason;

  function say(intent: string) {
    const before = world.currentMoment;
    try {
      const result = commitConversationTurn(world, {
        session: view!.session,
        room: view!.room,
        progress: view!.progress,
        turnOrdinal: view!.turnOrdinal,
        addressee: view!.addressee,
        audibility: view!.audibility,
        intent,
        ...(transitionHandlers ? { transitionHandlers } : {}),
      });
      const after = result.world.currentMoment;
      setClock(
        after.date === before.date && after.minuteOfDay === before.minuteOfDay
          ? "No time passed."
          : after.date === before.date
            ? `${formatMinute(before.minuteOfDay)} → ${formatMinute(after.minuteOfDay)}`
            : `${formatMinute(before.minuteOfDay)} → ${formatMinute(after.minuteOfDay)}, ${after.date}`,
      );
      setTrouble(null);
      setHistoryPage(null);
      onWorldChange(result.world);
      // The pressed choice may not be offered next turn; keep the keyboard
      // inside the conversation rather than on the page body.
      requestAnimationFrame(() => {
        const box = boxRef.current;
        if (!box || box.contains(document.activeElement)) return;
        box
          .querySelector<HTMLElement>(
            '[data-testid="conversation-intents"] button, [data-testid="talk-back"]',
          )
          ?.focus();
      });
    } catch (error) {
      setTrouble(
        error instanceof Error ? error.message : "That did not come out right.",
      );
    }
  }

  return (
    <section
      className="pg-talk"
      data-testid={`conversation-${subject}`}
      data-state={historyPage === null ? "active" : "history"}
      data-audibility={view.audibility}
      data-addressee={String(view.addressee)}
      aria-label={`Conversation with ${name}`}
      ref={boxRef}
      onKeyDown={onKeyDown}
    >
      <header className="pg-talk-head">
        {facing !== null ? (
          <PersonPortrait world={world} personId={facing} size="large" />
        ) : null}
        <div className="pg-talk-who">
          <h2 className="pg-talk-name" data-testid="talk-name">
            {name}
          </h2>
          {relationship ? (
            <p className="pg-talk-relation" data-testid="talk-relationship">
              {relationship}
            </p>
          ) : null}
          <p className="pg-talk-topic" data-testid="conversation-topic">
            {view.topicLabel}
          </p>
        </div>
        <button
          type="button"
          className="ui-action ui-action--subtle pg-talk-back"
          data-testid="talk-back"
          onClick={onBack}
        >
          ← Back
        </button>
      </header>

      {/*
        What is on the table, in the subject's own words. Kept in view for the
        whole exchange rather than only at its opening, so a player who comes
        back to it mid-conversation still knows what it is about. The ordinary
        talk's briefing says nothing the header does not, so it is left out.
      */}
      {subject !== "life-talk" ? (
        <p className="pg-talk-context" data-testid="conversation-briefing">
          {view.briefing}
        </p>
      ) : null}

      {view.addressees.length > 1 ? (
        <div
          className="pg-talk-row"
          role="group"
          aria-label="Who you are talking to"
          data-testid="conversation-addressees"
        >
          {view.addressees.map((choice) => (
            <button
              key={String(choice.key)}
              type="button"
              className="pg-talk-chip"
              aria-pressed={choice.key === view.addressee}
              data-selected={choice.key === view.addressee}
              data-testid={`addressee-${String(choice.key)}`}
              onClick={() => {
                setHistoryPage(null);
                onChange({ subject, addressee: choice.key });
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : null}

      {historyPage === null ? (
        <>
          <div
            className="pg-talk-beat"
            data-testid="conversation-beat"
            aria-live="polite"
          >
            {current ? (
              <ExchangeTurn turn={current} />
            ) : (
              <p className="pg-talk-line">{view.openingLine}</p>
            )}
            {current && facing !== null ? (
              <HeardNote turn={current} facing={facing} facingName={name} />
            ) : null}
            {clock ? (
              <p
                className="pg-talk-clock"
                role="status"
                data-testid="talk-clock"
              >
                {clock}
              </p>
            ) : null}
          </div>

          {trouble ? (
            <p className="pg-talk-trouble" role="alert">
              {trouble}
            </p>
          ) : null}

          {view.settled ? (
            <p className="pg-talk-note" data-testid="conversation-closed">
              That is settled for now.
            </p>
          ) : speech.length > 0 ? (
            <div
              className="pg-talk-choices"
              role="group"
              aria-label="What you say"
              data-testid="conversation-intents"
            >
              {speech.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="pg-talk-choice"
                  data-testid={`intent-${option.key}`}
                  title={
                    option.description !== option.label
                      ? option.description
                      : undefined
                  }
                  onClick={() => say(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="pg-talk-note" data-testid="conversation-closed">
              There is nothing more to say about it right now.
            </p>
          )}

          <div className="pg-talk-foot">
            {/*
              Listen is offered only while the conversation says somebody still
              has something to add. It is not counted and it is not capped: the
              subject's own state decides, so it disappears once the room has
              nothing left, and comes back when something new is said.
            */}
            {listen && !view.settled ? (
              <button
                type="button"
                className="pg-talk-chip pg-talk-listen"
                data-testid="talk-listen"
                title={listen.description}
                onClick={() => say(LISTEN_INTENT)}
              >
                {listen.label}
              </button>
            ) : null}
            {!view.settled ? (
              <div
                className="pg-talk-row pg-talk-volume"
                role="group"
                aria-label="How you say it"
                data-testid="conversation-audibility"
              >
                {view.audibilities.map((choice) => (
                  <button
                    key={choice.key}
                    type="button"
                    className="pg-talk-chip pg-talk-chip--small"
                    aria-pressed={choice.key === view.audibility}
                    data-selected={choice.key === view.audibility}
                    data-testid={`audibility-${choice.key}`}
                    disabled={!choice.available}
                    title={choice.unavailableReason ?? choice.description}
                    aria-describedby={
                      !choice.available && choice.unavailableReason
                        ? "pg-talk-private-reason"
                        : undefined
                    }
                    onClick={() => setAudibility(choice.key)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : null}
            {otherTopics.map((entry) => (
              <button
                key={entry.subject}
                type="button"
                className="pg-talk-chip"
                data-testid={`talk-topic-${entry.subject}`}
                onClick={() => {
                  setHistoryPage(null);
                  setClock(null);
                  onChange({
                    subject: entry.subject,
                    addressee: facing ?? view.addressee,
                  });
                }}
              >
                Bring up: {entry.topicLabel}
              </button>
            ))}
            {history.count > 0 ? (
              <button
                type="button"
                className="pg-talk-chip"
                data-testid="talk-history-open"
                onClick={() => setHistoryPage(0)}
              >
                Earlier ({turns.length - (current ? 1 : 0)})
              </button>
            ) : null}
          </div>

          {/*
            Who else hears it, what talking costs, and why a volume is closed —
            one quiet line, so the box keeps its height.
          */}
          {!view.settled ? (
            <p className="pg-talk-hearing">
              <span data-testid="conversation-hearing">
                {bystanders.length > 0
                  ? `${bystanders.join(" and ")} ${
                      bystanders.length === 1 ? "hears" : "hear"
                    } this too.`
                  : "Nobody else hears this."}
                {subject === "life-talk"
                  ? " Each exchange takes 2 minutes; spending time together takes 30."
                  : ""}
              </span>
              {privateReason ? (
                <>
                  {" "}
                  <span
                    id="pg-talk-private-reason"
                    data-testid="audibility-unavailable"
                  >
                    {privateReason}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </>
      ) : (
        <div className="pg-talk-history" data-testid="talk-history">
          <p className="pg-talk-context">
            Earlier in this conversation · {history.count - history.index} of{" "}
            {history.count}
          </p>
          <ol className="pg-talk-history-list">
            {history.turns.map((turn) => (
              <li key={turn.eventId}>
                <ExchangeTurn
                  turn={turn}
                  dateLabel={
                    turn.date === world.currentDate ? null : String(turn.date)
                  }
                />
              </li>
            ))}
          </ol>
          <div className="pg-talk-foot">
            <button
              type="button"
              className="pg-talk-chip"
              data-testid="talk-history-older"
              disabled={history.index >= history.count - 1}
              onClick={() => setHistoryPage(history.index + 1)}
            >
              ← Earlier
            </button>
            <button
              type="button"
              className="pg-talk-chip"
              data-testid="talk-history-newer"
              disabled={history.index === 0}
              onClick={() => setHistoryPage(history.index - 1)}
            >
              Later →
            </button>
            <button
              type="button"
              className="ui-action"
              data-testid="talk-history-close"
              onClick={() => setHistoryPage(null)}
            >
              Back to the conversation
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** One exchange: what the player did, then what came back. */
function ExchangeTurn({
  turn,
  dateLabel = null,
}: {
  readonly turn: ConversationExchangeTurn;
  readonly dateLabel?: string | null;
}) {
  const reply = turn.reply.trim();
  const quoted =
    turn.speakerPersonId !== null && reply.length > 0 && !/^[“"]/.test(reply);
  return (
    <>
      {turn.playerLine ? (
        <p className="pg-talk-you" data-testid="talk-you">
          {dateLabel ? (
            <span className="pg-talk-date">{dateLabel} · </span>
          ) : null}
          {turn.playerLine}
        </p>
      ) : null}
      {reply.length > 0 ? (
        <p className="pg-talk-line" data-testid="talk-reply">
          {turn.speakerName && quoted ? (
            <strong className="pg-talk-speaker">{turn.speakerName}: </strong>
          ) : null}
          {quoted ? `“${reply}”` : reply}
        </p>
      ) : null}
    </>
  );
}

/**
 * What the person now being faced knows of the last thing said.
 *
 * Only shown when it is somebody other than the one who answered: turning to
 * a second person carries the conversation on, and whether they were there to
 * hear it is the record's answer, not an assumption.
 */
function HeardNote({
  turn,
  facing,
  facingName,
}: {
  readonly turn: ConversationExchangeTurn;
  readonly facing: EntityId;
  readonly facingName: string;
}) {
  const heard = addresseeHeardTurn(turn, facing);
  if (heard === "answered") return null;
  return (
    <p className="pg-talk-note" data-testid="talk-heard">
      {heard === "heard"
        ? `${facingName} was there and heard that.`
        : `${facingName} did not hear that.`}
    </p>
  );
}

/**
 * The conversations this life can start right now, as starting points.
 *
 * Which ones appear is the world's answer, exactly as before: a character with
 * nobody at home has no kitchen conversation, one who has left school has no
 * corridor. What changed is that this list no longer draws every conversation
 * in full. Choosing one opens it in the conversation box in the room.
 */
export function ConversationStarters({
  world,
  personId,
  onStart,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onStart: (
    addresseePersonId: EntityId,
    subject: ConversationSubjectKey,
  ) => void;
}) {
  const available = useMemo(
    () =>
      availablePlayerConversations(world, personId).filter(
        (entry) => entry.room.eligibleAddresseePersonIds.length > 0,
      ),
    [world, personId],
  );
  if (available.length === 0) return null;
  return (
    <section
      className="pg-personal-section pg-talk-starters"
      aria-labelledby="pg-talk-starters-heading"
      data-testid="conversations"
    >
      <h3 id="pg-talk-starters-heading">Talk to somebody here</h3>
      <ul>
        {available.map((entry) => {
          const first = entry.room.eligibleAddresseePersonIds[0]!;
          const names = entry.room.eligibleAddresseePersonIds
            .map((id) => personName(world.people[id]!))
            .join(", ");
          return (
            <li key={entry.subject}>
              <button
                type="button"
                className="ui-action ui-action--subtle"
                data-testid={`conversation-start-${entry.subject}`}
                onClick={() => onStart(first, entry.subject)}
              >
                {entry.topicLabel}
                <small>
                  {names}
                  {entry.settled ? " · settled for now" : ""}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
