import { useState } from "react";
import {
  completePressInterview,
  confirmPressResponse,
  draftPressResponse,
  projectPressInterview,
  publishPressInterview,
  type EntityId,
  type World,
} from "../simulation";
import { PressInterviewPanel } from "./PressInterviewPanel";

/** Normal saved-world consumer; arrangements and adviser content remain domain-owned. */
export function PressWorkspace({
  world,
  onWorldChange,
  onOpenPerson,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const [selected, setSelected] = useState<EntityId | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const arrangements = new Set(
    world.history.events
      .filter((event) => event.type === "press.interview-arranged")
      .map((event) => event.id),
  );
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const activities = world.history.scheduledActivities.filter(
    (activity) =>
      activity.responsiblePersonId === controlledPersonId &&
      activity.sourceEntityIds.some((id) => arrangements.has(id)),
  );
  const activity = activities.find((item) => item.id === selected);
  const view = activity ? projectPressInterview(world, activity.id) : null;
  function change(run: () => World) {
    try {
      onWorldChange(run());
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <section data-testid="normal-press-workspace" aria-label="Press interviews">
      <h3>Press interviews</h3>
      {problem ? <p role="status">{problem}</p> : null}
      {view ? (
        <PressInterviewPanel
          view={view}
          onClose={() => setSelected(null)}
          onOpenPerson={onOpenPerson}
          preparationUnavailable="No adviser briefing content has been supplied for this saved interview."
          feedbackUnavailable="No adviser interpretation has been supplied for this saved publication."
          onReviewPreparation={() =>
            setProblem("No adviser briefing content is available.")
          }
          onRequestAdviserFeedback={() =>
            setProblem("No adviser interpretation is available.")
          }
          onDraftResponse={(input) =>
            change(() => draftPressResponse(world, input))
          }
          onConfirmExactWording={(confirmedWording) =>
            change(() =>
              confirmPressResponse(world, {
                stableKey: `${view.activityId}:confirmed`,
                activityId: view.activityId,
                confirmedWording,
              }),
            )
          }
          onCompleteInterview={() =>
            change(() => completePressInterview(world, view.activityId))
          }
          onPublish={() =>
            change(() =>
              publishPressInterview(world, {
                stableKey: `${view.activityId}:publication`,
                activityId: view.activityId,
              }),
            )
          }
        />
      ) : activities.length ? (
        <ul>
          {activities.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setSelected(item.id)}>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No interviews are arranged in this life.</p>
      )}
    </section>
  );
}
