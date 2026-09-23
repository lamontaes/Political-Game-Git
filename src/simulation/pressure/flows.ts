/**
 * People moving between states, decided by the pressure to leave and the pull
 * to arrive. Flows are shares of a state's people, never head counts: the
 * simulation holds no state population (`state-populations` is not built).
 */

import type { EntityId, World } from "../types";
import type { PressureReading, StateFlowRecord } from "./contract";

/**
 * BLANKET: the share of a state's people who move to another state in a year
 * with no pressure at all. Not researched; filed as
 * `state-to-state-moves-what-pushes-and-pulls`.
 */
export const BLANKET_BASE_OUTFLOW_PCT_PER_YEAR = 2;

/** BLANKET: the lowest pull a state can have, so no state is never chosen. */
export const BLANKET_MIN_PULL = 0.1;

/** How many destinations a flow record keeps per origin. */
export const FLOW_DESTINATIONS_KEPT = 5;

/**
 * The latest quarter's readings, by state key. A state with no reading in the
 * latest quarter carries no pressure.
 */
export function latestReadings(
  world: World,
): ReadonlyMap<string, PressureReading> {
  const latest = new Map<string, PressureReading>();
  const store = world.pressure;
  if (!store) return latest;
  for (let index = store.readings.length - 1; index >= 0; index -= 1) {
    const reading = store.readings[index]!;
    if (reading.ordinal !== store.quartersStepped) break;
    latest.set(reading.stateKey, reading);
  }
  return latest;
}

/** How strongly a state draws movers: 1 when nothing is recorded. */
export function pullOf(reading: PressureReading | undefined): number {
  if (!reading) return 1;
  return Math.max(
    BLANKET_MIN_PULL,
    1 + reading.levels.arrive - reading.levels.leave,
  );
}

/** How strongly a state pushes people out: 1 when nothing is recorded. */
export function pushOf(reading: PressureReading | undefined): number {
  return 1 + (reading?.levels.leave ?? 0);
}

/**
 * Weights by jurisdiction id, for a draw that picks a destination (pull) or an
 * origin (push) among states. Every state not in the readings weighs 1.
 */
export function stateWeights(
  world: World,
  jurisdictionIds: readonly EntityId[],
  kind: "pull" | "push",
): readonly number[] {
  const byJurisdiction = new Map<EntityId, PressureReading>();
  for (const reading of latestReadings(world).values())
    byJurisdiction.set(reading.jurisdictionId, reading);
  return jurisdictionIds.map((id) =>
    kind === "pull"
      ? pullOf(byJurisdiction.get(id))
      : pushOf(byJurisdiction.get(id)),
  );
}

/**
 * One year's flows between `stateKeys`, from the readings that close it. A
 * state missing from `readings` carries no pressure.
 */
export function flowsForYear(
  stateKeys: readonly string[],
  readings: ReadonlyMap<string, PressureReading>,
  year: number,
): readonly StateFlowRecord[] {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return stateKeys.map((origin) => {
    const others = stateKeys.filter((other) => other !== origin);
    const total = others.reduce(
      (sum, other) => sum + pullOf(readings.get(other)),
      0,
    );
    const destinations = others
      .map((other) => ({
        stateKey: other,
        sharePct: total > 0 ? (pullOf(readings.get(other)) / total) * 100 : 0,
      }))
      .sort(
        (a, b) =>
          b.sharePct - a.sharePct || a.stateKey.localeCompare(b.stateKey),
      )
      .slice(0, FLOW_DESTINATIONS_KEPT)
      .map((entry) => ({ ...entry, sharePct: round(entry.sharePct) }));
    return {
      key: `${year}:${origin}`,
      year,
      fromStateKey: origin,
      outflowSharePct: round(
        BLANKET_BASE_OUTFLOW_PCT_PER_YEAR * pushOf(readings.get(origin)),
      ),
      destinations,
    };
  });
}

/** Recorded flows, optionally for one year. Reads only. */
export function stateFlows(
  world: World,
  year?: number,
): readonly StateFlowRecord[] {
  const flows = world.pressure?.flows ?? [];
  return year === undefined ? flows : flows.filter((row) => row.year === year);
}
