import { useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  askCandidateGuidance,
  leaveCandidateGuidance,
  projectCandidateGuidanceScene,
} from "../presentation/candidate-guidance-scene";
import { previewTimeCommand } from "../presentation/time-command";
import type { ShellRef } from "../presentation/shell-navigation";
import { useTimeCommand } from "./time-command-runner";

/** The conversation in the community room, from its saved entry and turns. */
export function CandidateGuidancePanel({
  world,
  personId,
  onWorldChange,
  onOpenEntity,
  onOutcome,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenEntity: (ref: ShellRef) => void;
  readonly onOutcome: (outcome: string) => void;
}) {
  const runner = useTimeCommand({ world, personId, onWorldChange });
  const [message, setMessage] = useState<string | null>(null);
  const scene = projectCandidateGuidanceScene(world, personId);
  if (!scene) return null;
  const stay = previewTimeCommand(world, personId, {
    kind: "attend-activity",
    activityId: scene.activityId,
  });

  return (
    <section
      className="pg-meeting-panel"
      data-testid="candidate-guidance-panel"
    >
      <h2>{scene.location.label}</h2>
      <p>{scene.caption}</p>
      <div data-testid="candidate-guidance-people">
        <h3>In the room</h3>
        <ul>
          {scene.actors.map((actor) => (
            <li key={actor.personId}>
              <button
                type="button"
                className="ui-link"
                onClick={() =>
                  onOpenEntity({ kind: "person", id: actor.personId })
                }
              >
                {actor.name}
              </button>{" "}
              · {actor.role}
              {/* PLACEHOLDER(overnight): The producer's exact words await English review. */}
              {actor.spokenLine ? <p>{actor.spokenLine}</p> : null}
            </li>
          ))}
        </ul>
      </div>
      {scene.turns.map((turn) => (
        <div key={turn.eventId} data-testid="candidate-guidance-turn">
          <p>You asked: {turn.words}</p>
          {turn.response ? <p>{turn.response}</p> : null}
        </div>
      ))}
      {scene.questions.map((question) =>
        scene.availableActions.includes(question.key) ? (
          <button
            key={question.key}
            type="button"
            className="ui-action"
            disabled={runner.pending}
            data-testid={`candidate-guidance-question-${question.key}`}
            onClick={() =>
              runner.perform(
                (current) => {
                  const next = askCandidateGuidance(
                    current,
                    personId,
                    scene.activityId,
                    question.key,
                  );
                  return {
                    world: next,
                    outcome:
                      next === current
                        ? "That question is no longer available. No time passed."
                        : "Question recorded. No time passed.",
                  };
                },
                (report) => setMessage(report.outcome),
              )
            }
          >
            {question.words}
          </button>
        ) : null,
      )}
      {scene.availableActions.includes("stay") ? (
        <button
          type="button"
          className="ui-action ui-action--primary"
          disabled={runner.pending || !stay}
          data-testid="stay-candidate-guidance"
          onClick={() =>
            runner.submit(
              { kind: "attend-activity", activityId: scene.activityId },
              (report) => {
                setMessage(report.outcome);
                if (report.status === "accepted") onOutcome(report.outcome);
              },
            )
          }
        >
          Stay through the conversation
          {stay ? ` · ${stay.elapsedMinutes} minutes` : ""}
        </button>
      ) : null}
      {scene.availableActions.includes("leave") ? (
        <button
          type="button"
          className="ui-action"
          disabled={runner.pending}
          data-testid="leave-candidate-guidance"
          onClick={() =>
            runner.perform(
              (current, handlers) => {
                const next = leaveCandidateGuidance(
                  current,
                  personId,
                  scene.activityId,
                  handlers,
                );
                return {
                  world: next,
                  outcome:
                    next === current
                      ? "Leaving is no longer available. No time passed."
                      : "You left the conversation and returned home.",
                };
              },
              (report) => {
                setMessage(report.outcome);
                if (report.status === "accepted") onOutcome(report.outcome);
              },
            )
          }
        >
          Leave and return home
        </button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
