/**
 * Results mode pays a month's skipped paydays on its first day: one weekly or
 * biweekly wage flow is settled two to five times that day, each payment named
 * by the day it fell due. An employer short of cash on two of those paydays
 * draws its savings at the bank twice, and each draw is named by the payday it
 * covers, so the second is not refused as a reused transfer id (Escalon,
 * California, Nov 12, 2026: the draw was named by the catch-up day, and the
 * run stopped on "Transfer id is empty or reused").
 *
 * The case is found, not assumed: each drawn world runs in results mode a
 * month at a time, up to a limit, until one flow draws savings for two or
 * more paydays on one catch-up day; the places passed over are named. A
 * second case replays the Escalon world where the run first stopped.
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type * as Accounts from "./accounts";

/** Every savings draw a payment asked for: its id, the day, what it drew. */
const draws = vi.hoisted(
  () => [] as { id: string; date: string; drawn: number }[],
);
vi.mock("./accounts", async (importOriginal) => {
  const real = await importOriginal<typeof Accounts>();
  return {
    ...real,
    drawSavingsToCover: (
      ...args: Parameters<typeof real.drawSavingsToCover>
    ) => {
      const drawn = real.drawSavingsToCover(...args);
      draws.push({ id: args[2].id, date: args[0].date, drawn });
      return drawn;
    },
  };
});

const PREFIX = "savings-for-payment:";
const DRAWS = 3;
// A year played, then up to a year skipped a month at a time.
const SKIPPED_MONTHS = 12;
const PLAYED_DAYS = 400;
const PLAYED_YEAR = 365;
const SKIPPED_DAYS = 60;

/** The flows that drew savings for two or more paydays on one day. */
function repeated(from: number) {
  const byFlowDay = new Map<string, Set<string>>();
  for (const row of draws.slice(from)) {
    if (!row.id.startsWith(PREFIX) || !(row.drawn > 0)) continue;
    const at = row.id.lastIndexOf("@");
    const key = `${row.id.slice(PREFIX.length, at)}|${row.date}`;
    const ids = byFlowDay.get(key) ?? new Set<string>();
    ids.add(row.id);
    byFlowDay.set(key, ids);
  }
  return [...byFlowDay].filter(([, ids]) => ids.size > 1);
}

/** How many flows asked for savings for two or more paydays on one day. */
function asked(from: number) {
  const seen = new Map<string, number>();
  for (const row of draws.slice(from)) {
    if (!row.id.startsWith(PREFIX)) continue;
    const key = `${row.id.slice(PREFIX.length, row.id.lastIndexOf("@"))}|${row.date}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.values()].filter((n) => n > 1).length;
}

/** Each draw names the payday it covers: a day on or before the day it ran. */
function namedByPayday(from: number, where: string) {
  for (const row of draws.slice(from)) {
    if (!row.id.startsWith(PREFIX)) continue;
    const due = row.id.slice(row.id.lastIndexOf("@") + 1);
    expect(due, `${row.id} names a payday (${where})`).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(due <= row.date, `${row.id} ran ${row.date} (${where})`).toBe(true);
  }
}

it("an employer short on two skipped paydays draws its savings once for each, by payday", () => {
  setBookkeeping(false);
  const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
  const passed: string[] = [];
  for (let n = 0; n < DRAWS; n++) {
    const seed = n ? `${base}:${n}` : base;
    const place = drawPlace(seed, "results-mode-savings-draw-per-payday");
    const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const from = draws.length;
    let found: [string, Set<string>][] = [];
    // Employers run short in played days, when their own costs and sales
    // run; results mode then skips whole months of paydays, each month's paid
    // on its first day. Play does not resume after results mode here: a
    // return to played days after skipped ones is its own defect (pool item
    // core-played-days-after-results-mode-lose-a-payroll-retry).
    advanceCore(core, addDays(makeIsoDate(core.date), PLAYED_YEAR));
    for (let month = 0; month < SKIPPED_MONTHS && !found.length; month++) {
      const next = new Date(`${core.date.slice(0, 7)}-01T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1, 1);
      advanceCore(core, next.toISOString().slice(0, 10), { results: true });
      found = repeated(from);
    }
    namedByPayday(from, where);
    if (!found.length) {
      passed.push(
        `${where}: through ${core.date}, no flow drew savings for two paydays on one day (${draws.length - from} draws asked, ${draws.slice(from).filter((r) => r.drawn > 0).length} drew money, ${asked(from)} flows asked twice on one day)`,
      );
      continue;
    }
    const [key, ids] = found[0]!;
    process.stdout.write(
      `SAVINGS DRAWS ${where}: ${key} drew for ${ids.size} paydays: ${[...ids].join(", ")}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    expect(ids.size, where).toBeGreaterThan(1);
    return;
  }
  throw new Error(
    `No drawn place had an employer draw savings for two skipped paydays on one day: ${passed.join("; ")}`,
  );
}, 3_600_000);

// The world where the run first stopped, as a labeled case beside the drawn
// ones: 400 played days, then the skipped days of the out-of-town workers'
// unit test that pull request 8886 adds (GOLDEN_PATH_SEED
// e24e25a7-6895-424e-a65d-ea8567e62726).
it("Escalon, California's skipped months finish with every savings draw named by its payday", () => {
  setBookkeeping(false);
  const where =
    "Escalon, California (0622790), world seed debb244d6d0d814a60610091708b1e965cb742f8dc9c279b9269373d20675afd";
  const { core } = buildBenchWorld(
    "debb244d6d0d814a60610091708b1e965cb742f8dc9c279b9269373d20675afd",
    gameStartDate(),
    { twoLevel: true, placeKey: "0622790" },
  );
  advanceCore(core, addDays(makeIsoDate(core.date), PLAYED_DAYS));
  const from = draws.length;
  advanceCore(core, addDays(makeIsoDate(core.date), SKIPPED_DAYS), {
    results: true,
  });
  namedByPayday(from, where);
  process.stdout.write(
    `SAVINGS DRAWS ${where}: results mode through ${core.date}; flows that drew for two or more paydays on one day: ${
      repeated(from)
        .map(([key, ids]) => `${key} (${ids.size})`)
        .join(", ") || "none"
    }\n`,
  );
}, 3_600_000);
