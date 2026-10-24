/**
 * Pool item world-counted-weight-release-grows-employer-staff. A town opened
 * at its Census size carries a sample of its households, each standing for
 * many; filling one in spreads the households it stood for over its group.
 * The jobs they held stay with their employers: no employer's heads move when
 * a household is filled in, and a year later no more employers stand over
 * their sales staff than in the same town at the sample size. Washington,
 * D.C. (pinned, where Dixon's Bowling Lanes grew 26 percent over its sales
 * staff with no hire and closed) and one more city above 100,000 drawn from
 * all 56.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { corePlaceByKey } from "./place-lookup";
import { countedHeadcountOf } from "./residents-economy";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const WASHINGTON = { key: "1150000", seed: "dc-closures-a" };
const SAMPLE = 10_000;
const LARGE = 100_000;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** How far over its sales staff an employer stands before it counts as over. */
const OVER = 1.1;

function build(seed: string, key: string, countScale: number): CoreState {
  setBookkeeping(false);
  return buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  }).core as CoreState;
}

/** Each employer's jobs: one for a full person's, its heads for a counted worker's. */
function heads(core: CoreState): Map<string, number> {
  const out = new Map<string, number>();
  for (const job of core.jobs.values())
    if (job.endsAt === undefined)
      out.set(job.organizationId, (out.get(job.organizationId) ?? 0) + 1);
  for (const id of core.organizations.keys()) {
    const counted = countedHeadcountOf(core, id);
    if (counted) out.set(id, (out.get(id) ?? 0) + counted);
  }
  return out;
}

/** Employers standing more than OVER times their sales-supported staff, worst first. */
function over(core: CoreState) {
  const staff = heads(core);
  return (
    coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("employers")
      .rows() as unknown as { id: string; salesStaff?: number }[]
  )
    .filter((row) => row.salesStaff !== undefined && row.salesStaff >= 1)
    .map((row) => ({
      id: row.id,
      staff: staff.get(row.id) ?? 0,
      sales: row.salesStaff!,
    }))
    .filter((row) => row.staff > row.sales * OVER)
    .sort((a, b) => b.staff / b.sales - a.staff / a.sales);
}

function check(where: string, seed: string, key: string, reference: number) {
  const scale = reference / SAMPLE;
  const core = build(seed, key, scale);
  const rt = residentsRuntime(core)!;
  // Filling in households that stand for many, each with a job: no
  // employer's heads move.
  const weighted = [...rt.store.liveHouseholds()]
    .filter((h) => rt.store.weightOf(h) > 1 && h.jobs.length)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 20);
  expect(
    weighted.length,
    `${where}: weighted households with jobs`,
  ).toBeGreaterThan(0);
  const filled: string[] = [];
  for (const h of weighted) {
    const id = rt.store.memberIdsOf(h)[0];
    if (!id) continue;
    const before = heads(core);
    fillInPerson(core, id);
    const after = heads(core);
    for (const org of new Set([...before.keys(), ...after.keys()])) {
      // Filling in gives the household's unplaced worker a commuter job at
      // the outside account (core-commuter-job-fill-in): a hire, not weight.
      if (core.organizations.get(org)?.kind === OUTSIDE_MARKET_KIND) continue;
      expect(
        Math.abs((after.get(org) ?? 0) - (before.get(org) ?? 0)),
        `${where}: ${org} heads when ${h.id} (weight ${rt.store.weightOf(h)}) was filled in`,
      ).toBeLessThan(1e-6);
    }
    filled.push(h.id);
  }
  // A year on, at the Census size and the sample size.
  advanceCore(core, addDays(gameStartDate(), 365));
  const scaled = over(core);
  const sampleCore = build(seed, key, 1);
  advanceCore(sampleCore, addDays(gameStartDate(), 365));
  const sample = over(sampleCore);
  const show = (rows: ReturnType<typeof over>) =>
    rows
      .slice(0, 3)
      .map((r) => `${r.id} ${r.staff.toFixed(1)}/${r.sales.toFixed(1)}`)
      .join(", ") || "none";
  process.stdout.write(
    `WEIGHT RELEASE ${where} (scale ${scale.toFixed(1)}): filled ${filled.length} (${filled.slice(0, 3).join(", ")}) with no employer's heads moving; employers over their sales staff at year end: Census ${scaled.length} (${show(scaled)}), sample ${sample.length} (${show(sample)})\n`,
  );
  // How far over its sales staff the most overstaffed employer stands: the
  // jobs engine lets a firm run over at any size, so the Census town is held
  // to the sample town's worst, within a tenth (Dixon's Bowling Lanes stood
  // 26 percent over where the sample's worst was within its sales staff).
  const worst = (rows: ReturnType<typeof over>) =>
    rows.reduce((n, r) => Math.max(n, r.staff / r.sales), OVER);
  expect(
    worst(scaled),
    `${where}: the most overstaffed employer at the Census size (${show(scaled)}) against the sample size (${show(sample)})`,
  ).toBeLessThanOrEqual(worst(sample) * 1.1);
}

it("Washington, D.C. at its Census size: a fill-in moves no employer's heads, and a year later no more employers stand over their sales staff than at the sample size", () => {
  const reference = placeReferencePopulation(WASHINGTON.key)?.value;
  expect(reference).toBeGreaterThan(LARGE);
  check(
    `Washington, D.C. (${WASHINGTON.key}), seed ${WASHINGTON.seed}`,
    WASHINGTON.seed,
    WASHINGTON.key,
    reference!,
  );
  // Two years of Washington took about 500 seconds at one worker on a
  // 4-core container (census-scale closures); about twice that.
}, 1_200_000);

it(`a drawn city above 100,000 at its Census size behaves the same (base ${base})`, () => {
  // WEIGHT_RELEASE_KEY and WEIGHT_RELEASE_SEED pin a drawn place to rerun it.
  const pinned = process.env.WEIGHT_RELEASE_SEED;
  if (pinned) {
    const key = process.env.WEIGHT_RELEASE_KEY!;
    const reference = placeReferencePopulation(
      corePlaceByKey(key)!.sourceGeoid!,
    )!.value;
    check(
      `pinned ${key}, census ${reference}, seed ${pinned}`,
      pinned,
      key,
      reference,
    );
    return;
  }
  const tried: string[] = [];
  for (let i = 0; i < 400; i += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "world-counted-weight-release",
    );
    const geoid = corePlaceByKey(draw.key)?.sourceGeoid;
    const reference = geoid ? placeReferencePopulation(geoid)?.value : null;
    if (!reference || reference <= LARGE || draw.key === WASHINGTON.key) {
      tried.push(`${draw.name}: ${reference ?? "no population"}`);
      continue;
    }
    check(
      `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}, base ${base}`,
      draw.seed,
      draw.key,
      reference,
    );
    return;
  }
  throw new Error(`no drawn place above ${LARGE}: ${tried.join("; ")}`);
}, 1_200_000);
