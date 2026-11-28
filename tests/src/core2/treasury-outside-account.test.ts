import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { coreAPI } from "../../../src/core2/state";
import {
  budgetInForce,
  outsideAccountOf,
  sameGovernment,
} from "../../../src/core2/budgets-treasury";
import { governments } from "../../../src/core2/modules/budgets";
import { OUTSIDE_MARKET_KIND } from "../../../src/core2/opening-outside-market";

// A public employer's outside account is its pay authority's: it carries that
// government's wages only. Every treasury's flows (the federal budget's
// trillions included) settle with the town's outside market. Before the fix
// the treasuries took the first outside account by id, which in many places
// was a city employer, so a 180-person city "paid" $7 trillion in a year.
const seed = process.env.GOLDEN_PATH_SEED ?? "treasury-outside-account";

describe("a treasury's outside money settles with the outside market", () => {
  it("keeps each public employer's outside flows within its adopted budget", () => {
    setBookkeeping(false);
    for (let draw = 0; draw < 2; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "treasury-outside-account");
      const label = `${place.name} (${place.key}) seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      // Past the first monthly close, when every treasury settles with outside.
      for (let day = 0; day < 62; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const market = core.organizations.get(outsideAccountOf(api)!);
      expect(market?.kind, label).toBe(OUTSIDE_MARKET_KIND);
      const flows = core.cashJournal.externalFlowsByOwner;
      const govs = governments(api);
      let checked = 0;
      for (const [id, flow] of flows) {
        const employer = core.organizations.get(id)!;
        if (employer.kind !== "employer") continue;
        const gov = govs.find((g) =>
          sameGovernment(employer, core.organizations.get(g.organizationId)!),
        );
        if (!gov) continue;
        const budget = budgetInForce(api, gov.id);
        if (!budget) continue;
        const adopted = Object.values(budget.spendingMinor).reduce(
          (n, v) => n + v,
          0,
        );
        checked += 1;
        expect(
          Number(flow.incomingMinor) + Number(flow.outgoingMinor),
          `${label}: ${employer.name} against budget ${budget.id}`,
        ).toBeLessThanOrEqual(adopted);
      }
      expect(checked, label).toBeGreaterThan(0);
      // The treasuries' flows are on the market, far above any one employer's.
      const marketFlow = flows.get(market!.id)!;
      expect(
        Number(marketFlow.incomingMinor) + Number(marketFlow.outgoingMinor),
        label,
      ).toBeGreaterThan(0);
    }
  }, 600_000);
});
