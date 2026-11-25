/**
 * A law the outcome web carries into prices names the businesses whose prices
 * it raised and the dollars buyers paid for it (pool item
 * laws-web-carried-price-laws-traced): the state enacts a bottle deposit, and
 * after the web's three-month lag and the next price reviews, the law's reach
 * holds the town's businesses with the extra they took. Before the fix the
 * law raised prices and its reach held no business.
 *
 * The test draws its place (drawn-place-tests) and takes the first whose
 * opening has no bottle deposit in force anywhere in its chain of governments,
 * naming the places passed over. It was pinned to Eveleth, Minnesota, until
 * the history from 1925 opened Minnesota with a deposit already in force
 * (Nov 19: the state's starting row holds 1 on the train and 0 on main), so
 * enacting one there changes nothing and moves no price.
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
import { drawPlace } from "../../scripts/core2-year/place";
import { lawInForce } from "./modules/laws";

const base = process.env.GOLDEN_PATH_SEED || "web-price-trace";
const DRAWS = 6;
const DEPOSIT = "us-policy-positions:environment-energy.bottle-deposit";
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it(`names the businesses a bottle deposit raised prices at, with the dollars (drawn from ${base})`, () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${base}:${draw}`, "web-price-trace");
    const where = `${place.name} (${place.key}), seed ${base}:${draw}`;
    const { core, placeId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    if (lawInForce(api, DEPOSIT).value) {
      passed.push(`${where}: a deposit is already in force`);
      continue;
    }
    process.stdout.write(
      `WEB-PRICE-TRACE ${where}; passed over ${passed.length ? passed.join("; ") : "none"}\n`,
    );
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
    expect(side, `${where}: the price side of the law`).toBeDefined();
    expect(
      side!.organizations,
      `${where}: businesses whose price it raised`,
    ).toBeGreaterThan(0);
    expect(
      side!.amountMinor,
      `${where}: what buyers paid for it`,
    ).toBeGreaterThan(0);
    // The law's page names them, with the money.
    const page = lawDid(core, DEPOSIT).find((d) => d.lawId === row.id);
    expect(page?.organizations.count, `${where}: businesses on the page`).toBe(
      side!.organizations,
    );
    expect(
      page?.namedOrganizations[0]?.name,
      `${where}: a business by name`,
    ).toBeTruthy();
    return;
  }
  throw new Error(
    `No drawn place opened without a deposit: ${passed.join("; ")}`,
  );
}, 120_000);
