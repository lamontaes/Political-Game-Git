/**
 * What a local seat pays and how many hours it takes (office play,
 * OFFICE-LOCAL). A place's own charter or ordinance is used where one is
 * read; every other seat starts from its band's estimate for the body's
 * size (`data/research/local-government/local-office-pay-2026.json`), moved
 * within the band's recorded spread once per world (the estimate rule: a
 * visible value starts from the real average with a per-world spread). The
 * same seat in the same world always pays the same.
 */
import research from "../../data/research/local-government/local-office-pay-2026.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import { officeDayParameter } from "./office-day-calendar";

interface Estimate {
  readonly value: number;
  readonly tag: string;
  readonly low: number;
  readonly high: number;
  readonly from: string;
}
type ByBand = Readonly<Record<string, Estimate>>;
const RESEARCH = research as unknown as {
  bands: readonly { id: string; minPopulation: number }[];
  annualPayUsd: Readonly<Record<string, ByBand>>;
  weeklyHours: Readonly<Record<string, ByBand>>;
  mayorFullTime: Readonly<Record<string, boolean>>;
};

/** The research row each local office kind is paid by. */
const PAY_ROWS: Readonly<Record<string, string>> = {
  council: "council-member",
  "township-board": "council-member",
  mayor: "mayor",
  "county-board": "county-commissioner",
  // A county's elected executive is its mayor: paid like a mayor of its size.
  "county-executive": "mayor",
};

export interface SeatPay {
  readonly annualMinor: number;
  readonly weeklyHours: number;
  /** The seat is the holder's job; otherwise they keep theirs and are paid this besides. */
  readonly fullTime: boolean;
  readonly citation: string;
}

/** Where `key` falls in the spread: low at 0, the band's value at 0.5, high at 1. */
function within(estimate: Estimate, position: number): number {
  return position < 0.5
    ? estimate.low + (estimate.value - estimate.low) * (position / 0.5)
    : estimate.value +
        (estimate.high - estimate.value) * ((position - 0.5) / 0.5);
}

/** A local seat's pay and hours, or null for an office this table does not pay. */
export function seatPay(input: {
  readonly officeKind: string;
  readonly officeId: string;
  readonly population: number;
  readonly worldSeed: string;
}): SeatPay | null {
  const row = PAY_ROWS[input.officeKind];
  if (!row) return null;
  const band = [...RESEARCH.bands]
    .reverse()
    .find((b) => input.population >= b.minPopulation)!;
  const pay = RESEARCH.annualPayUsd[row]?.[band.id];
  const hours = RESEARCH.weeklyHours[row]?.[band.id];
  if (!pay || !hours) return null;
  // One position per seat and world: the place's estimate, not a draw for any person.
  const position =
    parseInt(
      stableHash(`${input.worldSeed}|${input.officeId}|pay`).slice(0, 8),
      16,
    ) / 0x1_0000_0000;
  const dollars = Math.round(within(pay, position));
  const weeklyHours = Math.round(within(hours, position));
  const fullTime =
    weeklyHours >= officeDayParameter("fullTimeWeeklyHours") ||
    (row === "mayor" && RESEARCH.mayorFullTime[band.id] === true);
  return {
    annualMinor: dollars * 100,
    weeklyHours,
    fullTime,
    citation: `${row}, ${input.population} people (band ${band.id}): $${dollars} a year and ${weeklyHours} hours a week, within the band's spread $${pay.low} to $${pay.high} (${pay.tag}; local-office-pay-2026.json: ${pay.from})`,
  };
}
