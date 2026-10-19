/**
 * A counted household filled in takes its purchases with it: the money a
 * seller was owed by the counted flow moves to the household's own living
 * plan, so a seller's total across both tiers does not change. Counted
 * tuition "falling" in a played world is this move, not a loss
 * (pool: world-counted-tuition-drops).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { householdPart, residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
import type { CoreState } from "./types";

/** Each seller's monthly everyday purchases from counted households and from full ones. */
function bySeller(core: CoreState) {
  const rt = residentsRuntime(core)!;
  const counted = new Map<string, number>();
  for (const flow of rt.flows.values()) {
    if (flow.endedAt || flow.kind !== "purchase" || !flow.amountByContract)
      continue;
    if (core.organizations.get(flow.payeeId)?.outsideFlow !== undefined)
      continue;
    const months = flow.cadence.kind === "months" ? flow.cadence.every : 1;
    for (const [part, amount] of Object.entries(flow.amountByContract))
      if (part.startsWith(householdPart("")))
        counted.set(
          flow.payeeId,
          (counted.get(flow.payeeId) ?? 0) + amount / months,
        );
  }
  const full = new Map<string, number>();
  for (const plan of core.finance.livingPlans.values())
    for (const [seller, monthly] of plan.sellers)
      full.set(seller, (full.get(seller) ?? 0) + monthly);
  return { counted, full };
}

it("moves a filled-in household's purchases to its own plan and loses none", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "fill-in-purchases");
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const store = residentsRuntime(core)!.store;
  const before = bySeller(core);
  const sellers = [...before.counted.keys()];
  expect(sellers.length, `${draw.name}, seed ${draw.seed}`).toBeGreaterThan(0);

  // Fill in a handful of counted households, one member each.
  const picked = [...store.liveHouseholds()]
    .filter((h) => store.countedCount(h) > 0)
    .slice(0, 8);
  for (const h of picked)
    fillInPerson(core, store.ids[store.countedMembers(h)[0]!]!);

  const after = bySeller(core);
  let moved = 0;
  for (const seller of new Set([...sellers, ...after.full.keys()])) {
    const total = (m: ReturnType<typeof bySeller>) =>
      (m.counted.get(seller) ?? 0) + (m.full.get(seller) ?? 0);
    // Rounding: each moved household rounds its part to a whole cent.
    expect(total(after), `${draw.name} seller ${seller}`).toBeCloseTo(
      total(before),
      -Math.log10(picked.length),
    );
    moved +=
      (before.counted.get(seller) ?? 0) - (after.counted.get(seller) ?? 0);
  }
  // The counted side did give up money, so the check above is not vacuous.
  expect(moved).toBeGreaterThan(0);
}, 180_000);
