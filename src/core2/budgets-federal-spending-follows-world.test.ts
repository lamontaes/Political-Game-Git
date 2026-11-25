/**
 * The federal budget's spending follows the world, not the first plan (pins budgets.ts:861 and :1526, family 17).
 * Each year's lines start from the last adopted budget, carried at this year's cost: lines paid to households move
 * with the people the country's households hold and the world's prices, net interest with the debt and its yield,
 * every other line with prices. Receipts are measured from the middle of the year whose collections set the plan, so
 * growth is counted once. Fails on the code that rebuilt every year from the published file (spending equal to the
 * dollar year after year).
 * Places: three drawn per run (GOLDEN_PATH_SEED replays a run), each named in every message.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import federalLines from "./data/country/federal-lines.json" with { type: "json" };
import { budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

/** A double as the exact fraction it holds: doubling is exact, so double it until it is whole. */
function asFraction(x: number): [bigint, bigint] {
  let scaled = x;
  let d = 1n;
  while (!Number.isInteger(scaled)) {
    scaled *= 2;
    d *= 2n;
  }
  return [BigInt(scaled), d];
}

/** `value` × Π over ÷ Π under, exactly, rounded to the nearest whole cent (halves up). */
function exactlyRounded(
  value: number,
  over: readonly number[],
  under: readonly number[],
): number {
  let n = 1n;
  let d = 1n;
  for (const x of [value, ...over]) {
    const [a, b] = asFraction(x);
    n *= a;
    d *= b;
  }
  for (const x of under) {
    const [a, b] = asFraction(x);
    n *= b;
    d *= a;
  }
  // All positive here: debt, yield, people, prices and a line's cents.
  return Number((2n * n + d) / (2n * d));
}

const run = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const destination = federalLines.lines as Record<string, string>;

describe("federal spending follows the world's own people and prices", () => {
  for (const draw of [0, 1, 2]) {
    it(`draw ${draw}`, () => {
      setBookkeeping(false);
      const place = drawPlace(
        draw === 0 ? run : `${run}:${draw}`,
        "federal-spending",
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}, run ${run}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      advanceCore(world.core, "2026-11-01" as never);
      const us = governments(api).find((g) => g.level === "federal")!;
      const rows = budgetsOf(api, us.id)
        .slice()
        .sort((a, b) => a.fiscalYear - b.fiscalYear);
      let checked = 0;
      let moved = 0;
      for (let i = 1; i < rows.length; i += 1) {
        const prior = rows[i - 1]!;
        const row = rows[i]!;
        if (!prior.drivers || !row.drivers) continue;
        for (const [line, was] of Object.entries(prior.baseSpendingMinor!)) {
          const now = row.baseSpendingMinor![line]!;
          // The rule: last year's line times the ratios of this world's own
          // drivers, rounded once to the nearest cent of the exact result
          // (CTO, #9747 6991875920), worked here in whole numbers.
          const [over, under] =
            line === "netInterest"
              ? [
                  [row.drivers.debt, row.drivers.yield],
                  [prior.drivers.debt, prior.drivers.yield],
                ]
              : destination[line] === "households"
                ? [
                    [row.drivers.people, row.drivers.prices],
                    [prior.drivers.people, prior.drivers.prices],
                  ]
                : [[row.drivers.prices], [prior.drivers.prices]];
          expect(now, `${where}: ${row.id} ${line}`).toBe(
            exactlyRounded(was, over, under),
          );
          checked += 1;
          if (now !== was) moved += 1;
        }
        // A plan re-budgeted from a year's collections stands at that year's middle, not at the plan's first day.
        expect(row.revenuePlanMonth, `${where}: ${row.id} plan month`).not.toBe(
          row.startsOn.slice(0, 7),
        );
      }
      // Dev mode's Trace box shows a re-budgeted year's inputs: the budget it carried forward from, and the
      // treasury months whose collections set its plan.
      const latest = rows.filter((r) => r.collectedMonths?.length).at(-1);
      expect(latest, `${where}: a re-budgeted federal year`).toBeDefined();
      const kinds = new Set(
        (traceNode(world.core, world.director, latest!.id).causes ?? []).map(
          (c) => c.kind,
        ),
      );
      expect(
        kinds.has("budgets"),
        `${where}: trace names the budget carried forward`,
      ).toBe(true);
      expect(
        kinds.has("treasuryMonths"),
        `${where}: trace names the treasury months`,
      ).toBe(true);
      expect(checked, `${where}: federal years checked`).toBeGreaterThan(0);
      expect(moved, `${where}: lines that moved`).toBeGreaterThan(0);
    }, 1_200_000);
  }
});
