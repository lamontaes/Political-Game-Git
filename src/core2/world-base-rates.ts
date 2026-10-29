/**
 * Each world's base-rate tables (owner, Oct 27: realistic, not real): one
 * factor per published table (deaths, births, moves, chronic conditions, time
 * use, college enrollment, college completion), drawn once from the world's
 * seed by the shared world draw, that scales the whole table. A base rate checks totals and never picks one actor's
 * outcome; the factor only makes the world's own rates differ from the
 * published ones. The spreads are parameter rows.
 */
import { parameter as p } from "./parameters";
import { worldLevel } from "./world-draw";

const SPREAD = {
  mortality: "worldBaseRateMortalitySpreadShare",
  natality: "worldBaseRateNatalitySpreadShare",
  movers: "worldBaseRateMoversSpreadShare",
  conditions: "worldBaseRateConditionsSpreadShare",
  timeUse: "worldBaseRateTimeUseSpreadShare",
  collegeEnrollment: "worldBaseRateCollegeEnrollmentSpreadShare",
  collegeCompletion: "worldBaseRateCollegeCompletionSpreadShare",
} as const;

export type BaseRateTable = keyof typeof SPREAD;
export const BASE_RATE_TABLES = Object.keys(SPREAD) as BaseRateTable[];

/** The world's factor for a published base-rate table: one moved by the world's offset for that table. */
export function worldRateFactor(seed: string, table: BaseRateTable): number {
  return worldLevel(p("one"), seed, `world-base-rate:${table}`, SPREAD[table]);
}

/** The parameter row holding a table's spread. */
export function baseRateSpreadRow(table: BaseRateTable): string {
  return SPREAD[table];
}
