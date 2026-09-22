import { describePlacesOutcome } from "../presentation/player-places";
import { useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  enterOrdinaryMeeting,
  ordinaryMeetingEntry,
} from "../simulation/ordinary-meeting-presence";
import { projectOrdinaryMeetingScene } from "../presentation/ordinary-meeting-scene";
import {
  ordinaryMeetingLeaveOffer,
  leaveOrdinaryMeeting,
} from "../presentation/ordinary-meeting-actions";
import { previewTimeCommand } from "../presentation/time-command";
import { projectLivingSceneSurface } from "../presentation/living-scene-surfaces";
import type { ShellRef } from "../presentation/shell-navigation";
import { useTimeCommand } from "./time-command-runner";
import { SceneSurfaceReader } from "./SceneSurfaceReader";

/** The current, actually reached meeting. Reading the agenda is free; entry,
 * attendance and departure each use their own canonical writer. */
export function OrdinaryMeetingPanel({
  world,
  personId,
  onWorldChange,
  onOpenEntity,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenEntity: (ref: ShellRef) => void;
}) {
  const runner = useTimeCommand({ world, personId, onWorldChange });
  const [outcome, setOutcome] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const scene = projectOrdinaryMeetingScene(world, personId);
  const entry = scene
    ? null
    : world.history.scheduledActivities
        .filter(
          (activity) =>
            activity.location.locationKey === "ordinary-life:meeting-room",
        )
        .map((activity) => ordinaryMeetingEntry(world, personId, activity.id))
        .find(Boolean);
  const activityId = scene?.activityId ?? entry?.activity.id;
  if (!activityId) return null;
  const agenda = projectLivingSceneSurface(world, personId, {
    kind: "agenda",
    activityId,
  });
  const leave = ordinaryMeetingLeaveOffer(world, personId, activityId);
  const home = previewTimeCommand(world, personId, {
    kind: "walk",
    destination: "home",
  });
  const stay = previewTimeCommand(world, personId, {
    kind: "attend-activity",
    activityId,
  });
  return (
    <section className="pg-meeting-panel" data-testid="ordinary-meeting-panel">
      <h2>{scene?.location.label ?? entry?.activity.location.label}</h2>
      <p>{scene?.caption ?? "You have arrived for the public meeting."}</p>
      {agenda.status === "bound" ? (
        <button
          type="button"
          className="ui-action"
          data-testid="read-meeting-agenda"
          onClick={() => setReading(true)}
        >
          Read the agenda
        </button>
      ) : null}
      {entry ? (
        <button
          type="button"
          className="ui-action"
          disabled={runner.pending}
          data-testid="enter-ordinary-meeting"
          onClick={() =>
            runner.perform(
              (current) => {
                const next = enterOrdinaryMeeting(
                  current,
                  personId,
                  activityId,
                );
                return {
                  world: next,
                  outcome:
                    next === current
                      ? "Entry is no longer available. No time passed."
                      : "You entered the meeting. No time passed.",
                };
              },
              (report) => setOutcome(report.outcome),
            )
          }
        >
          Enter the meeting · no time passes
        </button>
      ) : null}
      {scene?.phase === "active" ? (
        <>
          <button
            type="button"
            className="ui-action"
            disabled={runner.pending || !stay}
            data-testid="stay-ordinary-meeting"
            onClick={() =>
              runner.submit({ kind: "attend-activity", activityId }, (report) =>
                setOutcome(report.outcome),
              )
            }
          >
            Stay through the meeting
            {stay ? ` · ${stay.elapsedMinutes} minutes` : ""}
          </button>
          <button
            type="button"
            className="ui-action"
            disabled={runner.pending || leave.kind !== "available"}
            data-testid="leave-ordinary-meeting"
            onClick={() =>
              runner.perform(
                (current, handlers) => {
                  const next = leaveOrdinaryMeeting(
                    current,
                    personId,
                    activityId,
                    handlers,
                  );
                  return {
                    world: next,
                    outcome:
                      next === current
                        ? "You could not leave yet. No time passed."
                        : describePlacesOutcome(current, next, personId),
                  };
                },
                (report) => setOutcome(report.outcome),
              )
            }
          >
            Leave and return home
            {leave.kind === "available"
              ? ` · ${leave.route.duration.minutes} minutes`
              : ""}
          </button>
          {leave.kind === "unavailable" ? <p>{leave.reason}</p> : null}
        </>
      ) : scene?.phase === "immediate-aftermath" ? (
        <button
          type="button"
          className="ui-action"
          disabled={runner.pending || !home}
          onClick={() =>
            runner.submit({ kind: "walk", destination: "home" }, (report) =>
              setOutcome(report.outcome),
            )
          }
        >
          Return home{home ? ` · ${home.elapsedMinutes} minutes` : ""}
        </button>
      ) : null}
      {outcome ? <p role="status">{outcome}</p> : null}
      {reading && agenda.status === "bound" ? (
        <SceneSurfaceReader
          record={agenda}
          onOpenEntity={onOpenEntity}
          onClose={() => {
            setReading(false);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLButtonElement>(
                  '[data-testid="read-meeting-agenda"]',
                )
                ?.focus(),
            );
          }}
        />
      ) : null}
    </section>
  );
}
