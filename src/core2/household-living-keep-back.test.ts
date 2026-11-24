/**
 * A household keeps back for its home first: what the home will cost by its
 * next everyday day, beyond the pay due in before then. A mortgage or lease
 * paid that morning is not kept back again, so a household with the cash buys
 * its month of everyday living; one with no pay coming keeps the whole next
 * payment back; and a short month shows why in the credit engine's monthly row
 * (what it held, what it kept back). Proven in the played world, in a place
 * drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { LivingPlan } from "./cost-of-living";
import { CREDIT_MODULE_ID } from "./modules/credit";
import { coreAPI } from "./state";

/** Places drawn, at most, for one with a home paid on its living day and pay to cover the next. */
const DRAWS = 4;
/** Days run, at most, to reach the first monthly review after a living day. */
const DAYS = 75;

interface Spent {
  date: string;
  requested: number;
  paid: number;
  held: number;
  keptBack: number;
  /** What the home will cost by the next everyday day: arrears and payments due. */
  homeDue: number;
  /** A housing payment made earlier the same day. */
  homePaidThatMorning: boolean;
  /** No member holds a job: no pay comes in before the next everyday day. */
  noPay: boolean;
}

it("keeps back the home's next payment beyond the month's pay, buys everyday living with the rest, and records why a month went short", () => {
  const seed = process.env.KEEP_BACK_SEED ?? randomBytes(8).toString("hex");
  const passed: string[] = [];
  setBookkeeping(false);
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "household-living-keep-back");
    const where = `${place.name} (${place.key}), seed ${place.seed} (test seed ${seed}, draw ${draw})`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const spent = new Map<string, Spent[]>();
    let review: string | undefined;
    // Each household's plan as the day began: what the review that day reads.
    type Before = Map<
      string,
      {
        plan: LivingPlan;
        lastAt?: string;
        requested: number;
        held?: number;
        keptBack?: number;
      }
    >;
    let atReview: Before = new Map();
    for (let day = 0; day < DAYS && !review; day += 1) {
      const before: Before = new Map(
        [...core.finance.livingPlans].map(([id, plan]) => [
          id,
          {
            plan,
            lastAt: plan.lastAt,
            requested: plan.lastRequestedMinor,
            held: plan.lastHeldMinor,
            keptBack: plan.lastKeptBackMinor,
          },
        ]),
      );
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const plan of core.finance.livingPlans.values()) {
        if (plan.lastAt !== core.date) continue;
        let paidToday = false,
          homeDue = 0;
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
          // The plan's due date has moved on to the next everyday day.
          homeDue +=
            row.arrearsMinor + (row.dueAt <= plan.dueAt ? row.amountMinor : 0);
        }
        const noPay = (
          core.households.get(plan.householdId)?.memberIds ?? []
        ).every((id) => {
          const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
          return !job || job.endsAt !== undefined || job.wageDailyMinor <= 0;
        });
        const rows = spent.get(plan.householdId) ?? [];
        rows.push({
          date: core.date,
          requested: plan.lastRequestedMinor,
          paid: plan.lastPaidMinor,
          held: plan.lastHeldMinor!,
          keptBack: plan.lastKeptBackMinor!,
          homeDue,
          homePaidThatMorning: paidToday,
          noPay,
        });
        spent.set(plan.householdId, rows);
      }
      const months = api
        .moduleState(CREDIT_MODULE_ID)
        .table("households")
        .rows()
        .filter((row) => row.date === core.date);
      if (months.length && spent.size) {
        review = core.date;
        atReview = before;
      }
    }
    const all = [...spent.values()].flat();
    // A place whose households made no living-day purchase before the first
    // review has nothing to test; the next is drawn, and this one is named.
    if (!all.length) {
      passed.push(
        `${where}: no household bought everyday living in ${DAYS} days`,
      );
      continue;
    }
    for (const month of all) {
      const free = Math.max(0, month.held - month.keptBack);
      // With the cash, the month's everyday living is bought in full; without
      // it, everything left after the home is spent and the rest goes unbought.
      expect(month.paid, `${where} ${month.date}`).toBe(
        Math.min(month.requested, free),
      );
    }
    for (const month of all) {
      // Never more than the home will cost by the next everyday day; with no
      // pay coming, all of it (rent or mortgage first).
      expect(month.keptBack, `${where} ${month.date}`).toBeLessThanOrEqual(
        month.homeDue,
      );
      if (month.noPay)
        expect(month.keptBack, `${where} ${month.date}`).toBe(month.homeDue);
    }
    // A home paid that morning is not kept back a second time: where the
    // month's pay covers the next payment, nothing is kept back.
    const paidThatMorning = all.filter((m) => m.homePaidThatMorning);
    const notTwice = paidThatMorning.filter(
      (m) => m.homeDue > 0 && m.keptBack === 0,
    );
    if (!notTwice.length) {
      passed.push(
        `${where}: no home paid on a living day with pay to cover the next`,
      );
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
    // The review covers living days since the first of the month before.
    const since = `${addDays(makeIsoDate(`${review!.slice(0, 7)}-01`), -1).slice(0, 7)}-01`;
    let read = 0,
      replaced = 0;
    for (const row of months) {
      const was = atReview.get(row.householdId as string);
      if (!was?.lastAt || was.lastAt < since) continue;
      // A household whose plan ended or was made anew that day is read afresh.
      if (
        core.finance.livingPlans.get(row.householdId as string) !== was.plan
      ) {
        replaced += 1;
        continue;
      }
      read += 1;
      expect(row, `${where} ${row.id}`).toMatchObject({
        everydayMinor: was.requested,
        livingHeldMinor: was.held,
        keptBackMinor: was.keptBack,
      });
    }
    expect(read, where).toBeGreaterThan(0);
    process.stdout.write(
      `keep-back: ${where}; ${all.length} living days, ${paidThatMorning.length} with the home paid that morning (${notTwice.length} keeping nothing back for the next payment), ${all.filter((m) => m.noPay).length} with no pay coming, ${all.filter((m) => m.paid === m.requested).length} bought in full; first review ${review} read ${read} households (${replaced} plans made anew that day); passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a home paid on its living day with the month's pay to cover the next (seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_200_000);
