/**
 * The government-finances compiler.
 *
 * The domain ships no production records — its gate is a network-egress denial
 * of the Census Bureau — so these tests are what demonstrate the compiler is
 * real. They exercise it through the same capability boundary every other domain
 * uses, on the cases the task's critical data rules name: a genuine reported
 * zero kept distinct from a missing cell, a withheld amount, an inapplicable
 * line, a line the product never carried, reference years that never merge,
 * units and categories preserved, government identity joinable by code not name,
 * and no collapse into a single capacity score.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  FINANCE_COLUMNS,
  GOVERNMENT_FINANCES_PRODUCTION_GATE,
  compileFinanceFixture,
  openFinanceFixture,
  parseFinanceMatrix,
  sourceDomain,
  validateFinanceCorpus,
} from "../../src/source/domains/government-finances/index";
import type { FinanceRecord } from "../../src/source/domains/government-finances/index";
import { isClean } from "../../src/source/core/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = "fixtures/source/government-finances/mixed-governments.json";

function compiled() {
  return compileFinanceFixture(openFinanceFixture(FIXTURE));
}

function byId(id: string): FinanceRecord | undefined {
  return compiled().records.find((record) => record.recordId === id);
}

describe("the government-finances compiler", () => {
  it("compiles a fixture matrix end to end", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.records.length).toBe(14);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
  });

  it("keeps a genuine reported zero distinct from a missing amount", () => {
    // The city reports 0 for sewerage charges; that is KNOWN(0), not absence.
    const zero = byId("00200300000002:REVENUE:A56:2022");
    expect(zero?.amount.state).toBe("KNOWN");
    if (zero?.amount.state === "KNOWN") expect(zero.amount.value).toBe(0);

    // A line the product does not carry for this unit is UNKNOWN, with no value.
    const missing = byId("00200300000002:DEBT:44T:2022");
    expect(missing?.amount.state).toBe("UNKNOWN");
    expect(missing?.amount).not.toHaveProperty("value");
  });

  it("carries a withheld amount as SUPPRESSED, never as zero", () => {
    const record = byId("00000000000001:REVENUE:C30:2022");
    expect(record?.amount.state).toBe("SUPPRESSED");
    expect(record?.amount).not.toHaveProperty("value");
    if (record?.amount.state === "SUPPRESSED") {
      expect(record.amount.providerFlag).toContain("disclosure");
    }
  });

  it("carries an inapplicable line as NOT_APPLICABLE", () => {
    const record = byId("00200300000002:EXPENDITURE:E24:2022");
    expect(record?.amount.state).toBe("NOT_APPLICABLE");
    expect(record?.amount).not.toHaveProperty("value");
  });

  it("preserves all four fiscal categories and their units", () => {
    const records = compiled().records;
    const categories = new Set(records.map((record) => record.category));
    expect([...categories].sort()).toEqual([
      "CASH_AND_SECURITIES",
      "DEBT",
      "EXPENDITURE",
      "REVENUE",
    ]);
    for (const record of records) expect(record.units).toBe("USD thousands");
  });

  it("does not silently combine reference years, and keeps the estimate basis", () => {
    const y2022 = byId("00000000000001:REVENUE:T01:2022");
    const y2021 = byId("00000000000001:REVENUE:T01:2021");
    expect(y2022?.fiscalYear).toBe(2022);
    expect(y2021?.fiscalYear).toBe(2021);
    // Same government, same item, two years, two distinct records — never merged.
    expect(y2022?.recordId).not.toBe(y2021?.recordId);
    expect(y2022?.estimateBasis).toBe("CENSUS_UNIVERSE");
    expect(y2021?.estimateBasis).toBe("SAMPLE_ESTIMATE");
    if (y2022?.amount.state === "KNOWN")
      expect(y2022.amount.asOf.slice(0, 4)).toBe("2022");
    if (y2021?.amount.state === "KNOWN")
      expect(y2021.amount.asOf.slice(0, 4)).toBe("2021");
  });

  it("retains the government identifier and joins by code, not by name", () => {
    const record = byId("00000000000001:REVENUE:T01:2022");
    expect(record?.censusGovId).toBe("00000000000001");
    // The record id and the evidence both key on the identifier.
    expect(record?.recordId.startsWith("00000000000001:")).toBe(true);
    expect(record?.evidence.providerNativeId).toBe("00000000000001");
  });

  it("validates clean against its own oracles", () => {
    expect(isClean(validateFinanceCorpus(compiled()))).toBe(true);
  });
});

describe("the finance validator refuses invented meaning", () => {
  function withRow(row: string[]) {
    const fixture = JSON.parse(
      readFileSync(resolve(REPO, FIXTURE), "utf-8"),
    ) as {
      artifacts: { matrixTsv: string };
    };
    const tsv = `${fixture.artifacts.matrixTsv}${row.join("\t")}\n`;
    const path = resolve(
      REPO,
      "fixtures/source/government-finances/probe.json",
    );
    writeFileSync(
      path,
      JSON.stringify({
        __fixture: true,
        fixtureId: "government-finances/probe",
        artifacts: { matrixTsv: tsv },
      }),
    );
    try {
      return compileFinanceFixture(
        openFinanceFixture("fixtures/source/government-finances/probe.json"),
      );
    } finally {
      rmSync(path, { force: true });
    }
  }

  it("rejects a record that collapses fiscal data into a composite score", () => {
    const corpus = withRow([
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      "2022",
      "2022-06-30",
      "REVENUE",
      "FISCAL_HEALTH",
      "Overall fiscal capacity score",
      "index",
      "CENSUS_UNIVERSE",
      "KNOWN",
      "87",
      "",
    ]);
    const report = validateFinanceCorpus(corpus);
    expect(
      report.findings.some(
        (f) => f.code === "government-finances/invented-score",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
  });

  it("rejects a government id that is not a 14-digit Census code", () => {
    const corpus = withRow([
      "12345",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      "2022",
      "2022-06-30",
      "REVENUE",
      "T01",
      "Property tax (T01)",
      "USD thousands",
      "CENSUS_UNIVERSE",
      "KNOWN",
      "100",
      "",
    ]);
    expect(
      validateFinanceCorpus(corpus).findings.some(
        (f) => f.code === "government-finances/malformed-gov-id",
      ),
    ).toBe(true);
  });
});

describe("the finance matrix reader refuses a shape it cannot transcribe", () => {
  it("rejects a matrix whose tab delimiters did not survive", () => {
    const spaceSeparated = `${FINANCE_COLUMNS.join(" ")}\n00000000000001 00 ZZ\n`;
    expect(() =>
      parseFinanceMatrix(Buffer.from(spaceSeparated, "utf-8")),
    ).toThrow(/tab characters did not survive|columns/);
  });
});

describe("the finance production gate", () => {
  it("refuses to compile production records, and says why", () => {
    expect(() =>
      sourceDomain.compileProduction({
        domain: "government-finances",
        artifacts: [],
      }),
    ).toThrow(/compiles no production corpus/);
    expect(sourceDomain.productionGate).toBe(
      GOVERNMENT_FINANCES_PRODUCTION_GATE,
    );
    expect(GOVERNMENT_FINANCES_PRODUCTION_GATE).toMatch(/census\.gov/);
    expect(GOVERNMENT_FINANCES_PRODUCTION_GATE).toMatch(/403/);
  });
});
