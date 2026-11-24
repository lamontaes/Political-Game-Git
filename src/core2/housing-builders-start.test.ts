/**
 * A town's builders keep starting houses after the world opens (laws thread,
 * Nov 15, 2026; item housing-builders-start-nothing-after-the-opening). The
 * economy keeps no month at the opening, so the builders' price base used to
 * be stored as 1 against an index near 312 a month later, and starts fell to
 * about 1/5,500 of their rate in every place. The base is now the first month
 * the economy keeps. Pinned at Wilton, Maine, whose builder starts its first
 * house of the year in April.
 */
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const WILTON = {
  name: "Wilton, Maine",
  key: "2385815",
  seed: "056520284c241460",
} as const;
/** The first month the builders build in, after the opening on January 20. */
const FIRST_BUILT = "2025-02";
/** Three months: the first house of the year is started on April 6. */
const DAYS = 90;
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it(`builders start houses after the opening, measured from the first kept month's prices (${WILTON.name})`, () => {
  const where = `${WILTON.name} (${WILTON.key}, seed ${WILTON.seed})`;
  const { core } = buildBenchWorld(WILTON.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: WILTON.key,
  });
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const opened = core.date;
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  const housing = api.moduleState("housing");
  const stock = housing.table("stock").get(`stock:${town}`) as unknown as {
    openingPriceLevel: number;
  };
  const firstMonth = api
    .moduleState("macro")
    .table("months")
    .get(`macro-month:${FIRST_BUILT}`) as unknown as {
    priceIndex: number;
  };
  expect(firstMonth, `${where}: the economy kept ${FIRST_BUILT}`).toBeTruthy();
  // The builders' base is the economy's price in the first month built in, not a stand-in of 1.
  expect(stock.openingPriceLevel, `${where}: the price base`).toBe(
    firstMonth.priceIndex,
  );
  const started = (
    housing.table("projects").rows() as unknown as {
      placeId: string;
      startedAt: string;
    }[]
  ).filter((p) => p.placeId === town);
  expect(
    started.some((p) => p.startedAt > opened),
    `${where}: a house started after the opening (started: ${started.map((p) => p.startedAt).join(", ")})`,
  ).toBe(true);
}, 60_000);
