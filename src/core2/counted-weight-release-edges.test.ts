/**
 * Pool item world-counted-weight-release-grows-employer-staff, the edge cases
 * a fill-in meets. A filled-in record's jobs stay with their employers when
 * the job was its employer's only counted job (a member of a household that
 * took its weight keeps the rest) and when the record stood for less than one
 * job (the full job takes the difference back from another counted job at
 * the employer). In a place drawn from all 56 at ten times its sample, with
 * the heads set as an employer's staffing would have set them. Each
 * record's household income follows its jobs' heads, through a partial cut
 * and both fill-ins.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import type { CountedHousehold } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { householdIncome, residentsRuntime } from "./modules/residents";
import {
  countedHeadcountOf,
  countedJobHeads,
  countedJobsOf,
} from "./residents-economy";
import { payrollReserve, treasuryParameter } from "./budgets-treasury";
import { governments } from "./modules/budgets";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState, JobInput } from "./types";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** An employer's heads: one for each full person's job, its heads for each counted job. */
function heads(core: CoreState, organizationId: string): number {
  let full = 0;
  for (const job of core.jobs.values())
    if (job.organizationId === organizationId && job.endsAt === undefined)
      full += 1;
  return full + countedHeadcountOf(core, organizationId);
}

const DAYS_PER_YEAR = 365;

/** What a record's employers pay for its open jobs in a year, for the jobs each stands for. */
function paidFor(core: CoreState, h: CountedHousehold): number {
  const store = residentsRuntime(core)!.store;
  return h.jobs
    .filter((job) => job.endsAt === undefined)
    .reduce(
      (n, job) =>
        n + job.wageDailyMinor * DAYS_PER_YEAR * store.headsOfJob(h, job.id),
      0,
    );
}

/**
 * Every live record's pay, times the households it stands for, is what its
 * employers pay for its jobs (within the cent each record's pay is rounded
 * to), so poverty, moves and housing read the payroll the employers pay.
 */
function payAgrees(core: CoreState, where: string): void {
  const store = residentsRuntime(core)!.store;
  for (const h of store.liveHouseholds()) {
    const weight = store.weightOf(h);
    expect(
      Math.abs(h.wagesMinorYear * weight - paidFor(core, h)),
      `${where}: ${h.id} earns ${h.wagesMinorYear} a year at weight ${weight}; its employers pay ${paidFor(core, h)}`,
    ).toBeLessThanOrEqual(weight);
  }
}

function world(i: number) {
  const place = drawPlace(
    createHash("sha256").update(`${base}:${i}`).digest("hex"),
    "counted-weight-release-edges",
  );
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    countScale: 10,
  });
  return {
    core: core as CoreState,
    where: `${place.name} (${place.key}), seed ${place.seed}, base ${base}`,
  };
}

/** The counted jobs held by a weighted household's members, by employer. */
function jobsByEmployer(core: CoreState) {
  const rt = residentsRuntime(core)!;
  const homes = new Map<string, CountedHousehold>();
  for (const h of rt.store.liveHouseholds())
    if (rt.store.weightOf(h) > 1)
      for (const id of rt.store.memberIdsOf(h)) homes.set(id, h);
  const out = new Map<string, { job: JobInput; home: CountedHousehold }[]>();
  for (const org of [...core.organizations.keys()].sort()) {
    const rows = countedJobsOf(core, org)
      .filter((job) => homes.has(job.personId))
      .map((job) => ({ job, home: homes.get(job.personId)! }));
    if (rows.length) out.set(org, rows);
  }
  return out;
}

