/**
 * Pool item world-counted-weight-release-grows-employer-staff, the edge cases
 * a fill-in meets. A filled-in record's jobs stay with their employers when
 * the job was its employer's only counted job (a member of a household that
 * took its weight keeps the rest) and when the record stood for less than one
 * job (the full job takes the difference back from another counted job at
 * the employer). In a place drawn from all 56 at ten times its sample, with
 * the heads set as an employer's staffing would have set them.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import type { CountedHousehold } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import { countedHeadcountOf, countedJobsOf } from "./residents-economy";
import { fillInPerson } from "./state";
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
    rt.store.setJobHeads(only!.job.id, 10);
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

    // Two records at one employer: the one filled in stands for half a job.
    const [pairOrg, rows] = pair;
    const filled = rows[0]!;
    const keeper = rows.find((row) => row.home.id !== filled.home.id)!;
    rt.store.setJobHeads(filled.job.id, 0.5);
    rt.store.setJobHeads(keeper.job.id, 10);
    const pairBefore = heads(core, pairOrg);
    fillInPerson(core, filled.job.personId);
    process.stdout.write(
      `WEIGHT RELEASE EDGES ${where}: ${pairOrg} job ${filled.job.id} (${filled.home.id}) at 0.5 heads beside ${keeper.job.id} at 10, ${pairBefore.toFixed(2)} before, ${heads(core, pairOrg).toFixed(2)} after\n`,
    );
    expect(
      heads(core, pairOrg),
      `${where}: ${pairOrg} after ${filled.home.id} was filled in`,
    ).toBeCloseTo(pairBefore, 9);
    return;
  }
  throw new Error(
    `no drawn place had both cases at ten times its sample: ${tried.join("; ")}`,
  );
}, 900_000);
