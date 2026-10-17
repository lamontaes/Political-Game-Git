/** One model, two tiers: an opening stands for as many jobs as the worker it replaces, and a layoff takes the jobs its record stands for. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { roleMix, rolesByDeficit } from "./modules/jobs";
import { countedHeadsOf, endCountedJob } from "./residents-economy";
import { coreAPI } from "./state";
import type { JobInput } from "./types";

const SCALE = 3;

interface Position {
  id: string;
  organizationId: string;
  status: string;
  heads?: number;
  replacesJobId?: string;
}

interface Employer {
  id: string;
  countedJobs?: Record<string, string>;
  countedHeads?: Record<string, number>;
}

/** A town opened at the scale and run a month; then one counted worker at each of the fifteen employers with the most counted workers leaves, and another month runs. */
function leavers(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 35));
  const state = api.moduleState("jobs");
  const employers = [
    ...(state.table("employers").rows() as unknown as Employer[]),
  ].sort(
    (a, b) =>
      Object.keys(b.countedJobs ?? {}).length -
      Object.keys(a.countedJobs ?? {}).length,
  );
  const gone: { job: string; person: string; heads: number }[] = [];
  for (const row of employers.slice(0, 15)) {
    const [job, person] = Object.entries(row.countedJobs ?? {})[0] ?? [];
    if (!job) continue;
    // The weight the employer's books held for the worker when they left: what the opening can stand for.
    gone.push({ job, person: person!, heads: row.countedHeads?.[job] ?? 1 });
    // Left outside the jobs engine, as a death or a move leaves it.
    endCountedJob(core, job);
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const positions = state.table("positions").rows() as unknown as Position[];
  return gone.flatMap((row) => {
    const opening = positions.find((p) => p.replacesJobId === row.job);
    return opening ? [{ ...row, opening }] : [];
  });
}

it("role mix and deficit read an opening's size, and agree with the plain count at one", () => {
  const jobs = [
    { id: "a", title: "Server", personId: "p1" },
    { id: "b", title: "Cook", personId: "p2" },
  ] as unknown as JobInput[];
  expect(roleMix(jobs, [])).toEqual(roleMix(jobs, [], () => 1));
  const weighted = roleMix(jobs, [], (job) => (job.id === "a" ? 3 : 1));
  expect(weighted.Server!.count).toBe(3);
  const mix = { Server: { count: 3 }, Cook: { count: 1 } };
  // Filling a three-job opening shifts the target share by three.
  expect(rolesByDeficit(mix, { Server: 0, Cook: 0 }, 3)[0]).toBe("Server");
  expect(rolesByDeficit(mix, {}, 1)).toEqual(rolesByDeficit(mix, {}));
});

/** Places are drawn in turn until one has an applicable case; none in this many fails the test. */
const DRAWS = 8;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

function replacementCase(draw: number) {
  const place = drawPlace(`${seed}-${draw}`, "weight-hiring");
  const where = `seed ${place.seed}, ${place.name} (${place.key})`;
  const base = leavers(place.seed, place.key);
  if (!base.length) return undefined;
  const scaled = leavers(place.seed, place.key, SCALE);
  const several = scaled.filter((row) => row.heads > 1.5);
  return several.length ? { where, base, scaled, several } : undefined;
}

