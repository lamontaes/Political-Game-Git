/**
 * The judicial-office-selection compiler.
 *
 * The domain ships no production records — the 92G research is a secondary
 * source and its authorities are not retrieved — so these tests are what prove
 * the compiler is real. They exercise it through the same capability boundary
 * every other domain uses, and they pin the one thing the model exists to keep:
 * that five different ways to constitute and fill a court stay five different
 * things, and never collapse toward a single "judicial election" default.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  JUDICIAL_COLUMNS,
  JUDICIAL_PRODUCTION_GATE,
  compileJudicialFixture,
  courtSlug,
  openJudicialFixture,
  parseJudicialMatrix,
  parseSelectionPipeline,
  readScalar,
  sourceDomain,
  validateJudicialCorpus,
} from "../../src/source/domains/judicial-office-selection/index";
import type {
  JudicialOfficeRecord,
  SelectionMechanism,
} from "../../src/source/domains/judicial-office-selection/index";
import { isClean } from "../../src/source/core/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = "fixtures/source/judicial-office-selection/model-families.json";

function compiled() {
  return compileJudicialFixture(openJudicialFixture(FIXTURE));
}

function record(id: string): JudicialOfficeRecord {
  const found = compiled().records.find((entry) => entry.recordId === id);
  if (!found) throw new Error(`no record ${id}`);
  return found;
}

/** The multiset of mechanisms in a pipeline, order-independent. */
function mechanisms(
  stages: readonly { readonly mechanism: SelectionMechanism }[],
): string[] {
  return stages.map((stage) => stage.mechanism).sort();
}

describe("the judicial-office compiler", () => {
  it("compiles the model-families fixture end to end", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
    expect(corpus.records.length).toBe(7);
  });

  it("covers all five researched jurisdictions", () => {
    const jurisdictions = new Set(
      compiled().records.map((r) => r.jurisdictionId),
    );
    expect([...jurisdictions].sort()).toEqual([
      "us-federal",
      "us-ky",
      "us-mo",
      "us-tx",
      "us-va",
    ]);
  });
});

describe("the five model families remain structurally distinct", () => {
  it("federal appointment is not Texas partisan election", () => {
    const federal = record("us-federal:supreme-court-of-the-united-states");
    const texas = record("us-tx:supreme-court-of-texas");

    expect(federal.tenureKind).toBe("GOOD_BEHAVIOR");
    expect(federal.retentionMethod).toBe("NONE");
    expect(mechanisms(federal.initialSelection)).toEqual([
      "EXECUTIVE_NOMINATION",
      "LEGISLATIVE_CONFIRMATION",
    ]);
    expect(
      federal.initialSelection.some((s) => s.mechanism.includes("ELECTION")),
    ).toBe(false);

    expect(texas.tenureKind).toBe("FIXED_TERM");
    expect(texas.retentionMethod).toBe("REELECTION_PARTISAN");
    expect(mechanisms(texas.initialSelection)).toEqual(["PARTISAN_ELECTION"]);

    expect(mechanisms(federal.initialSelection)).not.toEqual(
      mechanisms(texas.initialSelection),
    );
  });

  it("Missouri merit selection with retention is not an ordinary general election", () => {
    const missouri = record("us-mo:supreme-court-of-missouri");
    const texas = record("us-tx:supreme-court-of-texas");
    const kentucky = record("us-ky:supreme-court-of-kentucky");

    expect(missouri.retentionMethod).toBe("RETENTION_ELECTION");
    expect(
      missouri.initialSelection.some(
        (s) => s.mechanism === "MERIT_COMMISSION_SHORTLIST",
      ),
    ).toBe(true);
    // A retention election is never a contested general election.
    expect(missouri.retentionMethod).not.toBe(texas.retentionMethod);
    expect(missouri.retentionMethod).not.toBe(kentucky.retentionMethod);
    expect(
      missouri.initialSelection.some((s) => s.mechanism.endsWith("_ELECTION")),
    ).toBe(false);
  });

  it("Virginia legislative selection survives", () => {
    const virginia = record("us-va:supreme-court-of-virginia");
    expect(mechanisms(virginia.initialSelection)).toEqual([
      "LEGISLATIVE_ELECTION",
    ]);
    expect(virginia.retentionMethod).toBe("LEGISLATIVE_REELECTION");
    // Not appointment, not any kind of popular election.
    expect(
      virginia.initialSelection.every(
        (s) =>
          s.mechanism !== "PARTISAN_ELECTION" &&
          s.mechanism !== "NONPARTISAN_ELECTION" &&
          s.mechanism !== "EXECUTIVE_APPOINTMENT",
      ),
    ).toBe(true);
  });

  it("Kentucky's nonpartisan election and merit-shortlist interim do not collapse into Texas", () => {
    const kentucky = record("us-ky:supreme-court-of-kentucky");
    const texas = record("us-tx:supreme-court-of-texas");

    // Initial selection differs: nonpartisan vs partisan.
    expect(mechanisms(kentucky.initialSelection)).toEqual([
      "NONPARTISAN_ELECTION",
    ]);
    expect(mechanisms(kentucky.initialSelection)).not.toEqual(
      mechanisms(texas.initialSelection),
    );

    // Both fill interim seats by gubernatorial appointment, but only Kentucky
    // runs that appointment through a merit shortlist. The interim pipelines
    // must not be equal.
    expect(
      kentucky.interimVacancyFilling.some(
        (s) => s.mechanism === "MERIT_COMMISSION_SHORTLIST",
      ),
    ).toBe(true);
    expect(
      texas.interimVacancyFilling.some(
        (s) => s.mechanism === "MERIT_COMMISSION_SHORTLIST",
      ),
    ).toBe(false);
    expect(mechanisms(kentucky.interimVacancyFilling)).not.toEqual(
      mechanisms(texas.interimVacancyFilling),
    );
  });

  it("keeps Texas's two courts of last resort as one partisan model across both", () => {
    const civil = record("us-tx:supreme-court-of-texas");
    const criminal = record("us-tx:texas-court-of-criminal-appeals");
    expect(criminal.courtLevel).toBe("COURT_OF_LAST_RESORT");
    expect(mechanisms(criminal.initialSelection)).toEqual(
      mechanisms(civil.initialSelection),
    );
  });
});

