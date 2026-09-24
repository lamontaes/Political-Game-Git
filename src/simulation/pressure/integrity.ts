import type { World } from "../types";
import { PRESSURE_CONTRACT_VERSION, PRESSURE_KINDS } from "./contract";

/** The pressure store is append-only, ordered and never ahead of the clock. */
export function assertPressureIntegrity(world: World): void {
  const store = world.pressure;
  if (!store) return;
  if (store.contractVersion !== PRESSURE_CONTRACT_VERSION)
    throw new Error("Pressure store has an unknown contract version.");
  if (
    !Number.isSafeInteger(store.quartersStepped) ||
    store.quartersStepped < 0 ||
    (store.quartersStepped === 0) !== (store.lastPeriodEnd === null) ||
    (store.lastPeriodEnd !== null && store.lastPeriodEnd > world.currentDate)
  )
    throw new Error("Pressure store has an invalid quarter count or date.");
  const keys = new Set<string>();
  let ordinal = 0;
  for (const reading of store.readings) {
    if (keys.has(reading.key))
      throw new Error(`Duplicate pressure reading ${reading.key}.`);
    keys.add(reading.key);
    if (reading.ordinal < ordinal || reading.ordinal > store.quartersStepped)
      throw new Error(`Pressure reading ${reading.key} is out of order.`);
    ordinal = reading.ordinal;
    if (
      reading.periodStart > reading.periodEnd ||
      reading.periodEnd > world.currentDate
    )
      throw new Error(`Pressure reading ${reading.key} has an invalid period.`);
    if (!world.jurisdictions[reading.jurisdictionId])
      throw new Error(`Pressure reading ${reading.key} names no jurisdiction.`);
    for (const kind of PRESSURE_KINDS) {
      const level = reading.levels[kind];
      if (!Number.isFinite(level) || level < 0)
        throw new Error(
          `Pressure reading ${reading.key} has an invalid ${kind}.`,
        );
    }
  }
  const flowKeys = new Set<string>();
  for (const flow of store.flows) {
    if (flowKeys.has(flow.key))
      throw new Error(`Duplicate state flow ${flow.key}.`);
    flowKeys.add(flow.key);
    if (!Number.isFinite(flow.outflowSharePct) || flow.outflowSharePct < 0)
      throw new Error(`State flow ${flow.key} has an invalid share.`);
  }
}
