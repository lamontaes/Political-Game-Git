/**
 * How the outcome web's death-rate factors reach a person's hazard. One rule
 * for both tiers: a full person's strain (modules/health.ts) and a counted
 * person's chance of a serious illness (births-counted.ts) are multiplied by
 * `deathWebFactor` for their age and income fifth.
 *
 * - Infants (under one) read health.infant-mortality.
 * - Ages 55 to 64 read health.mortality-55-64.
 * - Every cause (overdose, firearm homicide, youth firearm suicide, motor
 *   vehicle; death-cause.ts) moves its share of the deaths at that age, so
 *   the total hazard rises by the share the web moved. Firearm homicide reads
 *   the youth firearm deaths at ages 1 to 19 and the crime outcome (the
 *   stand-your-ground and permit laws) at every age.
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
  /**
   * The person's own records are read for the link that has a place-level
   * twin at their age (health-own.ts), so the twin row is left out of the
   * web's factor and the cause moves them once.
   */
  ownRecords = false,
): DeathWeb {
  const core = api.state as CoreState;
  let cache = CACHE.get(core);
  if (!cache || cache.date !== core.date) {
    cache = { date: core.date, rows: new Map() };
    CACHE.set(core, cache);
  }
  const whole = Math.max(0, Math.floor(age));
  const key = `${placeId}|${whole}|${incomeFifth ?? "-"}|${ownRecords ? "own" : "place"}`;
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
  const twin = mortality5564.personLevel.placeTwin;
  const own = ownMeasure
    ? webReach(
        api,
        placeId,
        ownMeasure,
        subject,
        ownRecords && ownMeasure === "health.mortality-55-64"
          ? new Set([twin])
          : undefined,
      )
    : undefined;
  const causes = causeMix(api, placeId, whole, incomeFifth);
  const result: DeathWeb = {
    factor: (own?.factor ?? 1) * causes.factor,
    recordId: own?.recordId ?? causes.recordId,
  };
  cache.rows.set(key, result);
  return result;
}

/**
 * The web's factor on a teen's past-month cannabis use for their age in a
 * place this month (cannabis-sales-to-youth-use), and the web month record it
 * stands on: the health engine's teen record reads it (modules/health.ts).
 */
export function youthCannabisWeb(
  api: CoreAPI,
  placeId: string,
  measure: string,
  age: number,
): DeathWeb {
  const found = webReach(api, placeId, measure, { age });
  return { factor: found.factor, recordId: found.recordId };
}

/** The health links no engine reads yet, each named by its registered stopgap. */
const WAITING_STOPGAPS = [
  "SG-EW-HEALTH-marriage-equality-cause",
  "SG-EW-HEALTH-death-cause",
  "SG-EW-HEALTH-condition-record",
  "SG-EW-HEALTH-unsized-links",
  "SG-EW-HEALTH-person-level",
] as const;

export function markWaitingHealthLinks(api: CoreAPI): void {
  for (const id of WAITING_STOPGAPS) api.stopgap(id);
}
