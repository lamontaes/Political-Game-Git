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
import { placeLocalities } from "./places";
import { corePlaceStateIdentities } from "./place-lookup";
import { coreAPI } from "./state";
import { governments } from "./modules/budgets";
import { budgetInForce, publicPayRoom } from "./budgets-treasury";

const ISLAND_AREAS = ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"];
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** A locality drawn from the given states by the case's own hash, never by what it contains. */
function drawLocality(hash: string, states: readonly string[]) {
  const area = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const localities = [...placeLocalities(area)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  if (!localities.length) throw new Error(`no localities in ${area}`);
  return {
    area,
    locality: localities[parseInt(hash.slice(8, 16), 16) % localities.length]!,
  };
}
const hashOf = (label: string) =>
  createHash("sha256").update(`${seed}:${label}`).digest("hex");

/** The budget and pay checks, run in one played world. */
function checkTerritoryBudget(
  worldSeed: string,
  area: string,
  locality: { key: string; displayName: string },
  /** The balance and per-resident bands check an island area's estimated budget; a state's comes from its published one. */
  islandBudget = true,
): void {
  const where = `${locality.displayName} (${locality.key}, ${area}), seed ${worldSeed}`;
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: locality.key,
  });
  const api = coreAPI(core);
  const gov = governments(api).find((g) => g.level === "state")!;
  expect(gov.residents, `${where}: residents`).toBeGreaterThan(0);
  const budget = budgetInForce(api, gov.id)!;
  const spending = Object.values(budget.spendingMinor).reduce(
    (a, b) => a + b,
    0,
  );
  const revenue = Object.values(budget.revenueMinor).reduce((a, b) => a + b, 0);
  expect(spending, `${where}: spending`).toBeGreaterThan(0);
  if (islandBudget) {
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
  const job = core.jobs.get(chief!.jobId!);
  expect(
    job?.wageDailyMinor,
    `${where}: ${chief!.id}'s job ${chief!.jobId} is paid`,
  ).toBeGreaterThan(0);
  console.log(
    `territory-budget ${where}: administration room ${room}, chief ${chief!.id}, job ${chief!.jobId}`,
  );
}

it("American Samoa's treasury carries a budget in Pago Pago, seed e5 (the reported case)", () => {
  const localities = [...placeLocalities("US-AS")];
  const pago = localities.find((l) => l.key === "territory:AS:pago-pago");
  expect(pago, "Pago Pago is a locality of American Samoa").toBeDefined();
  checkTerritoryBudget("e5", "US-AS", pago!);
}, 300_000);

it(`an island area's treasury carries a budget in a drawn island locality, seed ${seed}`, () => {
  const hash = hashOf("territory-budget");
  const { area, locality } = drawLocality(hash, ISLAND_AREAS);
  checkTerritoryBudget(hash, area, locality);
}, 300_000);

it(`a state's treasury keeps its administration room and paid election chief in a drawn state locality, seed ${seed}`, () => {
  const hash = hashOf("territory-budget-state");
  const states = corePlaceStateIdentities()
    .map((s) => s.jurisdictionKey)
    .filter((k) => !ISLAND_AREAS.includes(k))
    .sort();
  const { area, locality } = drawLocality(hash, states);
  checkTerritoryBudget(hash, area, locality, false);
}, 300_000);
