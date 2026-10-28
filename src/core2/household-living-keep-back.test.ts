/**
 * A household keeps back only what its home still costs before its next
 * everyday day: a mortgage or lease paid that morning is not kept back again,
 * so a household with the cash buys its month of everyday living, and one that
 * can't shows why in the credit engine's monthly row (what it held, what it
 * kept back). Proven in the played world, in a place drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CREDIT_MODULE_ID } from "./modules/credit";
import { coreAPI } from "./state";

/** Places drawn, at most, for one with a home paid on its living day. */
const DRAWS = 4;
/** Days run, at most, to reach the first monthly review after a living day. */
const DAYS = 75;

interface Spent {
  date: string;
  requested: number;
  paid: number;
  held: number;
  keptBack: number;
  /** A housing payment made earlier the same day, and nothing else still due. */
  homePaidThatMorning: boolean;
}

it("keeps back only the home's payments still due, buys everyday living with the rest, and records why a month went short", () => {
  const seed = randomBytes(8).toString("hex");
  const passed: string[] = [];
  setBookkeeping(false);
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "household-living-keep-back");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const spent = new Map<string, Spent[]>();
    let review: string | undefined;
    for (let day = 0; day < DAYS && !review; day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const plan of core.finance.livingPlans.values()) {
        if (plan.lastAt !== core.date) continue;
        let paidToday = false,
          stillDue = false;
        for (const id of core.finance.obligationsByHousehold.get(
          plan.householdId,
        ) ?? []) {
          const row = core.finance.contracts.get(id);
          if (!row || row.endedAt) continue;
          const receipt = core.finance.latestReceiptsByContract.get(id);
          if (
            receipt?.date === core.date &&
            receipt.paidMinor === receipt.requestedMinor
          )
            paidToday = true;
          if (row.arrearsMinor > 0 || row.dueAt < plan.dueAt) stillDue = true;
        }
        const rows = spent.get(plan.householdId) ?? [];
        rows.push({
          date: core.date,
          requested: plan.lastRequestedMinor,
          paid: plan.lastPaidMinor,
          held: plan.lastHeldMinor!,
          keptBack: plan.lastKeptBackMinor!,
          homePaidThatMorning: paidToday && !stillDue,
        });
        spent.set(plan.householdId, rows);
      }
      const months = api
        .moduleState(CREDIT_MODULE_ID)
        .table("households")
        .rows()
        .filter((row) => row.date === core.date);
      if (months.length && spent.size) review = core.date;
    }
    const all = [...spent.values()].flat();
    expect(all.length, where).toBeGreaterThan(0);
    for (const month of all) {
      const free = Math.max(0, month.held - month.keptBack);
      // With the cash, the month's everyday living is bought in full; without
      // it, everything left after the home is spent and the rest goes unbought.
      expect(month.paid, `${where} ${month.date}`).toBe(
        Math.min(month.requested, free),
      );
    }
    // A home paid that morning is not kept back a second time.
    const paidThatMorning = all.filter((m) => m.homePaidThatMorning);
    for (const month of paidThatMorning)
      expect(month.keptBack, `${where} ${month.date}`).toBe(0);
    if (!paidThatMorning.length) {
      passed.push(`${where}: no home paid on a living day`);
      continue;
    }
    // The first monthly review carries each household's month: what it held
    // on its living day and what it kept back, so a short month names why.
    expect(review, where).toBeDefined();
    const months = api
      .moduleState(CREDIT_MODULE_ID)
      .table("households")
      .rows()
      .filter((row) => row.date === review);
    let read = 0;
    for (const row of months) {
      const month = (spent.get(row.householdId as string) ?? [])
        .filter((m) => m.date < review!)
        .at(-1);
      if (!month) continue;
      read += 1;
      expect(row, `${where} ${row.id}`).toMatchObject({
        everydayMinor: month.requested,
        livingHeldMinor: month.held,
        keptBackMinor: month.keptBack,
      });
      expect(row.unpaidMinor as number).toBeGreaterThanOrEqual(
        month.requested - month.paid,
      );
    }
    expect(read, where).toBeGreaterThan(0);
    process.stdout.write(
      `keep-back: ${where}; ${all.length} living days, ${paidThatMorning.length} with the home paid that morning, ${all.filter((m) => m.paid === m.requested).length} bought in full; first review ${review} read ${read} households; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a home paid on its living day (seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_200_000);
