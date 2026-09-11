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
  openNextLifeScene,
  walkOpeningNeighborhood,
} from "../../presentation/life-scene-flow";
import {
  projectLifeConversation,
  commitLifeConversation,
} from "../../presentation/life-conversation";
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
  function commit(run: () => World) {
    try {
      const next = run();
      setProblem(
        next === world
          ? "No change was made. Check your current commitments before advancing time."
          : null,
      );
      onWorldChange(next);
    } catch (error) {
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
      <div className="game-choices">
        <button
          className="ui-action"
          type="button"
          onClick={() =>
            commit(() =>
              walkOpeningNeighborhood(
                world,
                playerPersonId,
                "neighborhood",
                transitionHandlers,
              ),
            )
          }
        >
          Take a short neighborhood walk · 5 minutes
        </button>
        <button
          className="ui-action"
          type="button"
          onClick={() =>
            commit(() =>
              walkOpeningNeighborhood(
                world,
                playerPersonId,
                "home",
                transitionHandlers,
              ),
            )
          }
        >
          Walk home · 5 minutes
        </button>
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
