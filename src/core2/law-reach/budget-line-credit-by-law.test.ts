/**
 * A spending line two governments' laws changed credits each law with its own
 * share of the line's reach (pool item
 * laws-budget-line-reach-credited-to-latest-measure): the state raises welfare
 * and Medicaid, the town's council and the county board then pass their own
 * welfare ordinances, and after
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
import { rowsOf } from "./group-b-store";
import type { PersonReach } from "./group-b-store";
import { lawReach } from "./applied";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const KEY = "budget-line:welfareAndMedicaid";
const STATE_LAW = "test:state-welfare";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("credits a state raise and the town's own ordinances on one line each with its share (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const state = governments(api).find((g) => g.level === "state")!;
  const line = budgetToday(api, state)!.spendingMinor.welfareAndMedicaid!;
  amendBudget(api, {
    governmentId: state.id,
    line: "welfareAndMedicaid",
    deltaMinor: Math.round(line / 10),
    measureId: STATE_LAW,
    carry: true,
  });
  // Past the treasury's next closes. Eveleth's council and the county board
  // pass their own welfare ordinances in these weeks (2025-6 and 2025-3).
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const open = rowsOf<PersonReach>(api, "people").filter(
    (r) => r.key === KEY && r.endedOn === null,
  );
  expect(open.length, "people the benefit reaches").toBeGreaterThan(0);
  const credits = open[0]!.credits ?? {};
  const local = Object.keys(credits).filter((law) => law !== STATE_LAW);
  // The state's raise holds the largest share, and carries the rows.
  expect(open.every((r) => r.lawId === STATE_LAW)).toBe(true);
  expect(local.length, "the town's own laws on the line").toBeGreaterThan(0);
  for (const law of local)
    expect(credits[law]!, law).toBeLessThan(credits[STATE_LAW]!);
  // Each law's own page names the people it reaches now (and any it
  // reached before, which a law's page counts too): the state's and each
  // ordinance's.
  const now = open.filter((r) => core.people.has(r.personId)).length;
  for (const law of [STATE_LAW, ...local])
    expect(lawReach(api, law, placeId).fullPeople, law).toBeGreaterThanOrEqual(
      now,
    );
}, 70_000);
