import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import * as townBankShapes from "../src/simulation/living-world/town-bank-shapes.generated";
import * as townDeposits from "../src/simulation/living-world/town-deposits.generated";
import * as localBusinessCounts from "../src/simulation/local-business-counts.generated";
import * as placePopulation from "../src/simulation/nationwide-world/place-population.generated";
import {
  loadTownBankShapes,
  loadTownDeposits,
  loadLocalBusinessCounts,
  loadPlacePopulation,
} from "../data/tables";

const tables = [
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