it("an opening stands for the jobs of the counted worker it replaces: their household's weight at scale three, one at scale one", () => {
  let found: ReturnType<typeof replacementCase>;
  for (let draw = 0; draw < DRAWS && !found; draw++)
    found = replacementCase(draw);
  expect(
    found,
    `none of ${DRAWS} drawn places (seed ${seed}) opened both a scale-one replacement and a scale-three one for a worker standing for several jobs`,
  ).toBeDefined();
  const { where, base, scaled, several } = found!;
  for (const row of base)
    expect(row.opening.heads, `${where}: ${row.opening.id}`).toBeUndefined();
  for (const row of scaled) {
    // The opening stood for what the worker's household stood for; each full person who has taken a job of it since left it one fewer.
    if (row.heads > 1.5)
      expect(row.opening.heads, `${where}: ${row.opening.id}`).toBeDefined();
    expect(
      row.opening.heads ?? 1,
      `${where}: ${row.opening.id}`,
    ).toBeLessThanOrEqual(row.heads + 0.5);
  }
  console.log(
    `WIRED ${where}: ${scaled.length} counted workers left; ${several.map((row) => `${row.opening.id} stands for ${row.opening.heads!.toFixed(2)} jobs (worker ${row.job} stood for ${row.heads.toFixed(2)})`).join("; ")}; scale one: ${base.length} openings, each one job`,
  );
}, 3_600_000);

function layoffCase(draw: number) {
  const place = drawPlace(`${seed}-${draw}`, "weight-layoff");
  const where = `seed ${place.seed}, ${place.name} (${place.key})`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    countScale: SCALE,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 35));
  const state = api.moduleState("jobs");
  const employers = state.table("employers");
  // The five employers with the most counted workers, each told to shed seven and a half jobs.
  const asked = 7.5;
  const told = [...(employers.rows() as unknown as Employer[])]
    .filter((row) => Object.keys(row.countedJobs ?? {}).length > 2)
    .sort(
      (a, b) =>
        Object.keys(b.countedJobs ?? {}).length -
        Object.keys(a.countedJobs ?? {}).length,
    )
    .slice(0, 5);
  if (!told.length) return undefined;
  for (const row of told) employers.put({ ...row, need: -asked } as never);
  const before = new Set(
    (state.table("changes").rows() as unknown as { id: string }[]).map(
      (row) => row.id,
    ),
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 8));
  const changed = (
    state.table("changes").rows() as unknown as {
      id: string;
      kind: string;
      personId: string;
      organizationId: string;
    }[]
  ).filter((row) => !before.has(row.id));
  const laid = changed.filter((row) => row.kind === "layoff");
  const lines: string[] = [];
  let manyJobs = 0;
  for (const row of told) {
    const ours = laid.filter((l) => l.organizationId === row.id);
    const heads = ours.reduce(
      (sum, l) => sum + countedHeadsOf(core, l.personId),
      0,
    );
    // Each laid-off record stood for its household's weight, never less than one job.
    expect(heads, `${where}: ${row.id}`).toBeGreaterThanOrEqual(
      ours.length - 1e-9,
    );
    manyJobs += ours.filter(
      (l) => countedHeadsOf(core, l.personId) > 1.5,
    ).length;
    const after = employers.get(row.id) as unknown as Employer & {
      need: number;
    };
    // A worker who quit or died in the same days adds to the need again; those employers are not read for what was left.
    const departed = changed.some(
      (c) =>
        c.organizationId === row.id &&
        (c.kind === "quit" || c.kind === "left-work"),
    );
    if (ours.length && !departed) {
      // It never takes more jobs than the need called for, and stops short only when the next worker to go stands for more than what is left.
      expect(after.need, `${where}: ${row.id}`).toBeLessThanOrEqual(1e-9);
      const biggest = Math.max(
        0,
        ...Object.values(after.countedJobs ?? {}).map((person) =>
          countedHeadsOf(core, person),
        ),
      );
      expect(-after.need, `${where}: ${row.id}`).toBeLessThan(biggest + 1e-9);
    }
    if (ours.length)
      lines.push(`${row.id}: ${ours.length} workers, ${heads.toFixed(2)} jobs`);
  }
  return manyJobs
    ? `${where}: told to shed ${asked} jobs; ${lines.join("; ")}`
    : undefined;
}

it("a layoff takes the jobs its record stands for, not one", () => {
  let proof: string | undefined;
  for (let draw = 0; draw < DRAWS && !proof; draw++) proof = layoffCase(draw);
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) laid off a counted worker standing for several jobs`,
  ).toBeDefined();
  console.log(`WIRED ${proof}`);
}, 3_600_000);
