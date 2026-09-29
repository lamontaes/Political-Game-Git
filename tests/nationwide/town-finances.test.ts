import { describe, expect, it } from "vitest";

import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { organizationClosingAt } from "../../src/simulation/life-queries";
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
  stepTownFinances,
} from "../../src/simulation/living-world/town-finances";
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

    it("records each closing with its cause, and nothing closes that had cash", () => {
      expect(closings.length).toBeGreaterThan(0);
      for (const event of closings) {
        expect(event.tags).toContain("cause:ran-out-of-cash");
        expect(tagValue(event.tags, "credit:")).toBeDefined();
        const organizationId = tagValue(event.tags, "organization:")!;
        expect(
          world.townFinances!.businesses[organizationId]!.cash,
        ).toBeLessThan(0);
        expect(
          organizationClosingAt(world, organizationId)?.closed?.reason,
        ).toBe(TOWN_BUSINESS_CLOSING_REASONS.ranOutOfCash);
        expect(event.summary).toMatch(/closed after its cash ran out/);
      }
    });

    it("feeds a closing that cost jobs into the town's own economy", () => {
      const withJobs = closings.filter(
        (event) => Number(tagValue(event.tags, "jobs:")) > 0,
      );
      expect(withJobs.length).toBeGreaterThan(0);
      const shocks = world.macroEconomy!.shocks;
      for (const event of withJobs)
        expect(
          shocks.some(
            (shock) =>
              shock.originEventId === event.id &&
              shock.kind === "regional-industry-downturn" &&
              shock.scope === `jurisdiction:${town}`,
          ),
        ).toBe(true);
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
