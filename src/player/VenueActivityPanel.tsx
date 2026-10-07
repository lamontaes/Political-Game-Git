import { useState } from "react";
import { completedActivityHere } from "../presentation/scene-venues";
import type { EntityId, World } from "../simulation";
import {
  goLabel,
  performVenueActivity,
  venueActivities,
  venueTiming,
} from "../presentation/venue-activity";
import { abandonUnperformableCommitment } from "../presentation/scheduled-activity-choice";
import { proseWeekdayDate } from "../presentation/prose-dates";
import { formatRoutineElapsedMinutes } from "../presentation/routine-outcome";
import { formatMinute } from "../presentation/player-calendar";

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
  // A refusal the engine words is shown as it gave it; ours is only a key.
  const [problem, setProblem] = useState<{
    readonly key: string;
    readonly detail?: string;
  } | null>(null);
  const entries = venueActivities(world, personId);
  const completed = completedActivityHere(world, personId);
  if (!entries.length && !completed) return null;
  return (
    <section aria-label="Planned activities" data-testid="venue-activities">
      {completed ? (
        <dl role="status" data-testid="venue-activity-completed">
          <dt>Finished</dt>
          <dd>{completed.title}</dd>
          <dt>Where</dt>
          <dd>{completed.location.label}</dd>
        </dl>
      ) : null}
      {entries.map(({ activity, refusal, abandonable }) => (
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
                  next === world ? { key: "activity-not-completed" } : null,
                );
                if (next !== world) onWorldChange(next);
              } catch (error) {
                setProblem(
                  error instanceof Error
                    ? { key: "activity-refused", detail: error.message }
                    : { key: "activity-not-completed" },
                );
              }
            }}
          >
            {activity.kind === "travel" ? goLabel(activity) : "Start now"}
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
                setProblem(next === world ? { key: "give-up-refused" } : null);
                if (next !== world) onWorldChange(next);
              }}
            >
              Give up on this
            </button>
          ) : null}
          {refusal ? (
            <p>{refusal}</p>
          ) : (
            <VenueTimingValues timing={venueTiming(world, activity.id)} />
          )}
        </div>
      ))}
      {problem ? (
        <p role="status" data-problem={problem.key}>
          {problem.detail}
        </p>
      ) : null}
    </section>
  );
}

/** The timing as labeled values: when it starts, how long it takes. */
function VenueTimingValues({
  timing,
}: {
  readonly timing: ReturnType<typeof venueTiming>;
}) {
  if (!timing) return null;
  const length = formatRoutineElapsedMinutes(timing.minutes);
  return (
    <dl data-testid="venue-activity-timing" data-timing={timing.kind}>
      {timing.kind === "starts" ? (
        <>
          <dt>Starts</dt>
          <dd>
            {proseWeekdayDate(timing.date)}, {formatMinute(timing.minuteOfDay)}
          </dd>
        </>
      ) : null}
      <dt>
        {timing.kind === "travel"
          ? "Travel"
          : timing.kind === "stay"
            ? "Stay"
            : "Length"}
      </dt>
      <dd>{length}</dd>
    </dl>
  );
}
