/**
 * Pool item world-census-scale-closures-rise: a town opened at its Census size
 * pays that multiple of wages (its counted workers stand for several) and
 * takes in that multiple of sales, so no firm closes for want of cash to meet
 * its payroll. A drawn place above 10,000 people, opened at reference over the
 * 10,000-person sample, played for a year.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
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
    const reference = geoid
      ? placeReferencePopulation(geoid)?.value
      : undefined;
    if (reference && reference >= 12_000 && reference <= 40_000)
      return { draw, reference };
  }
  throw new Error(`no drawn place between 12,000 and 40,000 (seed ${base})`);
}

it("no firm in a Census-size town closes for want of cash to pay its wages", () => {
  const { draw, reference } = drawLargeTown();
  const where = `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
    countScale: reference / SAMPLE,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const unfunded = [...(core as CoreState).finance.closures.values()].filter(
    (closure) => closure.reasonKey.includes("unfunded-obligation"),
  );
  expect(
    unfunded.map((closure) => `${closure.organizationId} ${closure.date}`),
    where,
  ).toEqual([]);
  // The closures that did happen, by job change id.
  const changes = coreAPI(core)
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .rows() as unknown as { id: string; kind: string }[];
  const closures = changes.filter((row) => row.kind === "closure");
  console.log(`CLOSURES ${where}: ${closures.length} closure rows`);
}, 1_800_000);
