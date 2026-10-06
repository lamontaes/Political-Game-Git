import {
  controlledCommitmentsBlockingMinuteAdvance,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type World,
} from "../simulation";
import { moneyText } from "../simulation/money-text";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { recordById } from "../simulation/history-index";

/** "7:00 a.m.": a time of day as a person would say it. */
export function proseClockTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${minute.toString().padStart(2, "0")} ${hour < 12 ? "a.m." : "p.m."}`;
}

/** Elapsed clock duration, not a guessed number of calendar dates. */
export function formatRoutineElapsedMinutes(minutes: number): string {
  const parts: string[] = [];
  for (const [unit, size] of [
    ["day", 1440],
    ["hour", 60],
    ["minute", 1],
  ] as const) {
    const count = Math.floor(minutes / size);
    minutes %= size;
    if (count) parts.push(`${count} ${unit}${count === 1 ? "" : "s"}`);
  }
  return parts.join(", ") || "0 minutes";
}

/** Read only: summarize actual appended outcomes, never advertised earnings. */
export function describeRoutineOutcome(
  before: World,
  after: World,
  personId: EntityId,
  requestedMinutes?: number,
): string {
  const elapsed = simulationMinutesBetween(
    before.currentMoment,
    after.currentMoment,
  );
  const lines = elapsed === 0 ? ["No time passed."] : [];
  const events = after.history.events.slice(before.history.events.length);
  const newOutcomes = after.history.resourceTransferOutcomes.slice(
    before.history.resourceTransferOutcomes.length,
  );
  const amounts = new Map<
    string,
    { label: string; currency: string; minorUnits: number }
  >();
  for (const outcome of newOutcomes) {
    const flow = recordById(
      after.history.resourceFlows,
      outcome.resourceFlowId,
    );
    // Routine notices omit payroll transfers just as recordedPayStubs does,
    // without rebuilding every historical stub (and its tax rows) on each
    // daily call. Only newly appended outcomes can affect this notice.
    const isRecordedPaycheck =
      outcome.occurredAt <= after.currentDate &&
      flow?.basisKind.startsWith("compensation:") &&
      flow.recipient.kind === "person" &&
      flow.recipient.personId === personId &&
      flow.source.kind === "organization";
    if (isRecordedPaycheck) continue;
    const received =
      flow?.recipient.kind === "person" && flow.recipient.personId === personId;
    const sent =
      flow?.source.kind === "person" && flow.source.personId === personId;
    if (received || sent) {
      const label = received ? "Received" : "Paid";
      const currency = outcome.transferredAmount.currency;
      const key = `${label} ${currency}`;
      amounts.set(key, {
        label,
        currency,
        minorUnits:
          (amounts.get(key)?.minorUnits ?? 0) +
          outcome.transferredAmount.minorUnits,
      });
      if (outcome.status === "blocked" || outcome.status === "missed")
        lines.push(outcome.note ?? "Payment remains unresolved.");
    }
  }
  for (const { label, currency, minorUnits } of amounts.values())
    if (minorUnits > 0)
      lines.push(`${label} ${moneyText({ currency, minorUnits })}.`);
  for (const state of after.history.futureDueItemStates.slice(
    before.history.futureDueItemStates.length,
  )) {
    const due = after.history.futureDueItems.find(
      (d) => d.id === state.dueItemId,
    );
    if (
      state.status === "blocked" &&
      due?.entityIds.some((id) =>
        after.history.educationEnrollments.some(
          (e) => e.id === id && e.personId === personId,
        ),
      )
    )
      lines.push(state.context ?? "Study is pending unpaid tuition.");
  }
  for (const event of events)
    if (
      event.involvedEntityIds.includes(personId) &&
      (event.type === "life.scene.arrived" ||
        event.type === "life-paths2.credential" ||
        event.type === "life-paths2.tuition-grace-opened" ||
        event.type === "life-paths2.tuition-paused" ||
        event.type === "life-paths2.study-period")
    )
      lines.push(event.summary);
  if (requestedMinutes !== undefined && elapsed < requestedMinutes) {
    const ids = controlledCommitmentsBlockingMinuteAdvance(after, 1);
    const activity = after.history.scheduledActivities.find(
      (a) =>
        ids.includes(a.id) &&
        scheduledActivityState(after, a.id).status === "scheduled",
    );
    const meeting =
      activity?.kind === "travel" &&
      activity.location.locationKey === "ordinary-life:to-meeting-room"
        ? after.history.scheduledActivities.find(
            (candidate) =>
              candidate.stableKey === `${PUBLIC_MEETING_KEY}:activity` &&
              activity.sourceEntityIds.includes(candidate.id),
          )
        : null;
    lines.push(
      meeting
        ? `The public meeting starts at ${proseClockTime(scheduledActivityState(after, meeting.id).start.minuteOfDay)} Choose Go to meeting or Stay home.`
        : activity
          ? `${activity.title} comes first.`
          : "Something on your calendar comes first.",
    );
  }
  return lines.join("\n");
}
