// @vitest-environment node
/**
 * A buyer's regular seller (regular-seller.ts): each pair's standing is fixed
 * by the world's seeded unit, so a closing moves only that seller's buyers and
 * a new seller wins only the buyers it now stands first for. In a played
 * world, a store's closing moves its households to another store of its kind
 * the same day, on the business engine's record. Pinned place and seed:
 * Pierre, South Dakota (4649600, size-4649600), at its Census size.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { BUSINESS_MODULE_ID } from "./business-module-id";
import { closeBusinessByChoice } from "./finance-state";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { regularSeller } from "./regular-seller";
import { coreAPI } from "./state";

setBookkeeping(false);

const SEED = "size-4649600";
const buyers = Array.from({ length: 4000 }, (_, n) => `household:${n}`);
const sellers = [
  { id: "a", weight: 1 },
  { id: "b", weight: 2 },
  { id: "c", weight: 1 },
  { id: "d", weight: 4 },
];
const dealt = (list: typeof sellers) =>
  new Map(buyers.map((id) => [id, regularSeller(SEED, id, list)!]));

describe("a buyer's regular seller", () => {
  it("follows capacity, and only a closed seller's buyers move", () => {
    const before = dealt(sellers);
    const count = (id: string) =>
      [...before.values()].filter((seller) => seller === id).length;
    // Each seller's share of buyers is near its share of capacity (1:2:1:4).
    expect(count("d") / buyers.length).toBeGreaterThan(0.45);
    expect(count("d") / buyers.length).toBeLessThan(0.55);
    expect(count("a") / buyers.length).toBeGreaterThan(0.1);
    expect(count("a") / buyers.length).toBeLessThan(0.15);
    const after = dealt(sellers.filter((row) => row.id !== "b"));
    for (const id of buyers)
      if (before.get(id) !== "b") expect(after.get(id)).toBe(before.get(id));
      else expect(after.get(id)).not.toBe("b");
  });

  it("a new seller takes only the buyers it now stands first for", () => {
    const before = dealt(sellers);
    const after = dealt([...sellers, { id: "e", weight: 2 }]);
    let won = 0;
    for (const id of buyers)
      if (after.get(id) === "e") won++;
      else expect(after.get(id)).toBe(before.get(id));
    // Its share of capacity is 2 of 10.
    expect(won / buyers.length).toBeGreaterThan(0.16);
    expect(won / buyers.length).toBeLessThan(0.24);
  });

  it("moves a closed store's households to another store of its kind the same day, on record (Pierre, South Dakota, 4649600, seed size-4649600)", () => {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: "4649600",
    });
    const api = coreAPI(core);
    // The business engine records its owners on the first day played.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const business = api.moduleState(BUSINESS_MODULE_ID);
    const retail = (id: string) =>
      core.organizations.get(id)?.classification === "enterprise:retail";
    // The store that the most full households buy from.
    const buyersOf = new Map<string, string[]>();
    for (const plan of core.finance.livingPlans.values())
      for (const id of plan.sellers.keys())
        if (retail(id))
          buyersOf.set(id, [...(buyersOf.get(id) ?? []), plan.householdId]);
    const [storeId, households] = [...buyersOf].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    )[0]!;
    expect(households.length).toBeGreaterThan(0);
    const owner = business.table("owners").get(storeId) as
      { ownerId: string } | undefined;
    expect(owner).toBeDefined();
    const before = new Map(
      households.map((id) => [
        id,
        core.finance.livingPlans.get(id)!.sellers.get(storeId)!,
      ]),
    );
    closeBusinessByChoice(core, api, {
      organizationId: storeId,
      ownerAccountId: api.accounts().main(owner!.ownerId),
      reasonKey: "retiring",
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Test: the owner closes the store.",
        estimatedFrom: "Test closing.",
      },
    });
    const moves = business
      .table("customerMoves")
      .query("byFrom", [storeId]) as unknown as {
      householdId: string;
      toId: string;
      monthlyMinor: number;
      date: string;
      cause: string;
    }[];
    expect(moves.map((row) => row.householdId).sort()).toEqual(
      [...households].sort(),
    );
    for (const move of moves) {
      const plan = core.finance.livingPlans.get(move.householdId)!;
      expect(move.date).toBe(core.date);
      expect(move.cause).toBe("closed");
      expect(retail(move.toId)).toBe(true);
      expect(core.finance.businesses.get(move.toId)!.closedAt).toBeUndefined();
      expect(plan.sellers.has(storeId)).toBe(false);
      expect(move.monthlyMinor).toBe(before.get(move.householdId));
      expect(plan.sellers.get(move.toId)).toBeGreaterThanOrEqual(
        move.monthlyMinor,
      );
    }
  }, 100_000);
});
