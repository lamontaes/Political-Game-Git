/**
 * The past's reads: its parameters, the seeded draw between two bounds, a date
 * shifted by days, and the past module's id. They import only the past's
 * parameter table and the seeded draw, both outside every ring, so a writer of
 * the past takes them without loading the past engine's ring; past-module.ts
 * re-exports each one.
 */
import rows from "./data/past/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import { seededUnit } from "./seeded";
import type { CoreAPI } from "./types";
import { ownPastKind } from "./own-past-kinds";
import { default as jobsJson } from "./data/jobs/jobs.json";
import type { CoreState, PersonState } from "./types";
import { decisionLean, traitLeanBetween } from "./trait-decisions";
import { stopgap } from "./stopgaps";

export const PAST_MODULE_ID = "core2-past-v1";

const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A past parameter's value, registering its stopgap when it carries one. */
export function pastParameter(api: CoreAPI | null, key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown past parameter: ${key}`);
  if (row.stopgapId) api?.stopgap(row.stopgapId);
  return row.value;
}

/** A value inside [low, high], fixed by the seed and key. */
export function seededBetween(
  seed: string,
  key: string,
  low: number,
  high: number,
): number {
  return low + (high - low) * seededUnit(seed, key);
}

export function shiftDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export const PAST_WORK_SPELL = ownPastKind("person.work-spell");

/** The jobs engine's actions by option id: the act kinds its chooser weighs. */
const JOB_ACTIONS: Readonly<Record<string, { actKinds: readonly string[] }>> =
  Object.fromEntries(
    Object.values(
      jobsJson.actions as Record<string, { id: string; actKinds: string[] }>,
    ).map((row) => [row.id, row]),
  );

/**
 * A person's scaled lean (about -1 to 1) in one of the jobs engine's
 * decisions: the employer's formula decision by its own act kinds, a
 * worker's chooser decision by the act kinds of the jobs engine's actions.
 * The decisions' own weights are in their own units (years of tenure, score);
 * how far a lean moves a quarter's pull is `pastWorkTraitSpread`.
 */
const lean = (
  core: CoreState,
  person: PersonState,
  decisionId: string,
  toward: string,
  over: string,
) =>
  decisionId === "jobs.value-worker"
    ? decisionLean(core, person, decisionId, toward, over)
    : traitLeanBetween(
        core,
        person,
        JOB_ACTIONS[toward]!.actKinds,
        JOB_ACTIONS[over]!.actKinds,
      );

/** How the pull to leave or be let go falls with age (the steady rate at the reference age). */
export function workAgeFactor(api: CoreAPI, age: number): number {
  const p = (key: string) => api.parameter(key);
  return Math.pow(
    Math.max(age, p("pastWorkYoungestAge")) / p("pastWorkAgeReferenceYears"),
    -p("pastWorkAgeElasticity"),
  );
}

/**
 * How finding work slows with age past the reference age (CPS mean weeks
 * unemployed run longer for the old); nobody finds faster for being young.
 * One factor for the pre-start run and the lives in play
 * (stopgapId: SG-LABOR-find-age-estimated).
 */
export function findAgeFactor(api: CoreAPI, age: number): number {
  const p = (key: string) => api.parameter(key);
  stopgap("SG-LABOR-find-age-estimated");
  return Math.pow(
    Math.max(age, p("pastWorkFindAgeReferenceYears")) /
      p("pastWorkFindAgeReferenceYears"),
    -p("pastWorkFindAgeElasticity"),
  );
}

/** Layoffs a quarter: JOLTS's rate, raised by a rise in unemployment (points over the quarter). */
export function layoffPerQuarter(
  api: CoreAPI,
  rise: number,
  lean: number,
  ageFactor: number,
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkLayoffsPerQuarter") *
    (1 + p("pastWorkLayoffRisePerPoint") * rise) *
    Math.exp(p("pastWorkTraitSpread") * lean) *
    ageFactor
  );
}

/** Moves to another job a quarter: JOLTS's quits, fewer when work is scarce (mean over now) and when the pay is better. */
export function quitPerQuarter(
  api: CoreAPI,
  meanOverNow: number,
  lean: number,
  payRatio: number,
  ageFactor: number,
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkQuitsPerQuarter") *
    Math.pow(meanOverNow, p("pastWorkQuitUnemploymentElasticity")) *
    Math.exp(p("pastWorkTraitSpread") * lean) *
    Math.pow(payRatio, -p("pastWorkQuitPayElasticity")) *
    ageFactor
  );
}

/** Finding work a quarter: CPS's spells out of work, longer when work is scarce. */
export function findPerQuarter(
  api: CoreAPI,
  meanOverNow: number,
  lean: number,
  /** The seeker's age in years; omitted, no age effect (the reference age's rate). */
  age?: number,
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkFindsPerQuarter") *
    (age === undefined ? 1 : findAgeFactor(api, age)) *
    Math.pow(meanOverNow, p("pastWorkFindUnemploymentElasticity")) *
    Math.exp(p("pastWorkTraitSpread") * lean)
  );
}

/** A person's traits' leans in the jobs engine's three working-life decisions. */
export function workLeans(
  core: CoreState,
  person: PersonState,
): { layoffLean: number; quitLean: number; applyLean: number } {
  return {
    layoffLean: lean(core, person, "jobs.value-worker", "let-go", "keep"),
    quitLean: lean(
      core,
      person,
      "jobs.review-worker",
      "jobs-look",
      "jobs-stay",
    ),
    applyLean: lean(core, person, "jobs.apply", "jobs-apply", "jobs-wait"),
  };
}
