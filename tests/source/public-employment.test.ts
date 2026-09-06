/**
 * The public-employment compiler.
 *
 * The domain ships no production records — its gate is a network-egress denial
 * of the Census Bureau — so these tests demonstrate the compiler is real. They
 * exercise it through the same capability boundary every other domain uses, on
 * the cases the task's critical data rules name: a genuine reported zero kept
 * distinct from a missing measure, a withheld measure, an inapplicable measure,
 * the aggregate of full-time and part-time counts that stays INCOMPLETE when a
 * component is missing, reference years that never merge, units preserved,
 * government identity joinable by code not name, and no collapse into an agency
 * efficiency score.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  EMPLOYMENT_COLUMNS,
  PUBLIC_EMPLOYMENT_PRODUCTION_GATE,
  compileEmploymentFixture,
  openEmploymentFixture,
  parseEmploymentMatrix,
  sourceDomain,
  totalEmployment,
  validateEmploymentCorpus,
} from "../../src/source/domains/public-employment/index";
import type { EmploymentRecord } from "../../src/source/domains/public-employment/index";
import { isClean } from "../../src/source/core/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = "fixtures/source/public-employment/mixed-functions.json";

function compiled() {
  return compileEmploymentFixture(openEmploymentFixture(FIXTURE));
}

function byId(id: string): EmploymentRecord | undefined {
  return compiled().records.find((record) => record.recordId === id);
}

describe("the public-employment compiler", () => {
  it("compiles a fixture matrix end to end", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.records.length).toBe(9);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
  });

  it("keeps a genuine reported zero distinct from a missing measure", () => {
    // The city police force reports zero part-time employees: KNOWN(0).
    const zero = byId("00200300000002:62:2022");
    expect(zero?.partTimeEmployees.state).toBe("KNOWN");
    if (zero?.partTimeEmployees.state === "KNOWN")
      expect(zero.partTimeEmployees.value).toBe(0);

    // The state fire service has no part-time count in the product: UNKNOWN.
    const missing = byId("00000000000001:79:2022");
    expect(missing?.partTimeEmployees.state).toBe("UNKNOWN");
    expect(missing?.partTimeEmployees).not.toHaveProperty("value");
  });

  it("carries a withheld measure as SUPPRESSED, never as zero", () => {
    const record = byId("00000000000001:24:2022");
    expect(record?.fullTimeEmployees.state).toBe("KNOWN");
    expect(record?.partTimeEmployees.state).toBe("SUPPRESSED");
    expect(record?.partTimeEmployees).not.toHaveProperty("value");
    expect(record?.partTimePayroll.state).toBe("SUPPRESSED");
  });

  it("carries inapplicable measures as NOT_APPLICABLE", () => {
    const record = byId("00200300000002:24:2022");
    for (const measure of [
      record?.fullTimeEmployees,
      record?.partTimeEmployees,
      record?.fullTimeEquivalent,
      record?.fullTimePayroll,
      record?.partTimePayroll,
    ]) {
      expect(measure?.state).toBe("NOT_APPLICABLE");
    }
  });

  it("adds full-time and part-time honestly, refusing a total when one is missing", () => {
    // Both known: a COMPLETE aggregate.
    const police = byId("00000000000001:62:2022");
    const policeTotal = totalEmployment(police as EmploymentRecord);
    expect(policeTotal.state).toBe("COMPLETE");
    if (policeTotal.state === "COMPLETE") expect(policeTotal.value).toBe(5200);

    // Part-time suppressed: INCOMPLETE, naming the missing part.
    const higherEd = byId("00000000000001:24:2022");
    const higherEdTotal = totalEmployment(higherEd as EmploymentRecord);
    expect(higherEdTotal.state).toBe("INCOMPLETE");
    if (higherEdTotal.state === "INCOMPLETE") {
      expect(higherEdTotal.missing.map((gap) => gap.member.label)).toContain(
        "part-time",
      );
    }

    // Part-time missing entirely: also INCOMPLETE, not full-time read as a total.
    const fire = byId("00000000000001:79:2022");
    expect(totalEmployment(fire as EmploymentRecord).state).toBe("INCOMPLETE");

    // A genuine zero part-time still yields a COMPLETE total.
    const cityPolice = byId("00200300000002:62:2022");
    const cityTotal = totalEmployment(cityPolice as EmploymentRecord);
    expect(cityTotal.state).toBe("COMPLETE");
    if (cityTotal.state === "COMPLETE") expect(cityTotal.value).toBe(40);
  });

  it("does not silently combine reference years, and keeps the estimate basis", () => {
    const y2022 = byId("00000000000001:000:2022");
    const y2021 = byId("00000000000001:000:2021");
    expect(y2022?.referenceYear).toBe(2022);
    expect(y2021?.referenceYear).toBe(2021);
    expect(y2022?.recordId).not.toBe(y2021?.recordId);
    expect(y2022?.estimateBasis).toBe("CENSUS_UNIVERSE");
    expect(y2021?.estimateBasis).toBe("SAMPLE_ESTIMATE");
  });

  it("preserves units and the reference date on every record", () => {
    for (const record of compiled().records) {
      expect(record.employmentUnits).toBe("employees (headcount)");
      expect(record.payrollUnits).toBe("USD (March gross payroll)");
      expect(record.referenceDate).toMatch(/^\d{4}-03-12$/);
    }
  });

  it("retains the government identifier and joins by code, not by name", () => {
    const record = byId("00000000000001:62:2022");
    expect(record?.censusGovId).toBe("00000000000001");
    expect(record?.evidence.providerNativeId).toBe("00000000000001");
  });

  it("validates clean against its own oracles", () => {
    expect(isClean(validateEmploymentCorpus(compiled()))).toBe(true);
  });
});

describe("the employment validator refuses invented meaning", () => {
  function withRow(row: string[]) {
    const fixture = JSON.parse(
      readFileSync(resolve(REPO, FIXTURE), "utf-8"),
    ) as {
      artifacts: { matrixTsv: string };
    };
    const tsv = `${fixture.artifacts.matrixTsv}${row.join("\t")}\n`;
    const path = resolve(REPO, "fixtures/source/public-employment/probe.json");
    writeFileSync(
      path,
      JSON.stringify({
        __fixture: true,
        fixtureId: "public-employment/probe",
        artifacts: { matrixTsv: tsv },
      }),
    );
    try {
      return compileEmploymentFixture(
        openEmploymentFixture("fixtures/source/public-employment/probe.json"),
      );
    } finally {
      rmSync(path, { force: true });
    }
  }

  it("rejects a record that collapses staffing into an efficiency score", () => {
    const corpus = withRow([
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      "2022",
      "2022-03-12",
      "EFF1",
      "Agency efficiency score",
      "CENSUS_UNIVERSE",
      "employees (headcount)",
      "USD (March gross payroll)",
      "90",
      "0",
      "90",
      "0",
      "0",
    ]);
    const report = validateEmploymentCorpus(corpus);
    expect(
      report.findings.some(
        (f) => f.code === "public-employment/invented-score",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
  });

  it("rejects a government id that is not a 14-digit Census code", () => {
    const corpus = withRow([
      "999",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      "2022",
      "2022-03-12",
      "62",
      "Police protection",
      "CENSUS_UNIVERSE",
      "employees (headcount)",
      "USD (March gross payroll)",
      "10",
      "1",
      "10",
      "1000",
      "100",
    ]);
    expect(
      validateEmploymentCorpus(corpus).findings.some(
        (f) => f.code === "public-employment/malformed-gov-id",
      ),
    ).toBe(true);
  });
});

describe("the employment matrix reader refuses a shape it cannot transcribe", () => {
  it("rejects a matrix whose tab delimiters did not survive", () => {
    const spaceSeparated = `${EMPLOYMENT_COLUMNS.join(" ")}\n00000000000001 00 ZZ\n`;
    expect(() =>
      parseEmploymentMatrix(Buffer.from(spaceSeparated, "utf-8")),
    ).toThrow(/tab characters did not survive|columns/);
  });
});

describe("the employment production gate", () => {
  it("refuses to compile production records, and says why", () => {
    expect(() =>
      sourceDomain.compileProduction({
        domain: "public-employment",
        artifacts: [],
      }),
    ).toThrow(/compiles no production corpus/);
    expect(sourceDomain.productionGate).toBe(PUBLIC_EMPLOYMENT_PRODUCTION_GATE);
    expect(PUBLIC_EMPLOYMENT_PRODUCTION_GATE).toMatch(/census\.gov/);
    expect(PUBLIC_EMPLOYMENT_PRODUCTION_GATE).toMatch(/403/);
  });
});

/**
 * Adversarial score/rating probes, and the ASPEP reference date.
 *
 * ASPEP's staffing is the rawest material for a fabricated productivity metric
 * in the whole project — headcount over population, payroll over headcount —
 * so the guard is checked against variants that avoid the word "score", and
 * against the Bureau's own function labels, which must survive it.
 */
