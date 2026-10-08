import {
  controlledCommitmentsBlockingMinuteAdvance,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type ResourceEndpoint,
  type World,
} from "../simulation";
import { organizationNameAt } from "../simulation/living-world/party-registry";
import { personName } from "../simulation/people";
import { moneyText } from "../simulation/money-text";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { recordedPayStubs } from "../simulation/resource-income";

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

/** Who a payment went to or came from, as recorded; null when not recorded. */
function endpointName(
  world: World,
  endpoint: ResourceEndpoint | undefined,
): string | null {
  if (!endpoint) return null;
  if (endpoint.kind === "person") {
    const person = world.people[endpoint.personId];
    return person ? personName(person) : null;
  }
  if (endpoint.kind === "household") {
    return (
      world.history.households.find((h) => h.id === endpoint.householdId)
        ?.label ?? null
    );
  }
  return organizationNameAt(world, endpoint.organizationId);
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
  const newPayStubIds = new Set(
    recordedPayStubs(after, personId)
      .filter((stub) =>
        after.history.resourceTransferOutcomes
          .slice(before.history.resourceTransferOutcomes.length)
          .some((outcome) => outcome.id === stub.paycheck.id),
      )
      .map((stub) => stub.paycheck.id),
  );
  const amounts = new Map<
    string,
    {
      label: string;
      currency: string;
      minorUnits: number;
      counterparty: string | null;
    }
  >();
  for (const outcome of after.history.resourceTransferOutcomes.slice(
    before.history.resourceTransferOutcomes.length,
  )) {
    if (newPayStubIds.has(outcome.id)) continue;
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
      const counterparty = endpointName(
        after,
        received ? flow?.source : flow?.recipient,
      );
      const key = `${label} ${currency} ${counterparty ?? ""}`;
      amounts.set(key, {
        label,
        currency,
        counterparty,
        minorUnits:
          (amounts.get(key)?.minorUnits ?? 0) +
          outcome.transferredAmount.minorUnits,
      });
      if (outcome.status === "blocked" || outcome.status === "missed")
        lines.push(outcome.note ?? "Payment remains unresolved.");
    }
  }
  for (const { label, currency, minorUnits, counterparty } of amounts.values())
    if (minorUnits > 0) {
      const named = counterparty
        ? ` ${label === "Paid" ? "to" : "from"} ${counterparty}`
        : "";
      lines.push(`${label} ${moneyText({ currency, minorUnits })}${named}.`);
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
