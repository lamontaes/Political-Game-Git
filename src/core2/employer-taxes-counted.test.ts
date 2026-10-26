/**
 * The employer's payroll tax share on counted workers' wages (pool item
 * world-stopgap-employer-taxes-assumed-data, SG-WORLD-employer-tax-counted-wages):
 * in a place drawn from all 56, the town as the player gets it, played through
 * a quarter. A counted wage flow's payday leaves a share record with the same
 * law and the same rule as a paycheck's, per worker times the workers the flow
 * pays, from the employer's own cash to the treasuries, balanced on the
 * journal. Place and seed come from GOLDEN_PATH_SEED (random when unset).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawInForce } from "./modules/laws";
import {
  EMPLOYER_TAXES_MODULE_ID,
  type EmployerTaxRecord,
} from "./modules/employer-taxes";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const bookkeepingBefore = setBookkeeping(true);
afterAll(() => {
  setBookkeeping(bookkeepingBefore);
});

it("counted workers' wages carry the employer's payroll tax share", () => {
  const draw = drawPlace(seed, "employer-share-counted");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 95));
  const counted = (
    api
      .moduleState(EMPLOYER_TAXES_MODULE_ID)
      .table("shares")
      .rows() as unknown as EmployerTaxRecord[]
  ).filter((row) => row.counted);
  expect(
    counted.length,
    `${where}: counted paydays with a share`,
  ).toBeGreaterThan(0);
  const medicare = lawInForce(api, "medicare-tax").governing;
  for (const row of counted) {
    expect(row.counted!.workers, `${where} ${row.id}`).toBeGreaterThan(0);
    expect(row.wagesMinor, `${where} ${row.id}`).toBeGreaterThan(0);
    // The law's Medicare rate on every worker's wages (it has no wage base).
    if (medicare?.value)
      expect(row.medicareMinor, `${where} ${row.id}`).toBe(
        Math.round(
          (row.counted!.workers *
            (row.wagesMinor / row.counted!.workers) *
            (typeof medicare.terms?.employerRate === "number"
              ? medicare.terms.employerRate
              : medicare.value)) /
            100,
        ),
      );
    // Paid from the employer's cash to treasuries, and balanced.
    expect(
      row.postings.reduce((sum, p) => sum + p.deltaMinor, 0),
      `${where} ${row.id}: the entry balances`,
    ).toBe(0);
    for (const p of row.postings.filter((p) => p.deltaMinor < 0))
      expect(p.accountId, `${where} ${row.id}`).toBe(
        `cash:${row.employerId}:residual`,
      );
    expect(
      row.paidMinor + row.arrearsAfterMinor,
      `${where} ${row.id}`,
    ).toBeGreaterThanOrEqual(0);
  }
  expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
  console.info(
    `employer-taxes-counted ${where}: ${counted.length} counted paydays, first ${counted[0]!.id}`,
  );
}, 900_000);
