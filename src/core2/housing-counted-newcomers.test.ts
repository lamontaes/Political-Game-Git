/**
 * Households that move into the played town find a home (stopgap
 * SG-WORLD-housing-new-home-buyers retired, built with #9117). Pinned to
 * Bastrop, Louisiana (place 2204685, the seed home-price-paths draws from
 * "c3"), on the second of March of its first year, after February's arrivals
 * and before March's housing review: every newcomer to the town either buys
 * (by the renters' rule, with its share of its group's account and, when the
 * household it was drawn like owns, that home's value less its loan) or rents
 * a home like that household's, and every dollar balances.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { claimsInGroup, fundBalance } from "./counted-money";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { weighCountedBuyers } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = "2204685";

it("newcomers to the town buy or rent a home like the household they were drawn like, and the money balances", () => {
  setBookkeeping(false);
  const drawn = drawPlace("c3", "home-price-paths");
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  advanceCore(core, makeIsoDate(`${core.date.slice(0, 4)}-03-02`));
  const rt = residentsRuntime(core)!;
  const town = core.placeMetadata!.housingTown!;
  const homes = api.moduleState("housing").table("dwellings");
  type Home = {
    tenure: string;
    basis?: string;
    rentMinor?: number;
    valueMinor?: number;
  };
  // The town's newcomers waiting for March's review, each with the home of the household it was drawn like.
  const waiting = rt.newcomers
    .map((row) => ({ ...row, h: rt.store.liveHousehold(row.householdId) }))
    .filter((row) => row.h?.placeId === town && row.h.tenure === "other");
  const detail = `Bastrop LA (${PLACE}), world ${core.seed}, ${core.date}: ${waiting.length} newcomers to the town`;
  expect(waiting.length, detail).toBeGreaterThan(0);
  for (const row of waiting)
    expect(homes.get(`dwelling:${row.householdId}`), detail).toBeUndefined();
  const likeOwns = new Map(
    waiting.map((row) => [
      row.householdId,
      (homes.get(`dwelling:${row.likeId}`) as Home | undefined)?.tenure ===
        "own",
    ]),
  );
  const groupOf = new Map(
    waiting.map((row) => [row.householdId, row.h!.group]),
  );
  const perClaim = (group: number) =>
    fundBalance(api, rt, group) / claimsInGroup(rt, group);
  const perClaimBefore = new Map(
    [...groupOf.values()].map((group) => [group, perClaim(group)]),
  );

  // Every account the review can touch, before and after (see housing-counted-buy.test.ts).
  const funds = () =>
    [...rt.funds.values()].reduce((n, id) => n + api.accounts().balance(id), 0);
  const owners = [...core.organizations.keys()];
  const others = () =>
    owners.reduce(
      (n, id) => n + api.accounts().balance(api.accounts().main(id)),
      0,
    ) +
    [...core.cashJournal.externalFlowsByOwner.values()].reduce(
      (n, row) => n + row.netMinor,
      0,
    );
  const before = funds() + others();
  weighCountedBuyers(api);
  expect(funds() + others(), detail).toBe(before);
  expect(rt.newcomers.length, detail).toBe(0);

  const purchases = new Map(
    (
      api.moduleState("housing").table("purchases").rows() as unknown as {
        householdId: string;
        counted?: boolean;
        weight: number;
        downMinor: number;
        savingsMinor: number;
        broughtMinor?: number;
        leaseMonths: number;
      }[]
    )
      .filter((row) => row.counted && row.leaseMonths === 0)
      .map((row) => [row.householdId, row]),
  );
  let rented = 0;
  for (const row of waiting) {
    const h = rt.store.liveHousehold(row.householdId)!;
    const home = homes.get(`dwelling:${h.id}`) as Home | undefined;
    const bought = purchases.get(h.id);
    if (bought) {
      // It bought: an owner with a mortgage, its down payment covered by what it brought and its share.
      expect(home, `${detail}: ${h.id}`).toMatchObject({
        tenure: "own",
        basis: "purchase",
      });
      expect(h.tenure, h.id).toBe("mortgage");
      expect(
        bought.savingsMinor + (bought.broughtMinor ?? 0),
        `${detail}: ${h.id}`,
      ).toBeGreaterThanOrEqual(bought.downMinor);
      // Only a household drawn like an owner brings a sold home's money.
      if (!likeOwns.get(h.id))
        expect(bought.broughtMinor, h.id).toBeUndefined();
      // The other newcomers and residents in the group it left paid none of it.
      const group = groupOf.get(h.id)!;
      if (claimsInGroup(rt, group) > 0)
        expect(
          Math.abs(perClaim(group) - perClaimBefore.get(group)!),
          `${detail}: group ${group}`,
        ).toBeLessThanOrEqual(purchases.size);
    } else {
      // It rents a home like the one it was drawn like, at that home's rent, to the landlord, from next month.
      rented++;
      expect(home, `${detail}: ${h.id}`).toMatchObject({
        tenure: "rent",
        basis: "arrival",
      });
      expect(h.tenure, h.id).toBe("rent");
      const rent = rt.flows.get(`rent:${h.id}`);
      expect(rent && !rent.endedAt, h.id).toBe(true);
      expect(rent!.amountMinor, h.id).toBe(home!.rentMinor);
    }
  }
  const boughtHere = waiting.filter((row) => purchases.has(row.householdId));
  expect(boughtHere.length, `${detail}: bought`).toBeGreaterThan(0);
  expect(rented, `${detail}: rented`).toBeGreaterThan(0);
  // A newcomer drawn like an owner bought with what its old home sold for.
  expect(
    boughtHere.some(
      (row) => (purchases.get(row.householdId)!.broughtMinor ?? 0) > 0,
    ),
    detail,
  ).toBe(true);
}, 300_000);
