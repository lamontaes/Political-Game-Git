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
    expect(y2022?.surveyYear).toBe(2022);
    expect(y2021?.surveyYear).toBe(2021);
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
      "",
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
      "",
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

  function financeRow(
    surveyYear: string,
    fiscalYearEnding: string,
    fiscalYearLabel = "",
  ): string[] {
    return [
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      surveyYear,
      fiscalYearEnding,
      fiscalYearLabel,
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
  function findingsFor(
    surveyYear: string,
    fiscalYearEnding: string,
    fiscalYearLabel = "",
  ) {
    const corpus = withProbeRow(
      financeRow(surveyYear, fiscalYearEnding, fiscalYearLabel),
    );
    const id = `00000000000001:REVENUE:T99:${surveyYear}`;
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
    expect(record?.surveyYear).toBe(2022);
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
        isWithinSurveyYearWindow(record.surveyYear, record.fiscalYearEnding),
      ).toBe(true);
    }
    // And the fixture must actually carry the previous-calendar-year case,
    // otherwise it teaches the defect it was corrected for.
    const crossing = corpus.records.filter(
      (record) =>
        Number(record.fiscalYearEnding.slice(0, 4)) !== record.surveyYear,
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
      "",
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

  /*
   * Delimiter bypasses.
   *
   * The guard used to treat `-` as part of a word, so the boundary around a
   * token would not close against a hyphen and the composite slid through; `_`
   * did the same as a `\w` character. The effect was that the guard policed
   * spelling rather than substance — `efficiency score` rejected,
   * `efficiency-score` and `efficiency_score` accepted — which is no constraint
   * at all, because the bypass is available to anyone who reaches for an
   * identifier-shaped label.
   *
   * Every spelling of a composite below must be rejected. The three the audit
   * named are first, but they are examples of the class, not the class itself,
   * so the sweep runs each fabricated description above through every delimiter
   * too: hard-coding the three named cases would leave the fourth open.
   */
  const bypassed = [
    "efficiency-score",
    "fiscal-score",
    "overall-fiscal-health",
    "efficiency_score",
    "fiscal_score",
    "overall_fiscal_health",
    "fiscal.health.index",
    "fiscal/health/index",
    "fiscal:health:rating",
    "OVERALL-FISCAL-HEALTH",
    "efficiency--score",
    "overall(capacity)",
    "municipal-solvency-grade",
    "service_capacity_weighted",
    "z_score",
    "fiscal\u2014health\u2014index",
  ];
  for (const description of bypassed) {
    it(`rejects the delimiter-spelled "${description}"`, () => {
      const codes = describeItem("T99", description).map(
        (finding) => finding.code,
      );
      expect(codes).toContain("government-finances/invented-score");
    });
  }

  /*
   * The vocabulary, not the punctuation, is what decides. Each fabricated
   * description above is respelled with every delimiter and must still be
   * caught, so the guard cannot be narrowed back to the examples that were
   * reported.
   */
  const DELIMITERS = ["-", "_", ".", "/", ":", "  ", " - "];
  for (const delimiter of DELIMITERS) {
    it(`catches every fabricated label respelled with "${delimiter}"`, () => {
      for (const description of fabricated) {
        const respelled = description.split(" ").join(delimiter);
        const codes = describeItem("T99", respelled).map(
          (finding) => finding.code,
        );
        expect(
          codes,
          `"${respelled}" evaded the fabricated-score guard`,
        ).toContain("government-finances/invented-score");
      }
    });
  }

  /*
   * The other direction, and the reason the guard cannot simply treat every
   * delimiter-joined string as suspect: ASPEP publishes hyphenated function
   * names, and Census item descriptions carry commas and parentheses. A guard
   * that rejected these would be rejecting the source.
   */
  const legitimatelyPunctuated = [
    "Police Protection - Officers",
    "Police Protection - Other",
    "Health - Other",
    "Higher education - other",
    "Direct expenditure, higher education (E24)",
    "General sales and gross receipts tax (T09)",
    "Charges, sewerage (A56)",
    "Water Transport and Terminals",
    "Upgrade of water treatment plant",
  ];
  for (const description of legitimatelyPunctuated) {
    it(`accepts the punctuated source label "${description}"`, () => {
      expect(describeItem("T99", description)).toEqual([]);
    });
  }
});

/**
 * Survey year, fiscal-year-ending date, and fiscal-year label.
 *
 * Section G requires three separate facts, and the schema used to carry two of
 * them under one name: the Census survey year lived in a field called
 * `fiscalYear`, whose own documentation said it was the survey year. A caller
 * reads the name, not the comment, so the conflation was one join away from
 * asserting that a December-31 city's books closed in the survey year they were
 * reported in.
 *
 * These tests hold the three apart, and hold the third one honest: the
 * public-use finance products do not publish the government's own label for its
 * fiscal year, so the fixture leaves it UNKNOWN rather than deriving one.
 */
