/**
 * One quarterly step of the pressure layer: every state's pressures fade, the
 * quarter's causes add to them, and a reading is appended for each state that
 * carries something. Every fourth step also records the year's flows between
 * states when any state carries pressure and, when one carries pressure to
 * leave, a public event the press can print.
 *
 * Runs inside the migration review's scheduled transition rather than as a
 * transition of its own, because each scheduled transition costs the clock two
 * whole-world copies and an integrity check. No integrity check here.
 */

import { addDays } from "../dates";
import { stateKeyForJurisdiction } from "../life-places";
import type { EntityId, IsoDate, Jurisdiction, World } from "../types";
import { recordWorldEvent } from "../world";
import { causesInPeriod } from "./causes";
import {
  PRESSURE_CONTRACT_VERSION,
  PRESSURE_KINDS,
  STATE_FLOWS_EVENT,
  type PressureKind,
  type PressureReading,
  type PressureStore,
  type StateFlowRecord,
} from "./contract";
import { flowsForYear, latestReadings } from "./flows";

/** BLANKET: the share of every pressure lost each quarter. Not researched. */
export const BLANKET_FADE_PER_QUARTER = 0.25;

/** How far the first reading looks back: one migration review interval. */
export const FIRST_PERIOD_DAYS = 91;

/** Quarters per recorded year of flows. */
export const QUARTERS_PER_FLOW_YEAR = 4;

/** The world's states, one jurisdiction per state key, in world order. */
export function worldStates(world: World): readonly {
  readonly stateKey: string;
  readonly jurisdiction: Jurisdiction;
}[] {
  const seen = new Set<string>();
  const states: { stateKey: string; jurisdiction: Jurisdiction }[] = [];
  for (const id of world.jurisdictionOrder) {
    const jurisdiction = world.jurisdictions[id];
    if (!jurisdiction) continue;
    const stateKey = stateKeyForJurisdiction(jurisdiction);
    if (!stateKey || seen.has(stateKey)) continue;
    seen.add(stateKey);
    states.push({ stateKey, jurisdiction });
  }
  return states;
}

/**
 * Steps the quarter ending today. Idempotent for a date. A state is given a
 * reading only when it carries something (see `PressureStore`).
 */
export function stepPressure(world: World): World {
  const store: PressureStore = world.pressure ?? {
    contractVersion: PRESSURE_CONTRACT_VERSION,
    quartersStepped: 0,
    lastPeriodEnd: null,
    readings: [],
    flows: [],
  };
  const periodEnd = world.currentDate;
  if (store.lastPeriodEnd && store.lastPeriodEnd >= periodEnd) return world;
  // The first period reaches back one review interval, to the opening day.
  const periodStart: IsoDate = store.lastPeriodEnd
    ? addDays(store.lastPeriodEnd, 1)
    : addDays(periodEnd, -FIRST_PERIOD_DAYS);
  const ordinal = store.quartersStepped + 1;
  const previous = latestReadings(world);
  const causes = causesInPeriod(world, periodStart, periodEnd);
  const states = worldStates(world);

  const readings: PressureReading[] = [];
  for (const { stateKey, jurisdiction } of states) {
    const contributions = causes.get(stateKey) ?? [];
    const before = previous.get(stateKey)?.levels;
    const levels = Object.fromEntries(
      PRESSURE_KINDS.map((kind) => [
        kind,
        round(
          (before?.[kind] ?? 0) * (1 - BLANKET_FADE_PER_QUARTER) +
            contributions
              .filter((entry) => entry.kind === kind)
              .reduce((sum, entry) => sum + entry.amount, 0),
        ),
      ]),
    ) as Record<PressureKind, number>;
    if (
      contributions.length === 0 &&
      PRESSURE_KINDS.every((kind) => levels[kind] === 0)
    )
      continue;
    readings.push({
      key: `${ordinal}:${stateKey}`,
      ordinal,
      stateKey,
      jurisdictionId: jurisdiction.id,
      periodStart,
      periodEnd,
      levels,
      contributions,
    });
  }

  const current = new Map(readings.map((row) => [row.stateKey, row]));
  const closesYear = ordinal % QUARTERS_PER_FLOW_YEAR === 0;
  const flows: readonly StateFlowRecord[] =
    closesYear && current.size > 0 && states.length > 1
      ? flowsForYear(
          states.map((state) => state.stateKey),
          current,
          Number(periodEnd.slice(0, 4)),
        )
      : [];

  let next: World = {
    ...world,
    pressure: {
      ...store,
      quartersStepped: ordinal,
      lastPeriodEnd: periodEnd,
      readings: [...store.readings, ...readings],
      flows: [...store.flows, ...flows],
    },
  };
  const reported = flows.length > 0 ? largestPushedFlow(readings, flows) : null;
  if (reported) next = recordFlowEvent(next, reported, ordinal);
  return next;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * The origin whose movers were most pushed by a recorded cause, or null when
 * no state carries any pressure to leave. With nothing recorded, every state
 * sends the same share and there is no pattern to report.
 */
function largestPushedFlow(
  readings: readonly PressureReading[],
  flows: readonly StateFlowRecord[],
): { reading: PressureReading; flow: StateFlowRecord } | null {
  const pushed = readings
    .filter((reading) => reading.levels.leave > 0)
    .sort(
      (a, b) =>
        b.levels.leave - a.levels.leave || a.stateKey.localeCompare(b.stateKey),
    )[0];
  if (!pushed) return null;
  const flow = flows.find((row) => row.fromStateKey === pushed.stateKey);
  return flow ? { reading: pushed, flow } : null;
}

function recordFlowEvent(
  world: World,
  { reading, flow }: { reading: PressureReading; flow: StateFlowRecord },
  ordinal: number,
): World {
  const from = world.jurisdictions[reading.jurisdictionId]!;
  const top = flow.destinations[0];
  const destination = top
    ? worldStates(world).find((state) => state.stateKey === top.stateKey)
    : undefined;
  const involved: EntityId[] = [from.id];
  if (destination) involved.push(destination.jurisdiction.id);
  const destinationClause = destination
    ? ` The most went to ${destination.jurisdiction.name}.`
    : "";
  return recordWorldEvent(world, {
    stableKey: `pressure:state-flows:${ordinal}`,
    type: STATE_FLOWS_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: from.id,
    involvedEntityIds: involved,
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `year:${flow.year}`,
      `from:${flow.fromStateKey}`,
      ...(top ? [`to:${top.stateKey}`] : []),
      `outflow-pct:${flow.outflowSharePct}`,
    ],
    summary: `A larger share of people left ${from.name} for other states this year than left any other state, about ${flow.outflowSharePct} percent.${destinationClause}`,
    context: {
      location: { jurisdictionId: from.id, label: from.name, setting: null },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
