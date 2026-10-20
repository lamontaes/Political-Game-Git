/**
 * A renter household's monthly choice to buy a home comes out in favor of
 * buying when its own reasons pull that way (pool item
 * world-renters-can-choose-to-buy): children at home, the head's age, years in
 * the lease and savings beyond the down payment, against the cost and the
 * down payment. The played world, a place drawn from all 56 on a seed nobody
 * chose (RENTERS_BUY_SEED pins one); a year, and the share of full renter
 * households that bought against the NAR first-time buyer share.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const seed = process.env.RENTERS_BUY_SEED ?? randomBytes(8).toString("hex");

it("full renter households buy a home in a played year, each purchase naming the reasons that decided it", () => {
  setBookkeeping(false);
  // Most of a town's renters are counted, so places are drawn in turn until
  // the full renter households add up to enough to see a share and someone has bought.
  let renters = 0;
  const bought: {
    where: string;
    id: string;
    reasons?: Record<string, number>;
  }[] = [];
  const seen: string[] = [];
  for (let draw = 0; draw < 12 && (renters < 60 || !bought.length); draw++) {
    const place = drawPlace(`${seed}:${draw}`, "renters-buy");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const here = new Set(
      [...core.finance.contracts]
        .filter(([id, row]) => id.startsWith("lease:") && !row.endedAt)
        .map(([, row]) => row.householdId),
    ).size;
    advanceCore(core, addDays(makeIsoDate(core.date), 366));
    const rows = api
      .moduleState("housing")
      .table("purchases")
      .rows() as unknown as { id: string; reasons?: Record<string, number> }[];
    renters += here;
    for (const row of rows) bought.push({ where, ...row });
    seen.push(`${where}: ${rows.length} of ${here}`);
  }
  const share = renters ? bought.length / renters : 0;
  const detail = `${seen.join("; ")} (${(share * 100).toFixed(1)}% of ${renters} full renter households)`;
  if (process.env.RENTERS_BUY_LOG)
    appendFileSync(process.env.RENTERS_BUY_LOG, `${detail}\n`);
  expect(bought.length, detail).toBeGreaterThan(0);
  // The NAR first-time buyer count is about 2 to 3 percent of renter
  // households a year; a handful of towns sits within a few times that.
  expect(share, detail).toBeLessThanOrEqual(0.1);
  for (const row of bought) {
    expect(row.reasons, `${row.where} ${row.id}`).toBeDefined();
    expect(Object.keys(row.reasons!), `${row.where} ${row.id}`).toEqual(
      expect.arrayContaining([
        "baseline",
        "cost",
        "down",
        "children",
        "age",
        "tenure",
        "savings",
      ]),
    );
  }
}, 3_600_000);
