/**
 * A counted group's bank savings are the group's, and each of its households
 * holds the same share of them as of its cash: its people at its savings
 * weight over the group's claims (`countedDeposits`). Before, the bank's
 * review swept each household's part of the group's cash by its people alone,
 * so the savings weights stopped spreading what households held, and the
 * median household read near its group's mean. Pinned at Staples,
 * Connecticut (`drawPlace("probe-a", "exit-a")`, the opening jobless stock
 * test's town) in a town of 1,500, on day 1 and after a month of reviews.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { depositsHeld } from "./accounts";
import {
  claimsInGroup,
  countedDeposits,
  fundBalance,
  fundOf,
  savingWeight,
} from "./counted-money";
import { advanceCore, createLifeCore } from "./life";
import { householdCashReader, residentsRuntime } from "./modules/residents";
import { OUTCOME_WEB_MODULE } from "./modules/outcome-web";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

it("a counted household's cash and bank savings are one share of its group's money, on day 1 and a month on (Staples, Connecticut)", () => {
  const place = drawPlace("probe-a", "exit-a");
  const where = `${place.name} ${place.state}, seed probe-a, label exit-a`;
  const core = createLifeCore(
    withWorldEconomy(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    ),
    { data: worldCoreData(), modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE] },
  );
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)!.placeId;
  const year = core.date.slice(0, 4);
  for (const day of [`${year}-01-21`, `${year}-02-21`]) {
    advanceCore(core, day);
    const rt = residentsRuntime(core)!;
    const cashOf = householdCashReader(rt);
    const groups = new Map<
      number,
      { money: number; summed: number; households: number }
    >();
    let banked = 0;
    for (const h of rt.store.liveHouseholds()) {
      if (h.placeId !== town || h.group < 0) continue;
      // Nothing is banked under a counted household's own id.
      expect(depositsHeld(core, h.id), `${where}, ${day}: ${h.id}`).toBe(0);
      const group = groups.get(h.group) ?? {
        money:
          fundBalance(api, rt, h.group) +
          depositsHeld(core, fundOf(api, rt, h.group)),
        summed: 0,
        households: 0,
      };
      const own = Math.min(rt.store.countedCount(h), rt.store.weightedCount(h));
      const held = cashOf(h) + countedDeposits(api, rt, h);
      // Its cash and its savings together are its share of all the group's money.
      const share =
        (group.money * own * savingWeight(core.seed, h)) /
        claimsInGroup(rt, h.group);
      expect(
        Math.abs(held - share),
        `${where}, ${day}: ${h.id} holds ${held} against its share ${share}`,
      ).toBeLessThanOrEqual(2);
      group.summed += (held * rt.store.weightedCount(h)) / own;
      group.households += 1;
      groups.set(h.group, group);
    }
    for (const [id, group] of groups) {
      banked += group.money;
      // The group's households together hold its money, to a cent or two a household.
      expect(
        Math.abs(group.summed - group.money),
        `${where}, ${day}: group ${id}`,
      ).toBeLessThanOrEqual(2 * group.households + 2);
    }
    expect(groups.size, `${where}, ${day}: counted groups`).toBeGreaterThan(10);
    expect(banked, `${where}, ${day}: the groups' money`).toBeGreaterThan(0);
  }
  // The groups banked some of it.
  const rt = residentsRuntime(core)!;
  const deposits = [...new Set(rt.store.groups.map((_, i) => i))]
    .filter((i) => rt.funds.has(i))
    .reduce((n, i) => n + depositsHeld(core, fundOf(api, rt, i)), 0);
  expect(deposits, `${where}: the groups' bank savings`).toBeGreaterThan(0);
}, 40_000);
