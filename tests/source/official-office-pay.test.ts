import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OFFICE_PAY_FACTS_PATH,
  OFFICE_PAY_OUTPUT_PATH,
  SALARY_OFFICES,
  renderOfficePayModule,
  validateSalaryJournal,
} from "../../scripts/source/regional-money/export-office-pay";
import {
  estimatedStatePay,
  statePayFor,
  OFFICE_PAY_META,
} from "../../src/simulation/office-pay";
import { STATES } from "../../src/simulation/state-reference";
import type { World } from "../../src/simulation/types";

const journal = JSON.parse(readFileSync(OFFICE_PAY_FACTS_PATH, "utf8"));

describe("official annual salary inputs", () => {
  it("regenerates exactly and cites every shipped salary", () => {
    expect(readFileSync(OFFICE_PAY_OUTPUT_PATH, "utf8")).toBe(
      renderOfficePayModule(),
    );
    expect(() => validateSalaryJournal(journal)).not.toThrow();
    expect(OFFICE_PAY_META.citations.length).toBe(journal.facts.length);
    for (const fact of journal.facts) {
      expect(statePayFor(fact.office, fact.state)?.annualDollars).toBe(
        fact.annualDollars,
      );
      expect(OFFICE_PAY_META.citations).toContainEqual({
        state: fact.state,
        office: fact.office,
        annualDollars: fact.annualDollars,
        status: fact.status,
        sourceUrl: fact.sourceUrl,
        locator: fact.locator,
        referencePeriod: fact.referencePeriod,
      });
    }
    expect(JSON.stringify(OFFICE_PAY_META)).not.toMatch(
      /bookofthestates|Council of State Governments|lockedSha256|newerThanTables/i,
    );
  });

  it("rejects duplicated, nonofficial, missing-period and zero salary records", () => {
    const first = journal.facts[0];
    for (const facts of [
      [first, first],
      [{ ...first, sourceUrl: "https://bookofthestates.org/tables/2023-4-3/" }],
      [{ ...first, referencePeriod: "" }],
      [{ ...first, annualDollars: 0 }],
    ])
      expect(() => validateSalaryJournal({ ...journal, facts })).toThrow();
  });

  it("provides sourced pay or the existing labeled estimate in all 56 places", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
    const world = { seed: "data-fix-all-56-official-salaries" } as World;
    let checked = 0;
    let estimated = 0;
    for (const state of Object.keys(STATES))
      for (const office of SALARY_OFFICES) {
        const sourced = statePayFor(office, state);
        const pay = sourced ?? estimatedStatePay(world, office, state);
        expect(pay, `${state}:${office}`).not.toBeNull();
        expect(pay!.annualDollars, `${state}:${office}`).toBeGreaterThan(0);
        if (!sourced) {
          estimated++;
          const estimate = estimatedStatePay(world, office, state)!;
          expect(estimate.basis).toMatch(/^ESTIMATED FROM AVERAGE:/);
          expect(estimate.basis).toContain("not statutory salary authority");
        }
        checked++;
      }
    console.log(
      JSON.stringify({
        seed: world.seed,
        places: 56,
        salaryChecks: checked,
        sourced: checked - estimated,
        estimated,
      }),
    );
    expect(checked).toBe(168);
  });
});
