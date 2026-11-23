/**
 * Dev mode shows what a repeal ended (pool item dev-mode-repeal-reach-reads-nobody; the owner's
 * rule of Nov 16, 2026 that what a session traces by script dev mode shows). A bill that repeals
 * an amount ends the body's law row; a bill that answers a yes-or-no law No takes over from the row
 * that said yes. Either way the bill card read "reached nobody". Now the bill's outcome names the
 * row it ended or took over from, who that row reached while in force, and what of that ended on
 * the day it stopped, read from the end days the engines record. Played through dev mode's own
 * controls (introduce, decide with the chair hearing it, Run until) at Ridgeville, Alabama
 * (0164656), the draw "8341-pin"/"p6" executive-bill-menu.test.ts names: Alabama's state sales
 * tax repealed, and its dedicated parks funding answered No.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import {
  LAW_APPLIED_TABLE,
  type LawAppliedRow,
} from "../core2/law-reach/applied";
import { LAW_REACH_HOST_ID } from "../core2/law-reach/host";
import { coreAPI } from "../core2/state";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };
const BODY = "office:US-AL:legislature-lower";
const SALES_TAX = "law:US-AL:state:sales-tax:general:2025-01-01";
const PARKS =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
const PARKS_OPENING = `law:US-AL:state:${PARKS}:general:starting`;

it("a repeal's bill card names the law it ended and who no longer gets it (Ridgeville AL) (just like today: needs the state's real law it repeals)", () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    settings: { history: "today" },
    placeKey: place.key,
  });
  const core = world.core;
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  // 40 days of paydays, purchases and bills, so the laws have reached people.
  dev.advance(addDays(makeIsoDate(core.date), 40));
  const body = dev.lawmakingBodies().find((b) => b.id === BODY);
  expect(body, `${where}: no ${BODY}`).toBeDefined();
  const sponsorId = body!.members[0]!.key;
  // As the page's Repeal sends them: an amount repealed, a yes-or-no answered No.
  const repeal = dev.introduce({
    bodyOfficeId: BODY,
    sponsorId,
    series: "sales-tax",
    value: 0,
    repeal: true,
  }).bill;
  const no = dev.introduce({
    bodyOfficeId: BODY,
    sponsorId,
    series: PARKS,
    value: 0,
  }).bill;
  for (const bill of [repeal, no])
    dev.decideAt(bill.id, 40, { sign: true, chairHears: true });

  // Before the repeal's day: the row it ends is named, still in force, nothing of it ended.
  const before = dev.billOutcome(repeal.id);
  expect(before.ending.how, `${where}: the repeal did not pass`).toBe("law");
  expect(before.laws, `${where}: a repeal makes no row of its own`).toEqual([]);
  expect(
    before.ended.map((row) => row.id),
    `${where}: the row the repeal ends`,
  ).toEqual([SALES_TAX]);
  const pending = before.ended[0]!;
  expect(pending.inForce, where).toBe(true);
  expect(
    pending.reach.records,
    `${where}: the sales tax reached no one before its repeal`,
  ).toBeGreaterThan(0);
  expect(pending.reach.ended.records, where).toBe(0);

  // Run until it ends stops on the repeal's end day.
  const until = dev.runUntil({
    event: "law-takes-effect",
    subject: SALES_TAX,
    cap: 800,
  });
  expect(until.reason, `${where}: Run until did not stop on the end`).toBe(
    "event",
  );
  expect(until.records).toContain(`law-ended:${SALES_TAX}`);
  expect(core.date, where).toBe(pending.endDate);
  dev.advance(addDays(makeIsoDate(core.date), 40));

  // After: every row it reached ended on its end day, and no engine applied it again.
  const after = dev.billOutcome(repeal.id).ended[0]!;
  const reach = after.reach;
  expect(after.inForce, where).toBe(false);
  expect(reach.ended.lastEndedOn, where).toBe(after.endDate);
  expect(reach.ended.records, `${where}: rows the repeal left open`).toBe(
    reach.records,
  );
  expect(reach.ended.amountMinor, where).toBe(reach.amountMinor);
  expect(reach.ended.fullPeople, where).toBe(reach.fullPeople);
  expect(reach.ended.fullPeople + reach.ended.counted, where).toBeGreaterThan(
    0,
  );
  const applied = (
    coreAPI(core)
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .rows() as unknown as LawAppliedRow[]
  ).filter((row) => row.lawId === SALES_TAX);
  expect(
    applied.filter((row) => row.lastOn >= after.endDate!).map((row) => row.id),
    `${where}: the sales tax applied on or after its end`,
  ).toEqual([]);

  // A yes-or-no answered No: its new row names the row it took over from, and what of that ended.
  const answered = dev.billOutcome(no.id);
  expect(answered.ending.how, `${where}: the No did not pass`).toBe("law");
  const law = answered.laws[0]!;
  expect(law.value, where).toBe(0);
  expect(
    law.replaced.map((row) => row.id),
    `${where}: the row the No took over from`,
  ).toEqual([PARKS_OPENING]);
  const replaced = law.replaced[0]!.reach;
  expect(replaced.records, where).toBeGreaterThan(0);
  expect(replaced.ended.records, `${where}: rows the No left open`).toBe(
    replaced.records,
  );
  expect(replaced.ended.lastEndedOn, where).toBe(law.effectiveDate);
}, 60_000);
