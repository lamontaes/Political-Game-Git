/**
 * Pool item world-census-scale-closures-rise: a town opened at its Census size
 * pays that multiple of wages (its counted workers stand for several), takes
 * in that multiple of sales and holds that multiple of cash, so it closes no
 * more firms than the same town at the sample size. A drawn place above
 * 10,000 people, opened at reference over the 10,000-person sample, played
 * for a year each way.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { placePopulation } from "./gov-rules/place-population";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { corePlaceByKey } from "./place-lookup";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const SAMPLE = 10_000;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The first drawn place whose Census population is between 12,000 and 40,000. */
function drawLargeTown() {
  for (let i = 0; i < 4000; i += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "world-census-scale-closures",
    );
    const geoid = corePlaceByKey(draw.key)?.sourceGeoid;
    const reference = geoid ? placePopulation(geoid) : null;
    if (reference && reference >= 12_000 && reference <= 40_000)
      return { draw, reference };
  }
  throw new Error(`no drawn place between 12,000 and 40,000 (seed ${base})`);
}

function play(seed: string, key: string, countScale: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const closed = [...(core as CoreState).finance.closures.values()].map(
    (closure) =>
      `${closure.organizationId} ${closure.date} ${closure.reasonKey}`,
  );
  const changes = coreAPI(core)
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .rows() as unknown as { id: string; kind: string }[];
  return {
    closed,
    rows: changes.filter((row) => row.kind === "closure").length,
  };
}

it("a Census-size town closes no more firms than the same town at the sample size", () => {
  const { draw, reference } = drawLargeTown();
  const where = `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}`;
  const sample = play(draw.seed, draw.key, 1);
  const scaled = play(draw.seed, draw.key, reference / SAMPLE);
  console.log(
    `CLOSURES ${where}: sample ${sample.closed.length} firms ${sample.rows} job rows; census ${scaled.closed.length} firms ${scaled.rows} job rows`,
  );
  expect(
    scaled.closed.length,
    `${where}: sample closed ${sample.closed.join("; ")}; census closed ${scaled.closed.join("; ")}`,
  ).toBeLessThanOrEqual(sample.closed.length);
}, 3_600_000);
