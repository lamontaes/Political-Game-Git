// The federal day's world parts, in a module of their own with no imports. A federal part registers when
// its file loads (the president's file adds the Senate's votes on nominations), and that file and
// office-day-federal.ts import each other: a list declared inside office-day-federal.ts is not yet
// initialized when the president's file registers into it ("Cannot access 'worldParts' before
// initialization"). Here the list always exists before either file runs.
import type { CoreAPI } from "./types";

type WorldPart = (api: CoreAPI) => void;
export const worldParts: WorldPart[] = [];

/** A federal part adds what happens each day whoever the player controls (the Senate's votes on nominations). */
export function addFederalWorldPart(part: WorldPart): void {
  if (!worldParts.includes(part)) worldParts.push(part);
}

type DayPart = (api: CoreAPI, personId: string) => void;
export const dayParts: DayPart[] = [];

/** A federal part adds what it does each day for the controlled holder (the president's duties). */
export function addFederalDayPart(part: DayPart): void {
  if (!dayParts.includes(part)) dayParts.push(part);
}
