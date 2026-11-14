/**
 * A town household's living cost follows its pay on the same curve an
 * official's does (pool item world-resident-spending-follows-income), so a
 * well-paid household spends more than a poorly paid one of the same town
 * instead of every household buying the same basket. Pinned to Matagorda,
 * Texas on seed pt1:0 so a draw never decides the result.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";

it("the opening living cost rises with the household's pay", () => {
  const draw = drawPlace("pt1:0", "session-a-property-tax");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const households = new Map<
    string,
    { pay: number; cost: number; size: number }
  >();
  for (const person of api.state.people.values()) {
    const wage = person.jobId
      ? (api.state.jobs.get(person.jobId)?.wageDailyMinor ?? 0)
      : 0;
    const row = households.get(person.householdId) ?? {
      pay: 0,
      cost: 0,
      size: 0,
    };
    row.pay += wage;
    row.size += 1;
    row.cost += person.livingCostDailyMinor ?? 0;
    households.set(person.householdId, row);
  }
  const paid = [...households.values()].filter(
    (h) => h.size === 1 && h.pay > 10_000 && h.pay < 40_000 && h.cost > 0,
  );
  expect(paid.length, where).toBeGreaterThan(8);
  const share = paid.map((h) => h.cost / h.pay).sort((a, b) => a - b);
  const medianShare = share[Math.floor(share.length / 2)]!;
  // A basket would take about a third of this pay; the curve takes about half.
  expect(medianShare, where).toBeGreaterThan(0.4);
  // And never more than most of it.
  expect(share.at(-1)!, where).toBeLessThanOrEqual(0.7 + 1e-9);
}, 60_000);