describe("source honesty", () => {
  it("leaves an unresolved qualification field UNKNOWN, with no value to read", () => {
    const kentucky = record("us-ky:supreme-court-of-kentucky");
    for (const field of [
      kentucky.minimumAge,
      kentucky.residencyRequirement,
      kentucky.professionalQualification,
    ]) {
      expect(field.state).toBe("UNKNOWN");
      expect(field).not.toHaveProperty("value");
    }
  });

  it("distinguishes a constitution read and found silent from nobody having looked", () => {
    const federal = record("us-federal:supreme-court-of-the-united-states");
    // Article III imposes no age, residency, bar or professional requirement:
    // read and silent, not merely unresolved.
    expect(federal.minimumAge.state).toBe("NO_REQUIREMENT_FOUND");
    expect(federal.barMembershipRequirement.state).toBe("NO_REQUIREMENT_FOUND");
    expect(federal.termLengthYears.state).toBe("NOT_APPLICABLE");
    const kentucky = record("us-ky:supreme-court-of-kentucky");
    expect(kentucky.minimumAge.state).toBe("UNKNOWN");
  });

  it("carries every fixture row as not-retrieved and unverified, and the validator enforces it", () => {
    for (const r of compiled().records) {
      expect(r.citedAuthority.retrieval).toBe("NOT_RETRIEVED");
      expect(r.citedAuthority.verification).toBe("UNVERIFIED");
    }
    expect(isClean(validateJudicialCorpus(compiled()))).toBe(true);
  });

  it("models none of the forbidden concepts", () => {
    const keys = Object.keys(record("us-mo:supreme-court-of-missouri")).join(
      " ",
    );
    for (const banned of ["ideolog", "liberal", "conservative", "quality"]) {
      expect(keys.toLowerCase()).not.toContain(banned);
    }
  });
});

