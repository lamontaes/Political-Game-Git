/**
 * A town played at the sample size and at its Census size, for the
 * tests of pool item world-census-scale-closures-rise. Each test file plays
 * its own towns, so one process holds only its own worlds.
 */
import { expect } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

export const SAMPLE = 10_000;

function play(seed: string, key: string, countScale: number, days: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  });
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  const closed = [...(core as CoreState).finance.closures.values()].map(
    (closure) =>
      `${closure.organizationId} ${closure.date} ${closure.reasonKey}`,
  );
  const rows = (
    coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("changes")
      .rows() as unknown as {
      id: string;
      kind: string;
    }[]
  )
    .filter((row) => row.kind === "closure")
    .map((row) => row.id);
  return { closed, rows };
}

/** One town played at the sample size and at its Census size (a year unless told): the Census run closes no more job rows. */
export function compareClosures(
  where: string,
  seed: string,
  key: string,
  reference: number,
  days = 365,
) {
  const sample = play(seed, key, 1, days);
  const scaled = play(seed, key, reference / SAMPLE, days);
  process.stdout.write(
    `CLOSURES ${where}: sample ${sample.closed.length} firms ${sample.rows.length} job rows; census ${scaled.closed.length} firms ${scaled.rows.length} job rows\n`,
  );
  expect(
    scaled.rows.length,
    `${where}: sample closed ${sample.closed.join("; ")} (${sample.rows.join(", ")}); census closed ${scaled.closed.join("; ")} (${scaled.rows.join(", ")})`,
  ).toBeLessThanOrEqual(sample.rows.length);
  expect(scaled.closed.length, where).toBeLessThanOrEqual(sample.closed.length);
}
