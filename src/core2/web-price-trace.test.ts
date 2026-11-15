/**
 * A law the outcome web carries into prices names the businesses whose prices
 * it raised and the dollars buyers paid for it (pool item
 * laws-web-carried-price-laws-traced): the state enacts a bottle deposit, and
 * after the web's three-month lag and the next price reviews, the law's reach
 * holds the town's businesses with the extra they took. Pinned to Eveleth,
 * Minnesota, on the world seed the take-effect check measured; before the fix
 * the law raised prices and its reach held no business.
 */
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import { lawReach } from "./law-reach/applied";
import { WEB_PRICE_WHAT } from "./law-reach/web-price-trace";
import { lawDid } from "../bench/law-did";

const SEED = "9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad";
const EVELETH = "2719934";
const DEPOSIT = "us-policy-positions:environment-energy.bottle-deposit";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("names the businesses a bottle deposit raised prices at, with the dollars (Eveleth, Minnesota)", () => {
  const { core, placeId } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: EVELETH,
  });
  const api = coreAPI(core);
  const state = lawChain(api).levels.find((l) => l.level === "state")!;
  const row = enactLaw(api, {
    jurisdiction: state.jurisdiction,
    level: "state",
    series: DEPOSIT,
    value: 1,
    effectiveDate: core.date,
    measureId: "test-bottle-deposit",
    citation: "Test: the state enacts a bottle deposit",
  });
  // The web's lag is three months; two monthly price reviews after it.
  advanceCore(core, addDays(makeIsoDate(core.date), 6 * 30));
  const reach = lawReach(api, row.id, placeId);
  const side = reach.by.find((s) => s.what === WEB_PRICE_WHAT);
  expect(side, "the price side of the law").toBeDefined();
  expect(
    side!.organizations,
    "businesses whose price it raised",
  ).toBeGreaterThan(0);
  expect(side!.amountMinor, "what buyers paid for it").toBeGreaterThan(0);
  // The law's page names them, with the money.
  const page = lawDid(core, DEPOSIT).find((d) => d.lawId === row.id);
  expect(page?.organizations.count, "businesses on the page").toBe(
    side!.organizations,
  );
  expect(page?.namedOrganizations[0]?.name, "a business by name").toBeTruthy();
}, 120_000);
