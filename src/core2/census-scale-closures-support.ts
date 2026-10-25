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
import { BUSINESS_MODULE_ID } from "./modules/business";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

export const SAMPLE = 10_000;

/** What a world has closed so far: firms (id, date, reason), job rows and draws. */
function readClosures(core: CoreState) {
  const firms = [...core.finance.closures.values()].map((closure) => ({
    id: closure.organizationId,
    label: `${closure.organizationId} ${closure.date} ${closure.reasonKey}`,
  }));
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
  // An owner's draw on the books is what the journal moved: whole minor units.
  const draws = coreAPI(core)
    .moduleState(BUSINESS_MODULE_ID)
    .table("draws")
    .rows() as unknown as { id: string; drawnMinor: number }[];
  const fractional = draws.filter((row) => !Number.isInteger(row.drawnMinor));
  return { firms, rows, draws: draws.length, fractional };
}

function build(seed: string, key: string, countScale: number) {
  setBookkeeping(false);
  return buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  }).core as CoreState;
}

/** How long past the window the sample town may take to close a firm the Census town closed: a month, the step counted moves and owners' books take. */
const LATER_DAYS = 31;

/**
 * One town played at the sample size and at its Census size (a year unless
 * told). The Census run closes no more job rows, and every firm it closes
 * the sample run closes too: the same firm, in the window or within a month
 * after it (a household's monthly move can land a month apart when the
 * group's counts are weighted).
 */
export function compareClosures(
  where: string,
  seed: string,
  key: string,
  reference: number,
  days = 365,
) {
  // The Census town first, read and let go, so one world is held at a time.
  const scaled = (() => {
    const core = build(seed, key, reference / SAMPLE);
    advanceCore(core, addDays(makeIsoDate(core.date), days));
    return readClosures(core);
  })();
  const sampleCore = build(seed, key, 1);
  const end = addDays(makeIsoDate(sampleCore.date), days);
  advanceCore(sampleCore, end);
  const sample = readClosures(sampleCore);
  // Only where the Census town closed a firm the sample has not: play on.
  let later = sample;
  const missing = () =>
    scaled.firms.filter(
      (firm) => !later.firms.some((other) => other.id === firm.id),
    );
  for (let day = 1; day <= LATER_DAYS && missing().length; day += 1) {
    advanceCore(sampleCore, addDays(end, day));
    later = readClosures(sampleCore);
  }
  process.stdout.write(
    `CLOSURES ${where}: sample ${sample.firms.length} firms ${sample.rows.length} job rows (${later.firms.length} firms within ${LATER_DAYS} days after); census ${scaled.firms.length} firms ${scaled.rows.length} job rows\n`,
  );
  expect(
    scaled.rows.length,
    `${where}: sample closed ${sample.firms.map((f) => f.label).join("; ")} (${sample.rows.join(", ")}); census closed ${scaled.firms.map((f) => f.label).join("; ")} (${scaled.rows.join(", ")})`,
  ).toBeLessThanOrEqual(sample.rows.length);
  expect(
    missing().map((firm) => firm.label),
    `${where}: firms the Census town closed that the sample town did not, within ${LATER_DAYS} days after`,
  ).toEqual([]);
  for (const run of [sample, scaled])
    expect(
      run.fractional.map((row) => `${row.id} ${row.drawnMinor}`),
      `${where}: draws on the books in whole minor units, of ${run.draws}`,
    ).toEqual([]);
}
