import { useState } from "react";
import {
  daysBetween,
  currentLifeCutoff,
  futureDueItemStateAt,
  type EntityId,
  type World,
} from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { describeRoutineOutcome } from "../presentation/routine-outcome";
import { previewTimeCommand } from "../presentation/time-command";
import {
  PROTECTED_STOP_NOTE,
  skipToLabel,
  stoppedEarlyLabel,
} from "../presentation/time-target-label";
import { proseDate } from "../presentation/prose-dates";
import { useTimeCommand } from "./time-command-runner";
import { LifePathsPanel } from "./LifePathsPanel";
import { PlacesWorkspace, type PlacesEntityRef } from "./PlacesWorkspace";

/** A owns the Personal root mount. This leaf owns no navigation or save store. */
export function PersonalRoutinePanel({
  world,
  personId,
  onWorldChange,
  onOpenEntity,
  onTogglePin,
  isPinned,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenEntity: (ref: PlacesEntityRef) => void;
  readonly onTogglePin: (ref: PlacesEntityRef) => void;
  readonly isPinned: (ref: PlacesEntityRef) => boolean;
}) {
  const [notice, setNotice] = useState("");
  const runner = useTimeCommand({ world, personId, onWorldChange });
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
  const pass = (days: number) =>
    runner.submit({ kind: "days", days }, (report) =>
      setNotice(
        report.stoppedEarly && report.target
          ? `${stoppedEarlyLabel(report.target)}\n${report.outcome}`
          : report.outcome,
      ),
    );
  const tomorrow = previewTimeCommand(world, personId, {
    kind: "days",
    days: 1,
  });
  const periodDays =
    nextPeriod && nextPeriod.dueAt > world.currentDate
      ? daysBetween(world.currentDate, nextPeriod.dueAt)
      : null;
  const periodTarget =
    periodDays === null
      ? null
      : previewTimeCommand(world, personId, { kind: "days", days: periodDays });
  const busy = runner.pending || undefined;
  const tuitionDeadline = nextPeriod?.stableKey.startsWith(
    "life-paths2.study-grace-deadline:",
  );
  return (
    <details data-testid="personal-routine">
      <summary>Jobs, study and outings</summary>
      <p>
        Read offers and accepted terms here. Reading does not pass time. Attend
        includes any journey disclosed by the offer.
      </p>
      <button
        type="button"
        aria-disabled={busy}
        aria-describedby="personal-routine-tomorrow-target"
        onClick={() => pass(1)}
      >
        Continue to tomorrow morning
      </button>
      <p id="personal-routine-tomorrow-target">
        {tomorrow ? `${skipToLabel(tomorrow.target)}. ` : ""}
        {PROTECTED_STOP_NOTE}
      </p>
      {nextPeriod && periodDays !== null ? (
        <>
          <p id="personal-routine-period-target">
            {tuitionDeadline
              ? "The disclosed tuition grace deadline is "
              : "The next accepted study period ends "}
            {proseDate(nextPeriod.dueAt)}.{" "}
            {periodTarget ? `${skipToLabel(periodTarget.target)}. ` : ""}
            Continuing resolves established ordinary work and tuition, but stops
            for protected commitments.
          </p>
          <button
            type="button"
            aria-disabled={busy}
            aria-describedby="personal-routine-period-target"
            onClick={() => pass(periodDays)}
          >
            {tuitionDeadline
              ? "Continue to tuition deadline"
              : "Continue to next study period"}
          </button>
        </>
      ) : null}
      {runner.pending ? <p role="status">Time is passing…</p> : null}
      {notice && !runner.pending ? (
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
        isPinned={isPinned}
        transitionHandlers={createCampaignElectionTransitionRegistry()}
      />
    </details>
  );
}
