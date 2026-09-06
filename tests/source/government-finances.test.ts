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
  isWithinSurveyYearWindow,
  surveyYearWindow,
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

/**
 * Compile the shipped fixture with one extra row appended.
 *
 * Module-scoped twin of the suite-local `withRow`, so the window and score
 * probes below can share it. It writes through the same capability boundary the
 * production path uses — a fixture outside `fixtures/source/` is refused.
 */
function withProbeRow(row: readonly string[]) {
  const fixture = JSON.parse(readFileSync(resolve(REPO, FIXTURE), "utf-8")) as {
    artifacts: { matrixTsv: string };
  };
  const relative = "fixtures/source/government-finances/window-probe.json";
  const path = resolve(REPO, relative);
  writeFileSync(
    path,
    JSON.stringify({
      __fixture: true,
      fixtureId: "government-finances/window-probe",
      artifacts: {
        matrixTsv: `${fixture.artifacts.matrixTsv}${row.join("\t")}\n`,
      },
    }),
  );
  try {
    return compileFinanceFixture(openFinanceFixture(relative));
  } finally {
    rmSync(path, { force: true });
  }
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

/**
 * The Census survey-year fiscal window.
 *
 * A survey year comprises each government's fiscal year ending between July 1
 * of the previous calendar year and June 30 of the survey year. Half that
 * window sits in the previous calendar year, which is where Alabama, Michigan,
 * Texas and every December-31 municipality in the country report from — so
 * these boundaries are the difference between transcribing the source and
 * rejecting most of it.
 */
describe("the survey-year fiscal window", () => {
  const SURVEY_YEAR = 2022;

  function financeRow(fiscalYear: string, fiscalYearEnding: string): string[] {
    return [
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      fiscalYear,
      fiscalYearEnding,
      "REVENUE",
      "T99",
      "Probe item (T99)",
      "USD thousands",
      "CENSUS_UNIVERSE",
      "KNOWN",
      "100",
      "",
    ];
  }

  /** Findings raised against the probe record alone. */
  function findingsFor(fiscalYear: string, fiscalYearEnding: string) {
    const corpus = withProbeRow(financeRow(fiscalYear, fiscalYearEnding));
    const id = `00000000000001:REVENUE:T99:${fiscalYear}`;
    return validateFinanceCorpus(corpus).findings.filter(
      (finding) => finding.recordId === id,
    );
  }

  it("states the window as the Bureau defines it", () => {
    expect(surveyYearWindow(2022)).toEqual({
      firstDay: "2021-07-01",
      lastDay: "2022-06-30",
    });
  });

  it("accepts July 1 of the previous year — the window's first day", () => {
    expect(findingsFor(String(SURVEY_YEAR), "2021-07-01")).toEqual([]);
    expect(isWithinSurveyYearWindow(SURVEY_YEAR, "2021-07-01")).toBe(true);
  });

  it("accepts December 31 of the previous year — the common municipal close", () => {
    expect(findingsFor(String(SURVEY_YEAR), "2021-12-31")).toEqual([]);
    expect(isWithinSurveyYearWindow(SURVEY_YEAR, "2021-12-31")).toBe(true);
  });

  it("accepts September 30 of the previous year — Alabama and Michigan", () => {
    expect(findingsFor(String(SURVEY_YEAR), "2021-09-30")).toEqual([]);
  });

  it("accepts June 30 of the survey year — the window's last day", () => {
    expect(findingsFor(String(SURVEY_YEAR), "2022-06-30")).toEqual([]);
    expect(isWithinSurveyYearWindow(SURVEY_YEAR, "2022-06-30")).toBe(true);
  });

  it("rejects June 30 of the previous year — one day before the window", () => {
    const codes = findingsFor(String(SURVEY_YEAR), "2021-06-30").map(
      (finding) => finding.code,
    );
    expect(codes).toContain(
      "government-finances/fiscal-year-outside-survey-window",
    );
    expect(isWithinSurveyYearWindow(SURVEY_YEAR, "2021-06-30")).toBe(false);
  });

  it("rejects July 1 of the survey year — one day after the window", () => {
    const codes = findingsFor(String(SURVEY_YEAR), "2022-07-01").map(
      (finding) => finding.code,
    );
    expect(codes).toContain(
      "government-finances/fiscal-year-outside-survey-window",
    );
    expect(isWithinSurveyYearWindow(SURVEY_YEAR, "2022-07-01")).toBe(false);
  });

  it("rejects a date-shaped string that names no day on the calendar", () => {
    expect(isWithinSurveyYearWindow(SURVEY_YEAR, "2022-02-30")).toBe(false);
    // The normalizer refuses to date an amount to a day that never happened,
    // so the amount is unresolved rather than confidently mis-dated.
    const corpus = withProbeRow(financeRow(String(SURVEY_YEAR), "2022-02-30"));
    const record = corpus.records.find(
      (candidate) => candidate.recordId === "00000000000001:REVENUE:T99:2022",
    );
    expect(record?.amount.state).toBe("UNKNOWN");
    expect(record?.amount).not.toHaveProperty("value");
  });

  it("keeps the survey year and the fiscal-year-ending date as separate facts", () => {
    const corpus = withProbeRow(financeRow(String(SURVEY_YEAR), "2021-12-31"));
    const record = corpus.records.find(
      (candidate) => candidate.recordId === "00000000000001:REVENUE:T99:2022",
    );
    // The year is not derived from the date, and the date is not derived from
    // the year: they disagree on calendar year and both survive intact.
    expect(record?.fiscalYear).toBe(2022);
    expect(record?.fiscalYearEnding).toBe("2021-12-31");
    if (record?.amount.state === "KNOWN") {
      expect(record.amount.asOf).toBe("2021-12-31");
    }
  });

  it("the shipped fixture exemplifies the window rather than merely passing", () => {
    const corpus = compiled();
    // Every record's own date must sit inside its own survey year's window.
    for (const record of corpus.records) {
      expect(
        isWithinSurveyYearWindow(record.fiscalYear, record.fiscalYearEnding),
      ).toBe(true);
    }
    // And the fixture must actually carry the previous-calendar-year case,
    // otherwise it teaches the defect it was corrected for.
    const crossing = corpus.records.filter(
      (record) =>
        Number(record.fiscalYearEnding.slice(0, 4)) !== record.fiscalYear,
    );
    expect(crossing.length).toBeGreaterThan(0);
    expect(isClean(validateFinanceCorpus(corpus))).toBe(true);
  });
});

/**
 * Adversarial score/rating probes.
 *
 * The prohibition is on fabricated verdicts, not on the Bureau's vocabulary.
 * Both directions have to hold: a rating dressed as an item must be caught even
 * when it avoids the word "score", and the Census function literally called
 * "Health and hospitals" must pass.
 */
describe("the fabricated-score guard, adversarially", () => {
  function describeItem(itemCode: string, description: string) {
    const corpus = withProbeRow([
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      "2022",
      "2022-06-30",
      "REVENUE",
      itemCode,
      description,
      "USD thousands",
      "CENSUS_UNIVERSE",
      "KNOWN",
      "100",
      "",
    ]);
    return validateFinanceCorpus(corpus).findings.filter(
      (finding) =>
        finding.recordId === `00000000000001:REVENUE:${itemCode}:2022`,
    );
  }

  const fabricated = [
    "Overall fiscal capacity rating",
    "Statewide fiscal rankings",
    "Fiscal health index",
    "Composite revenue indicator",
    "Municipal solvency grade",
    "Revenue adequacy percentile",
    "Government efficiency measure",
    "Administrative competency measure",
    "Staff productivity measure",
    "Fiscal distress classification",
    "Creditworthiness assessment",
    "Overall fiscal health",
    "Weighted service capacity",
    "Aggregate performance summary",
  ];
  for (const description of fabricated) {
    it(`rejects "${description}"`, () => {
      const codes = describeItem("T99", description).map(
        (finding) => finding.code,
      );
      expect(codes).toContain("government-finances/invented-score");
    });
  }

  /*
   * Real Census finance item and function names. Every one of these must pass:
   * a guard that rejects the source's own vocabulary teaches whoever hits it to
   * route around the guard, which is worse than no guard.
   */
  const legitimate = [
    "Health and hospitals",
    "Health",
    "Hospitals",
    "Public welfare",
    "Police protection",
    "Fire protection",
    "Correction",
    "Financial administration",
    "Judicial and legal",
    "Natural resources",
    "Parks and recreation",
    "Housing and community development",
    "Solid waste management",
    "Sewerage",
    "Water supply",
    "Air transportation",
    "Libraries",
    "Higher education",
    "Elementary and secondary education",
    "General sales and gross receipts tax",
    "Property tax",
    "Interest on general debt",
    "Total debt outstanding",
    "Total cash and securities",
    "Insurance trust revenue",
    "Upgrade of water treatment plant",
  ];
  for (const description of legitimate) {
    it(`accepts the source's own "${description}"`, () => {
      expect(describeItem("T99", description)).toEqual([]);
    });
  }
});
