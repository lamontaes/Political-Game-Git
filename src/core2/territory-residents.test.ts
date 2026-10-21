/**
 * An island area's state government carries its residents from the Census
 * figures in public-budget-bases.json (SG-GOV-REACH-B-territory-residents),
 * and group B shares a budget line's change to the town by them. Played
 * world, an island place drawn from the five by a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import bases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { residentsOf, townShare } from "./law-reach/group-b-money";
import { governments } from "./modules/budgets";
import { coreAPI } from "./state";

const ISLANDS = ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"];
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function drawIsland() {
  for (let n = 0; n < 5000; n += 1) {
    const place = drawPlace(`${seed}:${n}`, "territory-residents");
    if (ISLANDS.includes(place.state)) return place;
  }
  throw new Error("no island place drawn");
}

it("every island area has a Census population in the budget bases", () => {
  for (const key of ISLANDS) {
    const row = (bases.places as Record<string, Record<string, unknown>>)[key]!;
    const count =
      row.population2024 ??
      row.islandAreaPopulation2020 ??
      row.puertoRicoPopulation2025;
    expect(typeof count, key).toBe("number");
    expect(count as number, key).toBeGreaterThan(0);
  }
});

it(`the state government of an island place carries its residents (seed ${seed})`, () => {
  const place = drawIsland();
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const state = governments(api).find((g) => g.level === "state")!;
  const row = (bases.places as Record<string, Record<string, number>>)[
    state.id
  ]!;
  const expected =
    row.population2024 ??
    row.islandAreaPopulation2020 ??
    row.puertoRicoPopulation2025;
  expect(state.residents, where).toBe(expected);
  expect(residentsOf(api, state), where).toBe(expected);
  const share = townShare(api, state);
  expect(share, where).toBeGreaterThan(0);
  expect(share, where).toBeLessThanOrEqual(1);
}, 600_000);
