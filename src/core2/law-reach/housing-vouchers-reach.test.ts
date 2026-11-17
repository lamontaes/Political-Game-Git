/**
 * Vouchers for every eligible family reach the town's renters (pool item
 * laws-housing-vouchers-pay-eligible-renters): Congress enacts the federal
 * question, and at the housing engine's next monthly review the federal
 * Treasury pays each renting household at or under the very-low-income limit
 * the rent above its own share of income. The law's page and dev mode's bill
 * card name the full households paid, count the counted ones and show the
 * dollars. Before the fix the law was in force and nobody was paid. Drawn
 * (CTO, Nov 17: tests draw their place; it was pinned to Eveleth, Minnesota):
 * a place where the law reaches no full or no counted household is passed
 * over and named, and one place must be paid.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { enactLaw, lawChain, lawInForce } from "../modules/laws";
import { coreAPI } from "../state";
import { HOUSING_VOUCHERS_KEY } from "../housing-assistance";
import { lawReach } from "./applied";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const MEASURE = "test-federal-housing-vouchers";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it(`pays the town's eligible renters when Congress makes vouchers an entitlement (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let i = 0; i < DRAWS; i += 1) {
    const draw = drawPlace(`${seed}:${i}`, "housing-vouchers-reach");
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const { core, placeId } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
    const row = enactLaw(api, {
      jurisdiction: federal.jurisdiction,
      level: "federal",
      series: HOUSING_VOUCHERS_KEY,
      value: 1,
      effectiveDate: core.date,
      measureId: MEASURE,
      citation: "Test: Congress makes housing vouchers an entitlement",
    });
    expect(lawInForce(api, HOUSING_VOUCHERS_KEY).value, where).toBe(1);
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const reach = lawReach(api, row.id, placeId);
    const side = reach.by.find((s) => s.what === "housing-voucher-paid");
    if (!side || !side.fullPeople || !side.counted || !side.amountMinor) {
      passed.push(
        `${where}: ${side ? `${side.fullPeople} full people, ${side.counted} counted households, ${side.amountMinor} minor units paid` : "no voucher paid"}`,
      );
      continue;
    }
    console.log(
      `housing vouchers: ${where}: ${side.fullPeople} people in full households, ${side.counted} counted households, ${side.amountMinor} minor units; passed over: ${passed.join("; ") || "none"}`,
    );
    return;
  }
  throw new Error(
    `no drawn place's renters were paid; passed over: ${passed.join("; ")}`,
  );
}, 400_000);
