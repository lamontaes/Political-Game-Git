/**
 * Every elected office's pay in the salary table carries its provenance
 * (pool item gov-official-salary-research): for each of the 56 places, each
 * figure is either a sourced fact (a statute or commission, in
 * data/source/official-office-pay/facts.json) or an estimate whose group has
 * a spread in the table's provenance. A figure with neither fails here, so a
 * new row cannot enter the table uncited. The table's recalled rows shrink
 * as research cites them; this test does not change when they do.
 */
import { describe, expect, it } from "vitest";
import salaries from "../../data/research/offices/official-salaries-2026.json" with { type: "json" };
import payFacts from "../../data/source/official-office-pay/facts.json" with { type: "json" };

const OFFICES = {
  governor: { fact: "governor", group: "governor" },
  lieutenantGovernor: { fact: null, group: "statewide" },
  attorneyGeneral: { fact: null, group: "statewide" },
  secretaryOfState: { fact: null, group: "statewide" },
  treasurer: { fact: null, group: "statewide" },
  legislatorAnnual: { fact: "state-legislator", group: "legislator" },
} as const;

type Row = Record<string, number | string | boolean | null>;
const states = salaries.states as unknown as Record<string, Row>;
const sourced = new Set(
  payFacts.facts
    .filter((fact) => fact.status === "SOURCED" && fact.sourceUrl)
    .map((fact) => `${fact.office}:${fact.state}`),
);
const spreads = salaries.provenance.estimated.spreadPct as Record<
  string,
  number
>;

describe("the official salary table", () => {
  it("covers all 56 places", () => {
    expect(Object.keys(states)).toHaveLength(56);
  });

  it("cites every figure to a statute or gives it a spread", () => {
    const uncited: string[] = [];
    for (const [key, row] of Object.entries(states)) {
      const usps = key.replace(/^US-/, "");
      for (const [office, { fact, group }] of Object.entries(OFFICES)) {
        if (row[office] === null || row[office] === undefined) continue;
        const cited = fact !== null && sourced.has(`${fact}:${usps}`);
        const spread = spreads[group];
        if (!cited && !(Number.isFinite(spread) && spread! > 0))
          uncited.push(`${key} ${office}`);
        if (!cited && row.estimate !== true)
          uncited.push(`${key} ${office} is recalled but not marked estimate`);
      }
    }
    expect(uncited).toEqual([]);
  });

  it("says how each spread was found", () => {
    const { estimatedFrom, spreadBasis, tag } = salaries.provenance.estimated;
    expect(tag).toBe("ESTIMATED");
    expect(estimatedFrom.length).toBeGreaterThan(40);
    expect(spreadBasis.length).toBeGreaterThan(40);
  });
});
