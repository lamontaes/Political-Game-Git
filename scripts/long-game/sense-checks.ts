/**
 * Sense checks for the nightly long game (`twenty-years.ts`). They catch only
 * what cannot happen in any world: more jobs held than adults, a count below
 * zero, the country tier's own impossible counts. They never fail a run for
 * leaving a real-world range (owner, Nov 8: "ranges aren't targets").
 *
 * Each check is a pure function over a `WorldReading`; `readWorld` takes the
 * reading from a played world. Jobs are counted from the job records
 * themselves (each household's open jobs times the households it stands for,
 * plus its out-of-town workers and the full people's jobs), not from the
 * vital-statistics readings, until `jobs-counted-household-job-share-runs-away`
 * is fixed.
 *
 * Left out: money balance. The journal keeps no balance check of its own to
 * call (the every-place nightly computes its gap inline in
 * `scripts/core2-year/all-places-worker.ts`), so a later change must move that
 * into one function in `src/core2` and add it here.
 */
import { countryProblems } from "../../src/core2/country-model";
import { MACRO_MODULE_ID, countryStates } from "../../src/core2/modules/macro";
import {
  residentCounts,
  residentsRuntime,
} from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";

/** One counted place, as the records say it today. */
export interface PlaceReading {
  readonly placeId: string;
  readonly households: number;
  readonly people: number;
  /** Counted adults (each record times its weight). */
  readonly adults: number;
  /** Open recorded jobs held by counted households, each record times its weight. */
  readonly recordedJobs: number;
  /** Counted workers with an employer outside the town (the household's share, times its weight). */
  readonly outOfTownWorkers: number;
  /** Full people living in the place, and how many of them hold a job. */
  readonly fullPeople: number;
  readonly fullWorkers: number;
}

export interface WorldReading {
  readonly places: readonly PlaceReading[];
  /** `countryProblems` over the country tier; empty when the world has none yet. */
  readonly countryProblems: readonly string[];
}

export interface SenseResult {
  readonly id: string;
  readonly ok: boolean;
  readonly detail: string;
}

export const SENSE_CHECK_IDS = [
  "jobs-not-over-adults",
  "no-negative-counts",
  "country-tier-counts",
] as const;

const SLACK = 1e-6;
const FIRST = 3;

/** A place holds more jobs than it has adults. */
export function jobsNotOverAdults(world: WorldReading): SenseResult {
  const id = "jobs-not-over-adults";
  const bad = world.places
    .map((p) => ({
      placeId: p.placeId,
      jobs: p.recordedJobs + p.outOfTownWorkers + p.fullWorkers,
      adults: p.adults + p.fullPeople,
    }))
    .filter((p) => p.jobs > p.adults * (1 + SLACK) + SLACK);
  return {
    id,
    ok: bad.length === 0,
    detail: bad.length
      ? bad
          .slice(0, FIRST)
          .map(
            (p) =>
              `place ${p.placeId}: ${Math.round(p.jobs)} jobs held for ${Math.round(p.adults)} adults`,
          )
          .join("; ")
      : "ok",
  };
}

/** A count of people or households below zero, or not a number, anywhere. */
export function noNegativeCounts(world: WorldReading): SenseResult {
  const id = "no-negative-counts";
  const fields = [
    "households",
    "people",
    "adults",
    "recordedJobs",
    "outOfTownWorkers",
    "fullPeople",
    "fullWorkers",
  ] as const;
  const bad: string[] = [];
  for (const place of world.places)
    for (const field of fields)
      if (!(place[field] >= 0))
        bad.push(`place ${place.placeId}: ${field} is ${place[field]}`);
  return {
    id,
    ok: bad.length === 0,
    detail: bad.length ? bad.slice(0, FIRST).join("; ") : "ok",
  };
}

/** The country tier's own impossible counts (`countryProblems`). */
export function countryTierCounts(world: WorldReading): SenseResult {
  const id = "country-tier-counts";
  const bad = world.countryProblems;
  return {
    id,
    ok: bad.length === 0,
    detail: bad.length ? bad.slice(0, FIRST).join("; ") : "ok",
  };
}

export function runSenseChecks(world: WorldReading): SenseResult[] {
  return [
    jobsNotOverAdults(world),
    noNegativeCounts(world),
    countryTierCounts(world),
  ];
}

type Household = { placeId: string; unplacedWorkers?: number };

/** The reading of a played world. Read-only. */
export function readWorld(core: CoreState): WorldReading {
  const counts = residentCounts(core);
  const outOfTown = new Map<string, number>();
  const rt = residentsRuntime(core);
  if (rt) {
    const store = (
      rt as unknown as {
        store: {
          liveHouseholds(): Iterable<Household>;
          weightOf(h: Household): number;
        };
      }
    ).store;
    for (const h of store.liveHouseholds())
      outOfTown.set(
        h.placeId,
        (outOfTown.get(h.placeId) ?? 0) +
          (h.unplacedWorkers ?? 0) * store.weightOf(h),
      );
  }
  const full = new Map<string, { people: number; workers: number }>();
  for (const p of core.people.values()) {
    if (!p.alive) continue;
    const at = full.get(p.placeId) ?? { people: 0, workers: 0 };
    at.people += 1;
    if (p.jobId) at.workers += 1;
    full.set(p.placeId, at);
  }
  const places: PlaceReading[] = counts.map((c) => ({
    placeId: c.placeId,
    households: c.households,
    people: c.people,
    adults: c.adults,
    recordedJobs: c.workers,
    outOfTownWorkers: outOfTown.get(c.placeId) ?? 0,
    fullPeople: full.get(c.placeId)?.people ?? 0,
    fullWorkers: full.get(c.placeId)?.workers ?? 0,
  }));
  let problems: string[] = [];
  // A world without the macro module has no country tier to check.
  if (core.modules.has(MACRO_MODULE_ID)) {
    const api = coreAPI(core);
    const states = countryStates(api);
    const [nation] = [
      ...api.moduleState(MACRO_MODULE_ID).table("country").rows(),
    ];
    if (states.length && nation)
      problems = countryProblems({
        ...(nation as object),
        states: [...states],
      } as Parameters<typeof countryProblems>[0]);
  }
  return { places, countryProblems: problems };
}
