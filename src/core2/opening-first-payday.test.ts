/**
 * A world opens partway through everyone's pay period, so the first payday
 * after the opening pays the whole period, the days before the opening
 * included (pool item world-opening-month-pays-rent-before-any-pay). Pinned
 * to Bastrop, Louisiana (place 2204685, the seed home-price-paths draws from
 * "c3"), built on the game's start date so the opening is the build.
 *
 * Old premise (core2 commit a46bb32e, a builder's comment, no ruling): the
 * days of a pay period before the opening were owed to no one, so the first
 * paydays paid only the days since it. Account lead, Nov 15: a world opens in
 * motion, and every payday after the opening pays its whole period.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OFFICIAL_PAY_MODULE_ID } from "./modules/official-pay";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = "2204685";

it("pays counted workers and officials their whole first period at Bastrop LA", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(
    drawPlace("c3", "home-price-paths").seed,
    gameStartDate(),
    { twoLevel: true, placeKey: PLACE },
  );
  const opening = makeIsoDate(core.date);
  const rt = residentsRuntime(core)!;
  const where = `Bastrop LA (${PLACE}), world ${core.seed}, opened ${opening}`;

  // Officials seated at the opening are owed from the first of the month (or their service start, if later), not from the build.
  const pay = coreAPI(core)
    .moduleState(OFFICIAL_PAY_MODULE_ID)
    .table("pay")
    .rows() as unknown as { id: string; paidFrom: string }[];
  expect(pay.length, where).toBeGreaterThan(0);
  const monthStart = `${opening.slice(0, 8)}01`;
  for (const row of pay)
    expect(
      row.paidFrom >= monthStart && row.paidFrom <= opening,
      `${where}: ${row.id}`,
    ).toBe(true);
  expect(
    pay.some((row) => row.paidFrom < opening),
    where,
  ).toBe(true);

  // The counted payroll with the first payday after the opening.
  const flows = [...rt.flows.values()].filter(
    (row) => row.kind === "wages" && row.perDayMinorByJob,
  );
  expect(flows.length, where).toBeGreaterThan(0);
  for (const row of flows)
    expect("earnedDaysByDue" in row, `${where}: ${row.id}`).toBe(false);
  const flow = flows.sort((a, b) => a.nextAt.localeCompare(b.nextAt))[0]!;
  const due = makeIsoDate(flow.nextAt);
  expect(due > opening, `${where}: ${flow.id}`).toBe(true);
  advanceCore(core, makeIsoDate(addDays(due, -1)));
  // What the whole period pays, as the flow stands the day before.
  const whole = flow.amountMinor;
  advanceCore(core, due);
  expect(flow.lastRequestedMinor, `${where}: ${flow.id} on ${due}`).toBe(whole);
  expect(flow.lastPaidMinor, `${where}: ${flow.id} on ${due}`).toBe(whole);
}, 150_000);
