import type { SimulationMoment } from "../../simulation/types";
import { makeIsoDate } from "../elections/calendar";
/** Numeric part of the frozen authored legislative scenario constructor. */
export function scenarioInitialMoment(
  timeZone: string,
  utcOffsetMinutes: number,
): SimulationMoment {
  return {
    date: makeIsoDate("2026-01-05") as SimulationMoment["date"],
    minuteOfDay: 9 * 60 + 10,
    timeZone,
    utcOffsetMinutes,
  };
}

// stopgapId: "SG-P14-legislatures-fixture-initial-clock"
