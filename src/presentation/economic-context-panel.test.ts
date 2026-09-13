import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEconomicContextBrowserProvider } from "./economic-context-browser";
import {
  legislativeEstimateComparisonGraph,
  fiscalRecordGraph,
} from "./economic-graphs";
import {
  EconomicGraph,
  EconomicContextView,
  LEXINGTON_ECONOMIC_BINDING,
} from "../player/EconomicContextPanel";

const ROOT = resolve(import.meta.dirname, "../..");

describe("EconomicContextView", () => {
  it("renders accessible exact-value fallbacks and distinct record classes", async () => {
    const provider = createEconomicContextBrowserProvider({
      fetchJson: async (url) =>
        JSON.parse(
          readFileSync(resolve(ROOT, "public", url.replace(/^\//, "")), "utf8"),
        ) as unknown,
    });
    const context = await provider.query(
      LEXINGTON_ECONOMIC_BINDING,
      "2026-09-09",
    );
    const estimate = legislativeEstimateComparisonGraph({
      estimateId: "estimate:ui-proof",
      measureId: "measure:ui-proof",
      provisionIds: ["provision:ui-proof"],
      addedOutlaysMinorUnits: 12_500_000,
      currency: "USD",
      qualification: "Conditional on full funding and administration.",
      referencePeriod: {
        kind: "interval",
        startsAt: "2027-01-01",
        endsAt: "2027-12-31",
      },
    });
    const html = renderToStaticMarkup(
      createElement(EconomicContextView, {
        context,
        fiscalGraphs: [estimate],
      }),
    );

    expect(html).toContain('data-testid="economic-context-panel"');
    expect(html).toContain('role="img"');
    expect(html).toContain("Exact values");
    expect(html).toContain("historical observation");
    expect(html).toContain("forecast");
    expect(html).toContain("PRELIMINARY");
    expect(html).toContain("Not established");
    expect(html).toContain("Missing — X: Data unavailable");
    expect(html).toContain("Fayette, KY · county · Dollars");
    expect(html).toContain("No GDP effect is represented");
    expect(html).not.toContain("fiscal-estimate");
    expect(html).toContain("SHA-256");
    expect(html).not.toContain("simulated future GDP");
  });
});

describe("EconomicGraph sparse and exact records", () => {
  function graphMarkup(values: readonly (number | null)[], unit: string) {
    const graph = fiscalRecordGraph(
      "budget-history:sparse-proof",
      "Sparse budget",
      values.map((value, index) => ({
        recordKey: `record:${index}`,
        seriesKey: "government.revenue",
        seriesLabel: "Revenue",
        period: `202${index}`,
        value,
        missingReason: value === null ? "Not supplied" : null,
        unit,
        geographyKey: "scope:proof",
        geographyLabel: "Proof scope",
        recordClass: "simulated-history" as const,
      })),
    )!;
    return renderToStaticMarkup(createElement(EconomicGraph, { graph }));
  }

  it("shows isolated observations without inventing a line through a missing period", () => {
    const html = graphMarkup([125, null, 126], "USD minor units");
    expect(html.match(/<circle /g)).toHaveLength(2);
    expect(html).not.toContain("<polyline");
    expect(html).toContain("Missing — Not supplied");
  });

  it("retains exact money units and fractional values in the table", () => {
    expect(graphMarkup([125], "USD minor units")).toContain(
      "125 USD minor units",
    );
    expect(graphMarkup([12.34567], "Percent")).toContain("12.34567 Percent");
    expect(graphMarkup([12.34567], "Dollars")).toContain("$12.34567");
    expect(graphMarkup([125], "EUR minor units")).toContain(
      "125 EUR minor units",
    );
    expect(graphMarkup([null], "USD minor units")).not.toContain("<circle");
  });
});
