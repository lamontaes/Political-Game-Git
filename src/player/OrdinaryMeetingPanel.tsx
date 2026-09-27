import { describePlacesOutcome } from "../presentation/player-places";
import { useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  enterOrdinaryMeeting,
  ORDINARY_MEETING_PRESENCE,
  ordinaryMeetingEntry,
  speakAtOrdinaryMeeting,
} from "../simulation/ordinary-meeting-presence";
import { projectOrdinaryMeetingScene } from "../presentation/ordinary-meeting-scene";
import {
  ordinaryMeetingLeaveOffer,
  leaveOrdinaryMeeting,
  goBrieflyToOrdinaryMeeting,
} from "../presentation/ordinary-meeting-actions";
import { previewTimeCommand } from "../presentation/time-command";
import { projectLivingSceneSurface } from "../presentation/living-scene-surfaces";
import type { ShellRef } from "../presentation/shell-navigation";
import { useTimeCommand } from "./time-command-runner";

/** The current, actually reached meeting. Reading the agenda is free; entry,
 * attendance and departure each use their own canonical writer. */
export function OrdinaryMeetingPanel({
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
  const [outcome, setOutcome] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
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
      {scene?.actors.length ? (
        <div data-testid="ordinary-meeting-people">
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
                {/* PLACEHOLDER(overnight): Resident lines await the English engine's exact-word review. */}
                {actor.spokenLine ? <p>{actor.spokenLine}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {agenda.status === "bound" &&
      (!scene || scene.availableActions.includes("read-agenda")) ? (
        <button
          type="button"
          className="ui-action"
          data-testid="read-meeting-agenda"
          onClick={() => setReading(true)}
        >
          Read the agenda
        </button>
      ) : null}
      {reading && agenda.status === "bound" ? (
        <div data-testid="ordinary-meeting-agenda">
          <h3>{agenda.heading}</h3>
          {scene?.agendaText ? (
            <p>{scene.agendaText}</p>
          ) : (
            agenda.lines.map((line, index) => (
              <p key={`${agenda.revision}:${index}`}>{line}</p>
            ))
          )}
          <button
            type="button"
            className="ui-action ui-action--subtle"
            onClick={() => setReading(false)}
          >
            Close agenda
          </button>
        </div>
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
          {scene.availableActions.includes("speak") ? (
            <button
              type="button"
              className="ui-action"
              aria-expanded={speaking}
              data-testid="speak-ordinary-meeting"
              onClick={() => setSpeaking((value) => !value)}
            >
              Speak at the meeting
            </button>
          ) : null}
          {speaking && scene.availableActions.includes("speak") ? (
            <div role="group" aria-label="Choose your exact public comment">
              {/* PLACEHOLDER(overnight): These exact speech choices are COPY-PENDING in the canonical producer. */}
              {scene.speechChoices.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  className="ui-action ui-action--subtle"
                  disabled={runner.pending}
                  data-testid={`meeting-speech-${choice.key}`}
                  onClick={() =>
                    runner.perform(
                      (current) => {
                        const next = speakAtOrdinaryMeeting(
                          current,
                          personId,
                          activityId,
                          choice.key,
                        );
                        const comment = next.history.events.find(
                          (event) =>
                            event.stableKey ===
                            `${ORDINARY_MEETING_PRESENCE}:${activityId}:comment:${personId}`,
                        );
                        return {
                          world: next,
                          outcome:
                            next === current
                              ? "The comment was not recorded. No time passed."
                              : (comment?.summary ?? choice.words),
                        };
                      },
                      (report) => setOutcome(report.outcome),
                    )
                  }
                >
                  {choice.words}
                </button>
              ))}
            </div>
          ) : null}
          {scene.spokenWords ? (
            <p data-testid="ordinary-meeting-spoken-words">
              You said: {scene.spokenWords}
            </p>
          ) : null}
          {scene.availableActions.includes("stay") ? (
            <button
              type="button"
              className="ui-action"
              disabled={runner.pending || !stay}
              data-testid="stay-ordinary-meeting"
              onClick={() =>
                runner.submit(
                  { kind: "attend-activity", activityId },
                  (report) => setOutcome(report.outcome),
                )
              }
            >
              Stay through the meeting
              {stay ? ` · ${stay.elapsedMinutes} minutes` : ""}
            </button>
          ) : null}
          {scene.availableActions.includes("go-briefly") ? (
            <button
              type="button"
              className="ui-action"
              disabled={runner.pending || leave.kind !== "available"}
              data-testid="brief-ordinary-meeting"
              onClick={() =>
                runner.perform(
                  (current, handlers) => {
                    const next = goBrieflyToOrdinaryMeeting(
                      current,
                      personId,
                      activityId,
                      handlers,
                    );
                    const brief = next.history.events.find(
                      (event) =>
                        event.type === "civic.meeting-brief-visit" &&
                        event.tags.includes(`activity:${activityId}`),
                    );
                    return {
                      world: next,
                      outcome:
                        next === current
                          ? "The short visit could not be completed. No time passed."
                          : (brief?.summary ??
                            describePlacesOutcome(current, next, personId)),
                    };
                  },
                  (report) => {
                    setOutcome(report.outcome);
                    if (report.status === "accepted") onOutcome(report.outcome);
                  },
                )
              }
            >
              Go briefly
              {/* PLACEHOLDER(overnight): The canonical writer currently uses a 15-minute visit. */}
              {leave.kind === "available"
                ? ` · 15 minutes here, then ${leave.route.duration.minutes} minutes home`
                : ""}
            </button>
          ) : null}
          {scene.availableActions.includes("leave") ? (
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
                  (report) => {
                    setOutcome(report.outcome);
                    if (report.status === "accepted") onOutcome(report.outcome);
                  },
                )
              }
            >
              Leave and return home
              {leave.kind === "available"
                ? ` · ${leave.route.duration.minutes} minutes`
                : ""}
            </button>
          ) : null}
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
    </section>
  );
}
