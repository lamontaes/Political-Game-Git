/**
 * The highways line sets the share of the town's roads in poor condition, and
 * drivers' repair bills follow it (place-prices reads the rule monthly). A
 * drawn place for a year: cut the line, the poor share rises above its base
 * and households' monthly repair spending rises by the engine's own figure;
 * restore it and the rule ends. Place and seed are in the title.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { amendBudget, governments } from "../modules/budgets";
import { lawChain } from "../modules/laws";
import { PLACE_PRICES_MODULE_ID } from "../modules/place-prices";
import goods from "../data/prices/goods.json";
import { coreAPI } from "../state";
import { budgetNow, residentsOf } from "./group-b-money";

const draw = drawPlace(randomBytes(32).toString("hex"), "roads");

it(`a cut highways line leaves more roads in poor condition and raises drivers' repair bills (place ${draw.key}, seed ${draw.seed})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const where = `place ${draw.key}, seed ${draw.seed}`;
  expect(core.modules.has(PLACE_PRICES_MODULE_ID), where).toBe(true);
  const town = lawChain(api).townPlaceId;
  const gov = governments(api)
    .filter((g) => residentsOf(api, g) > 0)
    .find((g) => (budgetNow(api, g.id)?.spendingMinor.highways ?? 0) > 0);
  expect(gov, `${where}: no government funds highways`).toBeDefined();
  const rules = () => api.moduleState(PLACE_PRICES_MODULE_ID).table("rules");
  const ruleId = `${town}:vehicle-repair:road`;
  const base = goods.goods["vehicle-repair"].poorShareBase;
  const day = (n: number) =>
    new Date(Date.parse(`${core.date}T00:00:00Z`) + n * 86_400_000)
      .toISOString()
      .slice(0, 10);
  expect(rules().get(ruleId), `${where}: a road rule before any change`).toBe(
    undefined,
  );
  const line = budgetNow(api, gov!.id)!.spendingMinor.highways!;
  amendBudget(api, {
    governmentId: gov!.id,
    line: "highways",
    deltaMinor: -Math.round(line * 0.25),
    measureId: "TEST-ROADS-CUT",
  });
  advanceCore(core, day(35));
  const cut = rules().get(ruleId) as unknown as
    { value: number; cause: string } | undefined;
  expect(cut, `${where}: the cut left no road rule`).toBeDefined();
  expect(cut!.value, `${where}: poor share after the cut`).toBeGreaterThan(
    base,
  );
  expect(cut!.cause).toContain("highways");
  const journal = core.cashJournal.totals;
  expect(journal.grossDebitMinor).toBe(journal.grossCreditMinor);
  amendBudget(api, {
    governmentId: gov!.id,
    line: "highways",
    deltaMinor: Math.round(line * 0.25),
    measureId: "TEST-ROADS-RESTORE",
  });
  advanceCore(core, day(35));
  expect(rules().get(ruleId), `${where}: the rule ends at base`).toBe(
    undefined,
  );
}, 600_000);
