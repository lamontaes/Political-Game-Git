/**
 * How the outcome web's death-rate factors reach a person's hazard. One rule
 * for both tiers: a full person's strain (modules/health.ts) and a counted
 * person's chance of a serious illness (births-counted.ts) are multiplied by
 * `deathWebFactor` for their age and income fifth.
 *
 * - Infants (under one) read health.infant-mortality.
 * - Ages 55 to 64 read health.mortality-55-64.
 * - Deaths carry no cause, so a traffic link moves the share of deaths a
 *   crash stands for at that age (IIHS crash deaths per 100,000 over the life
 *   table's death rate at the age), not every death.
 */
import deathWeb from "./data/health/death-web.json" with { type: "json" };
import { ssa2023AnnualProbability } from "./health-mortality-table";
import { webReach, type Subject } from "./outcome-web-reach";
import type { CoreAPI, CoreState } from "./types";

export const DEATH_WEB_REFRESH_DAY = deathWeb.refreshDayOfMonth;

interface RateBand {
  readonly min: number;
  readonly max: number;
  readonly rate: number;
}
const BANDS = deathWeb.traffic.ratePer100000ByAgeBand as readonly RateBand[];
const PER_100000 = 100_000;
const HALF = 2;

/** Crash deaths per 100,000 at an age: between the bands' midpoints, so no age is a cliff. */
function trafficRate(age: number): number {
  const mids = BANDS.map((band) => (band.min + band.max) / HALF);
  if (age <= mids[0]!) return BANDS[0]!.rate;
  for (let i = 1; i < BANDS.length; i += 1)
    if (age <= mids[i]!) {
      const share = (age - mids[i - 1]!) / (mids[i]! - mids[i - 1]!);
      return BANDS[i - 1]!.rate + (BANDS[i]!.rate - BANDS[i - 1]!.rate) * share;
    }
  return BANDS[BANDS.length - 1]!.rate;
}

const shares = new Map<number, number>();
/** The share of deaths at a whole age that a traffic crash stands for (the table is fixed). */
export function trafficShareOfDeaths(age: number): number {
  const whole = Math.max(0, Math.floor(age));
  let share = shares.get(whole);
  if (share === undefined) {
    const allCause =
      (Number(ssa2023AnnualProbability(Math.min(whole, 119), "male")) +
        Number(ssa2023AnnualProbability(Math.min(whole, 119), "female"))) /
      HALF;
    share = Math.min(1, trafficRate(whole) / PER_100000 / allCause);
    shares.set(whole, share);
  }
  return share;
}

export interface DeathWeb {
  /** The multiplier on the person's death hazard (1 where nothing moves it). */
  readonly factor: number;
  /** The web month row the factor stands on, or null. */
  readonly recordId: string | null;
}

const CACHE = new WeakMap<
  object,
  { date: string; rows: Map<string, DeathWeb> }
>();

/** The web's factor on one person's death hazard this month, cached by place, age and income fifth. */
export function deathWebFactor(
  api: CoreAPI,
  placeId: string,
  age: number,
  incomeFifth?: number,
): DeathWeb {
  const core = api.state as CoreState;
  let cache = CACHE.get(core);
  if (!cache || cache.date !== core.date) {
    cache = { date: core.date, rows: new Map() };
    CACHE.set(core, cache);
  }
  const whole = Math.max(0, Math.floor(age));
  const key = `${placeId}|${whole}|${incomeFifth ?? "-"}`;
  const found = cache.rows.get(key);
  if (found) return found;
  const subject: Subject = {
    age: whole,
    ...(incomeFifth === undefined ? {} : { incomeFifth }),
  };
  const mortality5564 = deathWeb.mortality5564;
  const ownMeasure =
    whole < deathWeb.infantBelowAge
      ? "health.infant-mortality"
      : whole >= mortality5564.fromAge && whole < mortality5564.belowAge
        ? "health.mortality-55-64"
        : undefined;
  const own = ownMeasure
    ? webReach(api, placeId, ownMeasure, subject)
    : undefined;
  const traffic = webReach(api, placeId, "traffic.fatality-rate", subject);
  const result: DeathWeb = {
    factor:
      (own?.factor ?? 1) *
      (1 + trafficShareOfDeaths(whole) * (traffic.factor - 1)),
    recordId: own?.recordId ?? traffic.recordId,
  };
  cache.rows.set(key, result);
  return result;
}

/** The health links no engine reads yet, each named by its registered stopgap. */
const WAITING_STOPGAPS = [
  "SG-EW-HEALTH-coverage-record",
  "SG-EW-HEALTH-death-cause",
  "SG-EW-HEALTH-condition-record",
  "SG-EW-HEALTH-unsized-links",
  "SG-EW-HEALTH-person-level",
] as const;

export function markWaitingHealthLinks(api: CoreAPI): void {
  for (const id of WAITING_STOPGAPS) api.stopgap(id);
}
