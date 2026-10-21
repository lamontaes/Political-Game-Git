/**
 * A part-time seat's stipend is taxed as a paycheck is (pool item
 * office-stopgap-office-day-official-pay, SG-OFFICE-stipend-transfer): in a
 * place drawn from all 56, the town as the player gets it, played through two
 * paydays. A stipend paid to a council member or commissioner leaves a
 * withholding record whose lines go to the treasuries that exist, and the
 * books still balance. Place and seed come from GOLDEN_PATH_SEED (random when
 * unset) and print on a failure.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { withholdingOf } from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const bookkeepingBefore = setBookkeeping(true);
afterAll(() => {
  setBookkeeping(bookkeepingBefore);
});

it("a stipend paid to a part-time official has the law's taxes withheld", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const draw = drawPlace(`${seed}:${attempt}`, "stipend-withholding");
    const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
    tried.push(where);
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 65));
    const stipends = [...core.people.keys()].flatMap((id) =>
      withholdingOf(api, id).filter((w) =>
        w.id.startsWith("withholding:stipend:"),
      ),
    );
    if (!stipends.length) continue;
    for (const record of stipends) {
      expect(record.paidMinor, `${where} ${record.id}`).toBeGreaterThan(0);
      expect(record.lines.length, `${where} ${record.id}`).toBeGreaterThan(0);
      // The tax comes out of the stipend, never more than was paid.
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
    console.info(
      `office-stipend-withholding ${where}: ${stipends.length} stipends taxed, first ${stipends[0]!.id}`,
    );
    return;
  }
  throw new Error(
    `no drawn place paid a stipend in two months: ${tried.join("; ")}`,
  );
}, 1_200_000);
