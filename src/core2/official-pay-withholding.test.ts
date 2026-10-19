/**
 * An official's salary is taxed as a paycheck is (pool item
 * gov-stopgap-official-pay-official-pay): in a random place from all 56, the
 * town as the player gets it, played through two paydays. A salary paid to an
 * official leaves a withholding record whose lines go to the treasuries that
 * exist, and the books still balance.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { withholdingOf } from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it("a salary paid to an official has the law's taxes withheld", () => {
  // Every official's record is kept when bookkeeping is on; in play only the
  // player's circle keeps theirs.
  setBookkeeping(true);
  const draw = drawPlace(seed, "official-pay-withholding");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 65));
  const salaries = [...core.people.keys()].flatMap((id) =>
    withholdingOf(api, id).filter((w) =>
      w.id.startsWith("withholding:salary:"),
    ),
  );
  expect(
    salaries.length,
    `${where}: salaries with tax withheld`,
  ).toBeGreaterThan(0);
  for (const record of salaries) {
    expect(record.paidMinor, `${where} ${record.id}`).toBeGreaterThan(0);
    expect(record.lines.length, `${where} ${record.id}`).toBeGreaterThan(0);
    // The tax comes out of the salary, never more than was paid.
    const taken = record.lines.reduce((sum, line) => sum + line.minor, 0);
    expect(taken, `${where} ${record.id}`).toBeLessThanOrEqual(
      record.paidMinor,
    );
    expect(
      record.postings.reduce((sum, p) => sum + p.deltaMinor, 0),
      `${where} ${record.id}: the entry balances`,
    ).toBe(0);
  }
  expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
}, 600_000);