it(`a fill-in keeps an employer's heads when its job was the employer's only counted one, and when it stood for less than one job (base ${base})`, () => {
  const tried: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const { core, where } = world(i);
    const rt = residentsRuntime(core)!;
    const byEmployer = jobsByEmployer(core);
    const sole = [...byEmployer].find(
      ([org, rows]) =>
        rows.length === 1 && countedJobsOf(core, org).length === 1,
    );
    const pair = [...byEmployer].find(
      ([org, rows]) =>
        org !== sole?.[0] &&
        rows.length >= 2 &&
        new Set(rows.map((row) => row.home.id)).size >= 2,
    );
    if (!sole || !pair) {
      tried.push(`${where}: sole ${!!sole}, pair ${!!pair}`);
      continue;
    }
    // The employer's only counted job stands for ten jobs.
    const [soleOrg, [only]] = sole as [
      string,
      { job: JobInput; home: CountedHousehold }[],
    ];
    rt.store.setJobHeads(only!.job, 10);
    const soleBefore = heads(core, soleOrg);
    fillInPerson(core, only!.job.personId);
    const kept = countedJobsOf(core, soleOrg);
    process.stdout.write(
      `WEIGHT RELEASE EDGES ${where}: ${soleOrg} sole job ${only!.job.id} (${only!.home.id}) at 10 heads, ${soleBefore.toFixed(2)} before, ${heads(core, soleOrg).toFixed(2)} after, kept on ${kept.map((job) => job.id).join(", ")}\n`,
    );
    expect(soleBefore, where).toBeCloseTo(10, 9);
    expect(
      heads(core, soleOrg),
      `${where}: ${soleOrg} after ${only!.home.id} was filled in`,
    ).toBeCloseTo(soleBefore, 9);
    expect(
      kept.some((job) => job.id.startsWith(`${only!.job.id}:kept:`)),
      where,
    ).toBe(true);

    payAgrees(core, `${where}, after ${only!.home.id} was filled in`);

    // Two records at one employer: the one filled in stands for half a job.
    const [pairOrg, rows] = pair;
    const filled = rows[0]!;
    const keeper = rows.find((row) => row.home.id !== filled.home.id)!;
    rt.store.setJobHeads(filled.job, 0.5);
    rt.store.setJobHeads(keeper.job, 10);
    // A partial cut: the keeper's job goes from 10 jobs to 4.5, and its
    // household's income falls by the 5.5 jobs' pay over its weight.
    const wage = keeper.job.wageDailyMinor * DAYS_PER_YEAR;
    const incomeAtTen = householdIncome(rt, keeper.home);
    rt.store.setJobHeads(keeper.job, 4.5);
    const cutBy = incomeAtTen - householdIncome(rt, keeper.home);
    process.stdout.write(
      `WEIGHT RELEASE EDGES ${where}: ${keeper.job.id} (${keeper.home.id}, weight ${rt.store.weightOf(keeper.home)}) cut from 10 to 4.5 jobs: household income ${incomeAtTen} to ${householdIncome(rt, keeper.home)}\n`,
    );
    expect(
      Math.abs(cutBy - (wage * 5.5) / rt.store.weightOf(keeper.home)),
      `${where}: ${keeper.home.id}'s income after the cut`,
    ).toBeLessThanOrEqual(1);
    payAgrees(core, `${where}, after the cut`);
    const pairBefore = heads(core, pairOrg);
    fillInPerson(core, filled.job.personId);
    process.stdout.write(
      `WEIGHT RELEASE EDGES ${where}: ${pairOrg} job ${filled.job.id} (${filled.home.id}) at 0.5 heads beside ${keeper.job.id} at 10, ${pairBefore.toFixed(2)} before, ${heads(core, pairOrg).toFixed(2)} after\n`,
    );
    expect(
      heads(core, pairOrg),
      `${where}: ${pairOrg} after ${filled.home.id} was filled in`,
    ).toBeCloseTo(pairBefore, 9);
    payAgrees(core, `${where}, after ${filled.home.id} was filled in`);
    return;
  }
  throw new Error(
    `no drawn place had both cases at ten times its sample: ${tried.join("; ")}`,
  );
}, 900_000);

it(`a counted job's heads size its treasury's payroll reserve (base ${base})`, () => {
  const tried: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const { core, where } = world(100 + i);
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    // A counted job at an employer a treasury pays (a town department).
    const job = [...core.organizations.values()]
      .filter((org) => org.publicPayAuthority)
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((org) => countedJobsOf(core, org.id))
      .find((row) => countedJobHeads(core, row) >= 2);
    if (!job) {
      tried.push(`${where}: no counted job at a publicly paid employer`);
      continue;
    }
    const before = new Map(
      governments(api).map((gov) => [gov.id, payrollReserve(api, gov)]),
    );
    const heads = countedJobHeads(core, job);
    rt.store.setJobHeads(job, heads / 2);
    const changed = governments(api)
      .map((gov) => ({
        id: gov.id,
        by: before.get(gov.id)! - payrollReserve(api, gov),
      }))
      .filter((row) => row.by !== 0);
    const monthDays =
      treasuryParameter("daysPerYear") / treasuryParameter("monthsPerYear");
    const expected = job.wageDailyMinor * monthDays * (heads / 2);
    process.stdout.write(
      `WEIGHT RELEASE EDGES ${where}: ${job.id} at ${job.organizationId} cut from ${heads} to ${heads / 2} jobs: reserve of ${changed.map((row) => `${row.id} down ${row.by}`).join(", ") || "none"}, expected ${expected.toFixed(1)}\n`,
    );
    expect(changed.length, `${where}: treasuries whose reserve moved`).toBe(1);
    expect(
      Math.abs(changed[0]!.by - expected),
      `${where}: ${changed[0]!.id}'s reserve after the cut`,
    ).toBeLessThanOrEqual(1);
    return;
  }
  throw new Error(
    `no drawn place had a counted job at a publicly paid employer: ${tried.join("; ")}`,
  );
}, 900_000);
