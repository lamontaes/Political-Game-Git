import { useEffect, useRef, useState } from "react";
import { personName, describePersonContext } from "../../simulation";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../simulation";
import {
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
} from "../../presentation/life-scene-flow";
import { formatMinute } from "../../presentation/player-calendar";
import { openingLifeLocation } from "../../presentation/life-scene-flow";

/**
 * The situation in front of the character: where, what is happening, what
 * they can do about it, and who is here to talk to.
 *
 * No root/chrome/pixel ownership. Every button invokes a canonical command.
 *
 * PT3: talking is no longer drawn here. This panel used to carry its own
 * conversation — the last four exchanges printed under the scene's choices,
 * with every talk option below them — so a few greetings pushed the scene's
 * actual choices out of a scrolling box. Choosing somebody now hands them to
 * the one conversation box the whole game uses, which replaces this panel
 * while the conversation lasts and gives it back on Back.
 */
export function LifeScenePanel({
  world,
  playerPersonId,
  onWorldChange,
  onTalkTo,
  returnFocusTo = null,
  onFocusReturned,
  transitionHandlers,
}: {
  world: World;
  playerPersonId: EntityId;
  onWorldChange: (world: World) => void;
  onTalkTo: (personId: EntityId) => void;
  returnFocusTo?: EntityId | null;
  onFocusReturned?: () => void;
  transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const talkToRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!returnFocusTo) return;
    talkToRef.current?.focus();
    onFocusReturned?.();
  }, [returnFocusTo, onFocusReturned]);
  const scene = currentOpeningLifeScene(world, playerPersonId);
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
    <section
      className="life-moment pg-opening-flow"
      data-testid="opening-life-scene"
    >
      {problem ? <p role="alert">{problem}</p> : null}
      {outcome ? (
        <p role="status" data-testid="life-scene-outcome">
          {outcome}
        </p>
      ) : null}
      {aftermath ? <p data-testid="life-scene-aftermath">{aftermath}</p> : null}
      {scene ? (
        <>
          <p className="game-scene" data-testid="life-scene-prose">
            {scene.prose}
          </p>
          <p className="game-note" data-testid="life-scene-minutes">
            Whatever you choose here takes {scene.definition.minutes} minutes.
          </p>
          <div
            className="game-choices"
            role="group"
            aria-label="What you do"
            data-testid="life-scene-choices"
          >
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
          {/*
            Who is here, as a way to start talking. Each carries their actual
            id to the conversation box; nothing picks a person for the player.
          */}
          {scene.presentPersonIds.some((id) => id !== playerPersonId) ? (
            <nav
              aria-label="People here"
              className="life-talk-to"
              data-testid="life-scene-people"
            >
              <span className="game-band">Talk to</span>
              {scene.presentPersonIds
                .filter((id) => id !== playerPersonId)
                .map((id) => {
                  const relationship = describePersonContext(
                    world,
                    playerPersonId,
                    id,
                  )?.relationship;
                  return (
                    <button
                      className="ui-action ui-action--subtle"
                      type="button"
                      key={id}
                      data-testid={`life-talk-${id}`}
                      ref={
                        id === returnFocusTo
                          ? (node) => {
                              talkToRef.current = node;
                            }
                          : undefined
                      }
                      onClick={() => onTalkTo(id)}
                    >
                      {personName(world.people[id]!)}
                      {relationship ? ` · ${relationship}` : ""}
                    </button>
                  );
                })}
            </nav>
          ) : null}
        </>
      ) : (
        <p className="game-note" data-testid="life-scene-quiet">
          Nothing here needs a choice right now.
        </p>
      )}
    </section>
  );
}