describe("the public-employment fabricated-score guard, adversarially", () => {
  function withProbeFunction(functionCode: string, functionLabel: string) {
    const fixture = JSON.parse(
      readFileSync(resolve(REPO, FIXTURE), "utf-8"),
    ) as { artifacts: { matrixTsv: string } };
    const row = [
      "00000000000001",
      "00",
      "ZZ",
      "000",
      "State of Fixtonia",
      "2022",
      "2022-03-12",
      functionCode,
      functionLabel,
      "CENSUS_UNIVERSE",
      "employees",
      "USD (March payroll)",
      "10",
      "2",
      "11",
      "50000",
      "5000",
    ];
    const relative = "fixtures/source/public-employment/guard-probe.json";
    const path = resolve(REPO, relative);
    writeFileSync(
      path,
      JSON.stringify({
        __fixture: true,
        fixtureId: "public-employment/guard-probe",
        artifacts: {
          matrixTsv: `${fixture.artifacts.matrixTsv}${row.join("\t")}\n`,
        },
      }),
    );
    try {
      const corpus = compileEmploymentFixture(openEmploymentFixture(relative));
      return validateEmploymentCorpus(corpus).findings.filter(
        (finding) => finding.recordId === `00000000000001:${functionCode}:2022`,
      );
    } finally {
      rmSync(path, { force: true });
    }
  }

  const fabricated = [
    "Agency efficiency measure",
    "Staffing productivity index",
    "Workforce competency rating",
    "Departmental performance ranking",
    "Composite staffing indicator",
    "Service capacity grade",
    "Overall staffing quality",
    "Weighted service performance",
    "Staffing adequacy percentile",
    "Administrative effectiveness measure",
  ];
  for (const label of fabricated) {
    it(`rejects the fabricated function "${label}"`, () => {
      const codes = withProbeFunction("F99", label).map(
        (finding) => finding.code,
      );
      expect(codes).toContain("public-employment/invented-score");
    });
  }

  /* Real ASPEP government-function labels. All must pass. */
  const legitimate = [
    "Health",
    "Hospitals",
    "Police protection - officers",
    "Police protection - other",
    "Fire protection",
    "Firefighters",
    "Correction",
    "Judicial and legal",
    "Financial administration",
    "Other government administration",
    "Streets and highways",
    "Public welfare",
    "Natural resources",
    "Parks and recreation",
    "Solid waste management",
    "Sewerage",
    "Water supply",
    "Electric power",
    "Air transportation",
    "Libraries",
    "Housing and community development",
    "Elementary and secondary education - instructional",
    "Higher education - other",
  ];
  for (const label of legitimate) {
    it(`accepts the Bureau's own function "${label}"`, () => {
      expect(withProbeFunction("F99", label)).toEqual([]);
    });
  }

  /*
   * The delimiter bypass, on the domain that most invites it.
   *
   * A staffing metric is the easiest thing in this project to fabricate, and a
   * function label is where it would arrive. The guard used to treat `-` and
   * `_` as parts of a word, so `efficiency-score` and `staff_productivity_index`
   * passed while their spaced spellings were caught. That the legitimate list
   * above contains `Police protection - officers` is exactly why the boundary
   * cannot be fixed by rejecting hyphens: both spellings must be judged on
   * vocabulary alone.
   */
  const bypassed = [
    "efficiency-score",
    "fiscal-score",
    "overall-fiscal-health",
    "staff_productivity_index",
    "workforce-competency-rating",
    "overall_staffing_quality",
    "service.capacity.grade",
    "AGENCY-EFFICIENCY-MEASURE",
  ];
  for (const label of bypassed) {
    it(`rejects the delimiter-spelled function "${label}"`, () => {
      const codes = withProbeFunction("F99", label).map(
        (finding) => finding.code,
      );
      expect(codes).toContain("public-employment/invented-score");
    });
  }

  const DELIMITERS = ["-", "_", ".", "/", ":", "  ", " - "];
  for (const delimiter of DELIMITERS) {
    it(`catches every fabricated function respelled with "${delimiter}"`, () => {
      for (const label of fabricated) {
        const respelled = label.split(" ").join(delimiter);
        const codes = withProbeFunction("F99", respelled).map(
          (finding) => finding.code,
        );
        expect(codes, `"${respelled}" evaded the guard`).toContain(
          "public-employment/invented-score",
        );
      }
    });
  }

  it("still accepts every hyphenated ASPEP function under the new boundary", () => {
    // The false-positive direction, stated once as a class: a delimiter in a
    // label is not evidence of anything, and the Bureau uses several.
    for (const label of legitimate.filter((entry) => entry.includes("-"))) {
      expect(withProbeFunction("F99", label), label).toEqual([]);
    }
  });

  it("does not conflate ASPEP reference timing with the finance fiscal window", () => {
    // ASPEP's reference is the pay period including March 12 of the survey
    // year, so its reference date sits inside the reference year. A
    // finance-style previous-calendar-year date is NOT valid here, and the
    // validator must say so rather than borrowing the finance window.
    const codes = withProbeFunction("F98", "Health").map(
      (finding) => finding.code,
    );
    expect(codes).toEqual([]);

    const corpus = compiled();
    for (const record of corpus.records) {
      expect(record.referenceDate.slice(0, 4)).toBe(
        String(record.referenceYear),
      );
      expect(record.referenceDate.slice(5)).toBe("03-12");
    }
    expect(isClean(validateEmploymentCorpus(corpus))).toBe(true);
  });
});
