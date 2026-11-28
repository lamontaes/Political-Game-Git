import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { gameStartDate } from "../../../src/core2/game-start";
import {
  allMortgageRows,
  dwellingTenure,
  evictionCases,
  homelessCountOf,
  householdStatusRow,
  housingStockOf,
} from "../../../src/core2/housing-reads";
import { HOMELESS_COUNT_MODULE_ID } from "../../../src/core2/modules/homeless-count";
import { HOUSING_MODULE_ID } from "../../../src/core2/modules/housing";
import { coreAPI } from "../../../src/core2/state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

/** Each door answers what the table it reads holds, in a played world at a drawn place. */
it("the housing doors read the housing engine's own tables", () => {
  const place = drawPlace(seed, "housing-reads");
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const housing = api.moduleState(HOUSING_MODULE_ID);

  const dwellings = housing.table("dwellings").rows();
  expect(dwellings.length, "the world keeps homes").toBeGreaterThan(0);
  for (const row of dwellings.slice(0, 50)) {
    const held = dwellingTenure(api, String(row.householdId));
    // The door answers own or rent; any other dwelling status has no tenure.
    expect(held?.tenure).toBe(
      row.tenure === "own" || row.tenure === "rent" ? row.tenure : undefined,
    );
    if (held) expect(held.recordId).toBe(row.id);
  }
  expect(dwellingTenure(api, "household:nobody")).toBeUndefined();

  expect(allMortgageRows(api)).toHaveLength(housing.table("mortgages").size);
  for (const row of housing.table("mortgages").rows().slice(0, 20))
    expect(allMortgageRows(api).some((one) => one.id === row.id)).toBe(true);

  const stock = housing.table("stock").rows();
  expect(stock.length, "the world keeps a rental stock").toBeGreaterThan(0);
  for (const row of stock.slice(0, 10))
    expect(housingStockOf(api, String(row.placeId))?.id).toBe(row.id);
  expect(housingStockOf(api, "place:nowhere")).toBeUndefined();

  expect(evictionCases(api)).toHaveLength(housing.table("cases").size);
  for (const row of housing.table("statuses").rows().slice(0, 20))
    expect(householdStatusRow(api, String(row.id))?.id).toBe(row.id);
  expect(householdStatusRow(api, "household:nobody")).toBeUndefined();

  if (core.modules.has(HOMELESS_COUNT_MODULE_ID))
    for (const row of api
      .moduleState(HOMELESS_COUNT_MODULE_ID)
      .table("counts")
      .rows()
      .slice(0, 10))
      expect(homelessCountOf(api, String(row.id))).toBe(row.homeless);
  expect(homelessCountOf(api, "place:nowhere")).toBeUndefined();
}, 600_000);
