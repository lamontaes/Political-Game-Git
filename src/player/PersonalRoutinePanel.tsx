import { useState } from "react";
import {
  addDays,
  daysBetween,
  currentLifeCutoff,
  futureDueItemStateAt,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
  type EntityId,
  type World,
} from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { describeRoutineOutcome } from "../presentation/routine-outcome";
import { LifePathsPanel } from "./LifePathsPanel";
import { PlacesWorkspace, type PlacesEntityRef } from "./PlacesWorkspace";

/** A owns the Personal root mount. This leaf owns no navigation or save store. */
export function PersonalRoutinePanel({
  world,
  personId,
  onWorldChange,
  onOpenEntity,
  onTogglePin,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenEntity: (ref: PlacesEntityRef) => void;
  readonly onTogglePin: (ref: PlacesEntityRef) => void;
}) {
  const [notice, setNotice] = useState("");
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const commit = (next: World, requestedMinutes?: number) => {
    setNotice(describeRoutineOutcome(world, next, personId, requestedMinutes));
    if (next !== world) onWorldChange(next);
  };
  const nextPeriod = world.history.futureDueItems
    .filter(
      (due) =>
        due.transitionKey === "education:study-period-due" &&
        due.entityIds.some((id) =>
          world.history.educationEnrollments.some(
            (e) => e.id === id && e.personId === personId,
          ),
        ) &&
        futureDueItemStateAt(world, due.id, currentLifeCutoff(world))
          ?.status === "scheduled",
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const pass = (days: number) => {
    try {
      commit(
        passOrdinaryDays(world, days),
        simulationMinutesBetween(
          world.currentMoment,
          simulationMomentAtLocalTime({
            date: addDays(world.currentDate, days),
            minuteOfDay: 420,
            timeZone: world.currentMoment.timeZone,
            preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
          }),
        ),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Time could not advance.",
      );
    }
  };
  return (
    <details data-testid="personal-routine">
      <summary>Jobs, study and outings</summary>
      <p>
        Read offers and accepted terms here. Reading does not pass time. Attend
        includes any journey disclosed by the offer.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            commit(
              passOrdinaryDays(world),
              simulationMinutesBetween(
                world.currentMoment,
                simulationMomentAtLocalTime({
                  date: addDays(world.currentDate, 1),
                  minuteOfDay: 420,
                  timeZone: world.currentMoment.timeZone,
                  preferredUtcOffsetMinutes:
                    world.currentMoment.utcOffsetMinutes,
                }),
              ),
            );
          } catch (error) {
            setNotice(
              error instanceof Error
                ? error.message
                : "Time could not advance.",
            );
          }
        }}
      >
        Continue to tomorrow morning
      </button>
      {nextPeriod && nextPeriod.dueAt > world.currentDate ? (
        <>
          <p>
            The next accepted study period ends {nextPeriod.dueAt}. Continuing
            resolves established ordinary work and tuition, but stops for
            protected commitments.
          </p>
          <button
            type="button"
            onClick={() =>
              pass(daysBetween(world.currentDate, nextPeriod.dueAt))
            }
          >
            Continue to next study period
          </button>
        </>
      ) : null}
      {notice ? (
        <p
          role="status"
          data-testid="personal-routine-outcome"
          style={{ whiteSpace: "pre-line" }}
        >
          {notice}
        </p>
      ) : null}
      <LifePathsPanel
        world={world}
        onWorldChange={(next) => commit(next)}
        transitionHandlers={createCampaignElectionTransitionRegistry()}
        showTimeControl={false}
      />
      <PlacesWorkspace
        world={world}
        personId={personId}
        onWorldChange={(next) => commit(next)}
        onOpenEntity={onOpenEntity}
        onTogglePin={onTogglePin}
        transitionHandlers={createCampaignElectionTransitionRegistry()}
      />
    </details>
  );
}
