import { describe, expect, it } from "vitest";

import {
  createExactQuantity,
  createLegislativeScenario,
  makeQuantityUnitKey,
  recordPolicyBaseline,
  serializeWorld,
} from "../simulation";
import { createWorldMetricCatalog, createWorldMetricDefinition } from "../simulation/world-metrics";
import type { EntityId, World } from "../simulation";
import { fileDraft } from "./legislation-docket";
import type { DocketBill } from "./legislation-docket";
import { billAnalysis, billEstimateAvailability } from "./legislation-analysis";

/**
 * Four things a bill's numbers can be, and the game keeping them apart.
 *
 * What the text commits is arithmetic and is always available. What a
 * programme would achieve is a forecast, and in a world that has never
 * measured the thing the programme is about, the honest output is the name of
 * the missing series rather than a number. These tests hold that line from
 * both directions: the unavailable case says exactly what is absent, and the
 * available case only appears once a baseline genuinely exists.
 */

function kentuckyDocket(
  familyKey: string,
  variantKey: string,
  parameterValues?: Parameters<typeof fileDraft>[1]["parameterValues"],
): { readonly world: World; readonly bill: DocketBill; readonly jurisdictionId: EntityId } {
  const scenario = createLegislativeScenario("kentucky");
  const jurisdictionId = (scenario.world.history.legislativeMeasures ?? [])[0]!
    .jurisdictionId;
  const filed = fileDraft(scenario.world, {
    scenarioKey: "kentucky",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    familyKey,
    variantKey,
    parameterValues,
  });
  return { world: filed.world, bill: filed.bill, jurisdictionId };
}

describe("what the bill commits is read from the bill", () => {
  it("adds up the ceilings the sections state", () => {
    const { world, bill } = kentuckyDocket(
      "transit-access",
      "enrollment-fare-relief",
    );
    const analysis = billAnalysis(world, bill);
    expect(analysis.fiscal.statedCeilingMinorUnits).toBe(800_000_000);
    expect(analysis.fiscal.statedCeilingLabel).toBe("$8,000,000");
    expect(analysis.fiscal.basis).toContain("not a forecast");
  });

  it("is degree-sensitive to the amount the player chose", () => {
    const lean = kentuckyDocket("bridge-maintenance", "worst-first-condition", {
      "repair-authorization": {
        kind: "money",
        minorUnits: 700_000_000,
        currency: "USD",
      },
    });
    const rich = kentuckyDocket("bridge-maintenance", "worst-first-condition", {
      "repair-authorization": {
        kind: "money",
        minorUnits: 5_600_000_000,
        currency: "USD",
      },
    });
    expect(
      billAnalysis(lean.world, lean.bill).fiscal.statedCeilingMinorUnits,
    ).toBe(700_000_000);
    expect(
      billAnalysis(rich.world, rich.bill).fiscal.statedCeilingMinorUnits,
    ).toBe(5_600_000_000);
  });

  it("says a mandate states no amount rather than reporting zero", () => {
    const { world, bill } = kentuckyDocket(
      "water-service-lines",
      "inventory-and-plan",
    );
    const analysis = billAnalysis(world, bill);
    expect(analysis.fiscal.statedCeilingMinorUnits).toBeNull();
    expect(analysis.fiscal.statedCeilingLabel).toBe("This Act states no amount.");
    expect(analysis.fiscal.statedCeilingLabel).not.toContain("$0");
    // The sections are still listed; a bill without money still has text.
    expect(analysis.fiscal.sections.length).toBeGreaterThanOrEqual(4);
  });

  it("reports what the configuration says it does not do", () => {
    const { world, bill } = kentuckyDocket(
      "broadband-access",
      "adoption-support",
    );
    expect(billAnalysis(world, bill).declaredLimits).toContain(
      "It builds nothing. A household in an area with no service at all gets nothing from this Act.",
    );
  });
});

