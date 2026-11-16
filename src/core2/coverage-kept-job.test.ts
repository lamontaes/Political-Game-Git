import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COVERAGE_MODULE_ID,
  type CountedCoverageRow,
  type CoverageRow,
} from "./modules/coverage";
import { countedJob, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A worker who keeps the job and pays every premium keeps the plan
// (premiums-coverage-double-count). The share of workers who hold their own
// plan is a share of the workers who have a job today: a lost job already
// ends a plan, so the town's unemployment must not also take plans from
// workers who kept theirs. Pinned: Gillette, Wyoming, whose jobless share
// rises most in the first spring of the three towns the cause was traced in.
const PLACE = { key: "5631855", name: "Gillette, Wyoming" };
const SEED = "cov-5631855";
const MONTHS = ["2025-02-02", "2025-03-02", "2025-04-02"] as const;

interface Holder {
  readonly householdId: string;
  readonly organizationId: string;
  readonly weight: number;
}

/** Each policyholder today with the employer they work for, full and counted. */
function holders(core: CoreState): Map<string, Holder> {
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const out = new Map<string, Holder>();
  const table = api.moduleState(COVERAGE_MODULE_ID);
  for (const row of table
    .table("coverage")
    .rows() as unknown as CoverageRow[]) {
    if (row.to !== null || row.plan !== "employer") continue;
    if (row.holderId !== row.personId) continue;
    const person = core.people.get(row.personId);
    const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
    if (job?.endsAt === undefined && job)
      out.set(row.personId, {
        householdId: row.householdId,
        organizationId: job.organizationId,
        weight: 1,
      });
  }
  for (const row of table
    .table("countedCoverage")
    .rows() as unknown as CountedCoverageRow[]) {
    if (row.to !== null) continue;
    const h = rt.store.liveHousehold(row.householdId);
    const job = h?.jobs.find(
      (j) =>
        j.personId === row.holderId &&
        j.endsAt === undefined &&
        countedJob(core, j.id),
    );
    if (h && job)
      out.set(row.holderId, {
        householdId: row.householdId,
        organizationId: job.organizationId,
        weight: rt.store.weightOf(h),
      });
  }
  return out;
}

/** Whether a policyholder still works for the same employer today. */
function keptJob(core: CoreState, personId: string, was: Holder): boolean {
  const person = core.people.get(personId);
  if (person) {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    return (
      person.alive &&
      job?.endsAt === undefined &&
      job?.organizationId === was.organizationId
    );
  }
  const rt = residentsRuntime(core)!;
  const h = rt.store.liveHousehold(was.householdId);
  return !!h?.jobs.some(
    (j) =>
      j.personId === personId &&
      j.endsAt === undefined &&
      j.organizationId === was.organizationId &&
      countedJob(core, j.id),
  );
}

/** Policyholders whose premium went short at the last 1st (they lapse by the rule for any unpaid bill). */
function short(core: CoreState): Set<string> {
  const api = coreAPI(core);
  const table = api.moduleState(COVERAGE_MODULE_ID);
  return new Set(
    [
      ...(table.table("coverage").rows() as unknown as CoverageRow[]),
      ...(table
        .table("countedCoverage")
        .rows() as unknown as CountedCoverageRow[]),
    ]
      .filter((row) => row.lastPaidMinor < row.lastDueMinor)
      .map((row) => row.holderId ?? ""),
  );
}

it(`workers who keep their job and pay keep their plan as the town's jobless share rises (${PLACE.name} [${PLACE.key}], seed ${SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const opening = holders(core);
  // Everyone who has missed a premium since the opening, by policyholder.
  const missed = new Set<string>();
  const lines: string[] = [];
  for (const day of MONTHS) {
    advanceCore(core, makeIsoDate(day));
    for (const id of short(core)) missed.add(id);
    const now = holders(core);
    let kept = 0,
      lost = 0;
    const lostIds: string[] = [];
    for (const [personId, was] of opening) {
      if (missed.has(personId) || !keptJob(core, personId, was)) continue;
      if (now.has(personId)) kept += was.weight;
      else {
        lost += was.weight;
        if (lostIds.length < 5) lostIds.push(personId);
      }
    }
    const share = lost / Math.max(1, kept + lost);
    lines.push(
      `${day}: kept ${kept.toFixed(0)}, lost ${lost.toFixed(0)} (${(share * 100).toFixed(1)}%) ${lostIds.join(" ")}`,
    );
    // A worker can still move down the ranking when a larger employer
    // hires; that moves a few, not a share of the town.
    expect(share, lines.join("\n")).toBeLessThan(0.02);
  }
  process.stderr.write(`${lines.join("\n")}\n`);
}, 180_000);
