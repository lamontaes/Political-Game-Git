/**
 * Dev mode's bill card traces a budget-line bill (owner, Nov 14: every law
 * effect can be triggered from the game's own code in dev mode and its effect
 * seen there): a Congress bill raising Medicare a tenth is drafted, passed with
 * dev mode's own vote route and run 40 days, and the bill's outcome carries its
 * budget lines and who they reached, Medicare members in town among them.
 * Before the fix a budget-line bill's card said it made no law and showed no
 * reach. Pinned to Eveleth, Minnesota, on the world seed the take-effect check
 * measured.
 */
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { draftBill } from "../core2/modules/legislature";
import { provisionFor } from "../core2/bill-catalog";
import { budgetsOf, governments } from "../core2/modules/budgets";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("shows a Congress Medicare raise's budget line and who it reached on dev mode's bill card (Eveleth, Minnesota)", () => {
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const { core } = world;
  const api = coreAPI(core);
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  const house = dev.lawmakingBodies().find((b) => b.id === "federal:us-house")!;
  const federal = governments(api).find((g) => g.level === "federal")!;
  const line = [...budgetsOf(api, federal.id)].sort(
    (a, b) => b.fiscalYear - a.fiscalYear,
  )[0]!.spendingMinor.medicare!;
  const bill = draftBill(api, {
    bodyOfficeId: house.id,
    sponsorId: house.members[0]!.key,
    provisions: [
      provisionFor({
        policyId: "budget:federal:medicare",
        operation: "expand",
        amount: Math.round(line / 10),
      }),
    ],
  });
  dev.decideAt(bill.id, Math.round(house.members.length * 0.9), {
    sign: true,
    chairHears: true,
  });
  dev.advance(addDays(makeIsoDate(core.date), 40));
  const outcome = dev.billOutcome(bill.id);
  expect(outcome.ending).toEqual({ how: "law", by: "enacted" });
  expect(outcome.budget?.lines.map((l) => l.line)).toEqual(["medicare"]);
  const side = outcome.budget!.reach.by.find(
    (s) => s.what === "medicare-share-changed-by-line",
  );
  expect(side, "Medicare members whose share fell").toBeDefined();
  expect(side!.fullPeople).toBeGreaterThan(0);
  expect(side!.amountMinor).toBeGreaterThan(0);
}, 90_000);
