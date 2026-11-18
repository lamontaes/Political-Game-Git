// @vitest-environment node
/**
 * A buyer's regular seller (regular-seller.ts): each pair's standing is fixed
 * by the world's seeded unit, so a closing moves only that seller's buyers and
 * a new seller wins only the buyers it now stands first for. In a played
 * world, a store's closing moves its households to another store of its kind
 * the same day, on the business engine's record, in a place drawn from all
 * 56 (NATION_SEED replays).
 */
import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { BUSINESS_MODULE_ID } from "./business-module-id";
import { closeBusinessByChoice } from "./finance-state";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";
import { realLocalities } from "./places";
import { regularSeller } from "./regular-seller";
import { coreAPI } from "./state";

setBookkeeping(false);

const SEED = "regular-seller-unit";
const DRAW_SEED = process.env.NATION_SEED ?? randomBytes(8).toString("hex");
/** Months the test waits for the founding engine to open a second store of a kind. */
const WAIT_MONTHS = 12;
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

  it("moves a closed store's households to another store of its kind the same day, on record", () => {
    // A kind with two stores is the world's own doing (the opening seeds one
    // and the founding engine opens more where demand outgrows it): draw
    // places until one has a kind with two sellers households buy from, and
    // name the ones passed over.
    const passed: string[] = [];
    let built = 0;
    for (let attempt = 0; attempt < 400 && built < 4; attempt += 1) {
      const place = drawPlace(`${DRAW_SEED}:${attempt}`, "regular-seller");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      // Two stores of a kind take a town with the demand for them: a place of ten thousand to fifty thousand people (a larger one takes too long to play a year).
      const row = realLocalities().find((r) => r.key === place.key);
      const real = row?.sourceGeoid
        ? publishedPlaceReferencePopulation(row.sourceGeoid)?.value
        : undefined;
      if (real === undefined || real < 10_000 || real > 50_000) {
        passed.push(
          `${where}: ${real === undefined ? "no published count" : real < 10_000 ? "under ten thousand people" : "over fifty thousand people (a year of play there runs past the wait)"}`,
        );
        continue;
      }
      built += 1;
      let world: ReturnType<typeof buildBenchWorld>;
      try {
        world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      } catch (error) {
        // A place with no household to play (every adult in group quarters) has no player: another is drawn.
        if ((error as Error).name !== "NoPlayerHereError") throw error;
        passed.push(`${where}: no one to play`);
        continue;
      }
      const { core } = world;
      const api = coreAPI(core);
      // The business engine records its owners, and the opening settles its markets, on the first day played.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const business = api.moduleState(BUSINESS_MODULE_ID);
      // The stores households buy from, by kind.
      const sellersByKind = () => {
        const byKind = new Map<string, Map<string, string[]>>();
        for (const plan of core.finance.livingPlans.values())
          for (const id of plan.sellers.keys()) {
            const kind = core.organizations.get(id)?.classification;
            if (!kind || !business.table("owners").get(id)) continue;
            const stores = byKind.get(kind) ?? new Map<string, string[]>();
            stores.set(id, [...(stores.get(id) ?? []), plan.householdId]);
            byKind.set(kind, stores);
          }
        return [...byKind]
          .filter(([, stores]) => stores.size >= 2)
          .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))[0];
      };
      // The opening seeds one store of a kind, so a second one is the founding
      // engine's: wait for it, a month at a time, up to a year.
      let kind = sellersByKind();
      for (let month = 0; !kind && month < WAIT_MONTHS; month += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        kind = sellersByKind();
      }
      if (!kind) {
        passed.push(`${where}: no kind with two sellers in a year`);
        continue;
      }
      const sameKind = (id: string) =>
        core.organizations.get(id)?.classification === kind[0];
      const [storeId, households] = [...kind[1]].sort(
        (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
      )[0]!;
      const owner = business.table("owners").get(storeId) as
        { ownerId: string } | undefined;
      expect(owner, where).toBeDefined();
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
      expect(moves.map((row) => row.householdId).sort(), where).toEqual(
        [...households].sort(),
      );
      for (const move of moves) {
        const plan = core.finance.livingPlans.get(move.householdId)!;
        expect(move.date).toBe(core.date);
        expect(move.cause).toBe("closed");
        expect(sameKind(move.toId)).toBe(true);
        expect(
          core.finance.businesses.get(move.toId)!.closedAt,
        ).toBeUndefined();
        expect(plan.sellers.has(storeId)).toBe(false);
        expect(move.monthlyMinor).toBe(before.get(move.householdId));
        expect(plan.sellers.get(move.toId)).toBeGreaterThanOrEqual(
          move.monthlyMinor,
        );
      }
      process.stdout.write(
        `regular seller: ${where}: ${storeId} (${kind[0]}) closed, ${moves.length} households moved; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a kind with two sellers: ${passed.join("; ")}`,
    );
  }, 3_600_000);
});
