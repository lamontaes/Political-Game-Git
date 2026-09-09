import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEconomicContextBrowserProvider } from "./economic-context-browser";
import { legislativeEstimateComparisonGraph } from "./economic-graphs";
import {
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
    expect(html).toContain("No GDP effect is represented");
    expect(html).toContain("SHA-256");
    expect(html).not.toContain("simulated future GDP");
  });
});
