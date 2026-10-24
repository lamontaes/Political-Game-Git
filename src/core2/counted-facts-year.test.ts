/**
 * Counted people read from their group's columns (pool items
 * world-counted-reads-person-callers and ...-rest): in a place drawn from all
 * 56, the town as the player gets it, played a whole year. Jobs, employer
 * taxes, credit, business and candidacy run on `residentFacts` and the
 * household facts, the journal balances, and none of those engines builds a
 * counted person record. Place and seed come from GOLDEN_PATH_SEED (random
 * when unset).
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { EMPLOYER_TAXES_MODULE_ID } from "./modules/employer-taxes";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const bookkeepingBefore = setBookkeeping(true);
afterAll(() => {
  setBookkeeping(bookkeepingBefore);
});

const ENGINES = [
  "src/core2/modules/jobs.ts",
  "src/core2/jobs-benefits.ts",
  "src/core2/modules/employer-taxes.ts",
  "src/core2/modules/credit.ts",
  "src/core2/modules/business.ts",
  "src/core2/modules/candidacy.ts",
];

it("jobs, taxes, credit, business and candidacy read counted people from the columns for a year", () => {
  for (const file of ENGINES)
    expect(
      readFileSync(file, "utf8"),
      `${file} builds no counted person record`,
    ).not.toMatch(/residentPerson\(|\.peopleOf\(/);

  const draw = drawPlace(seed, "counted-facts-year");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));

  const rt = residentsRuntime(core);
  expect(rt, `${where}: the counted tier is installed`).toBeDefined();
  expect(rt!.jobs.size, `${where}: counted jobs were read`).toBeGreaterThan(0);
  expect(
    api.moduleState(EMPLOYER_TAXES_MODULE_ID).table("shares").rows().length,
    `${where}: employer tax shares were written`,
  ).toBeGreaterThan(0);
  expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
  console.info(
    `counted-facts-year ${where}: ${rt!.jobs.size} counted jobs, journal balanced`,
  );
}, 1_200_000);
