import {
  controlledCommitmentsBlockingMinuteAdvance,
  currentLifeCutoff,
  futureDueItemStateAt,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type World,
} from "../simulation";
import { moneyText } from "../simulation/money-text";
import { proseDate, proseWeekdayDate } from "./prose-dates";

/** "7:00 a.m.": a time of day as a person would say it. */
export function proseClockTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${minute.toString().padStart(2, "0")} ${hour < 12 ? "a.m." : "p.m."}`;
}

/**
 * What a skip produced beyond the clock itself, or null when it produced
 * nothing else. The room's corner already shows the new date and time, so a
 * notice that would only repeat it is not shown.
 */
export function routineOutcomeAfterClock(outcome: string): string | null {
  const rest = outcome.split("\n").slice(1).join("\n").trim();
  return rest ? rest : null;
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
  // The first line is always the clock; `routineOutcomeAfterClock` relies on it.
  const lines = [
    elapsed > 0
      ? `It is now ${proseWeekdayDate(after.currentDate)}, ${proseClockTime(
          after.currentMoment.minuteOfDay,
        )}.`
      : "No time passed.",
  ];
  const events = after.history.events.slice(before.history.events.length);
  const work = events.filter(
    (e) =>
      e.type === "life-paths2.work-session" &&
      e.involvedEntityIds.includes(personId),
  );
  if (work.length)
    lines.push(
      `${work.length} ordinary work shift${work.length === 1 ? "" : "s"} completed.`,
    );
  const amounts = new Map<
    string,
    { label: string; currency: string; minorUnits: number }
  >();
  for (const outcome of after.history.resourceTransferOutcomes.slice(
    before.history.resourceTransferOutcomes.length,
  )) {
    const flow = after.history.resourceFlows.find(
      (f) => f.id === outcome.resourceFlowId,
    );
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
  for (const due of after.history.futureDueItems) {
    if (
      due.transitionKey === "life-paths2:pay" &&
      due.entityIds.some((id) => work.some((e) => e.id === id)) &&
      futureDueItemStateAt(after, due.id, currentLifeCutoff(after))?.status ===
        "scheduled"
    )
      lines.push(
        `Earned shift pay is due ${proseDate(due.dueAt)}; it has not posted yet.`,
      );
  }
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
    lines.push(
      activity
        ? `Stopped for ${activity.title}; resolve this commitment before continuing.`
        : "Stopped before the requested time; resolve the pending commitment before continuing.",
    );
  }
  return lines.join("\n");
}
