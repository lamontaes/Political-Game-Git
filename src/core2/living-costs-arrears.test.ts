/**
 * A household that cannot pay its outside living cost on the 1st pays it when
 * money arrives. Played world in a place drawn from all 56; the place and seed
 * are named in every failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("leaves households that earn owing under a tenth of their living costs after 90 days, and the books balance", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "living-costs-arrears");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 90));
    // A household that earns pays what it is asked: what it still owes after
    // 90 days is under a tenth of what it was asked. A household with no job
    // and no cash owes what it cannot pay (see the pool item for them).
    const rt = residentsRuntime(core)!;
    let asked = 0,
      owed = 0;
    for (const flow of rt.flows.values()) {
      if (flow.financeKind !== "household.outside-living-costs") continue;
      if (flow.endedAt || flow.payerId === flow.residentsId) continue;
      const home = core.households.get(
        core.people.get(flow.payerId)?.householdId ?? "",
      );
      const earns = (home?.memberIds ?? []).some((id) => {
        const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
        return job !== undefined && job.endsAt === undefined;
      });
      if (!earns) continue;
      asked += flow.amountMinor * 3;
      owed += flow.arrearsMinor;
    }
    expect(asked, where).toBeGreaterThan(0);
    expect(owed / asked, `${where}: owed ${owed} of ${asked}`).toBeLessThan(
      0.1,
    );
    const living = core.finance.totalsByKind.get(
      "household.outside-living-costs",
    );
    expect(living, where).toBeDefined();
    // What is unfunded is what was asked and not yet paid, never more.
    expect(living!.unfundedMinor, where).toBeLessThanOrEqual(
      living!.requestedMinor - living!.paidMinor + 1,
    );
    expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);

it("writes off a jobless household's living cost unpaid past the charge-off age, so no household owes more than a few bills", () => {
  setBookkeeping(false);
  try {
    // A place where every household paid has nothing to write off: draw on,
    // checking the ceiling and the books in every place drawn, until a place
    // has a household that went unpaid long enough, and name each one passed.
    const passed: string[] = [];
    for (let n = 0; n < 12; n += 1) {
      const draw = drawPlace(`${seed}:${n}`, "living-costs-write-off");
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
      const api = coreAPI(core);
      const bills = api.parameter("livingCostWriteOffBills");
      const rt = residentsRuntime(core)!;
      const living = () =>
        [...rt.flows.values()].filter(
          (flow) =>
            flow.financeKind === "household.outside-living-costs" &&
            flow.payerId !== flow.residentsId,
        );
      // Whether the household paying a flow holds an active job today.
      const jobless = (payerId: string) => {
        const home = core.households.get(
          core.people.get(payerId)?.householdId ?? "",
        );
        return (
          home !== undefined &&
          !home.memberIds.some((id) => {
            const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
            return job !== undefined && job.endsAt === undefined;
          })
        );
      };
      // Eight months, a month at a time: a household with no job and no cash
      // misses eight bills, and each write-off is matched to the household's
      // jobs on the month it happens.
      const before = new Map<string, number>();
      let found:
        | {
            flowId: string;
            householdId: string;
            written: number;
            owes: number;
            bill: number;
          }
        | undefined;
      for (let month = 0; month < 8; month += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        for (const flow of living()) {
          const written = flow.writtenOffMinor ?? 0;
          if (
            !found &&
            written > (before.get(flow.id) ?? 0) &&
            jobless(flow.payerId)
          )
            found = {
              flowId: flow.id,
              householdId: core.people.get(flow.payerId)!.householdId,
              written,
              owes: flow.arrearsMinor,
              bill: flow.amountMinor,
            };
          before.set(flow.id, written);
        }
      }
      let worst = 0;
      for (const flow of living()) {
        // Owing never passes the ceiling, whoever the household is.
        expect(
          flow.arrearsMinor,
          `${where}: ${flow.id} owes ${flow.arrearsMinor} of a ${flow.amountMinor} bill`,
        ).toBeLessThanOrEqual(Math.round(flow.amountMinor * bills) + 1);
        worst = Math.max(
          worst,
          flow.arrearsMinor / Math.max(1, flow.amountMinor),
        );
      }
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      // Not vacuous: a household with no active job went unpaid long enough
      // to have its living cost written off.
      if (found) {
        expect(found.written, `${where}: ${found.flowId}`).toBeGreaterThan(0);
        expect(
          found.owes,
          `${where}: ${found.flowId} (household ${found.householdId}) owes ${found.owes} of a ${found.bill} bill`,
        ).toBeLessThanOrEqual(Math.round(found.bill * bills) + 1);
        process.stdout.write(
          `living-cost write-off: ${where}; household ${found.householdId} with no active job; flow ${found.flowId}; written off ${found.written}\n`,
        );
        return;
      }
      passed.push(`${where} (worst ${worst} bills)`);
    }
    throw new Error(
      `no drawn place wrote off a jobless household's living cost in 12 draws: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
