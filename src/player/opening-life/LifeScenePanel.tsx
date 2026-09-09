import { projectOpeningLife } from "../../presentation/opening-life";
import {
  canJoinOrdinaryGroup,
  joinOrdinaryGroup,
} from "../../presentation/ordinary-community";
import { useState } from "react";
import { personName, describePersonContext } from "../../simulation";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../simulation";
import {
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
  openingNeighborhoodWalkOffer,
  openNextLifeScene,
  walkOpeningNeighborhood,
} from "../../presentation/life-scene-flow";
import {
  projectLifeConversation,
  commitLifeConversation,
} from "../../presentation/life-conversation";
import { formatMinute } from "../../presentation/player-calendar";
import { openingLifeLocation } from "../../presentation/life-scene-flow";
import {
  lifeReflectionOffer,
  chooseConversationApproach,
  ORDINARY_LIFE_GOALS,
  chooseOrdinaryLifeGoal,
} from "../../simulation/life-personality";

/** No root/chrome/pixel ownership. Every button invokes a canonical command. */
export function LifeScenePanel({
  world,
  playerPersonId,
  onWorldChange,
  onContinue,
  transitionHandlers,
}: {
  world: World;
  playerPersonId: EntityId;
  onWorldChange: (world: World) => void;
  onContinue: () => void;
  transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [selected, setSelected] = useState<EntityId | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const identity = projectOpeningLife(world, playerPersonId);
  const scene = currentOpeningLifeScene(world, playerPersonId);
  const talk = selected
    ? projectLifeConversation(world, playerPersonId, selected)
    : null;
  const reflection = lifeReflectionOffer(world, playerPersonId);
  const lastSceneEvent = world.history.events
    .filter(
      (event) =>
        (event.type === "life.scene.opened" ||
          event.type === "life.scene.resolved") &&
        event.participants.some(
          (participant) =>
            participant.personId === playerPersonId &&
            participant.role === "focus:subject",
        ),
    )
    .at(-1);
  const aftermath =
    !scene && lastSceneEvent?.type === "life.scene.resolved"
      ? lastSceneEvent.summary
      : null;
  /*
   * Say what actually happened to the clock and to where you are.
   *
   * The old wrapper had one sentence for every outcome — "No change was made.
   * Check your current commitments before advancing time." — which was wrong
   * twice over. It told a player standing at home that their calendar was the
   * problem, and after a walk that really did move them it said nothing at all,
   * so the owner had to ask "I assume that means I took a walk?".
   *
   * Now a change reports the before and after clock, the date when the date
   * moved, and where the walk left them. An unchanged world is reported as
   * nothing having happened, without inventing a cause for it.
   */
  function commit(run: () => World) {
    const beforeMoment = world.currentMoment;
    const beforePlace =
      openingLifeLocation(world, playerPersonId)?.label ?? null;
    try {
      const next = run();
      if (next === world) {
        setOutcome(null);
        setProblem("Nothing changed. No time passed.");
        onWorldChange(next);
        return;
      }
      const after = next.currentMoment;
      const afterPlace =
        openingLifeLocation(next, playerPersonId)?.label ?? null;
      const clock =
        after.date === beforeMoment.date
          ? `${formatMinute(beforeMoment.minuteOfDay)} → ${formatMinute(after.minuteOfDay)}`
          : `${formatMinute(beforeMoment.minuteOfDay)} → ${formatMinute(after.minuteOfDay)}, ${after.date}`;
      const moved =
        afterPlace && afterPlace !== beforePlace ? ` · ${afterPlace}` : "";
      setProblem(null);
      setOutcome(
        after.date === beforeMoment.date &&
          after.minuteOfDay === beforeMoment.minuteOfDay &&
          !moved
          ? "Done. No time passed."
          : `${clock}${moved}`,
      );
      onWorldChange(next);
    } catch (error) {
      setOutcome(null);
      setProblem(
        error instanceof Error
          ? error.message
          : "That action is no longer available.",
      );
    }
  }
  return (
    <section className="life-moment" data-testid="opening-life-scene">
      <p data-testid="life-identity">
        {identity.name} · Age {identity.age} · {identity.date} ·{" "}
        {identity.place}
      </p>
      {problem ? <p role="alert">{problem}</p> : null}
      {outcome ? (
        <p role="status" data-testid="life-scene-outcome">
          {outcome}
        </p>
      ) : null}
      {aftermath ? <p data-testid="life-scene-aftermath">{aftermath}</p> : null}
      {scene ? (
        <>
          <p className="game-scene">{scene.prose}</p>
          <p>{scene.definition.minutes} minutes</p>
          <div className="game-choices">
            {scene.choices.map((choice) => (
              <button
                className="ui-action"
                type="button"
                key={choice.key}
                onClick={() =>
                  commit(() =>
                    chooseOpeningLifeScene(
                      world,
                      playerPersonId,
                      scene.eventId,
                      choice.key,
                      transitionHandlers,
                    ),
                  )
                }
              >
                {choice.label}
              </button>
            ))}
          </div>
          <nav aria-label="People here">
            {scene.presentPersonIds
              .filter((id) => id !== playerPersonId)
              .map((id) => (
                <button
                  className="ui-action"
                  type="button"
                  key={id}
                  aria-pressed={selected === id}
                  onClick={() => setSelected(id)}
                >
                  {personName(world.people[id]!)}
                  {describePersonContext(world, playerPersonId, id)
                    ?.relationship
                    ? ` · ${describePersonContext(world, playerPersonId, id)!.relationship}`
                    : ""}
                </button>
              ))}
          </nav>
          {talk ? (
            <div aria-label={`Conversation with ${talk.person.name}`}>
              {talk.transcript.slice(-4).map((turn) => (
                <p key={turn.eventId}>
                  <span>{turn.action}</span>
                  <br />“{turn.reply}”
                </p>
              ))}
              <p>
                Each exchange takes 2 minutes; spending time together takes 30
                minutes.
              </p>
              <div className="game-choices">
                {talk.intents.map((intent) => (
                  <button
                    className="ui-action"
                    type="button"
                    key={intent.key}
                    onClick={() =>
                      commit(() =>
                        commitLifeConversation(world, {
                          playerPersonId,
                          personId: selected!,
                          intent: intent.key,
                          revision: talk.revision,
                          transitionHandlers,
                        }),
                      )
                    }
                  >
                    {intent.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <button
            className="ui-action"
            type="button"
            onClick={() => {
              const next = openNextLifeScene(world, playerPersonId);
              if (next === world) onContinue();
              else onWorldChange(next);
            }}
          >
            Continue your day
          </button>
          <button className="ui-action" type="button" onClick={onContinue}>
            Continue your life
          </button>
        </>
      )}
      {reflection?.target.kind === "personality" ? (
        <button
          className="ui-action"
          type="button"
          onClick={() =>
            commit(() =>
              chooseConversationApproach(
                world,
                playerPersonId,
                reflection.target.kind === "personality"
                  ? (reflection.target.expressionKey as
                      "ask" | "listen" | "direct")
                  : "ask",
              ),
            )
          }
        >
          Keep using this approach in conversation
        </button>
      ) : null}
      {/*
        Both walks, each carrying its own answer.

        These were two unconditional buttons, so "Walk home" was offered while
        standing at home and refused with a message about the calendar. Now the
        offer says whether it can be taken and why not, and a walk that cannot
        be taken is disabled with its actual reason beside it rather than
        pretending to be available.
      */}
      <div className="game-choices" data-testid="life-walks">
        {(["neighborhood", "home"] as const).map((destination) => {
          const offer = openingNeighborhoodWalkOffer(
            world,
            playerPersonId,
            destination,
          );
          return (
            <p key={destination} className="life-walk">
              <button
                className="ui-action"
                type="button"
                data-testid={`life-walk-${destination}`}
                disabled={offer.unavailable !== null}
                onClick={() =>
                  commit(() =>
                    walkOpeningNeighborhood(
                      world,
                      playerPersonId,
                      destination,
                      transitionHandlers,
                    ),
                  )
                }
              >
                {offer.label} · {offer.minutes} minutes
              </button>
              {offer.unavailable ? (
                <small data-testid={`life-walk-${destination}-reason`}>
                  {offer.unavailable}
                </small>
              ) : null}
            </p>
          );
        })}
      </div>
      {canJoinOrdinaryGroup(world, playerPersonId) ? (
        <button
          className="ui-action"
          type="button"
          onClick={() => commit(() => joinOrdinaryGroup(world, playerPersonId))}
        >
          Join a neighborhood walking group
        </button>
      ) : null}
      <details>
        <summary>Personal plans</summary>
        {Object.entries(ORDINARY_LIFE_GOALS).map(([key, label]) => (
          <button
            className="ui-action"
            type="button"
            key={key}
            onClick={() =>
              commit(() =>
                chooseOrdinaryLifeGoal(
                  world,
                  playerPersonId,
                  key as keyof typeof ORDINARY_LIFE_GOALS,
                ),
              )
            }
          >
            {label}
          </button>
        ))}
      </details>
    </section>
  );
}
