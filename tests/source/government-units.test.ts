/**
 * The government-units compiler.
 *
 * The domain ships no production records in this environment — census.gov is
 * unreachable from the coding proxy, so gov_units_2025.zip cannot be acquired
 * and hashed (see the production gate) — so these tests are what demonstrate the
 * compiler is real. They exercise it through the same capability boundary every
 * other domain uses, on the cases that carry the domain's whole point:
 *
 *  1. deterministic compile/replay;
 *  2. missing is distinct from inactive and from not-applicable;
 *  3. government identity is distinct from Census place identity;
 *  4. a county geography does not imply a county government;
 *  5. a duplicate government ID is rejected;
 *  6. evidence and vintage survive normalization;
 *  7. no governance power can appear, because the schema has no field for one;
 *  8. the domain is covered by source:validate and source:replay automatically.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  FORBIDDEN_GOVERNANCE_KEYS,
  GOVERNMENT_UNITS_PRODUCTION_GATE,
  compileGovernmentUnitsFixture,
  openGovernmentUnitsFixture,
  sourceDomain,
  validateGovernmentUnitsCorpus,
} from "../../src/source/domains/government-units/index";
import type { GovernmentUnitRecord } from "../../src/source/domains/government-units/index";
import { isClean } from "../../src/source/core/index";
import { listDomainNames, loadDomains } from "../../scripts/source/registry";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = "fixtures/source/government-units/mixed-units.json";

function compiled() {
  return compileGovernmentUnitsFixture(openGovernmentUnitsFixture(FIXTURE));
}

function record(id: string): GovernmentUnitRecord {
  const found = compiled().records.find((r) => r.censusGovernmentId === id);
  if (!found) throw new Error(`fixture has no government ${id}`);
  return found;
}

/** Compile the fixture with extra tab-separated rows appended. */
function withRows(
  extra: string[][],
): ReturnType<typeof compileGovernmentUnitsFixture> {
  const fixture = JSON.parse(readFileSync(resolve(REPO, FIXTURE), "utf-8")) as {
    artifacts: { listingTsv: string };
  };
  const tsv =
    fixture.artifacts.listingTsv +
    extra.map((r) => r.join("\t")).join("\n") +
    "\n";
  const path = resolve(REPO, "fixtures/source/government-units/probe.json");
  writeFileSync(
    path,
    JSON.stringify({
      __fixture: true,
      fixtureId: "government-units/probe",
      artifacts: { listingTsv: tsv },
    }),
  );
  try {
    return compileGovernmentUnitsFixture(
      openGovernmentUnitsFixture("fixtures/source/government-units/probe.json"),
    );
  } finally {
    rmSync(path, { force: true });
  }
}

