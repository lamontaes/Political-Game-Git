/**
 * The state-office qualifications compiler.
 *
 * The domain preserves both research transports and promotes only claims that
 * clear 31F §8's first-party artifact gate. These tests exercise the transport,
 * fixture, and production boundaries, including an office that does not exist,
 * an office not yet operative, a requirement nobody has established, and an
 * authority that was read and is silent.
 *
 * They also pin PR #72's specific failures as permanent validation errors.
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  QUALIFICATION_COLUMNS,
  RECOVERED_31D_QUALIFICATION_COLUMNS,
  QUALIFICATIONS_SOURCE_BOUNDARY,
  REJECTED_PLACEHOLDER_CITATIONS,
  compileQualificationFixture,
  compileQualificationResearchTransport,
  isOfficeExistence,
  openQualificationFixture,
  parseQualificationMatrix,
  sourceDomain,
  validateQualificationCorpus,
} from "../../src/source/domains/state-office-qualifications/index";
import type { QualificationRecord } from "../../src/source/domains/state-office-qualifications/index";
import { isClean } from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = "fixtures/source/state-office-qualifications/mixed-states.json";

function compiled() {
  return compileQualificationFixture(openQualificationFixture(FIXTURE));
}

describe("the qualifications compiler", () => {
  it("compiles a fixture matrix end to end", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.records.length).toBeGreaterThan(8);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
  });

  it("makes an office that does not exist a fact about the entity, not a field", () => {
    const record = compiled().records.find(
      (entry) => entry.recordId === "ZZ:SECRETARY_OF_STATE:EXISTENCE",
    );
    expect(record).toBeDefined();
    expect(isOfficeExistence(record as QualificationRecord)).toBe(true);
    if (record && isOfficeExistence(record)) {
      expect(record.exists.state).toBe("KNOWN");
      if (record.exists.state === "KNOWN")
        expect(record.exists.value).toBe(false);
    }
  });

  it("keeps an office created but not yet operative out of present truth", () => {
    const record = compiled().records.find(
      (entry) => entry.recordId === "ZZ:LIEUTENANT_GOVERNOR:EXISTENCE",
    );
    expect(record && isOfficeExistence(record)).toBe(true);
    if (record && isOfficeExistence(record)) {
      expect(record.exists.state).toBe("NOT_YET_OPERATIVE");
      if (record.exists.state === "NOT_YET_OPERATIVE") {
        expect(record.exists.operativeFrom).toBe("2027-01-04");
      }
    }
  });

  it("leaves no value key on a requirement nobody established", () => {
    const corpus = compiled();
    for (const id of [
      "ZZ:GOVERNOR:PROFESSIONAL_QUALIFICATION",
      "ZZ:GOVERNOR:TERM_LIMIT",
      "ZZ:GOVERNOR:DISTRICT_RESIDENCE",
    ]) {
      const record = corpus.records.find((entry) => entry.recordId === id);
      expect(record, id).toBeDefined();
      if (record && !isOfficeExistence(record)) {
        expect(record.requirement.state).not.toBe("KNOWN");
        expect(record.requirement).not.toHaveProperty("value");
      }
    }
  });

  it("distinguishes an authority that was read and is silent from nobody having looked", () => {
    const corpus = compiled();
    const silent = corpus.records.find(
      (r) => r.recordId === "ZZ:GOVERNOR:TERM_LIMIT",
    );
    const unlooked = corpus.records.find(
      (r) => r.recordId === "ZZ:GOVERNOR:PROFESSIONAL_QUALIFICATION",
    );
    if (silent && !isOfficeExistence(silent)) {
      expect(silent.requirement.state).toBe("NO_REQUIREMENT_FOUND");
    }
    if (unlooked && !isOfficeExistence(unlooked)) {
      expect(unlooked.requirement.state).toBe("UNKNOWN");
    }
  });

  it("carries a normalization-review flag rather than clearing it", () => {
    const record = compiled().records.find(
      (entry) => entry.recordId === "ZZ:ATTORNEY_GENERAL:MINIMUM_AGE",
    );
    if (record && !isOfficeExistence(record)) {
      expect(record.normalizationReviewRequired).toBe(true);
    }
    const report = validateQualificationCorpus(compiled());
    expect(
      report.findings.some(
        (f) => f.code === "qualifications/awaiting-normalization-review",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(true);
  });
});

describe("the matrix reader refuses a shape it cannot transcribe", () => {
  it("matches only a complete cited provision, never a section-number prefix", async () => {
    const { locatorNames } =
      await import("../../src/source/domains/state-office-qualifications/index");
    expect(
      locatorNames("Neb. Const. art. III, § 12", "Neb. Const. art. III, § 1"),
    ).toBe(false);
    expect(
      locatorNames(
        "Minn. Const. art. VII, § 6; art. IV, § 6",
        "Minn. Const. art. VII, § 6",
      ),
    ).toBe(true);
  });

  it("recovers 31D as the exact 14-column transport found in Drive", () => {
    const bytes = readFileSync(
      resolve(REPO, "docs/research/31D-recovered-qualifications.tsv"),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "bc8afda99ae2e9e22180126bc4801fbd9fe5c6f9f3e12f442f8e16ab5de50473",
    );
    const table = parseQualificationMatrix(bytes);
    expect(table.schema.schemaId).toBe("31D-export-14");
    expect(table.header).toEqual([...RECOVERED_31D_QUALIFICATION_COLUMNS]);
    expect(table.rows).toHaveLength(601);
    for (const row of table.rows) expect(row.fields).toHaveLength(14);

    const normalized = compileQualificationResearchTransport(
      bytes,
      "drive:31D:1t0n5YuknltD2poTWWCGOvb7bRXaylAd0",
      "2026-09-08",
    );
    expect(normalized.productionStatus).toBe("staged-secondary-research");
    expect(normalized.records).toHaveLength(601);
    const derived = normalized.records.find(
      (record) => record.recordId === "OH:LOWER_CHAMBER:MINIMUM_AGE",
    );
    expect(derived?.citedAuthority).toMatchObject({
      derivation: "DERIVED",
      derivationChain: "Ohio Const. art. XV § 4 & art. V § 1",
      notes: "No 21-year requirement in Art. II",
    });
  });

  it("rejects a matrix whose tab delimiters did not survive — 31F finding 31F-01", () => {
    const spaceSeparated = `${QUALIFICATION_COLUMNS.join(" ")}\nZZ GOVERNOR Minimum Age KNOWN 30\n`;
    expect(() =>
      parseQualificationMatrix(Buffer.from(spaceSeparated, "utf-8")),
    ).toThrow(/tab characters did not survive transport/);
  });

  it("rejects a matrix whose columns are not the declared schema", () => {
    const wrong = "state\toffice\n" + "ZZ\tGOVERNOR\n";
    expect(() => parseQualificationMatrix(Buffer.from(wrong, "utf-8"))).toThrow(
      /has 2|declares "office_family"/,
    );
  });
});

describe("PR #72's failures are permanent validation errors", () => {
  function withRow(
    row: string[],
  ): ReturnType<typeof compileQualificationFixture> {
    const fixture = JSON.parse(
      readFileSync(resolve(REPO, FIXTURE), "utf-8"),
    ) as {
      artifacts: { matrixTsv: string };
    };
    const tsv = `${fixture.artifacts.matrixTsv}${row.join("\t")}\n`;
    const path = resolve(
      REPO,
      "fixtures/source/state-office-qualifications/probe.json",
    );
    writeFileSync(
      path,
      JSON.stringify({
        __fixture: true,
        fixtureId: "state-office-qualifications/probe",
        artifacts: { matrixTsv: tsv },
      }),
    );
    try {
      return compileQualificationFixture(
        openQualificationFixture(
          "fixtures/source/state-office-qualifications/probe.json",
        ),
      );
    } finally {
      rmSync(path, { force: true });
    }
  }

  it("rejects the placeholder URL #72 used for all 1,819 of its citations", () => {
    const corpus = withRow([
      "XX",
      "GOVERNOR",
      "Minimum Age",
      "KNOWN",
      "30 years",
      "Unknown",
      "unspecified",
      "2020-01-01",
      "DIRECT",
      "false",
      "https://www.elections.gov/official-sources",
      "A placeholder citation.",
    ]);
    const report = validateQualificationCorpus(corpus);
    expect(
      report.findings.some(
        (f) => f.code === "qualifications/rejected-placeholder-citation",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
    expect(REJECTED_PLACEHOLDER_CITATIONS.length).toBeGreaterThan(0);
  });

  it("rejects the standard-term-limit string #72 wrote in place of a rule", () => {
    const corpus = withRow([
      "XX",
      "GOVERNOR",
      "Term Limit Rule",
      "KNOWN",
      "Standard state term limit",
      "Constitution",
      "art. I",
      "2020-01-01",
      "DIRECT",
      "false",
      "https://example.gov/constitution",
      "A placeholder value.",
    ]);
    const report = validateQualificationCorpus(corpus);
    expect(
      report.findings.some(
        (f) => f.code === "qualifications/rejected-placeholder-value",
      ),
    ).toBe(true);
  });

  it("rejects a citation with no locator and one with no effective date", () => {
    const noLocator = withRow([
      "XX",
      "GOVERNOR",
      "Minimum Age",
      "KNOWN",
      "30 years",
      "Constitution",
      "",
      "2020-01-01",
      "DIRECT",
      "false",
      "https://example.gov/constitution",
      "No locator.",
    ]);
    expect(
      validateQualificationCorpus(noLocator).findings.some(
        (f) => f.code === "qualifications/no-legal-locator",
      ),
    ).toBe(true);

    const noDate = withRow([
      "XX",
      "GOVERNOR",
      "Minimum Age",
      "KNOWN",
      "30 years",
      "Constitution",
      "art. I",
      "",
      "DIRECT",
      "false",
      "https://example.gov/constitution",
      "No date.",
    ]);
    expect(
      validateQualificationCorpus(noDate).findings.some(
        (f) => f.code === "qualifications/no-effective-date",
      ),
    ).toBe(true);
  });
});

describe("the production source boundary", () => {
  it("compiles only its own locked authorities", () => {
    expect(() =>
      sourceDomain.compileProduction({ domain: "x", artifacts: [] }),
    ).toThrow(/was handed the lock for/);
    expect(sourceDomain.productionGate).toBeUndefined();
    expect(QUALIFICATIONS_SOURCE_BOUNDARY).toMatch(/31F section 8/);

    const lock = JSON.parse(
      readFileSync(
        resolve(
          REPO,
          "data/source/state-office-qualifications/artifact-lock.json",
        ),
        "utf8",
      ),
    ) as ArtifactLock;
    const compiled = sourceDomain.compileProduction(lock);
    expect(
      compiled.records.every(
        (record) => record.citedAuthority.researchTransport !== undefined,
      ),
    ).toBe(true);
    expect(
      compiled.corpus.inputs.every((input) =>
        lock.artifacts.some(
          (artifact) => artifact.artifactId === input.artifactId,
        ),
      ),
    ).toBe(true);
  });

  it("keeps the compiler-ready matrix as real TSV, with its delimiters intact", () => {
    const tsv = readFileSync(
      resolve(REPO, "docs/research/31F-compiler-ready-claims.tsv"),
      "utf-8",
    );
    const lines = tsv.trim().split("\n");
    expect(lines).toHaveLength(119);
    for (const line of lines) expect(line.split("\t")).toHaveLength(12);
    expect(lines[0]?.split("\t")).toEqual([...QUALIFICATION_COLUMNS]);
  });
});
