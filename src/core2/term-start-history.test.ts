import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import termStarts from "./data/elections/term-starts.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";

// A governor's past terms start on the state's own clause day, each in its
// own year, and each ends the day the next begins (gov-past-term-starts-by-rule).
// The place is drawn from the states whose clause is read (all 56 since the
// October 23 read), the only ones with a clause day to check.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
type Rule = { month: number; nth: number; weekday: number; offsetDays: number };
type Row = { rule?: Rule; monthDay?: string };
const read = Object.entries(
  termStarts.states as Record<string, { statewideExecutive?: Row }>,
)
  .filter(([, rows]) => rows.statewideExecutive)
  .sort(([a], [b]) => a.localeCompare(b));
/**
 * The clause's day in a year: a fixed month and day, or the nth weekday of a
 * month plus an offset, which may carry it into the next month (Kentucky's
 * fifth Tuesday after the November election) or back a few days.
 */
function clauseDay(row: Row, year: number): string {
  if (row.monthDay) return `${year}-${row.monthDay}`;
  const rule = row.rule!;
  const first = new Date(Date.UTC(year, rule.month - 1, 1)).getUTCDay();
  const day =
    1 + ((rule.weekday - first + 7) % 7) + 7 * (rule.nth - 1) + rule.offsetDays;
  return new Date(Date.UTC(year, rule.month - 1, day))
    .toISOString()
    .slice(0, 10);
}
const hash = createHash("sha256")
  .update(`${seed}:term-start-history`)
  .digest("hex");
const [state, rows] = read[parseInt(hash.slice(0, 8), 16) % read.length]!;
const localities = [...placeLocalities(state)].sort((a, b) =>
  a.key.localeCompare(b.key),
);
const locality =
  localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;

it(`a governor's terms in ${locality.displayName}, ${state} chain on the state's clause day, seed ${seed}`, () => {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: locality.key,
  });
  const where = `${locality.displayName} [${locality.key}], seed ${seed}`;
  const row = rows.statewideExecutive!;
  const terms = (
    coreAPI(core)
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as {
      id: string;
      startDate: string;
      endDate: string | null;
    }[]
  )
    // D.C.'s statewide executive clause is its mayor's (Home Rule Act sec. 421).
    .filter(
      (t) =>
        new RegExp(`:seat:${state}:(governor|mayor):`).test(t.id) && t.endDate,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  expect(terms.length, where).toBeGreaterThan(0);
  for (const [i, term] of terms.entries()) {
    expect(term.startDate, `${term.id} in ${where}`).toBe(
      clauseDay(row, Number(term.startDate.slice(0, 4))),
    );
    if (i > 0)
      expect(terms[i - 1]!.endDate, `${term.id} in ${where}`).toBe(
        term.startDate,
      );
  }
  // Building one bench world takes 10 to 20 s here (three draws: 10.7, 19.7
  // and 10.6 s); two minutes leaves room on a slower container.
}, 120_000);
