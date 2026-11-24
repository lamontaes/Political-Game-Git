/**
 * Vouchers for every eligible family reach the town's renters (pool item
 * laws-housing-vouchers-pay-eligible-renters): Congress enacts the federal
 * question, and at the housing engine's next monthly review the federal
 * Treasury pays each renting household at or under the very-low-income limit
 * the rent above its own share of income. The law's page and dev mode's bill
 * card name the full households paid, count the counted ones and show the
 * dollars. Pinned to Eveleth, Minnesota, on the world seed the take-effect
 * check measured; before the fix the law was in force and nobody was paid.
 */
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { enactLaw, lawChain, lawInForce } from "../modules/laws";
import { coreAPI } from "../state";
import { HOUSING_VOUCHERS_KEY } from "../housing-assistance";
import { lawReach } from "./applied";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const MEASURE = "test-federal-housing-vouchers";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("pays the town's eligible renters when Congress makes vouchers an entitlement (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
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
  expect(lawInForce(api, HOUSING_VOUCHERS_KEY).value).toBe(1);
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const reach = lawReach(api, row.id, placeId);
  const side = reach.by.find((s) => s.what === "housing-voucher-paid");
  expect(side, "the vouchers' side of the law").toBeDefined();
  expect(side!.fullPeople, "people in full households paid").toBeGreaterThan(0);
  expect(side!.counted, "counted households paid").toBeGreaterThan(0);
  expect(side!.amountMinor, "the dollars paid").toBeGreaterThan(0);
}, 70_000);
