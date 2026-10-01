import type { HistoricalEvent, World } from "../types";
import type { PressureReading } from "./contract";
import { latestReadings } from "./flows";
import { stepPressureLadder } from "./ladder";

export {
  BLANKET_POLITICAL_VIOLENCE,
  PRESSURE_ANGER_METRIC_STABLE_KEY,
  PRESSURE_LADDER_INCIDENT_STABLE_KEYS,
  THREAT_ATTEMPTED_PHASE,
  THREAT_INCIDENT_STABLE_KEY,
  THREAT_LAPSED_PHASE,
  UNREST_CALMED_PHASE,
  UNREST_INCIDENT_STABLE_KEY,
  UNREST_LASTING_PHASE,
  ensurePressureLadder,
  prominentPeopleIn,
  threatAttemptLine,
  threatIncidentDefinition,
  threatStrain,
  unrestIncidentDefinition,
} from "./ladder";

/** Tags the ladder's unrest and threat onset events carry. */
export const UNREST_EVENT = "pressure.unrest";
export const POLITICAL_THREAT_EVENT = "pressure.political-threat";

/** Quarterly pressure still feeds the recorded domestic incident ladder.
 * The retired canned international stories supply no crisis causes.
 */
export function stepPressureEvents(world: World): World {
  if (!world.pressure || world.pressure.quartersStepped === 0) return world;
  const readings = [...latestReadings(world).values()].sort((a, b) =>
    a.stateKey.localeCompare(b.stateKey),
  );
  return stepPressureLadder(world, readings);
}

/** Compatibility readers for the retired synthetic international feed.
 * Actual crises continue through the canonical crisis writers.
 */
export function internationalFriction(
  _world: World,
  _readings: readonly PressureReading[],
): ReadonlyMap<
  string,
  { friction: number; subject: string; reported: HistoricalEvent }
> {
  return new Map();
}
export function stepInternationalFriction(
  world: World,
  _readings?: readonly PressureReading[],
): World {
  return world;
}
