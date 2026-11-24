/**
 * Counted renter households become owners at about the rate real renters do
 * (pool item world-counted-renters-buy). At two named places with fixed
 * seeds, from the opening for twelve months: of the counted renter
 * households in the town on the first day, the share that bought a home
 * during the year sits inside the band real panels measure, give or take the
 * sampling spread of that many households. At a third, Storrs CT, where
 * almost nothing is for sale, the test below checks what counted buying owns
 * there. At all three, no day's purchases take more homes than were for sale
 * that morning or a builder finished that day.
 *
 * The band, 2% to 6% of renter households a year (the Account lead's ruling,
 * Nov 15), from:
 * - PSID: of renters in 1984, 29.5% owned five years later; 25.8% for 1989 to
 *   1994 and 23.4% for 1994 to 1999, about 5% to 7% a year nationally. The
 *   chance rises with income and wealth. HUD, "The Importance of Wealth and
 *   Income in the Transition to Homeownership", Exhibits 1 and 2.
 * - SIPP: 23.1% of renter households became owners over 2004 to 2007, and
 *   19.0% over 2009 to 2012, nationally. Census, SEHSD working paper 2018-14.
 * These are national rates; a town whose renters earn below the national
 * median sits below them. The ruling set the band's ends at 2% and 6%.
 *
 * The spread: a town's renters are a sample of n households, so even at a
 * true rate on the band's edge p, the year's share moves by a standard error
 * of sqrt(p(1 - p) / n). The check fails only when a place sits outside the
 * band by more than two standard errors (the usual 95% interval). At
 * Bastrop's 2,057 counted renter households the floor's standard error is
 * 0.31 points, so the year must read below 1.38% to fail.
 *
 * Runs twelve played months of the game's own days at each place (about
 * three to four minutes at each town): a year is the unit the
 * panels measure, and leases come up for weighing on their own anniversary
 * months, so a shorter run sees only some of them.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, addMonths, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const BAND = { floor: 0.02, ceiling: 0.06 };
const BASTROP = {
  key: "2204685",
  seed: drawPlace("c3", "home-price-paths").seed,
  name: "Bastrop LA",
};
const BLOOMINGDALE = {
  key: "3406340",
  seed: drawPlace("e5", "home-price-paths").seed,
  name: "Bloomingdale NJ",
};
const STORRS = {
  key: "0973980",
  seed: "counted-renter-rate",
  name: "Storrs CT",
};

type Purchase = {
  householdId: string;
  counted?: boolean;
  date: string;
  weight: number;
};

/**
 * A played year at a named place, a day at a time: the town's counted renter
 * households on the first day, those that bought, the most of them left
 * searching for a home at once, and every day whose counted purchases took
 * more homes than were for sale that morning or finished that day.
 */
function playYear({ key, seed, name }: typeof BASTROP) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const town = core.placeMetadata!.housingTown!;
  const opening = makeIsoDate(core.date);
  const renters = new Set<string>();
  for (const h of rt.store.liveHouseholds())
    if (h.placeId === town && h.tenure === "rent" && !h.quarters)
      renters.add(h.id);
  const housing = api.moduleState("housing");
  const stock = () =>
    housing.table("stock").get(`stock:${town}`) as unknown as
      | {
          listings?: { homes: number }[];
          newHomesForSale: number;
          searching?: Record<string, string>;
        }
      | undefined;
  // Homes for sale: households' listings and the builders' finished new houses.
  const forSale = () => {
    const row = stock();
    return (
      (row?.listings ?? []).reduce((n, l) => n + l.homes, 0) +
      Math.max(0, Math.floor(row?.newHomesForSale ?? 0))
    );
  };
  // Builders' houses in town under way: one finished during a day is for sale that day.
  const building = () =>
    new Map(
      (
        housing.table("projects").rows() as unknown as {
          id: string;
          placeId: string;
          kind: string;
          units: number;
          open: boolean;
        }[]
      )
        .filter((p) => p.placeId === town && p.kind === "single" && p.open)
        .map((p) => [p.id, p.units] as const),
    );
  const purchases = () =>
    housing.table("purchases").rows() as unknown as Purchase[];
  const end = makeIsoDate(addMonths(opening, 12));
  const overdrawn: string[] = [];
  let searching = 0;
  for (let day = opening; day < end;) {
    const morning = forSale();
    const underWay = building();
    day = makeIsoDate(addDays(day, 1));
    advanceCore(core, day);
    const still = building();
    const finished = [...underWay]
      .filter(([id]) => !still.has(id))
      .reduce((n, [, units]) => n + units, 0);
    const taken = purchases()
      .filter((row) => row.counted && row.date === day)
      .reduce((n, row) => n + row.weight, 0);
    if (taken > morning + finished + 1e-6)
      overdrawn.push(
        `${day}: ${taken.toFixed(2)} homes bought, ${morning} for sale that morning and ${finished} finished that day`,
      );
    searching = Math.max(
      searching,
      Object.keys(stock()?.searching ?? {}).filter((id) => renters.has(id))
        .length,
    );
  }
  const bought = new Set(
    purchases()
      .filter(
        (row) =>
          row.counted &&
          renters.has(row.householdId) &&
          row.date > opening &&
          row.date <= end,
      )
      .map((row) => row.householdId),
  ).size;
  const n = renters.size;
  const rate = bought / n;
  const spread = (p: number) => 2 * Math.sqrt((p * (1 - p)) / n);
  const detail = `${name} (${key}), world ${core.seed}, ${opening} to ${end}: ${bought} of ${n} renter households bought, ${(rate * 100).toFixed(2)}% a year, two standard errors at the floor ${(spread(BAND.floor) * 100).toFixed(2)} points; at most ${searching} left searching at once`;
  return { n, rate, spread, detail, overdrawn, searching };
}

it.each([BASTROP, BLOOMINGDALE])(
  "counted renter households in $name buy homes at 2% to 6% a year, as real renters do",
  (place) => {
    const year = playYear(place);
    expect(year.n, year.detail).toBeGreaterThan(0);
    // Every home bought was for sale that morning or finished that day.
    expect(year.overdrawn, year.detail).toEqual([]);
    expect(year.rate, year.detail).toBeGreaterThanOrEqual(
      BAND.floor - year.spread(BAND.floor),
    );
    expect(year.rate, year.detail).toBeLessThanOrEqual(
      BAND.ceiling + year.spread(BAND.ceiling),
    );
  },
  600_000,
);

// Storrs, Connecticut has almost no home for sale in its first year (no
// listing and no finished new house until the twelfth month; the supply side
// is pool item world-home-turnover). The premise here is what counted buying
// owns where nothing is for sale: renters who hold the down payment and
// choose to buy reach the market and are left searching, and nobody buys a
// home that was not for sale. The rate band at Storrs is the test of
// world-home-turnover's fix.
it("counted renters in Storrs CT, with almost nothing for sale, are left searching and buy only homes for sale", () => {
  const year = playYear(STORRS);
  expect(year.n, year.detail).toBeGreaterThan(0);
  expect(year.searching, year.detail).toBeGreaterThan(0);
  expect(year.overdrawn, year.detail).toEqual([]);
}, 600_000);