describe("a forecast is refused when nobody has measured anything", () => {
  it("names the exact series that is missing", () => {
    const { world, bill } = kentuckyDocket(
      "broadband-access",
      "unserved-buildout",
    );
    const estimate = billEstimateAvailability(world, bill);
    expect(estimate.kind).toBe("unavailable");
    if (estimate.kind !== "unavailable") return;
    expect(estimate.missing).toBe("metric-definition");
    expect(estimate.metricStableKey).toBe("broadband.served-household-share");
    expect(estimate.reason).toContain("no baseline");
    // What it would have measured is still said, so the gap is legible.
    expect(estimate.statement).toContain("households");
  });

  it("does not fabricate an analyst, a budget or an impact", () => {
    const { world, bill } = kentuckyDocket(
      "water-service-lines",
      "funded-replacement",
    );
    const analysis = billAnalysis(world, bill);
    expect(analysis.estimate.kind).toBe("unavailable");
    // The stated ceiling is still available, because a cap is arithmetic and
    // can be reported without claiming to know an effect.
    expect(analysis.fiscal.statedCeilingMinorUnits).toBe(2_900_000_000);
  });

  it("writes nothing when asked for an analysis", () => {
    const { world, bill } = kentuckyDocket(
      "transit-access",
      "unserved-county-formula",
    );
    const before = serializeWorld(world);
    billAnalysis(world, bill);
    billEstimateAvailability(world, bill);
    expect(serializeWorld(world)).toEqual(before);
  });
});

describe("a forecast becomes available once a baseline genuinely exists", () => {
  /**
   * Gives the world a definition of the series the family is about, then
   * records a baseline for it through the accepted policy-semantics writer.
   * Both are things a sourced world would arrive with; doing them explicitly
   * here is what makes the available branch reachable at all.
   */
  function withMeasuredBroadband(): {
    readonly world: World;
    readonly bill: DocketBill;
  } {
    const staged = kentuckyDocket("broadband-access", "unserved-buildout");
    const definition = createWorldMetricDefinition({
      stableKey: "broadband.served-household-share",
      name: "Households with service available",
      description:
        "Share of households in the jurisdiction an operating provider reaches.",
      domainKey: "population.demography",
      valueKind: "quantity",
      quantityUnit: makeQuantityUnitKey("count:households"),
      measureNature: "stock",
      referencePeriodKind: "point",
      denominatorMetricId: null,
      aggregationKind: "sum-compatible",
      aggregationNote: "Counts of households may be added across places.",
      stateSemantics: "primitive",
      tags: ["broadband.access"],
    });
    const catalog = createWorldMetricCatalog({
      definitions: [
        ...staged.world.metricCatalog.definitionOrder.map(
          (id) => staged.world.metricCatalog.definitions[id]!,
        ),
        definition,
      ],
    });
    let world: World = { ...staged.world, metricCatalog: catalog };
    world = recordPolicyBaseline(world, {
      stableKey: "test:broadband-baseline",
      seriesKey: "broadband:served-household-share",
      metricId: definition.id,
      scope: { jurisdictionId: staged.bill.jurisdictionId, segmentKey: null },
      referencePeriod: { kind: "point", at: world.currentDate },
      expectedValue: {
        kind: "quantity",
        quantity: createExactQuantity(620_000, 1, "count:households"),
      },
      generatedAt: world.currentDate,
      recordedAt: world.currentDate,
      sourceEntityIds: [staged.bill.jurisdictionId],
      methodologyKey: "methodology:authored-test-baseline",
      assumptionKeys: ["assumption:authored-test"],
      uncertainty: { kind: "none" },
      provenance: {
        kind: "authored",
        note: "A test baseline, recorded so the available branch is reachable.",
      },
      supersedesBaselineId: null,
    });
    return { world, bill: staged.bill };
  }

  it("reports the baseline it would estimate from", () => {
    const measured = withMeasuredBroadband();
    const estimate = billEstimateAvailability(measured.world, measured.bill);
    expect(estimate.kind).toBe("available");
    if (estimate.kind !== "available") return;
    expect(estimate.metricStableKey).toBe("broadband.served-household-share");
    expect(estimate.baselineId).toBeDefined();
  });
});