describe("deterministic compile and replay", () => {
  it("compiles to the same canonical digest twice", () => {
    expect(compiled().corpus.canonicalSha256).toBe(
      compiled().corpus.canonicalSha256,
    );
  });

  it("emits records in a stable sorted order", () => {
    const ids = compiled().records.map((r) => r.recordId);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("the matrix reader refuses a shape it cannot transcribe", () => {
  it("rejects a matrix whose tab delimiters did not survive", () => {
    const spaceSeparated = `${JUDICIAL_COLUMNS.join(" ")}\nus-federal COURT_OF_LAST_RESORT\n`;
    expect(() =>
      parseJudicialMatrix(Buffer.from(spaceSeparated, "utf-8")),
    ).toThrow(/tab characters did not survive/);
  });

  it("rejects a matrix whose columns are not the declared schema", () => {
    const wrong = "jurisdiction\tcourt\n" + "us-federal\tX\n";
    expect(() => parseJudicialMatrix(Buffer.from(wrong, "utf-8"))).toThrow(
      /has 2|declares "office_title"/,
    );
  });

  it("parses an ordered pipeline and rejects an unknown mechanism", () => {
    const good = parseSelectionPipeline(
      "MERIT_COMMISSION_SHORTLIST@Commission>EXECUTIVE_APPOINTMENT@Governor",
    );
    expect(good.stages.map((s) => s.order)).toEqual([1, 2]);
    expect(good.stages[0]?.actor).toBe("Commission");
    expect(good.unknownMechanisms).toEqual([]);

    const bad = parseSelectionPipeline("APPOINTED_BY_KING@Monarch");
    expect(bad.stages).toHaveLength(0);
    expect(bad.unknownMechanisms).toEqual(["APPOINTED_BY_KING"]);
  });

  it("reads a KNOWN value token with its effective date, and a slug from a title", () => {
    const evidence = {
      artifactId: "t",
      locator: {
        kind: "legal-section" as const,
        artifactId: "t",
        citation: "c",
        pageOrSection: "p",
      },
    };
    const authority = {
      authorityType: "State Constitution",
      exactSource: "Fixture",
      legalLocator: "art. I",
      authorityUrl: "https://fixture.invalid",
      referenceDate: "2026-09-05",
      retrieval: "NOT_RETRIEVED" as const,
      verification: "UNVERIFIED" as const,
      unresolvedFields: [],
    };
    const known = readScalar("KNOWN:8@1976-01-01", evidence, authority, (raw) =>
      Number(raw),
    );
    expect(known.value.state).toBe("KNOWN");
    if (known.value.state === "KNOWN") expect(known.value.value).toBe(8);
    expect(courtSlug("Supreme Court of Texas")).toBe("supreme-court-of-texas");
  });
});

describe("the validator enforces its invariants", () => {
  function withRow(row: string[]): ReturnType<typeof compileJudicialFixture> {
    const fixture = JSON.parse(
      readFileSync(resolve(REPO, FIXTURE), "utf-8"),
    ) as {
      artifacts: { matrixTsv: string };
    };
    const tsv = `${fixture.artifacts.matrixTsv}${row.join("\t")}\n`;
    const path = resolve(
      REPO,
      "fixtures/source/judicial-office-selection/probe.json",
    );
    writeFileSync(
      path,
      JSON.stringify({
        __fixture: true,
        fixtureId: "judicial-office-selection/probe",
        artifacts: { matrixTsv: tsv },
      }),
    );
    try {
      return compileJudicialFixture(
        openJudicialFixture(
          "fixtures/source/judicial-office-selection/probe.json",
        ),
      );
    } finally {
      rmSync(path, { force: true });
    }
  }

  it("rejects a fixture row that claims it retrieved its authority", () => {
    const corpus = withRow([
      "us-nv",
      "COURT_OF_LAST_RESORT",
      "Supreme Court of Nevada",
      "NONE",
      "FIXED_TERM",
      "REELECTION_NONPARTISAN",
      "NONPARTISAN_ELECTION@Electorate",
      "EXECUTIVE_APPOINTMENT@Governor",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "State Constitution",
      "Constitution of Nevada",
      "Nev. Const. art. VI",
      "https://www.leg.state.nv.us/const/",
      "2026-09-05",
      "RETRIEVED",
      "UNVERIFIED",
      "term_length,mandatory_retirement,professional_qualification,minimum_age,residency,bar_requirement",
    ]);
    const report = validateJudicialCorpus(corpus);
    expect(
      report.findings.some(
        (f) => f.code === "judicial/fixture-claims-retrieval",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
  });

  it("rejects an unresolved field that is not stated as unresolved", () => {
    const corpus = withRow([
      "us-nv",
      "COURT_OF_LAST_RESORT",
      "Supreme Court of Nevada",
      "NONE",
      "FIXED_TERM",
      "REELECTION_NONPARTISAN",
      "NONPARTISAN_ELECTION@Electorate",
      "EXECUTIVE_APPOINTMENT@Governor",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "State Constitution",
      "Constitution of Nevada",
      "Nev. Const. art. VI",
      "https://www.leg.state.nv.us/const/",
      "2026-09-05",
      "NOT_RETRIEVED",
      "UNVERIFIED",
      "", // names nothing unresolved, though six fields are UNKNOWN
    ]);
    const report = validateJudicialCorpus(corpus);
    expect(
      report.findings.some((f) => f.code === "judicial/silent-unresolved-gap"),
    ).toBe(true);
  });

  it("rejects good-behavior tenure that also claims a renewal method", () => {
    const corpus = withRow([
      "us-nv",
      "COURT_OF_LAST_RESORT",
      "Court of Contradiction",
      "NONE",
      "GOOD_BEHAVIOR",
      "RETENTION_ELECTION", // a hold that does not lapse is not renewed
      "EXECUTIVE_NOMINATION@President>LEGISLATIVE_CONFIRMATION@Senate",
      "EXECUTIVE_NOMINATION@President>LEGISLATIVE_CONFIRMATION@Senate",
      "NOT_APPLICABLE",
      "NO_REQUIREMENT_FOUND",
      "NO_REQUIREMENT_FOUND",
      "NO_REQUIREMENT_FOUND",
      "NO_REQUIREMENT_FOUND",
      "NO_REQUIREMENT_FOUND",
      "Federal Constitution",
      "Constitution",
      "art. III",
      "https://constitution.congress.gov/constitution/",
      "2026-09-05",
      "NOT_RETRIEVED",
      "UNVERIFIED",
      "",
    ]);
    const report = validateJudicialCorpus(corpus);
    expect(
      report.findings.some(
        (f) => f.code === "judicial/good-behavior-with-retention",
      ),
    ).toBe(true);
  });
});

describe("the production gate", () => {
  it("refuses to compile production records, and says why", () => {
    expect(() =>
      sourceDomain.compileProduction({ domain: "x", artifacts: [] }),
    ).toThrow(/compiles no production corpus/);
    expect(sourceDomain.productionGate).toBe(JUDICIAL_PRODUCTION_GATE);
    expect(JUDICIAL_PRODUCTION_GATE).toMatch(/secondary source/);
    expect(JUDICIAL_PRODUCTION_GATE.length).toBeGreaterThan(40);
  });
});
