/**
 * One payday (Money, Nov 8, item 1): in a random place from all 56, over a
 * played year, a counted employer's wage flow is settled only on a payday of
 * that employer's recorded payroll calendar, once per pay period, the same
 * dates its named workers are paid on.
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
import { FinanceReadGuard } from "./finance-plan";
import { nextWorkPayrollPeriod, workPayPeriodAtIndex } from "./work-pay-period";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("counted wage flows settle on their employer's recorded paydays, once each, as its named workers do", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "counted-payday");
  const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
  const where = pinned
    ? `pinned place [${pinned}], seed ${draw.seed}`
    : `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: process.env.GOLDEN_PATH_PLACE_KEY ?? draw.key,
  });
  const rt = residentsRuntime(core)!;
  const flows = [...rt.flows.values()].filter(
    (flow) => flow.kind === "wages" && flow.organizationId,
  );
  expect(flows.length, `${where} counted employer wage flows`).toBeGreaterThan(
    0,
  );
  const start = core.date;
  const countedPaid = new Map<string, string[]>();
  const namedPaid = new Map<string, Set<string>>();
  const lastNext = new Map(flows.map((f) => [f.id, f.nextAt]));
  const lastSettled = new Map<string, string | undefined>();
  const days = 365;
  for (let d = 1; d <= days; d++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const flow of flows) {
      if (flow.nextAt !== lastNext.get(flow.id)) {
        const list = countedPaid.get(flow.id) ?? [];
        list.push(core.date);
        countedPaid.set(flow.id, list);
        lastNext.set(flow.id, flow.nextAt);
      }
    }
    for (const [commitmentId, ledger] of core.work.payrollLedgerByCommitment) {
      if (ledger.lastSettledAt !== lastSettled.get(commitmentId)) {
        lastSettled.set(commitmentId, ledger.lastSettledAt);
        const orgId = core.work.commitments.get(commitmentId)?.organizationId;
        if (orgId && ledger.lastSettledAt) {
          const set = namedPaid.get(orgId) ?? new Set<string>();
          set.add(core.date);
          namedPaid.set(orgId, set);
        }
      }
    }
  }
  const reads = new FinanceReadGuard();
  const units = { zero: 0, one: 1, monthsPerYear: 12 };
  let checked = 0,
    matchedNamed = 0,
    namedEmployers = 0;
  for (const flow of flows) {
    const dates = countedPaid.get(flow.id) ?? [];
    // The calendar the flow was built from: its id is in the flow's own.
    const calendarId = [...core.work.payrollCalendars.values()].find(
      (c) => c.organizationId === flow.organizationId && flow.id.includes(c.id),
    );
    if (!calendarId) continue;
    // Every due date of this employer's calendar in the year.
    const due = new Set<string>();
    let period = nextWorkPayrollPeriod(reads, calendarId, start, start, units);
    while (period.dueAt <= core.date) {
      if (period.dueAt > start) due.add(period.dueAt);
      period = workPayPeriodAtIndex(
        reads,
        calendarId,
        period.index + 1,
        start,
        units,
      );
    }
    for (const date of dates)
      expect(
        due.has(date),
        `${where}: ${flow.id} settled on ${date}, not a payday of its employer's calendar`,
      ).toBe(true);
    // Once per period: no date twice.
    expect(new Set(dates).size, `${where} ${flow.id} paid twice`).toBe(
      dates.length,
    );
    // Partner flows (twice a month) pay half the month each, so a flow
    // alone pays a subset; every payday is covered by this flow or its partner.
    const covered = new Set(dates);
    for (const partner of flow.partnerFlowIds ?? [])
      for (const date of countedPaid.get(partner) ?? []) covered.add(date);
    if ([...due].some((date) => !covered.has(date)))
      console.log(
        `DBG ${flow.id} cadence ${JSON.stringify(flow.cadence)} first ${flow.firstAt} paid ${[...covered].sort().slice(0, 4)} due ${[...due].sort().slice(0, 4)} partners ${flow.partnerFlowIds}`,
      );
    for (const date of due)
      expect(
        covered.has(date),
        `${where}: ${flow.id} missed payday ${date}`,
      ).toBe(true);
    checked += 1;
    const named = namedPaid.get(flow.organizationId!);
    if (named?.size) {
      namedEmployers += 1;
      for (const date of named)
        if (due.has(date)) matchedNamed += 1;
        else
          throw new Error(
            `${where}: named workers of ${flow.organizationId} were paid on ${date}, not on its calendar`,
          );
    }
  }
  console.log(
    `counted-payday ${where}: ${checked} counted wage flows checked, ${namedEmployers} of them with named workers on the same calendar (${matchedNamed} named paydays on it)`,
  );
  expect(checked, where).toBeGreaterThan(0);
}, 1_800_000);
