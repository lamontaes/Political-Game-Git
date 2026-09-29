import { describe, expect, it } from "vitest";

import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import {
  organizationClosingAt,
  organizationProfileAt,
} from "../../src/simulation/life-queries";
import {
  townBusinessHasRoomToHire,
  townBusinessKindBooks,
  townBusinessLaysOff,
} from "../../src/simulation/living-world/town-business-books";
import {
  TOWN_BUSINESS_CLOSING_REASONS,
  townBusinesses,
} from "../../src/simulation/living-world/town-businesses";
import {
  TOWN_WORKPLACES,
  writeTownEmployer,
} from "../../src/simulation/living-world/town-employment";
import {
  BANK_FAILED_EVENT,
  BUSINESS_CLOSED_EVENT,
  TOWN_FINANCE_CLOSING_REASONS,
  closeBusinessesOutOfCash,
  stepTownFinances,
  townTaxableSales,
} from "../../src/simulation/living-world/town-finances";
import { BUDGET_SOURCES } from "../../src/simulation/public-budgets/store";
import { TOWN_FINANCE_ORIGIN_READER } from "../../src/simulation/macro-economy/sources";
import type { World } from "../../src/simulation";

const tagValue = (tags: readonly string[], prefix: string) =>
  tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);

describe(
  "Build 19: town businesses close when their cash runs out",
  { timeout: 900_000 },
  () => {
    // The observer draws its town at random from every state and territory;
    // this seed drew Marcus, Iowa.
    const seed = "b19-watch-8240f1";
    const opened = openObserverWorld(observerSetup(seed));
    const town =
      opened.world.people[opened.anchorPersonId]!.homeJurisdictionId!;
    let world: World = opened.world;
    for (let month = 0; month < 12; month += 1)
      world = advanceObservedWorld(world, 30);
    const closings = world.history.events.filter(
      (event) => event.type === BUSINESS_CLOSED_EVENT,
    );

    it("keeps books for every business that has paid a quarter, in one market per kind", () => {
      expect(observerPlace(seed).displayName).toBe("Marcus, Iowa");
      const store = world.townFinances!;
      const open = townBusinesses(world, town);
      expect(open.length).toBeGreaterThan(5);
      const markets = Object.values(store.markets).filter(
        (market) => market.town === town,
      );
      for (const market of markets) {
        expect(market.annualSales).toBeGreaterThanOrEqual(0);
        for (const id of market.members)
          expect(store.businesses[id]!.kind).toBe(market.kind);
      }
      const inAMarket = new Set(markets.flatMap((market) => market.members));
      for (const business of open)
        if (store.businesses[business.organizationId])
          expect(inAMarket.has(business.organizationId)).toBe(true);
    });

    it("draws nothing for a business's sales, and names every employer apart", () => {
      const store = world.townFinances!;
      for (const books of Object.values(store.businesses)) {
        expect(books.ownDemandLog).toBe(0);
        expect(books.margin).toBe(townBusinessKindBooks(books.kind).margin);
      }
      const names = world.history.organizations
        .filter((row) => row.stableKey.includes(`:${town}:employer:`))
        .map((row) => organizationProfileAt(world, row.id)!.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("sets every business's prices, in the dollars of the day the books began", () => {
      const store = world.townFinances!;
      expect(store.basePriceIndex).toBeGreaterThan(0);
      const months = world.macroEconomy!.months.filter(
        (month) => month.scope === "national",
      );
      const level = months.at(-1)!.priceIndex / store.basePriceIndex!;
      for (const books of Object.values(store.businesses)) {
        expect(books.price).toBeGreaterThan(0);
        // A year of costs and crowding moves a price, never wildly.
        expect(books.price! / level).toBeGreaterThan(0.8);
        expect(books.price! / level).toBeLessThan(1.25);
      }
    });

    it("in a year at real margins, nothing closes that had cash", () => {
      // Marcus's first year closed four businesses at the earlier head, each
      // from a defect (a drawn opening margin, a drawn customer drift, costs
      // that did not follow sales, pay read over an uneven count of
      // paydays). At each kind's real margin none runs out of cash.
      for (const event of closings) {
        const organizationId = tagValue(event.tags, "organization:")!;
        if (!event.tags.includes("cause:ran-out-of-cash")) continue;
        expect(
          world.townFinances!.businesses[organizationId]!.cash,
        ).toBeLessThan(0);
      }
    });

    it("a business whose cash and credit are gone closes, names why, and costs the town its jobs", () => {
      const store = world.townFinances!;
      const running = townBusinesses(world, town).filter(
        (business) =>
          business.jobs.length > 0 && store.businesses[business.organizationId],
      );
      const target = running[0]!;
      const books = store.businesses[target.organizationId]!;
      // Its cash is a year of its sales in the red, and its line is used up.
      const broke: World = {
        ...world,
        townFinances: {
          ...store,
          businesses: {
            ...store.businesses,
            [target.organizationId]: {
              ...books,
              cash: -books.annualRevenue,
              debt: books.lineLimit,
            },
          },
        },
      };
      const quarter = stepTownFinances(
        broke,
        town,
        running.map((business) => ({
          organizationId: business.organizationId,
          kind: business.workplace.key,
          newcomer: business.outlet >= business.workplace.outlets,
        })),
        new Set(),
        "business-broke",
        null,
      );
      expect(quarter.closing.map((row) => row.organizationId)).toEqual([
        target.organizationId,
      ]);
      const closed = closeBusinessesOutOfCash(
        quarter.world,
        town,
        quarter.closing,
        "b19-test:",
      );
      const event = closed.history.events.at(-1)!;
      expect(event.type).toBe(BUSINESS_CLOSED_EVENT);
      expect(event.tags).toContain("cause:ran-out-of-cash");
      expect(tagValue(event.tags, "credit:")).toBeDefined();
      expect(tagValue(event.tags, "organization:")).toBe(target.organizationId);
      expect(Number(tagValue(event.tags, "jobs:"))).toBe(target.jobs.length);
      expect(
        organizationClosingAt(closed, target.organizationId)?.closed?.reason,
      ).toBe(TOWN_BUSINESS_CLOSING_REASONS.ranOutOfCash);
      expect(event.summary).toMatch(/closed after its cash ran out/);
      const origins = TOWN_FINANCE_ORIGIN_READER.origins(
        closed,
        closed.currentDate,
      ).filter((origin) => origin.originEventId === event.id);
      expect(origins.map((origin) => origin.kind)).toContain(
        "regional-industry-downturn",
      );
      for (const origin of origins)
        expect(origin.scope).toBe(`jurisdiction:${town}`);
    });

    it("a city's sales tax follows what its town's businesses sell", () => {
      const index = townTaxableSales(world, town);
      expect(index).not.toBeNull();
      const city = world.publicBudgets!.governments.find(
        (government) =>
          government.level === "city" && government.jurisdictionId === town,
      )!;
      const year = city.years.at(-1)!;
      expect(year.townSalesAtAdoption).toBeGreaterThan(0);
      const at = BUDGET_SOURCES.indexOf("generalSalesTax");
      const row = city.months.at(-1)!;
      expect(row.townSales).toBeGreaterThan(0);
      // The month's sales tax is the budget's twelfth times the town's
      // taxable sales against where the budget set it.
      expect(
        Math.abs(
          row.revenue[at]! - (year.expectedRevenue[at]! / 12) * row.townSales!,
        ),
      ).toBeLessThanOrEqual(1);
    });

    it("a bank whose capital is gone fails, is recorded, and tightens credit in its town", () => {
      const bankWorkplace = TOWN_WORKPLACES.find((row) => row.key === "bank")!;
      const withBank = writeTownEmployer(
        world,
        town,
        bankWorkplace,
        9,
        world.currentDate,
      );
      const businesses = townBusinesses(withBank, town).map((business) => ({
        organizationId: business.organizationId,
        kind: business.workplace.key,
        newcomer: business.outlet >= business.workplace.outlets,
      }));
      const first = stepTownFinances(
        withBank,
        town,
        businesses,
        new Set(),
        "bank-opens",
        null,
      ).world;
      const [bankId, bank] = Object.entries(first.townFinances!.banks).find(
        ([id]) => !world.townFinances!.banks[id],
      )!;
      expect(bank.shape.cushion).toBeGreaterThan(0);
      // Its losses leave it 1 percent of its assets in capital.
      const broke: World = {
        ...first,
        townFinances: {
          ...first.townFinances!,
          banks: {
            ...first.townFinances!.banks,
            [bankId]: { ...bank, capital: 0.01 * (bank.liquid + bank.loans) },
          },
        },
      };
      const failed = stepTownFinances(
        broke,
        town,
        businesses,
        new Set(),
        "bank-fails",
        null,
      ).world;
      const event = failed.history.events.at(-1)!;
      expect(event.type).toBe(BANK_FAILED_EVENT);
      expect(["cause:insolvent", "cause:depositors-withdrew"]).toContain(
        event.tags.find((tag) => tag.startsWith("cause:")),
      );
      expect(event.summary).toMatch(/failed\./);
      expect(failed.townFinances!.banks[bankId]!.failed?.eventId).toBe(
        event.id,
      );
      expect(organizationClosingAt(failed, bankId)?.closed?.reason).toBe(
        TOWN_FINANCE_CLOSING_REASONS.bankFailed,
      );
      const origins = TOWN_FINANCE_ORIGIN_READER.origins(
        failed,
        failed.currentDate,
      ).filter((origin) => origin.originEventId === event.id);
      expect(origins.map((origin) => origin.kind)).toContain(
        "credit-tightening",
      );
      for (const origin of origins)
        expect(origin.scope).toBe(`jurisdiction:${town}`);
    });
  },
);

describe("Build 19: a business hires when its sales need hands", () => {
  const books = {
    organizationId: "organization_a",
    openedAt: "2026-04-06",
    cash: 5_000,
    debt: 0,
    kind: "retail",
    capacity: 100_000,
    annualRevenue: 100_000,
    annualOtherCosts: 60_000,
    margin: townBusinessKindBooks("retail").margin,
    ownDemandLog: 0,
    openingShare: 1,
    openingMarketSales: 100_000,
    bankId: null,
    lineLimit: 10_000,
    lastQuarterNet: 0,
    lastQuarterPay: 8_000,
    lastRound: "r",
  } as unknown as Parameters<typeof townBusinessHasRoomToHire>[0];

  it("hires nobody more while its sales only cover the staff it has", () => {
    expect(townBusinessHasRoomToHire(books, 4)).toBe(false);
  });

  it("hires once its sales grow past what its staff can serve", () => {
    expect(
      townBusinessHasRoomToHire({ ...books!, annualRevenue: 140_000 }, 4),
    ).toBe(true);
  });

  it("lets somebody go when its sales no longer cover its pay", () => {
    expect(townBusinessLaysOff({ ...books!, annualRevenue: 80_000 }, 3)).toBe(
      true,
    );
    expect(townBusinessLaysOff(books, 3)).toBe(false);
    // A business of one runs on its cash until its books close it.
    expect(townBusinessLaysOff({ ...books!, annualRevenue: 80_000 }, 1)).toBe(
      false,
    );
  });

  it("hires as before when its books have not opened", () => {
    expect(townBusinessHasRoomToHire(undefined, 0)).toBe(true);
  });
});
