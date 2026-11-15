/**
 * A federal raise to the Medicare line pays more of Medicare members' care
 * (pool item laws-medicare-raise-pays-more-of-members-care): Congress raises
 * the line a tenth, and at the next month's bills Medicare pays a tenth more
 * of its part of each member's care, so the member's share falls by those
 * dollars and the federal treasury pays them to the seller. The bill's page
 * and dev mode's bill card name the members in town, count the counted ones
 * and show the dollars. Pinned to Eveleth, Minnesota, on the world seed the
 * take-effect check measured; before the fix the raise went only to
 * recipients elsewhere.
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
const FEDERAL_LAW = "test:federal-medicare";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("names the Medicare members a federal Medicare raise reached at their bills (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const federal = governments(api).find((g) => g.level === "federal")!;
  const line = budgetToday(api, federal)!.spendingMinor.medicare!;
  amendBudget(api, {
    governmentId: federal.id,
    line: "medicare",
    deltaMinor: Math.round(line / 10),
    measureId: FEDERAL_LAW,
    carry: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const reach = lawReach(api, FEDERAL_LAW, placeId);
  const bills = reach.by.find(
    (side) => side.what === "medicare-share-changed-by-line",
  );
  expect(bills, "the medical bills' side of the law").toBeDefined();
  expect(bills!.fullPeople, "named Medicare members").toBeGreaterThan(0);
  expect(bills!.counted, "counted Medicare members").toBeGreaterThan(0);
  expect(bills!.amountMinor, "the dollars Medicare paid").toBeGreaterThan(0);
}, 70_000);
