/**
 * How the outcome web's death-rate factors reach a person's hazard. One rule
 * for both tiers: a full person's strain (modules/health.ts) and a counted
 * person's chance of a serious illness (births-counted.ts) are multiplied by
 * `deathWebFactor` for their age and income fifth.
 *
 * - Infants (under one) read health.infant-mortality.
 * - Ages 55 to 64 read health.mortality-55-64.
 * - Every cause (overdose, youth firearm homicide and suicide, motor
 *   vehicle; death-cause.ts) moves its share of the deaths at that age, so
 *   the total hazard rises by the share the web moved.
 */
import deathWeb from "./data/health/death-web.json" with { type: "json" };
import { causeMix } from "./death-cause";
import { webReach, type Subject } from "./outcome-web-reach";
import type { CoreAPI, CoreState } from "./types";

export const DEATH_WEB_REFRESH_DAY = deathWeb.refreshDayOfMonth;

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
  const causes = causeMix(api, placeId, whole, incomeFifth);
  const result: DeathWeb = {
    factor: (own?.factor ?? 1) * causes.factor,
    recordId: own?.recordId ?? causes.recordId,
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
