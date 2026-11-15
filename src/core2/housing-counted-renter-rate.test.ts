/**
 * Counted renter households become owners at about the rate real renters do
 * (pool item world-counted-renters-buy). Pinned to Bastrop, Louisiana (place
 * 2204685, the seed home-price-paths draws from "c3"), from the opening for
 * twelve months: of the counted renter households in the town on the first
 * day, weighted by the households each record stands for, the share that
 * bought a home during the year sits inside the band real panels measure.
 *
 * The band, 2% to 6% of renter households a year (the Account lead's ruling,
 * Nov 15), from:
 * - PSID: of renters in 1984, 29.5% owned five years later; 25.8% for 1989 to
 *   1994 and 23.4% for 1994 to 1999, about 5% to 7% a year nationally. The
 *   chance rises with income and wealth. HUD, "The Importance of Wealth and
 *   Income in the Transition to Homeownership", Exhibits 1 and 2.
 * - SIPP: 23.1% of renter households became owners over 2004 to 2007, and
 *   19.0% over 2009 to 2012, nationally. Census, SEHSD working paper 2018-14.
 * These are national rates; Bastrop's renters earn below the national median,
 * so their rate sits below them. The ruling set the band's ends at 2% and 6%.
 *
 * Runs twelve played months of the game's own days (about three minutes):
 * a year is the unit the panels measure, and leases come up for weighing on
 * their own anniversary months, so a shorter run sees only some of them.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addMonths, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = "2204685";

it("counted renter households in Bastrop LA buy homes at 2% to 6% a year, as real renters do", () => {
  setBookkeeping(false);
  const drawn = drawPlace("c3", "home-price-paths");
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const town = core.placeMetadata!.housingTown!;
  const opening = makeIsoDate(core.date);

  // The town's counted renter households on the first day, each weighted by the households its record stands for.
  const renters = new Map<string, number>();
  for (const h of rt.store.liveHouseholds())
    if (h.placeId === town && h.tenure === "rent" && !h.quarters)
      renters.set(h.id, rt.store.weightOf(h));
  const renterWeight = [...renters.values()].reduce((n, w) => n + w, 0);
  expect(renterWeight).toBeGreaterThan(0);

  const end = makeIsoDate(addMonths(opening, 12));
  advanceCore(core, end);

  // Those of them that bought during the year, by the purchase each recorded.
  const bought = (
    api.moduleState("housing").table("purchases").rows() as unknown as {
      householdId: string;
      counted?: boolean;
      date: string;
      weight: number;
    }[]
  ).filter(
    (row) =>
      row.counted &&
      renters.has(row.householdId) &&
      row.date > opening &&
      row.date <= end,
  );
  const boughtWeight = bought.reduce((n, row) => n + row.weight, 0);
  const rate = boughtWeight / renterWeight;
  const detail = `Bastrop LA (${PLACE}), world ${core.seed}, ${opening} to ${end}: ${boughtWeight.toFixed(1)} of ${renterWeight.toFixed(1)} renter households bought (${bought.length} records), ${(rate * 100).toFixed(2)}% a year`;
  expect(rate, detail).toBeGreaterThanOrEqual(0.02);
  expect(rate, detail).toBeLessThanOrEqual(0.06);
}, 600_000);
