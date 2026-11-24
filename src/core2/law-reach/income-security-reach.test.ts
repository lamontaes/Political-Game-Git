/**
 * A federal raise to the income security line reaches the town's households
 * through the engines that already pay from that line (pool item
 * laws-income-security-raise-pays-through-ssi-and-food-aid): Congress raises
 * the line a tenth, and after the treasury's next close food aid and SSI each
 * pay what their own law works out times the line in force over its base, and
 * the bill's page and dev mode's bill card name the households whose benefit
 * rose, count the counted ones and show the extra dollars. Pinned to
 * Eveleth, Minnesota, on the world seed the take-effect check measured;
 * before the fix the raise went only to recipients elsewhere.
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

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const FEDERAL_LAW = "test:federal-income-security";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("names the households a federal income security raise reached through food aid and SSI (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const federal = governments(api).find((g) => g.level === "federal")!;
  const line = budgetToday(api, federal)!.spendingMinor.incomeSecurity!;
  amendBudget(api, {
    governmentId: federal.id,
    line: "incomeSecurity",
    deltaMinor: Math.round(line / 10),
    measureId: FEDERAL_LAW,
    carry: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const reach = lawReach(api, FEDERAL_LAW, placeId);
  const food = reach.by.find((side) => side.what === "snap-changed-by-line");
  expect(food, "food aid's side of the law").toBeDefined();
  expect(
    food!.fullPeople,
    "named people in households paid more",
  ).toBeGreaterThan(0);
  expect(food!.counted, "counted households paid more").toBeGreaterThan(0);
  expect(food!.amountMinor, "the extra paid").toBeGreaterThan(0);
  const ssi = reach.by.find((side) => side.what === "ssi-changed-by-line");
  expect(ssi, "SSI's side of the law").toBeDefined();
  expect(ssi!.amountMinor, "the extra SSI paid").toBeGreaterThan(0);
}, 70_000);
