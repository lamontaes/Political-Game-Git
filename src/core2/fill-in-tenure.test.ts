/**
 * A counted worker filled in as a full person keeps the tenure their records
 * gave them: the jobs engine reads it for layoffs and raises alike, so a
 * worker the player meets is not the newest hire in the firm. Played four
 * months in the bench world (two-level, every module) in a place drawn from
 * all 56 on a seed nobody chose, so the opening's counted jobs have run long
 * enough to tell a kept tenure from a restarted one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { tenureYears } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a counted worker filled in keeps the tenure their counted record gave them", () => {
  const place = drawPlace(seed, "fill-in-tenure");
  const core = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const counted = [...rt.jobs.values()]
    .filter(
      (job) =>
        job.endsAt === undefined &&
        !core.people.has(job.personId) &&
        tenureYears(api, job) > 0.25,
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 5);
  expect(counted.length, `${place.name}, seed ${seed}`).toBeGreaterThan(0);
  for (const job of counted) {
    const before = tenureYears(api, job);
    fillInPerson(core, job.personId);
    const full = core.jobs.get(job.id);
    expect(full, `${job.id} after fill-in`).toBeDefined();
    const after = tenureYears(api, full!);
    console.log(
      `${place.name} (${place.key}), seed ${seed}: ${job.personId} held ${job.id} ${before.toFixed(3)} years counted, ${after.toFixed(3)} filled in`,
    );
    expect(after).toBeCloseTo(before, 2);
  }
}, 900_000);
