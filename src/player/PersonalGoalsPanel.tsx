import { useMemo, useState } from "react";

import {
  PERSONAL_GOAL_STATUS_LABEL,
  personalGoalActions,
} from "../presentation/life-continuation-shell";
import {
  projectPersonalGoals,
  setPersonalGoalStatus,
  startPersonalGoal,
  type GoalOpportunity,
  type PersonalGoalFamily,
} from "../presentation/people-goals";
import { proseDate } from "../presentation/prose-dates";
import type { EntityId, World } from "../simulation";
import { GameSelect } from "./controls/GameSelect";

/**
 * Private aims, in Who you are (CRUNCH46 P2).
 *
 * Setting or changing one is private and takes no time. What each aim lists
 * under it is what the world offers toward it today, and nothing when it
 * offers nothing.
 */
export function PersonalGoalsPanel({
  world,
  personId,
  onWorldChange,
  onOpportunity,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpportunity: (opportunity: GoalOpportunity) => void;
}) {
  const projection = useMemo(
    () => projectPersonalGoals(world, personId),
    [world, personId],
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [targets, setTargets] = useState<
    Partial<Record<PersonalGoalFamily, string>>
  >({});

  function attempt(command: () => World) {
    try {
      const next = command();
      setProblem(null);
      if (next !== world) onWorldChange(next);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "That aim could not be set.",
      );
    }
  }

  const current = projection.goals.filter(
    (goal) => goal.status === "active" || goal.status === "paused",
  );
  const closed = projection.goals.filter(
    (goal) => goal.status === "abandoned" || goal.status === "achieved",
  );

  return (
    <section
      className="pg-personal-section pg-goals"
      aria-labelledby="pg-goals-heading"
      data-testid="personal-goals"
    >
      <h3 id="pg-goals-heading">What you mean to do</h3>
      <p className="game-note">
        Private aims. Nobody learns of them unless you act on them, and setting
        or changing one takes no time.
      </p>

      {current.length === 0 ? (
        <p className="game-note" data-testid="personal-goals-none">
          You have not set any aims.
        </p>
      ) : (
        <ul className="pg-goals-list">
          {current.map((goal) => (
            <li key={goal.goalId} data-testid={`personal-goal-${goal.goalId}`}>
              <p>
                <strong>{goal.objective}</strong>{" "}
                <small>
                  {PERSONAL_GOAL_STATUS_LABEL[goal.status]} · set on{" "}
                  {proseDate(goal.since)}
                </small>
              </p>
              {goal.progress.map((line) => (
                <p key={line} className="game-note">
                  {line}
                </p>
              ))}
              {goal.status === "active" ? (
                goal.opportunities.length === 0 ? (
                  goal.obstacles.length > 0 ? (
                    /* The reasons are the candidacy rules' own sentences, so
                       an aim with nothing under it says why rather than
                       leaving the player to guess. */
                    <>
                      <p className="game-note">
                        Nothing offers a way toward this right now, because:
                      </p>
                      <ul className="pg-goals-obstacles">
                        {goal.obstacles.map((obstacle) => (
                          <li key={obstacle} className="game-note">
                            {obstacle}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="game-note">
                      Nothing in the world offers a way toward this right now.
                    </p>
                  )
                ) : (
                  <div className="pg-goals-actions">
                    {goal.opportunities.map((opportunity) => (
                      <button
                        key={`${opportunity.kind}:${opportunity.label}`}
                        type="button"
                        className="ui-action ui-action--rail"
                        onClick={() => onOpportunity(opportunity)}
                      >
                        {opportunity.label}
                      </button>
                    ))}
                  </div>
                )
              ) : null}
              <div className="pg-goals-actions">
                {personalGoalActions(goal.status).map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    className="ui-action ui-action--subtle"
                    aria-label={`${action.label}: ${goal.objective}`}
                    onClick={() =>
                      attempt(() =>
                        setPersonalGoalStatus(
                          world,
                          personId,
                          goal.goalId,
                          action.status,
                        ),
                      )
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h4>Set an aim</h4>
      <ul className="pg-goals-list">
        {projection.choices.map((choice) => {
          const selected =
            targets[choice.family] ?? choice.targets[0]?.targetEntityId ?? "";
          const target = choice.targets.find(
            (entry) => (entry.targetEntityId ?? "") === selected,
          );
          return (
            <li
              key={choice.family}
              data-testid={`goal-choice-${choice.family}`}
            >
              <strong>{choice.label}</strong>
              {choice.unavailableReason ? (
                <p className="game-note">{choice.unavailableReason}</p>
              ) : (
                <div className="pg-goals-actions">
                  {choice.targets.length > 1 ? (
                    <GameSelect
                      aria-label={`${choice.label}: who or what`}
                      value={selected}
                      onChange={(event) =>
                        setTargets((prior) => ({
                          ...prior,
                          [choice.family]: event.target.value,
                        }))
                      }
                    >
                      {choice.targets.map((entry) => (
                        <option
                          key={entry.targetEntityId ?? "any"}
                          value={entry.targetEntityId ?? ""}
                        >
                          {entry.label}
                        </option>
                      ))}
                    </GameSelect>
                  ) : (
                    <span className="game-note">{target?.label}</span>
                  )}
                  <button
                    type="button"
                    className="ui-action"
                    data-testid={`goal-start-${choice.family}`}
                    disabled={!target}
                    onClick={() =>
                      target &&
                      attempt(() =>
                        startPersonalGoal(world, {
                          personId,
                          family: choice.family,
                          targetEntityId: target.targetEntityId,
                        }),
                      )
                    }
                  >
                    Set this aim
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {closed.length > 0 ? (
        <details>
          <summary>Aims you closed</summary>
          <ul className="pg-goals-list">
            {closed.map((goal) => (
              <li key={goal.goalId}>
                {goal.objective}{" "}
                <small>{PERSONAL_GOAL_STATUS_LABEL[goal.status]}</small>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {problem ? (
        <p className="game-note" role="alert">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
