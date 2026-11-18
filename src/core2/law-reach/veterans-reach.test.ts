/**
 * The federal veterans line pays the town's veterans (pool item
 * laws-veterans-line-pays-the-towns-veterans): the treasury's monthly close
 * pays each full resident the past's service pass says served, and the
 * counted veterans by the ACS share for their age, from the federal
 * treasury. Congress then raises the line a tenth, and after the next close
 * the bill's page and dev mode's bill card name the full veterans whose
 * benefit rose, count the counted ones and show the extra dollars. Pinned to
 * Eveleth, Minnesota, on the world seed the take-effect check measured;
 * before the fix no engine paid a veteran and the raise went only to the
 * outside account.
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
import { lawReach } from "./applied";
import { payVeterans } from "./group-b-veterans";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const FEDERAL_LAW = "test:federal-veterans";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("pays the town's veterans from the veterans line and names those a raise reached (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  // Before any bill, the line already pays the town's veterans.
  const opening = payVeterans(api);
  expect(opening.named, "full veterans paid").toBeGreaterThan(0);
  expect(opening.counted, "counted veterans paid").toBeGreaterThan(0);
  const federal = governments(api).find((g) => g.level === "federal")!;
  const line = budgetToday(api, federal)!.spendingMinor.veterans!;
  amendBudget(api, {
    governmentId: federal.id,
    line: "veterans",
    deltaMinor: Math.round(line / 10),
    measureId: FEDERAL_LAW,
    carry: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const reach = lawReach(api, FEDERAL_LAW, placeId);
  const side = reach.by.find(
    (s) => s.what === "veterans-benefit-changed-by-line",
  );
  expect(side, "the veterans' side of the law").toBeDefined();
  expect(side!.fullPeople, "full veterans named").toBeGreaterThan(0);
  expect(side!.counted, "counted veterans").toBeGreaterThan(0);
  expect(side!.amountMinor, "the extra paid this month").toBeGreaterThan(0);
}, 70_000);
