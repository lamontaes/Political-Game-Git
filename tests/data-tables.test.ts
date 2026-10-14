import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import * as townPay from "../src/simulation/living-world/town-pay.generated";
import * as townRent from "../src/core2/reference/town-rent.generated";
import * as townEmployment from "../src/simulation/living-world/town-employment.generated";
import * as townBankShapes from "../src/simulation/living-world/town-bank-shapes.generated";
import * as townDeposits from "../src/simulation/living-world/town-deposits.generated";
import * as localBusinessCounts from "../src/simulation/local-business-counts.generated";
import * as countyHomeValue from "../src/simulation/county-home-value.generated";
import * as placePopulation from "../src/simulation/nationwide-world/place-population.generated";
import {
  loadTownPay,
  loadTownRent,
  loadTownEmployment,
  loadTownBankShapes,
  loadTownDeposits,
  loadLocalBusinessCounts,
  loadCountyHomeValue,
  loadPlacePopulation,
} from "../data/tables";

const tables = [
  { name: "town-pay", source: townPay, load: loadTownPay },
  { name: "town-rent", source: townRent, load: loadTownRent },
  { name: "town-employment", source: townEmployment, load: loadTownEmployment },
  {
    name: "town-bank-shapes",
    source: townBankShapes,
    load: loadTownBankShapes,
  },
  { name: "town-deposits", source: townDeposits, load: loadTownDeposits },
  {
    name: "local-business-counts",
    source: localBusinessCounts,
    load: loadLocalBusinessCounts,
  },
  {
    name: "county-home-value",
    source: countyHomeValue,
    load: loadCountyHomeValue,
  },
  {
    name: "place-population",
    source: placePopulation,
    load: loadPlacePopulation,
  },
] as const;

describe("generated table JSON snapshots", () => {
  it.each(tables)(
    "$name preserves every TypeScript export exactly",
    async ({ name, source, load }) => {
      const json = JSON.parse(
        readFileSync(
          new URL(`../data/tables/${name}.json`, import.meta.url),
          "utf8",
        ),
      );
      expect(json).toStrictEqual({ ...source });
      expect(await load()).toStrictEqual(json);
    },
  );
});
