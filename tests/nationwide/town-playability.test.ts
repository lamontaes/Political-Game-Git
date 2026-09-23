import { describe, expect, it } from "vitest";
import {
  lifePlaces,
  lifePlaceCoverage,
} from "../../src/simulation/life-places";
import {
  municipalGovernments,
  municipalGovernmentsWithProcedure,
} from "../../src/simulation/municipal-government";
import { MUNICIPAL_RULE_PACK_JURISDICTIONS } from "../../src/simulation/municipal-election-rule-packs";
import { LEGISLATIVE_RULE_PACKS } from "../../src/simulation/legislature-rule-packs";
import { NATIONAL_PLACES_ROWS } from "../../src/simulation/national-places.generated";
import {
  allGovernmentUnits,
  governmentUnitsForPlace,
} from "../../src/simulation/government-units";

/**
 * What a town needs before it plays, and how much of the country has it.
 *
 * This is the measurement behind `docs/findings/2026-09-22-what-a-town-needs-to-play.md`.
 * It is an assertion, not a report: each number below is the number that
 * document quotes, so the document cannot drift away from the tree while
 * claiming to describe it. When a number here changes, the finding is what
 * needs rewriting — that is the point of pinning them.
 *
 * Every expectation is exact. A range would let a regression that halves
 * municipal coverage pass as "still roughly right", which is the failure mode
 * this file exists to catch.
 */
describe("what a town needs before it plays", () => {
  it("offers a life anywhere and a legislature almost nowhere", () => {
    const coverage = lifePlaceCoverage();
    expect(coverage.supportsArbitrarySelection).toBe(true);
    // 10 authored + 32,350 places + 3,222 counties + 44 placeholder towns on
    // Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana
    // Islands, which the Census Gazetteer does not cover.
    expect(coverage.placeCount).toBe(35626);
    expect(coverage.provenance?.recordCount).toBe(32350);
    expect(coverage.countyProvenance?.recordCount).toBe(3222);

    // Nine authored states carry a legislative key; the one authored locality
    // does not, and neither does any corpus row (`life-places.ts:642`).
    const authored = lifePlaces();
    expect(authored).toHaveLength(10);
    const withKey = authored.filter(
      (place) => place.capabilities.legislativeScenarioKey !== null,
    );
    expect(withKey).toHaveLength(9);
    expect(withKey.every((place) => place.scope === "state")).toBe(true);
    expect(
      authored
        .filter((place) => place.scope === "locality")
        .every((place) => place.capabilities.legislativeScenarioKey === null),
    ).toBe(true);
    expect(Object.keys(LEGISLATIVE_RULE_PACKS)).toHaveLength(9);
  });

  it("knows who governs 19,480 places and how none but one of them votes", () => {
    const rows = JSON.parse(NATIONAL_PLACES_ROWS) as [string, string, string][];
    const governed = rows.filter(
      ([geoid]) => governmentUnitsForPlace(geoid).length > 0,
    );
    // Identity is a solved problem; procedure is not.
    expect(rows).toHaveLength(32350);
    expect(governed).toHaveLength(19480);
    expect(municipalGovernments()).toHaveLength(144);
    expect(municipalGovernmentsWithProcedure().map((unit) => unit.key)).toEqual(
      ["us-va-charlottesville"],
    );
  });

  it("leaves every township joined to no place at all", () => {
    const units = allGovernmentUnits();
    const townships = units.filter((unit) => unit.unitType === "township");
    expect(townships).toHaveLength(16184);
    // The acquired listing supplies `census_place_geoid` per row
    // (`src/source/domains/government-units/normalize.ts:154`) and leaves it
    // empty on every township, so `governmentUnitsForPlace` can never reach
    // one. This is why the town-meeting states read as ungoverned.
    expect(townships.filter((unit) => unit.placeGeoid !== null)).toHaveLength(
      0,
    );
  });

  it("carries a researched municipal-election corpus that play does not read", () => {
    // Fifty states and the District; Puerto Rico is not in the wave.
    expect(MUNICIPAL_RULE_PACK_JURISDICTIONS).toHaveLength(51);
    expect(MUNICIPAL_RULE_PACK_JURISDICTIONS).not.toContain("PR");
  });
});
