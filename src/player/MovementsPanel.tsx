import { useId, useState } from "react";
import {
  foundMovementAs,
  joinMovement,
  leadMovement,
  leaveMovement,
  opposeMovement,
  speakOnMovement,
  type EntityId,
  type World,
} from "../simulation";
import {
  projectMovements,
  type MovementActionKey,
} from "../presentation/movements-view";
import { GameSelect } from "./controls/GameSelect";

/**
 * Movements in the state the player lives in: what each wants, who leads it,
 * and what the player can do about it, which is join, oppose, leave, take up
 * an empty lead, or speak. The player can also found one. Every choice is an
 * explicit click that calls the movement writer for it; nothing here moves
 * the clock.
 */
export function MovementsPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const headingId = useId();
  const [notice, setNotice] = useState<string | null>(null);
  const [question, setQuestion] = useState<EntityId | "">("");
  const [answer, setAnswer] = useState<"yes" | "no">("yes");

  const controlled =
    world.control.kind === "person" && world.control.personId === personId;
  if (!controlled) return null;
  const view = projectMovements(world, personId);

  const act = (run: () => World, done: string) => {
    try {
      const next = run();
      if (next !== world) onWorldChange(next);
      setNotice(done);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "That could not be recorded.",
      );
    }
  };

  const apply = (key: string, action: MovementActionKey): World => {
    switch (action) {
      case "join":
        return joinMovement(world, key, personId);
      case "oppose":
        return opposeMovement(world, key, personId);
      case "leave":
        return leaveMovement(world, key, personId);
      case "lead":
        return leadMovement(world, key, personId);
      case "support":
      case "condemn":
      case "calm":
        return speakOnMovement(world, key, personId, action);
    }
  };

  return (
    <section aria-labelledby={headingId} data-testid="movements">
      <h3 id={headingId}>Movements</h3>
      {view.here.length === 0 ? (
        <p className="game-note" data-testid="movements-empty">
          No movement is organizing in your state right now.
        </p>
      ) : (
        view.here.map((movement) => (
          <article key={movement.key} data-testid="movement">
            <h4>{movement.title}</h4>
            {movement.lines.map((line) => (
              <p key={line} className="game-note">
                {line}
              </p>
            ))}
            <div className="game-choices">
              {movement.actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="ui-action"
                  onClick={() =>
                    act(
                      () => apply(movement.key, action.key),
                      "It was recorded.",
                    )
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          </article>
        ))
      )}
      {view.ended.length > 0 ? (
        <>
          <h4>Movements that ended here</h4>
          {view.ended.map((line) => (
            <p key={line} className="game-note">
              {line}
            </p>
          ))}
        </>
      ) : null}
      {view.elsewhere.length > 0 ? (
        <details>
          <summary>
            {view.elsewhere.length === 1
              ? "One movement is organizing in another state"
              : `${view.elsewhere.length} movements are organizing in other states`}
          </summary>
          {view.elsewhere.map((line) => (
            <p key={line} className="game-note">
              {line}
            </p>
          ))}
        </details>
      ) : null}
      <h4>Start a movement</h4>
      <p>
        <GameSelect
          aria-label="What the movement is about"
          value={question}
          placeholder="Choose a question"
          onChange={(event) => setQuestion(event.target.value as EntityId)}
        >
          {view.questions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </GameSelect>
        <GameSelect
          aria-label="For or against"
          value={answer}
          onChange={(event) =>
            setAnswer(event.target.value === "no" ? "no" : "yes")
          }
        >
          <option value="yes">For it</option>
          <option value="no">Against it</option>
        </GameSelect>
        <button
          type="button"
          className="ui-action"
          aria-disabled={question === "" || undefined}
          onClick={() =>
            question === ""
              ? setNotice("Choose what the movement is about first.")
              : act(
                  () =>
                    foundMovementAs(world, {
                      personId,
                      propositionId: question,
                      answer,
                    }),
                  "You founded a movement and lead it.",
                )
          }
        >
          Found it
        </button>
      </p>
      {notice ? (
        <p role="status" data-testid="movements-notice">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
