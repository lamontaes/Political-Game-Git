import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { macroCoreData } from "./modules/macro";
import { letGoReasons, letGoScore, turnoverJobs } from "./modules/jobs";
import { parameter } from "./parameters";
import { coreAPI } from "./state";

// A town worker is let go by their own employer's review (jobs.ts
// reviewKeeping): the pull reads the worker's value to the firm and the
// firm's own books, never a pace from outside the firm.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const pull = (score: number) => 1 / (1 + Math.exp(-score));

it("an employer's pull to let a worker go follows its books and the worker's value", () => {
  const typical = {
    valueYears: p("jobsTypicalTenureYears"),
    staffOver: 0,
    lossMonths: 0,
  };
  const balanced = letGoScore(p, typical);
  // Short of staff, in balance, over its sales: each lets go sooner than the last.
  const short = letGoScore(p, { ...typical, staffOver: -0.2 });
  const over = letGoScore(p, { ...typical, staffOver: 0.2 });
  expect(short).toBeLessThan(balanced);
  expect(over).toBeGreaterThan(balanced);
  // Months of loss raise it, and never past the weight.
  const losing = letGoScore(p, { ...typical, lossMonths: 6 });
  expect(losing).toBeGreaterThan(balanced);
  expect(losing - balanced).toBeLessThan(p("jobsLetGoLossWeight"));
  // A worker the firm values more is kept longer; a new one goes sooner.
  expect(letGoScore(p, { ...typical, valueYears: 15 })).toBeLessThan(balanced);
  expect(letGoScore(p, { ...typical, valueYears: 0.25 })).toBeGreaterThan(
    balanced,
  );
  // Nothing flips: a small step in the books is a small step in the pull.
  const step = letGoScore(p, { ...typical, staffOver: 0.01 });
  expect(pull(step) - pull(balanced)).toBeGreaterThan(0);
  expect(pull(step) - pull(balanced)).toBeLessThan(pull(balanced));
});

interface Change {
  id: string;
  kind: string;
  organizationId: string;
  values?: Record<string, number>;
}

it(`a played year's separations name their firm's books, seed ${seed}`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  // Draw until a town has private jobs enough for a year's reviews to let someone go.
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(seed, `employer-keep-review:${draw}`);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const jobsAtStart = turnoverJobs(api).length;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const changes = api
      .moduleState("jobs")
      .table("changes")
      .rows() as unknown as Change[];
    const townLayoffs = changes.filter(
      (row) => row.kind === "layoff" && !row.values?.regional,
    );
    const reviewed = townLayoffs.filter(
      (row) => row.values?.letGoPull !== undefined,
    );
    if (!reviewed.length) {
      passed.push(
        `${where}: ${jobsAtStart} private jobs at the start, no worker let go by a review in the year`,
      );
      continue;
    }
    // No town employer lets anyone go at a pace from outside its own records.
    expect(
      townLayoffs.filter((row) => row.values?.turnoverPull !== undefined),
      `${where}: town layoffs at a national pace`,
    ).toEqual([]);
    // Each review separation keeps what the employer read.
    for (const row of reviewed) {
      for (const key of ["letGoScore", "valueYears", "staffOver", "lossMonths"])
        expect(
          Number.isFinite(row.values?.[key]),
          `${where}: ${row.id} keeps ${key}`,
        ).toBe(true);
      expect(row.values!.letGoPull, `${where}: ${row.id}`).toBeGreaterThan(
        0.999,
      );
    }
    // The firms' own books differ and the review reads them: the town's jobs
    // do not all stand at one pull.
    const scores = new Set(
      turnoverJobs(api).map((job) =>
        letGoReasons(api, job).staffOver.toFixed(4),
      ),
    );
    expect(
      scores.size,
      `${where}: every firm reads the same staffing position`,
    ).toBeGreaterThan(1);
    // Dev mode's Trace opens the separation and shows the firm and what its review read.
    const traced = traceNode(core, director, reviewed[0]!.id);
    expect(traced.engine, `${where}: Trace finds ${reviewed[0]!.id}`).toBe(
      "jobs",
    );
    const shown = traced.record as Change;
    expect(shown.organizationId, where).toBe(reviewed[0]!.organizationId);
    expect(shown.values?.staffOver, where).toBe(reviewed[0]!.values!.staffOver);
    process.stdout.write(
      `KEEP REVIEW ${where}: ${reviewed.length} let go by their employer's review of ${townLayoffs.length} town layoffs, e.g. ${reviewed[0]!.id} at ${reviewed[0]!.organizationId} (staff over ${reviewed[0]!.values!.staffOver!.toFixed(3)}, loss months ${reviewed[0]!.values!.lossMonths}, value ${reviewed[0]!.values!.valueYears!.toFixed(2)} years); ${scores.size} staffing positions among the town's jobs; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn town let a worker go by review in a year, seed ${seed}: ${passed.join("; ")}`,
  );
}, 1_800_000);
