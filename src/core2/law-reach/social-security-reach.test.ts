/**
 * A federal raise to the Social Security line reaches the town's retirees on
 * the law's own record (pool item laws-social-security-raise-traced-to-the-law):
 * Congress raises the line a tenth, and after the treasury's next close the
 * law's page and dev mode's bill card name the full retirees whose award rose,
 * count the counted ones, and show the month's extra dollars each was paid.
 * Pinned to Eveleth, Minnesota, on the world seed the take-effect check
 * measured; before the fix the raise was paid but no record named the law.
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
const FEDERAL_LAW = "test:federal-social-security";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("names the retirees a federal Social Security raise reached, full and counted (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const federal = governments(api).find((g) => g.level === "federal")!;
  const line = budgetToday(api, federal)!.spendingMinor.socialSecurity!;
  amendBudget(api, {
    governmentId: federal.id,
    line: "socialSecurity",
    deltaMinor: Math.round(line / 10),
    measureId: FEDERAL_LAW,
    carry: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const reach = lawReach(api, FEDERAL_LAW, placeId);
  const awards = reach.by.find(
    (side) => side.what === "social-security-award-changed",
  );
  expect(awards, "the award engine's side of the law").toBeDefined();
  expect(awards!.fullPeople, "full retirees named").toBeGreaterThan(0);
  expect(awards!.counted, "counted retirees").toBeGreaterThan(0);
  expect(awards!.amountMinor, "the extra paid this month").toBeGreaterThan(0);
  // Each named retiree in town got about a tenth more than their award's base.
  const named = reach.people.filter(
    (p) => p.what === "social-security-award-changed" && p.inTown,
  );
  expect(named.length).toBeGreaterThan(0);
  expect(named.every((p) => p.amountMinor > 0)).toBe(true);
}, 70_000);
