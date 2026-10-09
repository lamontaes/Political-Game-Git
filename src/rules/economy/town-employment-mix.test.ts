import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { createStableId } from "../../simulation/ids";
import {
  COUNTY_SECTOR_EMPLOYMENT,
  STATE_PUBLIC_EMPLOYMENT,
  TOWN_EMPLOYMENT_META,
} from "../../simulation/living-world/town-employment.generated";
import { townEmploymentMix } from "../../simulation/living-world/town-employment";
import { townEmploymentMixFromFacts } from "./town-employment-mix";

const places = lifePlaceStateIdentities();
const placeCases = places.map((place, index) => ({ place, index }));
const sectorKeys = ["goods", "services"];
const localGroupKeys = ["schools", "health"];

function records(raw: string) {
  return new Map(
    raw.split(";").map((row) => {
      const colon = row.indexOf(":");
      return [
        row.slice(0, colon),
        row
          .slice(colon + 1)
          .split(",")
          .map((value) => (value === "" ? null : Number(value))),
      ] as const;
    }),
  );
}

describe("town employment mix selection", () => {
  it.each(placeCases)(
    "uses the shared state fallback path for $place.jurisdictionKey",
    ({ index }) => {
      const fips = `state-${index}`;
      const county = `${fips}-001`;
      const mix = townEmploymentMixFromFacts({
        countyGeoids: [`missing-${index}`],
        stateFips: fips,
        countyCellsByGeoid: new Map([[county, [index + 1, 2]]]),
        statePublicRowsByFips: new Map([
          [fips, [1000, 100, 200, 300, 50, 50]],
          [`complete-${index}`, [100, 10, 20, 30, 5, 5]],
        ]),
        sectorKeys,
        localGroupKeys,
      });

      expect(mix.basis).toBe("state");
      expect(mix.sectors).toEqual(
        new Map([
          ["goods", index + 1],
          ["services", 2],
        ]),
      );
      const scale = (index + 3) / 400;
      expect(mix.federal).toBeCloseTo(100 * scale);
      expect(mix.state).toBeCloseTo(200 * scale);
      expect(mix.local.get("schools")).toBeCloseTo(150 * scale);
      expect(mix.local.get("health")).toBeCloseTo(150 * scale);
    },
  );

  it.each(placeCases)(
    "matches the legacy national fallback for $place.jurisdictionKey",
    ({ index }) => {
      const oldResult = townEmploymentMix(
        createStableId("town", `P14-economy-national-fallback-${index}`),
      );
      const liftedResult = townEmploymentMixFromFacts({
        countyGeoids: [],
        stateFips: null,
        countyCellsByGeoid: records(COUNTY_SECTOR_EMPLOYMENT),
        statePublicRowsByFips: records(STATE_PUBLIC_EMPLOYMENT),
        sectorKeys: TOWN_EMPLOYMENT_META.sectors,
        localGroupKeys: TOWN_EMPLOYMENT_META.localGroups,
      });

      expect(liftedResult).toEqual(oldResult);
    },
  );

  it("averages only available town counties and preserves withheld cells", () => {
    const mix = townEmploymentMixFromFacts({
      countyGeoids: ["county-a", "missing", "county-b"],
      stateFips: "01",
      countyCellsByGeoid: new Map([
        ["county-a", [100, null]],
        ["county-b", [300, 60]],
      ]),
      statePublicRowsByFips: new Map([
        ["01", [1000, 100, 200, 300, 50, 50]],
        ["02", [100, 10, 20, 30, 5, 5]],
      ]),
      sectorKeys,
      localGroupKeys,
    });
    expect(mix.basis).toBe("county");
    expect(mix.sectors).toEqual(
      new Map([
        ["goods", 200],
        ["services", 30],
      ]),
    );
    expect(mix.federal).toBeCloseTo(57.5);
    expect(mix.state).toBeCloseTo(115);
    expect(mix.local).toEqual(
      new Map([
        ["schools", 86.25],
        ["health", 86.25],
      ]),
    );
  });

  it("uses the national public fallback and treats a missing local government as a state city", () => {
    const mix = townEmploymentMixFromFacts({
      countyGeoids: [],
      stateFips: "dc",
      countyCellsByGeoid: new Map([["county", [100, 50]]]),
      statePublicRowsByFips: new Map([
        ["dc", [500, 100, 200, null, 25, 75]],
        ["complete", [500, 100, 200, 200, 50, 50]],
      ]),
      sectorKeys,
      localGroupKeys,
    });

    expect(mix.basis).toBe("national");
    expect(mix.sectors).toEqual(
      new Map([
        ["goods", 100],
        ["services", 50],
      ]),
    );
    expect(mix.federal).toBe(75);
    expect(mix.state).toBe(0);
    expect(mix.local.get("schools")).toBe(75);
    expect(mix.local.get("health")).toBe(75);
  });
});
