import { useState } from "react";
import { completedActivityHere } from "../presentation/scene-venues";
import type { EntityId, World } from "../simulation";
import {
  performVenueActivity,
  venueActivities,
} from "../presentation/venue-activity";
import { abandonUnperformableCommitment } from "../presentation/scheduled-activity-choice";

/** Feature-local normal-play control. The caller owns the sole World/save. */
export function VenueActivityPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const entries = venueActivities(world, personId);
  const completed = completedActivityHere(world, personId);
  if (!entries.length && !completed) return null;
  return (
    <section aria-label="Planned activities" data-testid="venue-activities">
      {completed ? (
        <p role="status" data-testid="venue-activity-completed">
          You have finished {completed.title} at {completed.location.label}.
        </p>
      ) : null}
      {entries.map(({ activity, elapsedMinutes, refusal, abandonable }) => (
        <div key={activity.id}>
          <p>
            {activity.title} · {activity.location.label}
          </p>
          <button
            type="button"
            disabled={refusal !== null}
            data-activity-id={activity.id}
            onClick={() => {
              try {
                const next = performVenueActivity(world, personId, activity.id);
                setProblem(
                  next === world
                    ? "This activity could not be completed."
                    : null,
                );
                if (next !== world) onWorldChange(next);
              } catch (error) {
                setProblem(
                  error instanceof Error
                    ? error.message
                    : "This activity could not be completed.",
                );
              }
            }}
          >
            {activity.kind === "travel"
              ? "Make the journey"
              : "Carry out activity"}
          </button>
          {abandonable ? (
            /*
             * The way out of a commitment the game cannot let you keep.
             *
             * Time refuses to step over a confirmed commitment, and this one
             * cannot be carried out, so without this control the life has no
             * legal move at all. Giving it up is a choice and is recorded as
             * one; nothing is faked and no time passes.
             */
            <button
              type="button"
              data-testid={`venue-activity-give-up-${activity.id}`}
              onClick={() => {
                const next = abandonUnperformableCommitment(
                  world,
                  personId,
                  activity.id,
                );
                setProblem(
                  next === world
                    ? "This commitment could not be given up."
                    : null,
                );
                if (next !== world) onWorldChange(next);
              }}
            >
              Give up on this
            </button>
          ) : null}
          <p>
            {refusal ??
              `${elapsedMinutes} minutes, including any wait before it begins.`}
          </p>
          {abandonable ? (
            <p data-testid={`venue-activity-give-up-note-${activity.id}`}>
              Giving up takes no time and spends nothing. It clears the
              commitment so the rest of the day can go on.
            </p>
          ) : null}
        </div>
      ))}
      {problem ? <p role="status">{problem}</p> : null}
    </section>
  );
}
