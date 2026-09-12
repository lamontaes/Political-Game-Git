import {
  controlledCommitmentsBlockingMinuteAdvance,
  currentLifeCutoff,
  futureDueItemStateAt,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type World,
} from "../simulation";

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
  const lines = [
    elapsed > 0
      ? `${formatRoutineElapsedMinutes(elapsed)} passed (${elapsed} minutes). Now ${after.currentDate} at ${Math.floor(
          after.currentMoment.minuteOfDay / 60,
        )
          .toString()
          .padStart(
            2,
            "0",
          )}:${(after.currentMoment.minuteOfDay % 60).toString().padStart(2, "0")}.`
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
  const amounts = new Map<string, number>();
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
      const key = `${received ? "Received" : "Paid"} ${outcome.transferredAmount.currency}`;
      amounts.set(
        key,
        (amounts.get(key) ?? 0) + outcome.transferredAmount.minorUnits,
      );
      if (outcome.status === "blocked" || outcome.status === "missed")
        lines.push(outcome.note ?? "Payment remains unresolved.");
    }
  }
  for (const [key, amount] of amounts)
    if (amount > 0) lines.push(`${key}: ${(amount / 100).toFixed(2)}.`);
  for (const due of after.history.futureDueItems) {
    if (
      due.transitionKey === "life-paths2:pay" &&
      due.entityIds.some((id) => work.some((e) => e.id === id)) &&
      futureDueItemStateAt(after, due.id, currentLifeCutoff(after))?.status ===
        "scheduled"
    )
      lines.push(
        `Earned shift pay is due ${due.dueAt}; it has not posted yet.`,
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
