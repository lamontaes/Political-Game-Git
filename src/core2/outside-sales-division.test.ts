/**
 * Buyers outside the town divide their spending among the sellers of one kind
 * by how much of it each can serve: a seller whose staff falls short of what
 * its demand needs holds a smaller share and its rivals a larger one, and the
 * kind's total is unchanged. Played world in a place drawn from all 56; the place and seed are
 * named in every failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { scaleOutsideSales } from "./residents-economy";
import { firmStaffing, JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";
import { residentsRuntime } from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
// Every seller's outside buyers at their opening level, so only the division moves a seller.
const AT_OPENING = () => ({
  factor: 1,
  followed: "the opening (this test)",
});

it("divides outside buyers' spending among a kind's sellers by service level, keeping the kind's total", () => {
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      const draw = drawPlace(seed, `outside-division-${attempt}`);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
      advanceCore(core, addDays(makeIsoDate(core.date), 60));
      const rt = residentsRuntime(core)!;
      const api = coreAPI(core);
      const level = (id: string) => firmStaffing(api, id)?.serviceLevel;
      // A kind with two sellers that have outside buyers in the place.
      const byKind = new Map<string, string[]>();
      for (const flow of rt.flows.values()) {
        if (flow.kind !== "outside-sales" || flow.endedAt) continue;
        const book = core.finance.businesses.get(flow.payeeId);
        if (!book || book.closedAt) continue;
        const staffing = firmStaffing(api, flow.payeeId);
        if (!staffing || !(staffing.target > 0)) continue;
        const key = `${flow.placeId}|${book.kindId}`;
        const ids = byKind.get(key) ?? [];
        if (!ids.includes(flow.payeeId)) ids.push(flow.payeeId);
        byKind.set(key, ids);
      }
      const pair = [...byKind].find(([, ids]) => ids.length >= 2);
      if (!pair) continue;
      const [key, ids] = pair;
      const placeId = key.split("|")[0]!;
      const amount = (id: string) =>
        [...rt.flows.values()]
          .filter(
            (f) => f.kind === "outside-sales" && !f.endedAt && f.payeeId === id,
          )
          .reduce((n, f) => n + f.amountMinor, 0);
      scaleOutsideSales(core, placeId, AT_OPENING, level);
      const [dear, cheap] = ids as [string, string];
      const kindTotal = () => ids.reduce((n, id) => n + amount(id), 0);
      const before = { dear: amount(dear), cheap: amount(cheap) };
      const total = kindTotal();
      // The seller loses half the staff its demand needs.
      const employers = api.moduleState(JOBS_MODULE_ID).table("employers");
      const row = employers.get(dear) as unknown as {
        staffing: { staff: number; target: number };
      };
      employers.put({
        ...row,
        staffing: { ...row.staffing, staff: row.staffing.target * 0.5 },
      } as never);
      scaleOutsideSales(core, placeId, AT_OPENING, level);
      const after = { dear: amount(dear), cheap: amount(cheap) };
      expect(after.dear, `${where}: ${dear} is short of staff`).toBeLessThan(
        before.dear,
      );
      expect(after.cheap, `${where}: ${cheap}, its rival`).toBeGreaterThan(
        before.cheap,
      );
      // One seller's loss is its rivals' gain: the kind's total is unchanged
      // (to a minor unit a flow).
      expect(
        Math.abs(kindTotal() - total),
        `${where}: the kind's total`,
      ).toBeLessThanOrEqual(
        [...rt.flows.values()].filter(
          (f) => f.kind === "outside-sales" && ids.includes(f.payeeId),
        ).length,
      );
      process.stdout.write(
        `outside-sales-division ${where}: ${dear} ${before.dear} -> ${after.dear}, ${cheap} ${before.cheap} -> ${after.cheap}\n`,
      );
      return;
    }
    throw new Error(
      `no place with two rival sellers in 12 draws (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
