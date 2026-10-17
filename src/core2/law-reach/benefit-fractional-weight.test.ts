/**
 * One model, two tiers: a benefit paid to counted households whose fitted
 * weights are not whole numbers still books a whole-cent obligation. A drawn
 * place opened at three times its sample, the town's counted households
 * standing for 3.4 each.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { governments } from "../modules/budgets";
import { lawChain } from "../modules/laws";
import { coreAPI } from "../state";
import { payBenefits } from "./group-b-money";

it("pays a counted benefit in whole cents when the weights are fractional", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "benefit-weight");
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
    countScale: 3,
  });
  const api = coreAPI(core);
  const gov =
    governments(api).find((g) => g.level === "town") ?? governments(api)[0]!;
  const where = `place ${draw.key}, seed ${draw.seed}, town ${lawChain(api).townPlaceId}`;
  const heads = [1, 2, 3].map((n) => ({
    id: `counted:${n}`,
    named: false,
    householdId: `household:${n}`,
    age: 30,
    weeklyMinutes: 0,
    employed: false,
    scale: 3.4,
  }));
  expect(
    () =>
      payBenefits(api, {
        key: "benefit-weight-test",
        service: {
          id: "service:test",
          line: "test",
          baseTownMinor: 0,
          deltaTownMinor: 123_456_789,
          level: 1,
          byGovernment: { [gov.id]: 123_456_789 },
        },
        heads,
        modeledShare: 1,
      }),
    where,
  ).not.toThrow();
}, 300_000);
