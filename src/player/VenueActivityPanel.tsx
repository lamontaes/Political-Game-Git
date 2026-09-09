import { useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  performVenueActivity,
  venueActivities,
} from "../presentation/venue-activity";

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
  if (!entries.length) return null;
  return (
    <section aria-label="Planned activities" data-testid="venue-activities">
      {entries.map(({ activity, elapsedMinutes, refusal }) => (
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
          <p>
            {refusal ??
              `${elapsedMinutes} minutes, including any wait before it begins.`}
          </p>
        </div>
      ))}
      {problem ? <p role="status">{problem}</p> : null}
    </section>
  );
}
