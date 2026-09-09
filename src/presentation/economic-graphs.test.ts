import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createEconomicContextBrowserProvider,
  type BrowserEconomicGeographyBinding,
} from "./economic-context-browser";
import {
  economicObservationGraphs,
  fiscalRecordGraph,
  legislativeEstimateComparisonGraph,
} from "./economic-graphs";

const ROOT = resolve(import.meta.dirname, "../..");
const BINDING: BrowserEconomicGeographyBinding = {
  bindingKey: "economic-context.lexington-ky.v2",
  placeKey: "lexington-fayette",
  placeLabel: "Lexington, Kentucky",
  beaAreas: [
    {
      geographyLevel: "county",
      geoFips: "21067",
      relationship: "same-jurisdiction",
    },
    {
      geographyLevel: "msa",
      geoFips: "30460",
      relationship: "containing-metro",
    },
  ],
  lausAreaCodes: [
    { areaCode: "ST2100000000000", relationship: "containing-state" },
  ],
  hudFipsCodes: [
    { hudFipsCode: "2106799999", relationship: "same-jurisdiction" },
  ],
};

async function context() {
  const provider = createEconomicContextBrowserProvider({
    fetchJson: async (url) =>
      JSON.parse(
        readFileSync(resolve(ROOT, "public", url.replace(/^\//, "")), "utf8"),
      ) as unknown,
  });
  return provider.query(BINDING, "2026-09-09");
}

describe("economic and fiscal graph read models", () => {
  it("graphs supported observations and preserves a missing LAUS period as a gap", async () => {
    const collection = economicObservationGraphs(await context());
    const income = collection.graphs.find(
      (graph) => graph.graphKey === "per-capita-income",
    );
    expect(income).toMatchObject({
      unit: "Dollars",
      geography: { providerCode: "21067", level: "county" },
      series: [
        {
          recordClass: "historical-observation",
          points: [{ period: "2019" }, { period: "2023" }, { period: "2024" }],
        },
      ],
    });

    const unemployment = collection.graphs.find(
      (graph) => graph.graphKey === "unemployment-rate",
    );
    expect(
      unemployment?.series[0]?.points.find(
        (point) => point.period === "2025-M10",
      ),
    ).toMatchObject({
      value: null,
      missingReason: expect.stringMatching(/appropriations/i),
      recordClass: "historical-observation",
    });
    expect(collection.unavailable).toContainEqual({
      graphKind: "gdp",
      reason: expect.stringMatching(/none is a GDP series/i),
    });
  });

  it("adapts the frozen LEG estimate as a conditional forecast comparison", () => {
    const graph = legislativeEstimateComparisonGraph({
      estimateId: "estimate:measure-1",
      measureId: "measure-1",
      provisionIds: ["provision-1"],
      addedOutlaysMinorUnits: 12_500_000,
      currency: "USD",
      qualification:
        "Conditional on full funding, administration, and spending.",
      referencePeriod: {
        kind: "interval",
        startsAt: "2027-01-01",
        endsAt: "2027-12-31",
      },
    });
    expect(graph.series.map((series) => series.recordClass)).toEqual([
      "forecast",
      "forecast",
    ]);
    expect(graph.series.map((series) => series.points[0]?.value)).toEqual([
      0, 12_500_000,
    ]);
    expect(graph.boundaries.join(" ")).toMatch(
      /not a zero budget.*not an appropriation.*No GDP effect/is,
    );
  });

  it("keeps supplied fiscal lifecycle classes and missing values distinct", () => {
    const graph = fiscalRecordGraph("budget", "Budget history", [
      {
        recordKey: "draft:2027",
        seriesKey: "budget:proposal",
        seriesLabel: "Proposed spending",
        period: "FY2027",
        value: 300,
        missingReason: null,
        unit: "USD minor units",
        geographyKey: "jurisdiction:example",
        geographyLabel: "Example jurisdiction",
        recordClass: "draft",
      },
      {
        recordKey: "outturn:2026",
        seriesKey: "budget:outturn",
        seriesLabel: "Actual spending",
        period: "FY2026",
        value: null,
        missingReason: "No outturn record supplied.",
        unit: "USD minor units",
        geographyKey: "jurisdiction:example",
        geographyLabel: "Example jurisdiction",
        recordClass: "outturn",
      },
    ]);
    expect(graph?.series.map((series) => series.recordClass)).toEqual([
      "draft",
      "outturn",
    ]);
    expect(graph?.series[1]?.points[0]).toMatchObject({
      value: null,
      missingReason: "No outturn record supplied.",
    });
  });

  it("refuses mixed units or geographies instead of coercing them", () => {
    expect(() =>
      fiscalRecordGraph("bad", "Bad", [
        {
          recordKey: "a",
          seriesKey: "a",
          seriesLabel: "A",
          period: "2026",
          value: 1,
          missingReason: null,
          unit: "USD minor units",
          geographyKey: "one",
          geographyLabel: "One",
          recordClass: "simulated-history",
        },
        {
          recordKey: "b",
          seriesKey: "b",
          seriesLabel: "B",
          period: "2026",
          value: 1,
          missingReason: null,
          unit: "Percent",
          geographyKey: "two",
          geographyLabel: "Two",
          recordClass: "forecast",
        },
      ]),
    ).toThrow(/one exact unit and geography/i);
  });
});
