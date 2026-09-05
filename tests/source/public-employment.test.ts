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