describe("the three year facts stay three facts", () => {
  function probeRow(
    surveyYear: string,
    fiscalYearEnding: string,
    fiscalYearLabel = "",
  ): string[] {
    return [
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      surveyYear,
      fiscalYearEnding,
      fiscalYearLabel,
      "REVENUE",
      "T98",
      "Probe item (T98)",
      "USD thousands",
      "CENSUS_UNIVERSE",
      "KNOWN",
      "100",
      "",
    ];
  }

  function probe(
    surveyYear: string,
    fiscalYearEnding: string,
    fiscalYearLabel = "",
  ) {
    const corpus = withProbeRow(
      probeRow(surveyYear, fiscalYearEnding, fiscalYearLabel),
    );
    const record = corpus.records.find(
      (candidate) =>
        candidate.recordId === `00000000000001:REVENUE:T98:${surveyYear}`,
    );
    return { corpus, record };
  }

  it("names the Census survey year as the survey year, in the schema and the record", () => {
    // The column the source is read from, and the field it lands in, both say
    // survey year. Neither says fiscal year, because neither is one.
    expect(FINANCE_COLUMNS).toContain("survey_year");
    expect(FINANCE_COLUMNS).not.toContain("fiscal_year");
    const record = byId("00200300000002:REVENUE:T01:2022");
    expect(record?.surveyYear).toBe(2022);
    expect(record).not.toHaveProperty("fiscalYear");
  });

  it("keeps the fiscal-year-ending date in a calendar year the survey year never touches", () => {
    const record = byId("00200300000002:REVENUE:T01:2022");
    expect(record?.surveyYear).toBe(2022);
    expect(record?.fiscalYearEnding).toBe("2021-12-31");
    // Two facts that disagree on calendar year, and both survive: the date is
    // not corrected towards the year, and the year is not read off the date.
    expect(Number(record?.fiscalYearEnding.slice(0, 4))).not.toBe(
      record?.surveyYear,
    );
  });

  it("leaves the government's own fiscal-year label UNKNOWN rather than deriving one", () => {
    for (const record of compiled().records) {
      expect(record.fiscalYearLabel.state).toBe("UNKNOWN");
      // The absence carries no value key at all, so there is nothing for a
      // downstream `??` to turn into the survey year.
      expect(record.fiscalYearLabel).not.toHaveProperty("value");
    }
  });

  it("says why the label is absent, and cites the cell it is absent from", () => {
    const record = byId("00000000000001:REVENUE:T01:2022");
    if (record?.fiscalYearLabel.state === "UNKNOWN") {
      expect(record.fiscalYearLabel.reason).toMatch(/do not publish one/);
      // An UNKNOWN cites what was investigated rather than what was found.
      const [investigated] = record.fiscalYearLabel.investigated;
      expect(investigated?.locator).toMatchObject({
        kind: "delimited-row",
        column: "fiscal_year_label",
      });
    }
  });

  it("carries a label the source does state, without touching the other two facts", () => {
    // A June-30 state whose own books call the year FY2022. Supplied by the
    // source, so it is KNOWN — and it is dated to the closing date, not to the
    // survey year.
    const { record } = probe("2022", "2022-06-30", "FY2022");
    expect(record?.surveyYear).toBe(2022);
    expect(record?.fiscalYearEnding).toBe("2022-06-30");
    expect(record?.fiscalYearLabel.state).toBe("KNOWN");
    if (record?.fiscalYearLabel.state === "KNOWN") {
      expect(record.fiscalYearLabel.value).toBe("FY2022");
      expect(record.fiscalYearLabel.asOf).toBe("2022-06-30");
    }
  });

  it("rejects a fiscal-year label that is only the survey year restated", () => {
    // A December-31 government reported under survey year 2022 closed its books
    // in 2021. A label of "2022" here cannot have come from the source; it came
    // from the survey-year column, which is the conflation this repair removes.
    const { corpus } = probe("2022", "2021-12-31", "2022");
    const codes = validateFinanceCorpus(corpus)
      .findings.filter(
        (finding) => finding.recordId === "00000000000001:REVENUE:T98:2022",
      )
      .map((finding) => finding.code);
    expect(codes).toContain("government-finances/derived-fiscal-year-label");
  });

  it("does not flag a label that legitimately equals its survey year", () => {
    // A June-30 state's own FY label and the survey year genuinely coincide.
    const { corpus } = probe("2022", "2022-06-30", "2022");
    expect(isClean(validateFinanceCorpus(corpus))).toBe(true);
  });

  it("dates the corpus to the end of the survey-year window, not to December 31", () => {
    // A survey year is not a calendar year, so a corpus of survey year 2022 is
    // current as of 2022-06-30 and claims no coverage past it.
    expect(compiled().corpus.asOf).toBe(surveyYearWindow(2022).lastDay);
    expect(compiled().corpus.asOf).toBe("2022-06-30");
  });
});
