import type { EntityId, World } from "../simulation";
import {
  askClerk,
  fileAtClerk,
  leaveFilingVisit,
  projectClerkFilingScene,
  type ClerkRuleRecord,
} from "../presentation/clerk-filing-scene";
import { proseDate, proseMonthDay } from "../presentation/prose-dates";
import type { ShellRef } from "../presentation/shell-navigation";
import type {
  TimeCommandReport,
  TimeCommandRunner,
} from "./time-command-runner";

function rule(record: ClerkRuleRecord | undefined): string | null {
  if (!record) return null;
  return record.kind === "known"
    ? `${record.value}${record.estimated ? " (estimated)" : ""}`
    : record.kind;
}

/**
 * The clerk's counter, from its saved entry, questions and answers. Every
 * word shown is a record (the clerk's name and title, the seats' names, the
 * values the counter read out for them) or an approved control: Continue asks
 * the counter's next question in its order, and Back leaves.
 */
export function ClerkFilingPanel({
  world,
  personId,
  runner,
  onReport,
  onOpenEntity,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly runner: TimeCommandRunner;
  readonly onReport: (report: TimeCommandReport) => void;
  readonly onOpenEntity: (ref: ShellRef) => void;
}) {
  const scene = projectClerkFilingScene(world, personId);
  if (!scene) return null;
  const perform = (run: (current: World) => World) =>
    runner.perform(
      (current) => ({ world: run(current), outcome: "" }),
      onReport,
    );

  return (
    <section className="pg-meeting-panel" data-testid="clerk-filing-panel">
      <h2>{scene.location.label}</h2>
      <ul data-testid="clerk-filing-people">
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
          </li>
        ))}
      </ul>
      {scene.turns.map((turn) => (
        <dl key={turn.eventId} data-testid="clerk-filing-turn">
          {turn.answer.map((seat) => (
            <div key={seat.officeKey}>
              <dt>{seat.officeName}</dt>
              {seat.minimumAge ? <dd>{rule(seat.minimumAge)}</dd> : null}
              {seat.residency ? <dd>{rule(seat.residency)}</dd> : null}
              {seat.electionDate ? (
                <dd>
                  {proseDate(seat.electionDate)}
                  {seat.electionDateEstimated ? " (estimated)" : ""}
                </dd>
              ) : null}
              {seat.deadlineDate || seat.deadline ? (
                <dd>
                  {seat.deadlineDate
                    ? `${proseDate(seat.deadlineDate)} (estimated)`
                    : `${proseMonthDay(seat.deadline!)}${seat.termsEstimatedFrom ? " (estimated)" : ""}`}
                </dd>
              ) : null}
              {seat.feeMinorUnits !== undefined ? (
                <dd>
                  ${(seat.feeMinorUnits / 100).toFixed(2)}
                  {seat.termsEstimatedFrom ? " (estimated)" : ""}
                </dd>
              ) : null}
              {seat.filed?.map((filer) => (
                <dd key={filer.personId}>
                  <button
                    type="button"
                    className="ui-link"
                    onClick={() =>
                      onOpenEntity({ kind: "person", id: filer.personId })
                    }
                  >
                    {filer.name}
                  </button>{" "}
                  · {proseDate(filer.filedAt)}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      ))}
      {scene.questions[0] ? (
        <button
          type="button"
          className="ui-action"
          disabled={runner.pending}
          data-testid="clerk-filing-continue"
          onClick={() =>
            perform((current) =>
              askClerk(
                current,
                personId,
                scene.activityId,
                scene.questions[0]!,
              ),
            )
          }
        >
          Continue
        </button>
      ) : null}
      {scene.seats
        .filter((seat) =>
          scene.availableActions.includes(`file:${seat.officeKey}`),
        )
        .map((seat) => (
          <button
            key={seat.officeKey}
            type="button"
            className="ui-action ui-action--primary"
            disabled={runner.pending}
            data-testid={`clerk-filing-file-${seat.officeKey}`}
            onClick={() =>
              perform((current) =>
                fileAtClerk(
                  current,
                  personId,
                  scene.activityId,
                  seat.officeKey,
                ),
              )
            }
          >
            {seat.officeName}
          </button>
        ))}
      <button
        type="button"
        className="ui-action"
        disabled={runner.pending}
        data-testid="clerk-filing-leave"
        onClick={() =>
          runner.perform(
            (current, handlers) => ({
              world: leaveFilingVisit(
                current,
                personId,
                scene.activityId,
                handlers,
              ),
              outcome: "",
            }),
            onReport,
          )
        }
      >
        Back
      </button>
    </section>
  );
}
