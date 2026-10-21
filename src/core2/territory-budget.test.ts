/**
 * An island area's government has a budget (gov-territory-administration-line-overcommitted):
 * its state-level treasury carries spending and revenue by function sized from
 * its residents, so the wage room of its administration line covers the posts
 * charged to it and its election chief holds a paid job. Played world, an
 * island area and a locality nobody chose, with the seed named.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { placeLocalities, placeStateKeys } from "./places";
import { corePlaceByKey } from "./place-lookup";
import { coreAPI } from "./state";
import { governments } from "./modules/budgets";
import { budgetInForce, publicPayRoom } from "./budgets-treasury";

const ISLAND_AREAS = ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"];
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const hash = createHash("sha256")
  .update(`${seed}:territory-budget`)
  .digest("hex");
const area =
  ISLAND_AREAS[parseInt(hash.slice(0, 8), 16) % ISLAND_AREAS.length]!;
const localities = [...placeLocalities(area)].sort((a, b) =>
  a.key.localeCompare(b.key),
);
const locality =
  localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;

function checkBudget(
  where: string,
  worldSeed: string,
  placeKey: string,
  level: "state",
  sums = true,
): { chief: string; job: string; room: number } {
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const gov = governments(api).find((g) => g.level === level)!;
  expect(gov.residents, `${where}: residents`).toBeGreaterThan(0);
  const budget = budgetInForce(api, gov.id)!;
  const spending = Object.values(budget.spendingMinor).reduce(
    (a, b) => a + b,
    0,
  );
  const revenue = Object.values(budget.revenueMinor).reduce((a, b) => a + b, 0);
  expect(spending, `${where}: spending`).toBeGreaterThan(0);
  if (sums) {
    // A balanced general fund: revenue equals spending, less lines the engines add (pension contributions).
    expect(Math.abs(revenue - spending) / spending, where).toBeLessThan(0.05);
    // Spending a resident sits between a quarter and four times the states'
    // middle, a sanity band for an estimate from three published totals.
    const perResident = spending / 100 / gov.residents;
    expect(perResident, `${where}: spending a resident`).toBeGreaterThan(1_500);
    expect(perResident, `${where}: spending a resident`).toBeLessThan(40_000);
  }
  // The administration line carries the pay already charged to it.
  const room = publicPayRoom(api, gov.organizationId, "state:administration");
  expect(room, `${where}: administration room`).toBeGreaterThanOrEqual(0);
  // The election chief holds a paid job.
  const chief = [...core.people.values()].find((p) =>
    p.id.startsWith("person:election-chief:"),
  );
  expect(chief, `${where}: election chief`).toBeDefined();
  expect(chief!.jobId, `${where}: ${chief!.id} has a job`).toBeDefined();
  return { chief: chief!.id, job: chief!.jobId!, room };
}

it(`an island area's treasury carries a budget in ${locality.displayName} (${area}), seed ${seed}`, () => {
  const where = `${locality.displayName} (${locality.key}, ${area}), seed ${seed}`;
  const result = checkBudget(where, hash, locality.key, "state");
  console.log(
    `${where}: chief ${result.chief}, job ${result.job}, administration room ${result.room}`,
  );
}, 300_000);

// The case the item names: American Samoa's Pago Pago, whose administration
// line was 1.55 million short of the pay committed to it.
it("Pago Pago, American Samoa (seed e5): the administration line has room and the election chief holds a paid job", () => {
  const key = "territory:AS:pago-pago";
  expect(corePlaceByKey(key), "Pago Pago is a recorded place").toBeDefined();
  const result = checkBudget(
    `Pago Pago (${key}, US-AS), seed e5`,
    "e5",
    key,
    "state",
  );
  console.log(
    `Pago Pago (${key}), seed e5: chief ${result.chief}, job ${result.job}, administration room ${result.room}`,
  );
}, 300_000);

// One state drawn from the fifty, on the same seed: the same rule everywhere.
it("a state drawn on the seed has the same: room on the administration line and a paid election chief", () => {
  const states = [...placeStateKeys()]
    .filter((key) => !ISLAND_AREAS.includes(key) && key !== "US-DC")
    .sort();
  const state = states[parseInt(hash.slice(16, 24), 16) % states.length]!;
  const places = [...placeLocalities(state)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const place = places[parseInt(hash.slice(24, 32), 16) % places.length]!;
  const where = `${place.displayName} (${place.key}, ${state}), seed ${seed}`;
  // A state's own budget is its published one; only the room on its administration line and its paid chief are checked here.
  const result = checkBudget(where, hash, place.key, "state", false);
  console.log(
    `${where}: chief ${result.chief}, job ${result.job}, administration room ${result.room}`,
  );
}, 300_000);
