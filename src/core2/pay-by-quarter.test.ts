/**
 * Pay by quarter (Money, Nov 8): in a random place from all 56, over a played
 * year and a half, every named worker with a payday has the quarters of
 * their gross pay, oldest first, at most the current quarter and five
 * completed ones; their sum is what the payroll paid them; and every counted
 * wage flow's group has its worker's pay by quarter.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COMPLETED_QUARTERS_KEPT,
  quarterOf,
  withQuarterPay,
} from "./pay-by-quarter";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("keeps the current quarter and the last five completed, dropping the oldest", () => {
  let list = withQuarterPay(undefined, "2025-01-15", 100);
  list = withQuarterPay(list, "2025-02-15", 50);
  expect(list).toEqual([{ quarter: "2025Q1", grossMinor: 150 }]);
  for (const date of [
    "2025-04-01",
    "2025-07-01",
    "2025-10-01",
    "2026-01-01",
    "2026-04-01",
    "2026-07-01",
  ])
    list = withQuarterPay(list, date, 10);
  expect(list.length).toBe(COMPLETED_QUARTERS_KEPT + 1);
  expect(list[0]!.quarter).toBe("2025Q2");
  expect(list.at(-1)!.quarter).toBe(quarterOf("2026-07-01"));
});

it("a played year and a half writes named and counted pay by quarter", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "pay-by-quarter");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 548));
  const named = [...core.work.payByQuarter];
  expect(named.length, `${where} named workers paid`).toBeGreaterThan(0);
  let namedTotal = 0;
  for (const [person, list] of named) {
    expect(list.length, `${where} ${person}`).toBeLessThanOrEqual(
      COMPLETED_QUARTERS_KEPT + 1,
    );
    const quarters = list.map((row) => row.quarter);
    expect([...quarters].sort(), `${where} ${person} oldest first`).toEqual(
      quarters,
    );
    for (const row of list) {
      expect(
        row.grossMinor,
        `${where} ${person} ${row.quarter}`,
      ).toBeGreaterThan(0);
      namedTotal += row.grossMinor;
    }
  }
  let paid = 0;
  for (const total of core.work.totalsByJob.values()) paid += total.paidMinor;
  // Within the kept quarters, never more than all the payroll paid.
  expect(namedTotal, where).toBeLessThanOrEqual(paid);
  const counted = [...core.work.countedPayByQuarter];
  expect(counted.length, `${where} counted groups paid`).toBeGreaterThan(0);
  for (const [key, list] of counted)
    for (const row of list)
      expect(
        row.perWorkerGrossMinor,
        `${where} ${key} ${row.quarter}`,
      ).toBeGreaterThan(0);
  console.log(
    `pay-by-quarter ${where}: ${named.length} named workers, ${counted.length} counted group-employer pairs`,
  );
}, 1_800_000);
