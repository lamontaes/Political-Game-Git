/** The government pass of the pre-start run: how each official reached their seat, by record id. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { preStartHistory, preStartWindow, runPreStart } from "./pre-start";
import { coreAPI } from "./state";

it("lists how an official reached their seat before the start, by record id", () => {
  const place = drawPlace(randomBytes(32).toString("hex"), "pre-start-seats");
  const label = `${place.key} seed ${place.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  runPreStart(core, preStartWindow(core, "2000-01-01", "quarter"));
  const rows = preStartHistory(core, { kind: "office.seat-reached" });
  expect(rows.length, label).toBeGreaterThan(0);
  const terms = coreAPI(core).moduleState(OFFICES_MODULE_ID).table("terms");
  for (const row of rows) {
    const term = terms.get(String(row.facts.termId));
    expect(term, row.id).toBeDefined();
    expect(row.facts.reached, row.id).toBe(term!.reached);
    expect(row.date < core.startedAt, row.id).toBe(true);
  }
  const phases = preStartHistory(core, { kind: "law.phase" });
  expect(phases.length, label).toBeGreaterThan(0);
  const laws = coreAPI(core).moduleState("core2-laws-v1").table("laws");
  for (const row of phases) {
    expect(laws.get(String(row.facts.lawId)), row.id).toBeDefined();
    expect(row.date < core.startedAt, row.id).toBe(true);
  }
  // A budget adopted before the start is entered with its own record id; the
  // opening carries its first budget on the start date, so there may be none.
  const budgets = coreAPI(core)
    .moduleState("core2-budgets-v1")
    .table("budgets");
  for (const row of preStartHistory(core, { kind: "budget.adopted" })) {
    expect(budgets.get(String(row.facts.budgetId)), row.id).toBeDefined();
    expect(row.date < core.startedAt, row.id).toBe(true);
  }
}, 600_000);
