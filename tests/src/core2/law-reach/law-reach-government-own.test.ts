/**
 * A law's money total counts only money paid (pool item
 * dev-bill-card-money-counts-government-commitment): a state corrections
 * raise in a town with no corrections employer funds positions on the state
 * government's own record (the year's pay it commits, paid out as negative),
 * and that row is kept apart from what the treasury paid. Pinned to Eveleth,
 * Minnesota, on the world seed the take-effect check measured.
 */
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../../../../src/bench/world";
import { setBookkeeping } from "../../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../../src/core2/kernel/dates";
import { advanceCore } from "../../../../src/core2/life";
import { amendBudget, governments } from "../../../../src/core2/modules/budgets";
import { coreAPI } from "../../../../src/core2/state";
import { budgetToday } from "../../../../src/core2/law-reach/group-a-money";
import { lawReach } from "../../../../src/core2/law-reach/applied";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("keeps a government's own commitment out of the money a law moved (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const state = governments(api).find((g) => g.level === "state")!;
  const line = budgetToday(api, state)!.spendingMinor.corrections!;
  const measureId = "test:corrections:up";
  const raise = Math.round(line / 10);
  amendBudget(api, {
    governmentId: state.id,
    line: "corrections",
    deltaMinor: raise,
    measureId,
    // As a passed budget bill's change is (legislature.ts).
    carry: true,
  });
  // Past the next monthly close, so the treasury has paid some of it.
  advanceCore(core, addDays(makeIsoDate(core.date), 35));
  const reach = lawReach(api, measureId, placeId);
  const sides = reach.by.reduce((n, s) => n + s.amountMinor, 0);
  // The state's row: the year's pay for the positions, not a payment.
  expect(reach.governmentOwnMinor).toBe(-raise);
  // What the treasury paid on the raise so far, and nothing else.
  expect(reach.amountMinor).toBeGreaterThan(0);
  expect(reach.amountMinor).toBeLessThan(raise);
  expect(reach.amountMinor + reach.governmentOwnMinor).toBe(sides);
}, 60_000);
