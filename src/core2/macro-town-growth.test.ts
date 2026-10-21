import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { MacroMonth } from "./macro-model";
import { coreAPI } from "./state";

// The national step always hears the town's income growth (owner rule:
// estimate, never UNKNOWN): the nation's payroll-income growth until the
// town has comparable months of its own, then its own growth with a weight
// that rises by a twelfth for each month it covers.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "macro-town-growth");

it(`the town's income growth starts from the estimate and moves to its own, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = JSON.stringify({ seed, place: place.name });
  advanceCore(core, makeIsoDate("2026-07-02"));
  const rows = (
    coreAPI(core)
      .moduleState("macro")
      .table("months")
      .rows() as unknown as MacroMonth[]
  )
    .filter((row) => row.kind === "simulated")
    .sort((a, b) => (a.month < b.month ? -1 : 1));
  expect(rows.length, where).toBeGreaterThan(15);
  // Every simulated month has the estimate, and none is left without feedback.
  for (const row of rows) {
    expect(row.townIncomeGrowthPct, `${where}: ${row.id}`).toBeTypeOf("number");
    expect(row.townGrowthEstimatePct, `${where}: ${row.id}`).toBeTypeOf(
      "number",
    );
  }
  // The first year has no comparable month of the town's own.
  for (const row of rows.filter((r) => r.month < "2026-02"))
    expect(row.townGrowthOwnWeight, `${where}: ${row.id}`).toBe(0);
  // Then the town's own growth enters, with a rising weight, as a blend.
  const own = rows.filter((row) => (row.townGrowthOwnWeight ?? 0) > 0);
  expect(own.length, where).toBeGreaterThan(0);
  const weights = own.map((row) => row.townGrowthOwnWeight!);
  expect(weights, where).toEqual([...weights].sort((a, b) => a - b));
  expect(weights.at(-1)!, where).toBeGreaterThan(weights[0]!);
  for (const row of own) {
    const w = row.townGrowthOwnWeight!;
    expect(row.townIncomeGrowthPct!, `${where}: ${row.id}`).toBeCloseTo(
      w * row.townGrowthOwnPct! + (1 - w) * row.townGrowthEstimatePct!,
      6,
    );
  }
}, 900_000);
