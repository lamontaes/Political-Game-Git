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
