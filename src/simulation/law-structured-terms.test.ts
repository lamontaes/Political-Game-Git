import { describe, expect, it } from "vitest";
import {
  assertLawCategories,
  assertLawSchedules,
  type LawScheduleTerm,
} from "./law-structured-terms";
import { LAW_AMOUNT_UNITS } from "./law-consequence-types";
import type { World } from "./types";

// Controlled schema inputs, not researched law rows or legal estimates.
const world = {
  policyCatalog: {
    propositionOrder: ["question"],
    propositions: {
      question: {
        stableKey: "fixture:question",
        parameters: [
          { key: "coverage", allowedValues: ["included", "excluded"] },
          { key: "brackets" },
          { key: "deposit" },
        ],
      },
    },
  },
} as unknown as World;
const tax: LawScheduleTerm = {
  questionKey: "fixture:question",
  key: "brackets",
  kind: "income-tax",
  schedule: {
    standardDeductionMinor: 0,
    sourceUrl: "https://example.test/schema-fixture",
    brackets: [
      { overMinor: 0, rateBasisPoints: 0 },
      { overMinor: 100, rateBasisPoints: 100 },
    ],
  },
};
const tiers: LawScheduleTerm = {
  questionKey: "fixture:question",
  key: "deposit",
  kind: "tiers",
  tiers: [
    {
      threshold: 0,
      unit: "fluid-ounces",
      amount: { value: 1, unit: "minor/container" },
    },
    {
      threshold: 2,
      unit: "fluid-ounces",
      amount: { value: 2, unit: "minor/container" },
    },
  ],
};

describe("shared structured law text", () => {
  it("retains the closed-category contract", () => {
    expect(() =>
      assertLawCategories(world, [
        {
          questionKey: "fixture:question",
          key: "coverage",
          values: ["included"],
        },
      ]),
    ).not.toThrow();
    for (const values of [["invented"], ["included", "included"]])
      expect(() =>
        assertLawCategories(world, [
          { questionKey: "fixture:question", key: "coverage", values },
        ]),
      ).toThrow();
    expect(() =>
      assertLawCategories(world, [
        { questionKey: "fixture:question", key: "brackets", values: [] },
      ]),
    ).toThrow(/allowed values/);
  });
  it("admits the existing tax schedule and explicit quantity tiers without reducing either to a scalar", () => {
    expect(() => assertLawSchedules(world, [tax, tiers])).not.toThrow();
    expect(LAW_AMOUNT_UNITS).toContain("minor/container");
    expect(LAW_AMOUNT_UNITS).toContain("minor/tonne-co2-equivalent");
    expect(tiers.kind === "tiers" && tiers.tiers[1]!.amount.unit).toBe(
      "minor/container",
    );
  });
  it("rejects repeated schedule keys and missing catalog parameters", () => {
    expect(() => assertLawSchedules(world, [tax, tax])).toThrow(/repeat/);
    expect(() =>
      assertLawSchedules(world, [{ ...tax, key: "unknown" }]),
    ).toThrow(/catalog/);
  });
  it("rejects tax tables with missing zero coverage, unordered thresholds or malformed rates", () => {
    if (tax.kind !== "income-tax") throw new Error("Fixture kind");
    for (const brackets of [
      [],
      [{ overMinor: 100, rateBasisPoints: 1 }],
      [
        { overMinor: 0, rateBasisPoints: 1 },
        { overMinor: 0, rateBasisPoints: 2 },
      ],
      [{ overMinor: 0, rateBasisPoints: NaN }],
      [{ overMinor: 0, rateBasisPoints: 0.5 }],
    ])
      expect(() =>
        assertLawSchedules(world, [
          { ...tax, schedule: { ...tax.schedule, brackets } },
        ]),
      ).toThrow();
  });
  it("rejects unordered tiers, incompatible quantities, payment units and fractional minor amounts", () => {
    if (tiers.kind !== "tiers") throw new Error("Fixture kind");
    const first = tiers.tiers[0]!;
    for (const changed of [
      { ...first, threshold: NaN },
      { ...first, threshold: 2, unit: "litres" as const },
      {
        ...first,
        threshold: 2,
        amount: { value: 1, unit: "minor/tonne-co2-equivalent" as const },
      },
      {
        ...first,
        threshold: 2,
        amount: { value: 0.5, unit: "minor/container" as const },
      },
      { ...first, threshold: -1 },
    ])
      expect(() =>
        assertLawSchedules(world, [{ ...tiers, tiers: [first, changed] }]),
      ).toThrow();
  });
});
