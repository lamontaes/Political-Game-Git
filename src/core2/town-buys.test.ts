/**
 * Budget lines buy from the town's own firms (data/budgets/treasury-spending.json,
 * providers): in Center, North Dakota, after a month of a played world, the
 * police and fire lines buy from the town's repair shop or store, the health
 * line from its clinic or care home, corrections from its kitchens, clinic or
 * building services, and natural resources from its builders or professional
 * offices, each through the contracts engine's award and paid by the
 * treasury. Before, those lines had no town provider (or named
 * classifications no town business has) and all of it left town.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CONTRACTS_MODULE_ID,
  type ContractAwardRow,
} from "./modules/contracts";
import { coreAPI } from "./state";

const placeKey = "3813180";
const seed = "town-buys";
// One world built and run 40 days, about 40 seconds alone; the limit is about twice that beside other tests.
const LIMIT_MS = 120_000;

const BOUGHT_FROM: Readonly<Record<string, readonly string[]>> = {
  police: ["enterprise:repair", "enterprise:retail"],
  fire: ["enterprise:repair", "enterprise:retail"],
  healthAndHospitals: ["service:clinic", "service:nursing-home"],
  corrections: [
    "enterprise:food-service",
    "service:clinic",
    "enterprise:building-services",
  ],
  naturalResources: [
    "enterprise:construction",
    "enterprise:professional-services",
  ],
};

it(
  "police, fire, health, corrections and natural resources buy from the town's own firms",
  () => {
    const world = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey,
    });
    const core = world.core;
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const where = `${world.place.displayName} (place ${placeKey}, seed ${seed}, ${core.date})`;
    const awards = coreAPI(core)
      .moduleState(CONTRACTS_MODULE_ID)
      .table("awards")
      .rows() as unknown as ContractAwardRow[];
    for (const [line, kinds] of Object.entries(BOUGHT_FROM)) {
      const on = awards.filter((row) => row.line === line);
      expect(on.length, `${where}: an award on ${line}`).toBeGreaterThan(0);
      for (const row of on) {
        const firm = core.organizations.get(row.organizationId);
        expect(firm?.placeId, `${where}: ${line} firm in town`).toBe(
          world.placeId,
        );
        expect(kinds, `${where}: ${line} firm's kind`).toContain(
          firm?.classification,
        );
      }
      expect(
        on.reduce((n, row) => n + row.paidMinor, 0),
        `${where}: ${line} paid to the town's firms`,
      ).toBeGreaterThan(0);
    }
  },
  LIMIT_MS,
);
