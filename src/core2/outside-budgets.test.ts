/**
 * Every other state keeps a budget in the one budget store (Nation, Nov 8):
 * built from its Census finances and moved by its own jobs times pay since
 * the world opened. Played for a year in a place drawn from all 56 on a seed
 * nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, type BudgetRow } from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("other states keep a budget in the one store, moved by their own economy", () => {
  const place = drawPlace(seed, "outside-budgets");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 400);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
  }
  const where = `${place.name}, seed ${seed}`;
  const town = lawChain(api).stateKey;
  const rows = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("budgets")
    .rows() as unknown as BudgetRow[];
  const outside = rows.filter(
    (r) => r.governmentId.startsWith("US-") && r.governmentId !== town,
  );
  const states = new Set(outside.map((r) => r.governmentId));
  expect(states.size, `${where}: other states with a budget`).toBeGreaterThan(
    40,
  );
  // A state's budget one fiscal year on differs from the year before:
  // its jobs times pay moved.
  const byState = new Map<string, BudgetRow[]>();
  for (const r of outside)
    byState.set(r.governmentId, [...(byState.get(r.governmentId) ?? []), r]);
  const moved = [...byState.values()].filter((list) => {
    if (list.length < 2) return false;
    const [a, b] = list.sort((x, y) => x.fiscalYear - y.fiscalYear);
    const sum = (r: BudgetRow) =>
      Object.values(r.spendingMinor).reduce((n, v) => n + v, 0);
    return sum(a!) !== sum(b!);
  });
  expect(
    moved.length,
    `${where}: states whose budget moved with their economy`,
  ).toBeGreaterThan(0);
  // Lines move on their own bases: a state's income-tax line and its
  // property-tax line (the wage bill and the price level) do not move by one
  // factor, in at least one state.
  const lineWise = [...byState.values()].some((list) => {
    if (list.length < 2) return false;
    const [a, b] = list.sort((x, y) => x.fiscalYear - y.fiscalYear);
    const ratio = (line: string) =>
      (b!.revenueMinor[line] ?? 0) / (a!.revenueMinor[line] || 1);
    return Math.abs(ratio("individualIncomeTax") - ratio("propertyTax")) > 1e-6;
  });
  expect(lineWise, `${where}: lines move on their own bases`).toBe(true);
  for (const r of outside.slice(0, 5)) {
    expect(Object.keys(r.spendingMinor).length).toBeGreaterThan(0);
    expect(r.source).toContain("tax rate its law has in force");
  }
}, 900000);
