import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderRegionalMeasures } from "../../../scripts/source/export-regional-measures";
import { placeRegionalFacts } from "../../presentation/place-regional-facts";
import { searchLifePlaces } from "../index";
import {
  measuredPressures,
  regionalIssueRecordProblems,
  regionalIssuesFor,
  REGIONAL_ISSUE_JURISDICTIONS,
  type JurisdictionRegionalIssues,
} from "./regional-issues";
import {
  regionalHousingCost,
  regionalMeasureJurisdictions,
  regionalMeasuresOn,
} from "./regional-measures";

describe("regional measures", () => {
  it("regenerate byte-identically from the locked BEA, HUD and LAUS corpora", () => {
    const committed = readFileSync(
      resolve(import.meta.dirname, "regional-measures.generated.json"),
      "utf8",
    );
    expect(renderRegionalMeasures()).toBe(committed);
  });

  it("cover every one of the fifty-six places the game can start in", () => {
    expect([...regionalMeasureJurisdictions()].sort()).toEqual(
      [...REGIONAL_ISSUE_JURISDICTIONS].sort(),
    );
  });

  it("never answer with a period that had not ended on the date asked", () => {
    const early = regionalMeasuresOn("US-RI", "2026-01-05")!;
    expect(early.unemploymentRate?.period).toBe("2025-12");
    expect(early.housingPriceIndex?.period).toBe("2024");
    expect(early.twoBedroomFairMarketRent?.period).toBe("FY2025");
    const before = regionalMeasuresOn("US-RI", "2019-06-01")!;
    expect(before.housingPriceIndex).toBeNull();
    expect(before.unemploymentRate).toBeNull();
  });

  it("leave a series a place does not have unknown, not zero", () => {
    const guam = regionalMeasuresOn("US-GU", "2026-01-05")!;
    expect(guam.housingPriceIndex).toBeNull();
    expect(guam.unemploymentRate).toBeNull();
    expect(guam.twoBedroomFairMarketRent?.value).toBeGreaterThan(0);
    expect(regionalMeasuresOn("US-ZZ", "2026-01-05")).toBeNull();
  });

  it("give migration a housing cost against the nation", () => {
    const california = regionalHousingCost("US-CA", "2026-01-05")!;
    const mississippi = regionalHousingCost("US-MS", "2026-01-05")!;
    expect(california.housingPriceRelativeToNation).toBeGreaterThan(1);
    expect(mississippi.housingPriceRelativeToNation).toBeLessThan(1);
    expect(california.rentShareOfMedianFamilyIncome).toBeGreaterThan(
      mississippi.rentShareOfMedianFamilyIncome!,
    );
    expect(california.nationalRentShareOfMedianFamilyIncome).toBe(
      mississippi.nationalRentShareOfMedianFamilyIncome,
    );
  });
});

describe("regional issues", () => {
  it("await research everywhere instead of guessing from the figures", () => {
    expect(regionalIssueRecordProblems()).toEqual([]);
    for (const key of REGIONAL_ISSUE_JURISDICTIONS)
      expect(regionalIssuesFor(key)).toEqual({
        jurisdictionKey: key,
        basis: "awaiting-research",
        issues: null,
      });
  });

  it("refuse a researched issue that is not in the catalog or cites nothing", () => {
    const records: Record<string, JurisdictionRegionalIssues> =
      Object.fromEntries(
        REGIONAL_ISSUE_JURISDICTIONS.map((key) => [
          key,
          { jurisdictionKey: key, basis: "awaiting-research", issues: null },
        ]),
      );
    records["US-RI"] = {
      jurisdictionKey: "US-RI",
      basis: "researched",
      issues: [
        {
          issueKey: "housing-land-use.housing-affordability",
          prominence: "leading",
          concentratedIn: [],
          evidence: "test",
          sourceRefs: [],
        },
        {
          issueKey: "housing.made-up",
          prominence: "major",
          concentratedIn: [],
          evidence: "test",
          sourceRefs: ["test"],
        },
      ],
    };
    expect(regionalIssueRecordProblems(records)).toEqual([
      "US-RI: housing-land-use.housing-affordability cites no source.",
      "US-RI: housing.made-up is not a catalog issue.",
    ]);
  });

  it("lay each published figure beside the catalog issue it measures", () => {
    const pressures = measuredPressures("US-RI", "2026-01-05");
    const housing = pressures.filter(
      (pressure) =>
        pressure.issueKey === "housing-land-use.housing-affordability",
    );
    expect(housing.map((pressure) => pressure.measure).sort()).toEqual([
      "housingPriceIndex",
      "medianFamilyIncome",
      "twoBedroomFairMarketRent",
    ]);
    const jobless = pressures.find(
      (pressure) => pressure.measure === "unemploymentRate",
    );
    expect(jobless?.relativeToNation).toBeNull();
  });
});

describe("a hometown's regional figures", () => {
  it("tell the player what housing costs and pays in Rhode Island", () => {
    const providence = searchLifePlaces("Providence", 8, {
      stateJurisdictionKey: "US-RI",
      scope: "locality",
    }).find((place) => /^Providence,/i.test(place.displayName))!;
    const facts = placeRegionalFacts(providence);
    expect(facts.map((fact) => fact.key)).toEqual([
      "housing-price",
      "rent",
      "family-income",
      "unemployment",
    ]);
    const text = facts.map((fact) => fact.text).join("\n");
    expect(text).toMatch(/Housing in Rhode Island costs about \d+% more/);
    expect(text).toMatch(
      /two-bedroom apartment in Rhode Island rents for about \$1,\d{3} a month/,
    );
    expect(text).toMatch(
      /Unemployment in Rhode Island was [\d.]+% in December 2025\./,
    );
    expect(text).not.toMatch(/HUD|BEA|LAUS|Bureau|parity/);
  });

  it("leave out what a territory's sources do not publish", () => {
    const [sanJuan] = searchLifePlaces("San Juan", 1, {
      stateJurisdictionKey: "US-PR",
    });
    expect(sanJuan).toBeDefined();
    const keys = placeRegionalFacts(sanJuan!).map((fact) => fact.key);
    expect(keys).toEqual(["rent", "family-income", "unemployment"]);
  });
});