describe("the government-units compiler", () => {
  it("compiles the fixture listing end to end and validates clean", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.records).toHaveLength(10);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
    expect(isClean(validateGovernmentUnitsCorpus(corpus))).toBe(true);
  });

  it("1. compiles deterministically: two compiles agree byte-for-byte", () => {
    const first = compiled();
    const second = compiled();
    expect(second.corpus.canonicalSha256).toBe(first.corpus.canonicalSha256);
    // Records are sorted by stable government ID, so order is deterministic.
    const ids = first.records.map((r) => r.censusGovernmentId);
    expect(ids).toEqual([...ids].sort());
  });

  it("2. keeps missing distinct from inactive and from not-applicable", () => {
    // Active: three different answers, three different states.
    expect(record("90100100100000").active.state).toBe("KNOWN"); // County of Example
    const inactive = record("90200109900000").active; // Village of Former
    expect(inactive.state).toBe("KNOWN");
    if (inactive.state === "KNOWN") expect(inactive.value).toBe(false);
    const missing = record("90200105000000").active; // Town of Uncertain, blank status
    expect(missing.state).toBe("UNKNOWN");
    expect(missing).not.toHaveProperty("value");

    // A place crosswalk: applicable-but-unresolved, resolved, and not-applicable.
    const municipalUnknown = record("90200101000000").crosswalk.censusPlace;
    expect(municipalUnknown.state).toBe("UNKNOWN");
    expect(municipalUnknown).not.toHaveProperty("value");

    const resolved = record("90200103000000").crosswalk.censusPlace; // City of Linked
    expect(resolved.state).toBe("KNOWN");
    if (resolved.state === "KNOWN") expect(resolved.value).toBe("9099999");

    const specialPlace = record("90400001200000").crosswalk.censusPlace;
    expect(specialPlace.state).toBe("NOT_APPLICABLE");

    // A statewide special district (county 000) has no county to resolve to.
    const statewideCounty =
      record("90400001200000").crosswalk.countyOrEquivalent;
    expect(statewideCounty.state).toBe("NOT_APPLICABLE");
  });

  it("3. keeps government identity distinct from Census place identity", () => {
    const city = record("90200101000000"); // City of Example
    // The record's identity is its government ID; it carries no place GEOID as
    // an identity field, only an unresolved place crosswalk.
    expect(city.censusGovernmentId).toBe("90200101000000");
    expect(city).not.toHaveProperty("placeGeoid");
    expect(city).not.toHaveProperty("censusPlace");
    expect(city.crosswalk.censusPlace.state).not.toBe("KNOWN");
    // Even where a place crosswalk resolves, its GEOID is a place, not the
    // government's own identifier.
    const linked = record("90200103000000");
    if (linked.crosswalk.censusPlace.state === "KNOWN") {
      expect(linked.crosswalk.censusPlace.value).not.toBe(
        linked.censusGovernmentId,
      );
    }
  });

  it("4. does not let a county geography imply a county government", () => {
    const all = compiled().records;
    const coastal = record("91200302000000"); // City of Coastal, YY, county 003
    expect(coastal.governmentType).toBe("MUNICIPAL");
    expect(coastal.countyCensusCode).toBe("003");
    // The county code is only a geographic locator. No county government exists
    // for (state 91, county 003): the geography is not a governing authority.
    const countyGovernments = all.filter(
      (r) =>
        r.governmentType === "COUNTY" &&
        r.stateCensusCode === "91" &&
        r.countyCensusCode === "003",
    );
    expect(countyGovernments).toHaveLength(0);
    // And the county-geography crosswalk stays unresolved rather than inferred.
    expect(coastal.crosswalk.countyOrEquivalent.state).toBe("UNKNOWN");
  });

  it("5. rejects a duplicate government ID", () => {
    expect(() =>
      withRows([
        [
          "90100100100000", // already County of Example
          "Duplicate County",
          "ZZ",
          "",
          "County",
          "ACTIVE",
          "2025",
          "",
          "",
        ],
      ]),
    ).toThrow(/twice|not an identifier/);
  });

  it("6. carries evidence and vintage through normalization", () => {
    for (const r of compiled().records) {
      expect(r.evidence.artifactId).toBe("government-units/mixed-units");
      expect(r.evidence.locator.kind).toBe("delimited-row");
      expect(r.evidence.locator.artifactId).toBe(
        "government-units/mixed-units",
      );
      expect(r.sourceVintage).toBe("2025");
    }
  });

  it("7. cannot carry a governance power, because the schema has no field for one", () => {
    for (const r of compiled().records) {
      for (const key of Object.keys(r)) {
        expect(FORBIDDEN_GOVERNANCE_KEYS).not.toContain(key);
      }
      // The crosswalk seam carries only geographic links, no authority.
      expect(Object.keys(r.crosswalk).sort()).toEqual([
        "censusPlace",
        "countyOrEquivalent",
        "schoolDistrictGeography",
        "specialDistrictGeography",
      ]);
    }
    const report = validateGovernmentUnitsCorpus(compiled());
    expect(
      report.findings.some(
        (f) => f.code === "government-units/inferred-governance-power",
      ),
    ).toBe(false);
  });

  it("derives government type from the ID's own type digit when the label is blank", () => {
    const uncertain = record("90200105000000"); // blank government_type column
    expect(uncertain.governmentType).toBe("MUNICIPAL");
    expect(uncertain.governmentTypeCode).toBe("2");
  });

  it("establishes the state as the one source-supported parent", () => {
    const yy = record("91100100100000");
    expect(yy.stateUsps).toBe("YY");
    expect(yy.parentStateRelationship.state).toBe("KNOWN");
    if (yy.parentStateRelationship.state === "KNOWN") {
      expect(yy.parentStateRelationship.value).toBe("YY");
    }
  });
});

describe("the listing reader refuses shapes it cannot transcribe", () => {
  it("makes a malformed government ID a defect rather than a record", () => {
    expect(() =>
      withRows([
        ["123", "Too Short", "ZZ", "", "County", "ACTIVE", "2025", "", ""],
      ]),
    ).toThrow(/not a well-formed 14-digit/);
  });

  it("makes a type label that disagrees with the ID a defect", () => {
    expect(() =>
      withRows([
        [
          "90600100100000", // type digit 6 is not a defined government type
          "Impossible Government",
          "ZZ",
          "",
          "County",
          "ACTIVE",
          "2025",
          "",
          "",
        ],
      ]),
    ).toThrow(/not a well-formed 14-digit|disagree/);
  });

  it("makes a type label that names another type a defect", () => {
    expect(() =>
      withRows([
        [
          "90200104000000", // digit 2 = MUNICIPAL
          "Mislabeled Unit",
          "ZZ",
          "",
          "School District",
          "ACTIVE",
          "2025",
          "",
          "",
        ],
      ]),
    ).toThrow(/disagree/);
  });
});

describe("the production gate and command-matrix wiring", () => {
  it("8. is discovered and handled by the command matrix like every domain", async () => {
    expect(listDomainNames()).toContain("government-units");
    const domains = await loadDomains();
    const govUnits = domains.find((d) => d.domain === "government-units");
    expect(govUnits).toBeDefined();
    expect(govUnits?.productionGate).toBe(GOVERNMENT_UNITS_PRODUCTION_GATE);
    // The gate names the acquisition blocker so the manifest and validator
    // carry it rather than reporting a silent absence.
    expect(GOVERNMENT_UNITS_PRODUCTION_GATE).toMatch(/census\.gov/);
    expect(GOVERNMENT_UNITS_PRODUCTION_GATE.length).toBeGreaterThan(40);
  });

  it("refuses to open production artifacts that are not in a lock", () => {
    expect(() =>
      sourceDomain.compileProduction({
        domain: "government-units",
        artifacts: [],
      }),
    ).toThrow(/not in the government-units lock|is not in the/);
  });
});
