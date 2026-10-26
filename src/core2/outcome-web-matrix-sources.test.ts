/**
 * The effect matrix names where each engine measure's value comes from, the
 * way the web reads it (`readEngine` in src/core2/modules/outcome-web.ts): a
 * named reader of the engine's own record, or the month rows of the engine
 * that keeps it, world-metrics' by default. It used to credit every engine
 * measure to world-metrics' months, which left a reader's measure with a
 * blank field ("world-metrics months.") and pointed crime and police evidence
 * at a table that does not hold them. The matrix is written by
 * scripts/outcome-web/effect-matrix.ts; this reads what it wrote.
 */
import { describe, expect, it } from "vitest";
import matrix from "../../docs/reports/effect-web-matrix-2026-10-20.json" with { type: "json" };
import { engineMeasure } from "./outcome-web-model";

interface Point {
  readonly status: string;
  readonly evidence: string;
  readonly why?: string;
}
const LINKS = matrix.links as unknown as readonly {
  key: string;
  from: string;
  to: string;
  causeKind: string;
  points: Readonly<Record<"cause" | "reaches", Point>>;
}[];
const MEASURES = matrix.measures as unknown as readonly {
  measure: string;
  status: string;
  evidence: string;
}[];

/** The source the web reads an engine measure from, in the matrix's words. */
function source(measure: string): string {
  const definition = engineMeasure(measure)!;
  return definition.reader
    ? `the ${definition.reader} reader`
    : `${definition.module ?? "world-metrics"} ${definition.table ?? "months"}.${definition.field}`;
}

const starts = (evidence: string, measure: string, label: string) =>
  expect(evidence.startsWith(source(measure)), `${label}: ${evidence}`).toBe(
    true,
  );
const causeOf = (key: string) =>
  LINKS.find((link) => link.key === key)!.points.cause.evidence;
const measureOf = (measure: string) =>
  MEASURES.find((row) => row.measure === measure)!.evidence;

describe("the effect matrix's engine sources", () => {
  it("name the readers and the engines' own tables", () => {
    expect(causeOf("property-tax-to-rent")).toMatch(
      /^the property-tax-rate reader /,
    );
    expect(measureOf("housing.property-tax-rate")).toMatch(
      /^the property-tax-rate reader /,
    );
    expect(causeOf("corporate-tax-incidence")).toMatch(
      /^the state-corporate-rate reader /,
    );
    expect(causeOf("police-to-violent-crime")).toMatch(
      /^core2-public-safety-v1 months\.officersPer1000,/,
    );
    expect(measureOf("police.officers-per-1000")).toBe(
      "core2-public-safety-v1 months.officersPer1000",
    );
    expect(measureOf("crime.violent-victimization-index")).toBe(
      "core2-crime-v1 months.violentIndex",
    );
  });

  it("give every engine measure its configured source, never a blank field", () => {
    let checked = 0;
    for (const link of LINKS) {
      if (link.causeKind === "engine") {
        starts(link.points.cause.evidence, link.from, link.key);
        checked += 1;
      }
      const reaches = link.points.reaches;
      if (
        engineMeasure(link.to) &&
        reaches.why?.startsWith("engine doesn't read the factor")
      ) {
        starts(reaches.evidence, link.to, link.key);
        checked += 1;
      }
    }
    for (const row of MEASURES)
      if (row.status === "engine-record" && engineMeasure(row.measure)) {
        starts(row.evidence, row.measure, row.measure);
        checked += 1;
      }
    expect(checked).toBeGreaterThan(0);
    expect(JSON.stringify(matrix)).not.toMatch(/months\.(,|")/);
  });
});
