/**
 * A spending line two governments' laws changed credits each law with its own
 * share of the line's reach (pool item
 * laws-budget-line-reach-credited-to-latest-measure): the state raises welfare
 * and Medicaid, a later city amendment raises the same line, and after
 * the treasury's next close the assistance benefit's people are credited to
 * each law by its share of the change, the state's holding the most. Pinned to Eveleth,
 * Minnesota, on the world seed the take-effect check measured; before the fix
 * the town's ordinance took the whole reach.
 */
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { amendBudget, governments } from "../modules/budgets";
import { coreAPI } from "../state";
import { budgetToday } from "./group-a-money";
import { townShare } from "./group-b-money";
import { rowsOf } from "./group-b-store";
import type { PersonReach } from "./group-b-store";
import { lawReach } from "./applied";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const KEY = "budget-line:welfareAndMedicaid";
const LINE = "welfareAndMedicaid";
const STATE_LAW = "test:state-welfare";
const CITY_LAW = "test:eveleth-welfare";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("credits a state raise and a later city raise on one line each with its share (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const state = governments(api).find((g) => g.level === "state");
  const city = governments(api).find((g) => g.level === "city");
  expect(state).toBeDefined();
  expect(city?.name).toMatch(/eveleth/i);
  const stateDelta = Math.round(
    budgetToday(api, state!)!.spendingMinor[LINE]! / 10,
  );
  const stateTownDelta = Math.round(stateDelta * townShare(api, state!));
  const cityDelta = Math.round(stateTownDelta / 4);
  expect(cityDelta).toBeGreaterThan(0);
  expect(stateTownDelta).toBeGreaterThan(cityDelta);
  const amend = (
    governmentId: string,
    deltaMinor: number,
    measureId: string,
  ) => {
    expect(
      amendBudget(api, {
        governmentId,
        line: LINE,
        deltaMinor,
        measureId,
        carry: true,
      }),
      measureId,
    ).not.toBeNull();
  };
  amend(state!.id, stateDelta, STATE_LAW);
  // Drive the same budget-amendment entry point for both governments. This
  // checks attribution, not whether this council happens to pick this bill.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  amend(city!.id, cityDelta, CITY_LAW);
  // Read the attribution after a regular treasury close has rerun benefits.
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const open = rowsOf<PersonReach>(api, "people").filter(
    (r) => r.key === KEY && r.endedOn === null,
  );
  expect(open.length, "people the benefit reaches").toBeGreaterThan(0);
  // The state's raise holds the largest share, and carries the rows.
  expect(open.every((r) => r.lawId === STATE_LAW)).toBe(true);
  for (const row of open) {
    expect(Object.keys(row.credits ?? {}).sort()).toEqual(
      [CITY_LAW, STATE_LAW].sort(),
    );
    expect(row.credits![STATE_LAW]).toBeCloseTo(
      stateTownDelta / (stateTownDelta + cityDelta),
      8,
    );
    expect(row.credits![CITY_LAW]).toBeCloseTo(
      cityDelta / (stateTownDelta + cityDelta),
      8,
    );
  }
  // Each law's own page names the people it reaches now (and any it
  // reached before, which a law's page counts too): the state's and each
  // ordinance's.
  const now = open.filter((r) => core.people.has(r.personId)).length;
  expect(now).toBeGreaterThan(0);
  for (const law of [STATE_LAW, CITY_LAW])
    expect(lawReach(api, law, placeId).fullPeople, law).toBeGreaterThanOrEqual(
      now,
    );
}, 70_000);
