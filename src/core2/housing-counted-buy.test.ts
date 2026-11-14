/**
 * A counted renter household buys a home by the full renters' rule (pool item
 * world-counted-renters-buy): its own savings, from its own record, against
 * the down payment. Pinned to Bastrop, Louisiana (place 2204685, the seed
 * home-price-paths draws from "c3"), on the first of July of its first year:
 * the counted renters whose lease began in July weigh buying; those that buy
 * had the down payment in their own savings (their share of their group's
 * account), those short of it do not, and every dollar
 * moved (the group accounts, the bank, the sellers) balances. The same means
 * test applies to a full renter household's head and a counted one's.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { countedLeaseStart } from "./housing-counted-buy";
import { buyMarket, weighHome } from "./housing-buy";
import { countedMortgageFlowId } from "./housing-mortgages";
import { addDays, ageInYears, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bankYes, heldMortgages, mortgageRoom } from "./modules/credit";
import { rentHomeValue, weighCountedBuyers } from "./modules/housing";
import {
  departingCash,
  householdIncome,
  residentsRuntime,
} from "./modules/residents";
import { claimsInGroup, fundBalance } from "./counted-money";
import { coreAPI } from "./state";

const PLACE = "2204685";

it("counted renters on their lease month buy from their own savings, short ones do not, and the money balances", () => {
  setBookkeeping(false);
  const drawn = drawPlace("c3", "home-price-paths");
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  // To the first of July, before the month's housing review: the groups have saved since the opening, and July's renters weigh buying.
  advanceCore(core, makeIsoDate(`${core.date.slice(0, 4)}-07-01`));
  const rt = residentsRuntime(core)!;
  const town = core.placeMetadata!.housingTown!;
  const market = buyMarket(api)!;
  expect(market).toBeDefined();
  const share = housingData.mortgage.downPayment.firstTime;
  const month = core.date.slice(5, 7);
  const today = makeIsoDate(core.date);

  // This month's counted renters, with what each would put down against its own savings.
  const weighing = [...rt.store.liveHouseholds()].flatMap((h) => {
    if (h.tenure !== "rent" || h.quarters) return [];
    const start = countedLeaseStart(api, h);
    if (!start || start.slice(5, 7) !== month) return [];
    if (ageInYears(start, today) < 1) return [];
    const rent = rt.flows.get(`rent:${h.id}`);
    const value = rent && rentHomeValue(api, h.placeId, rent.amountMinor);
    if (!value) return [];
    return [
      {
        id: h.id,
        // Its own savings: its share of its group's account, for every household the record stands for.
        savings: departingCash(rt, h),
        down: value * share * rt.store.weightOf(h),
      },
    ];
  });
  const short = weighing.filter((row) => row.savings < row.down);
  expect(
    short.length,
    "a counted renter short of its down payment",
  ).toBeGreaterThan(0);

  // Every account the purchases can touch, before and after.
  const funds = () =>
    [...rt.funds.values()].reduce((n, id) => n + api.accounts().balance(id), 0);
  // Every organization's own account (the bank, the outside markets, builders, the residents' accounts).
  const owners = [...core.organizations.keys()];
  // Money paid to an owner outside the game's books (the outside market) leaves them as a recorded boundary flow.
  const outside = () =>
    [...core.cashJournal.externalFlowsByOwner.values()].reduce(
      (n, row) => n + row.netMinor,
      0,
    );
  const others = () =>
    owners.reduce(
      (n, id) => n + api.accounts().balance(api.accounts().main(id)),
      0,
    ) + outside();
  const bankId = mortgageRoom(api)!.bankId;
  const bankCash = () => api.accounts().balance(api.accounts().main(bankId));
  const before = { funds: funds(), others: others() };
  const heldBefore = heldMortgages(api, bankId).now,
    bankBefore = bankCash();

  // Each weighing household's group and its share of the group's account, and each group's money per person, before.
  const shareBefore = new Map(
    weighing.map((row) => {
      const h = rt.store.liveHousehold(row.id)!;
      return [row.id, { group: h.group, cash: departingCash(rt, h) }];
    }),
  );
  // Each household's claim is its people at its savings weight: the money per claim is what every household's share reads.
  const perPerson = (group: number) =>
    fundBalance(api, rt, group) / claimsInGroup(rt, group);
  const perPersonBefore = new Map(
    [...shareBefore.values()].map((row) => [row.group, perPerson(row.group)]),
  );
  const rentIds = new Map(
    weighing.map((row) => [row.id, rt.flows.get(`rent:${row.id}`)!]),
  );
  weighCountedBuyers(api);
  const after = { funds: funds(), others: others() };
  const heldAfter = heldMortgages(api, bankId).now,
    bankAfter = bankCash();

  const bought = (
    api.moduleState("housing").table("purchases").rows() as unknown as {
      id: string;
      householdId: string;
      counted?: boolean;
      weight: number;
      downMinor: number;
      loanMinor: number;
      savingsMinor: number;
      holderId: string;
      reasons: Record<string, number>;
    }[]
  ).filter((row) => row.counted);
  const detail = `Bastrop LA (${PLACE}), world ${core.seed}, ${core.date}: ${weighing.length} weighed, ${short.length} short, ${bought.length} bought`;
  expect(bought.length, detail).toBeGreaterThan(0);
  const buyers = new Set(bought.map((row) => row.householdId));
  // Short of the down payment: none bought.
  for (const row of short)
    expect(buyers.has(row.id), `${detail}: ${row.id}`).toBe(false);
  for (const row of bought) {
    // Its own savings covered the down payment it paid.
    expect(row.savingsMinor, `${detail}: ${row.id}`).toBeGreaterThanOrEqual(
      row.downMinor,
    );
    // Its rent ended, a mortgage part joined its holder's counted flow, and it owns its home.
    expect(rentIds.get(row.householdId)?.endedAt, row.id).toBe(core.date);
    const flow = rt.flows.get(countedMortgageFlowId(town, row.holderId));
    expect(
      flow?.amountByContract?.[`mortgage:${row.householdId}`],
      row.id,
    ).toBeGreaterThan(0);
    const home = api
      .moduleState("housing")
      .table("dwellings")
      .get(`dwelling:${row.householdId}`) as
      { tenure: string; basis: string } | undefined;
    expect(home, row.id).toMatchObject({ tenure: "own", basis: "purchase" });
    expect(rt.store.liveHousehold(row.householdId)?.tenure, row.id).toBe(
      "mortgage",
    );
  }
  // Its share of its renter group's account covered the down payment for every household it stands for.
  for (const row of bought)
    expect(
      shareBefore.get(row.householdId)!.cash,
      `${detail}: ${row.id}`,
    ).toBeGreaterThanOrEqual(row.downMinor * row.weight);
  // The renters left behind paid none of it: each renter group a buyer left holds the same money per claim (to the cent each move rounds), so every household left keeps its share.
  const left = new Set(
    bought.map((row) => shareBefore.get(row.householdId)!.group),
  );
  for (const group of left) {
    if (claimsInGroup(rt, group) <= 0) continue;
    expect(
      Math.abs(perPerson(group) - perPersonBefore.get(group)!),
      `${detail}: group ${group}`,
    ).toBeLessThanOrEqual(bought.length);
  }
  // The reasons differ between buyers: each comes from its own record.
  expect(new Set(bought.map((row) => JSON.stringify(row.reasons))).size).toBe(
    bought.length,
  );
  // Money: the groups paid the down payments; the sellers took them and the bank's loans; nothing else moved.
  const down = bought.reduce((n, row) => n + row.downMinor * row.weight, 0);
  // The bank's books carry each loan it made for every household the record stands for, as its cash paid it out.
  const banked = bought
    .filter((row) => row.holderId === bankId)
    .reduce((n, row) => n + row.loanMinor * row.weight, 0);
  expect(banked, detail).toBeGreaterThan(0);
  expect(Math.abs(heldAfter - heldBefore - banked), detail).toBeLessThanOrEqual(
    bought.length,
  );
  expect(Math.abs(bankBefore - bankAfter - banked), detail).toBeLessThanOrEqual(
    bought.length,
  );
  expect(
    Math.abs(before.funds - after.funds - down),
    detail,
  ).toBeLessThanOrEqual(bought.length);
  expect(after.funds + after.others, detail).toBe(before.funds + before.others);

  // One means test for both tiers: the same household with the down payment buys, a cent short does not.
  const first = bought[0]! as (typeof bought)[number] & { leaseMonths: number };
  const h = rt.store.liveHousehold(first.householdId)!;
  const facts = rt.store.countedMembers(h).map((m) => rt.store.factsOf(m));
  const head = [...facts].sort(
    (x, y) =>
      x.birthDate.localeCompare(y.birthDate) || x.id.localeCompare(y.id),
  )[0]!;
  const rentMinor = rentIds.get(h.id)!.amountMinor;
  const valueMinor = rentHomeValue(api, h.placeId, rentMinor)!;
  const weigh = (headId: string, householdId: string, meansMinor: number) =>
    weighHome(api, market, (payment, income) => bankYes(api, payment, income), {
      headId,
      householdId,
      valueMinor,
      rentMinor,
      incomeMinor: householdIncome(rt, h) / 12,
      meansMinor,
      children: facts.filter((row) => ageInYears(row.birthDate, today) < 18)
        .length,
      headAge: ageInYears(head.birthDate, today),
      leaseYears: first.leaseMonths / 12,
    });
  const enough = weigh(head.id, h.id, first.savingsMinor);
  expect(enough.buy, detail).toBe(true);
  expect(weigh(head.id, h.id, enough.downMinor - 1).buy, detail).toBe(false);
  // A full renter household's head, weighing the same home, is held to the same bar.
  const lease = [...core.finance.contracts.values()].find(
    (row) => row.id.startsWith("lease:") && !row.endedAt && row.householdId,
  )!;
  const fullHead = core.households
    .get(lease.householdId!)!
    .memberIds.map((id) => core.people.get(id)!)
    .sort((x, y) => x.birthDate.localeCompare(y.birthDate))[0]!;
  expect(
    weigh(fullHead.id, lease.householdId!, enough.downMinor - 1).buy,
    detail,
  ).toBe(false);
}, 300_000);
