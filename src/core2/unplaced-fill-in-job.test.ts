import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, withholdingOf } from "./modules/budgets";
import { countedDemotions } from "./modules/counted-demotion";
import { residentsRuntime } from "./modules/residents";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState, PersonState } from "./types";

// A filled-in household's jobless worker takes a real job with an employer
// outside the town, paid from the place's outside account, and goes back to
// the unplaced workers' pay when the household returns to the counts
// (core-commuter-job-fill-in). A place is drawn from all 56; set
// GOLDEN_PATH_SEED to reproduce a run.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a filled-in jobless worker holds an outside job with a payday and withholding, and returns to the pool, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `commuter:${attempt}`);
    tried.push(place.name);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const state = core as CoreState;
    const api = coreAPI(core);
    const rt = residentsRuntime(state)!;
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const pool = () =>
      [...rt.flows.values()]
        .filter(
          (flow) =>
            !flow.endedAt && flow.financeKind === "work.unplaced-residents",
        )
        .reduce((n, flow) => n + flow.amountMinor, 0);
    // A counted household with unplaced workers whose fill-in gives one of its
    // people a commuter job (a household of children or retirees would not).
    let commuter: PersonState | undefined;
    let before = 0;
    for (const household of [...rt.store.liveHouseholds()]
      .filter((h) => h.unplacedWorkers > 0 && rt.store.countedMembers(h).length)
      .slice(0, 12)) {
      before = pool();
      const member = rt.store.ids[rt.store.countedMembers(household)[0]!]!;
      fillInPerson(state, member);
      commuter = [...state.people.values()].find(
        (p) =>
          p.householdId === household.id &&
          p.jobId?.startsWith("job:commuter:"),
      );
      if (commuter) break;
    }
    if (!commuter) continue;
    const job = state.jobs.get(commuter.jobId!)!;
    const employer = state.organizations.get(job.organizationId)!;
    expect(employer.kind, `${where}: employer is the outside account`).toBe(
      OUTSIDE_MARKET_KIND,
    );
    expect(
      pool(),
      `${where}: the pool gave up the household's share`,
    ).toBeLessThan(before);
    const whileHeld = pool();
    // A regular payday, with tax withheld, and the account's own cash never used.
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    const ledger = [...state.work.payrollLedgerByCommitment.values()].find(
      (row) => row.jobId === job.id,
    );
    expect(
      ledger?.paidMinor ?? 0,
      `${where}: ${job.id} was paid`,
    ).toBeGreaterThan(0);
    expect(
      ledger?.lastPayrollReceiptId,
      `${where}: a payroll receipt`,
    ).toBeTruthy();
    // The paycheck went through the withholding step like any other: the year's
    // pay is counted once it is withheld, or had nothing to withhold under the
    // place's law, and any tax taken is on the person's record.
    const counted = api
      .moduleState(BUDGETS_MODULE_ID)
      .table("yearToDate")
      .get(`${commuter.id}:${core.date.slice(0, 4)}`) as
      { minor: number } | undefined;
    expect(
      counted?.minor ?? 0,
      `${where}: ${commuter.id} pay counted`,
    ).toBeGreaterThan(0);
    for (const line of withholdingOf(api, commuter.id))
      expect(line.date, where).toBeDefined();
    expect(state.organizations.get(employer.id)!.liquidMinor).toBe(0);
    // Out of the player's life for the world's 180 to 240 days, the household
    // goes back to the counts: the job ends and its pay goes back to the pool.
    advanceCore(core, addDays(makeIsoDate(core.date), 300));
    const returned = countedDemotions(api).find(
      (row) => row.householdId === commuter.householdId,
    );
    if (!returned) continue;
    expect(
      state.jobs.get(job.id)!.endsAt,
      `${where}: the job ended`,
    ).toBeDefined();
    expect(pool(), `${where}: the pay is back in the pool`).toBeGreaterThan(
      whileHeld,
    );
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `no drawn place had a filled-in unplaced worker (${tried.join(", ")}; seed ${seed})`,
  );
}, 1_800_000);
