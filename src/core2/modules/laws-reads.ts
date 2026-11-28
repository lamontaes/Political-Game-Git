import type { CoreAPI } from "../types";
import type { LawRowInput } from "../laws-starting";
import { default as data } from "../data/laws/public-pay-floor.json";
import type { LawLevelName } from "../laws-starting";

/** The laws engine's module id; `laws.ts` re-exports it for the engines that already import it there. */
export const LAWS_MODULE_ID = "core2-laws-v1";

/** The question list the law rows and the platforms answer; re-exported here so the past reads it through the laws entry. */
export { POLICY_QUESTIONS } from "../policy-answers";

/**
 * The laws engine's read doors: what every other engine, screen and scene asks
 * of the law table. A caller states what it wants, a law by its id, the laws of
 * a series, every law or the enactments of a series, and never opens
 * `core2-laws-v1` itself. Each door returns the engine's own rows as they are
 * stored: nothing is copied or computed, and none registers the module (a
 * caller that works without laws asks `modules.has(LAWS_MODULE_ID)` first, as
 * before). The one-law-in-force-on-a-date rule is `laws-in-force.ts`'s, not
 * these.
 */

/** One law row by its id, or undefined where no such law is kept. */
export function lawRowById(
  api: CoreAPI,
  lawId: string,
): LawRowInput | undefined {
  return api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as unknown as
    LawRowInput | undefined;
}

/** Every law row the world keeps (in force, pending and ended). */
export function allLawRows(api: CoreAPI): readonly LawRowInput[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as readonly LawRowInput[];
}

/**
 * The rows of one series as they are stored: every jurisdiction's, or one's
 * when `jurisdiction` is named. This is the stored rows only; `lawRows` in
 * laws.ts adds the level aliases for policy series.
 */
export function storedLawRowsOfSeries(
  api: CoreAPI,
  series: string,
  jurisdiction?: string,
): readonly LawRowInput[] {
  const table = api.moduleState(LAWS_MODULE_ID).table("laws");
  return (jurisdiction === undefined
    ? table.query("bySeriesOnly", [series])
    : table.query("bySeries", [
        jurisdiction,
        series,
      ])) as unknown as readonly LawRowInput[];
}

/** An act passed in play that settles one series: the rows of the enactments table. */
export function enactmentRowsOfSeries<T = unknown>(
  api: CoreAPI,
  series: string,
): readonly T[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("enactments")
    .query("bySeries", [series]) as unknown as readonly T[];
}

export const EMPLOYER_LEVELS = data.employerLevels as Readonly<
  Record<string, LawLevelName>
>;

/** The highest level whose floors reach a class that is a government of its own (a school district). */
export const BOUND_BY = data.boundBy as unknown as Readonly<
  Record<string, LawLevelName>
>;

/**
 * The highest level of government whose public-employee laws (a pay floor,
 * bargaining) reach a public employer class: its own level, except a school
 * district, a government of its own that only state and federal laws reach.
 * `publicEmployerLevel` below is where it is funded from.
 */
export function publicEmployerBoundLevel(
  classification: string,
): LawLevelName | undefined {
  return BOUND_BY[classification] ?? EMPLOYER_LEVELS[classification];
}

/** The level of government a public employer class belongs to (who funds it), if it is one. */
export function publicEmployerLevel(
  classification: string,
): LawLevelName | undefined {
  return EMPLOYER_LEVELS[classification];
}
