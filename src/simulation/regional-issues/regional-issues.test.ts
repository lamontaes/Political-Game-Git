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
import type { IsoDate } from "../types";
import {
  regionalHousingCost,
  regionalMeasureJurisdictions,
  regionalMeasuresOn,
} from "./regional-measures";

const d = (date: string) => date as IsoDate;

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

  it("show nothing before the locked edition was public", () => {
    // BEA's SARPP edition carrying 2024 was released February 19, 2026.
    expect(
      regionalMeasuresOn("US-RI", d("2026-02-18"))!.housingPriceIndex,
    ).toBeNull();
    const released = regionalMeasuresOn("US-RI", d("2026-02-19"))!;
    expect(released.housingPriceIndex?.period).toBe("2024");
    expect(released.housingPriceIndex?.knownAvailableOnBasis).toBe(
      "publisher-release-date",
    );
    // HUD's FY2025 Fair Market Rents were released August 14, 2024.
    expect(
      regionalMeasuresOn("US-RI", d("2024-08-13"))!.twoBedroomFairMarketRent,
    ).toBeNull();
    expect(
      regionalMeasuresOn("US-RI", d("2024-08-14"))!.twoBedroomFairMarketRent
        ?.period,
    ).toBe("FY2025");
    // LAUS and HUD income limits carry no release date, so they wait for the
    // date they were retrieved.
    const beforeRetrieval = regionalMeasuresOn("US-RI", d("2026-09-02"))!;
    expect(beforeRetrieval.unemploymentRate).toBeNull();
    expect(beforeRetrieval.medianFamilyIncome).toBeNull();
    const retrieved = regionalMeasuresOn("US-RI", d("2026-09-03"))!;
    expect(retrieved.unemploymentRate?.period).toBe("2026-07");
    expect(retrieved.unemploymentRate?.knownAvailableOnBasis).toBe(
      "retrieval-date-fallback",
    );
    expect(retrieved.medianFamilyIncome?.period).toBe("FY2025");
  });

  it("leave a series a place does not have unknown, not zero", () => {
    const guam = regionalMeasuresOn("US-GU", d("2026-09-03"))!;
    expect(guam.housingPriceIndex).toBeNull();
    expect(guam.unemploymentRate).toBeNull();
    expect(guam.twoBedroomFairMarketRent?.value).toBeGreaterThan(0);
    expect(regionalMeasuresOn("US-ZZ", d("2026-01-05"))).toBeNull();
  });

  it("give migration a housing cost against the nation", () => {
    const early = regionalHousingCost("US-CA", d("2026-01-05"))!;
    expect(early.housingPriceRelativeToNation).toBeNull();
    expect(early.rentShareOfMedianFamilyIncome).toBeNull();
    const california = regionalHousingCost("US-CA", d("2026-09-03"))!;
    const mississippi = regionalHousingCost("US-MS", d("2026-09-03"))!;
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
    const pressures = measuredPressures("US-RI", d("2026-09-03"));
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
  const providence = () =>
    searchLifePlaces("Providence", 8, {
      stateJurisdictionKey: "US-RI",
      scope: "locality",
    }).find((place) => /^Providence,/i.test(place.displayName))!;

  it("show only what was public when the life begins", () => {
    const place = providence();
    expect(place.context.initialMoment.date).toBe("2026-01-05");
    const facts = placeRegionalFacts(place);
    expect(facts.map((fact) => fact.key)).toEqual(["rent"]);
    expect(facts[0]!.text).toBe(
      "The federal fair market rent for a two-bedroom unit, averaged across Rhode Island, is $1,645 a month for fiscal year 2025 ($1,675 nationally). It is a benchmark, not an apartment's asking rent.",
    );
  });

  it("label every figure as a benchmark or statistic with its area and year", () => {
    const place = providence();
    const later = {
      ...place,
      context: {
        ...place.context,
        initialMoment: {
          ...place.context.initialMoment,
          date: d("2026-09-03"),
        },
      },
    } as typeof place;
    const text = placeRegionalFacts(later)
      .map((fact) => fact.text)
      .join("\n");
    expect(text).toMatch(
      /In 2024, housing prices across Rhode Island ran about \d+% above the national level\./,
    );
    expect(text).toMatch(
      /Area median family income, averaged across Rhode Island, is \$115,961 for fiscal year 2025/,
    );
    expect(text).toMatch(
      /Rhode Island's seasonally adjusted unemployment rate was [\d.]+% in July 2026\./,
    );
    expect(text).not.toMatch(/rents for|earns|HUD|BEA|LAUS|Bureau|parity/);
  });

  it("leave out what a territory's sources do not publish", () => {
    const [sanJuan] = searchLifePlaces("San Juan", 1, {
      stateJurisdictionKey: "US-PR",
    });
    expect(sanJuan).toBeDefined();
    const later = {
      ...sanJuan!,
      context: {
        ...sanJuan!.context,
        initialMoment: {
          ...sanJuan!.context.initialMoment,
          date: d("2026-09-03"),
        },
      },
    } as typeof sanJuan;
    const keys = placeRegionalFacts(later!).map((fact) => fact.key);
    expect(keys).toEqual(["rent", "family-income", "unemployment"]);
  });
});
