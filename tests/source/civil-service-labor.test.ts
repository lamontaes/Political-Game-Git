import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isClean } from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
import {
  CIVIL_SERVICE_LABOR_SOURCES,
  JURISDICTIONS,
  compileCivilServiceLabor,
  openCivilServiceLaborArtifacts,
  sourceDomain,
  validateCivilServiceLaborCorpus,
} from "../../src/source/domains/civil-service-labor/index";
import type { CivilServiceLaborRecord } from "../../src/source/domains/civil-service-labor/index";
import { listDomainNames } from "../../scripts/source/registry";

const REPO = resolve(import.meta.dirname, "../..");

function lock(): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source/civil-service-labor/artifact-lock.json"),
      "utf-8",
    ),
  ) as ArtifactLock;
}

function compiled() {
  return compileCivilServiceLabor(openCivilServiceLaborArtifacts(lock()));
}

function byKey(records: readonly CivilServiceLaborRecord[], key: string) {
  const found = records.find((record) => record.jurisdictionKey === key);
  if (!found) throw new Error(`Missing ${key}.`);
  return found;
}

describe("civil-service-labor source domain", () => {
  it("compiles a federal-plus-fifty-state envelope with two distinct profiles each", () => {
    const corpus = compiled();
    expect(corpus.records).toHaveLength(51);
    expect(corpus.records.map((record) => record.jurisdictionKey)).toEqual(
      JURISDICTIONS.map(({ key }) => key),
    );
    for (const record of corpus.records) {
      expect(record.civilService.recordId).toBe(
        `${record.recordId}:civil-service`,
      );
      expect(record.laborBargaining.recordId).toBe(
        `${record.recordId}:labor-bargaining`,
      );
    }
  });

  it("is wired into every source command by directory discovery", () => {
    expect(listDomainNames()).toContain("civil-service-labor");
    expect(sourceDomain.domain).toBe("civil-service-labor");
    expect(CIVIL_SERVICE_LABOR_SOURCES.length).toBeGreaterThan(10);
  });

  it("passes its domain validator", () => {
    expect(isClean(validateCivilServiceLaborCorpus(compiled()))).toBe(true);
  });

  it("compiles distinct verified regimes without a national template", () => {
    const records = compiled().records;
    const federal = byKey(records, "US-FEDERAL");
    const alaska = byKey(records, "US-AK");
    const minnesota = byKey(records, "US-MN");
    const nebraska = byKey(records, "US-NE");

    expect(federal.civilService.appealBody.state).toBe("KNOWN");
    expect(federal.laborBargaining.strikeRestriction).toMatchObject({
      state: "KNOWN",
      value: { rule: "prohibited" },
    });
    expect(alaska.laborBargaining.strikeRestriction).toMatchObject({
      state: "KNOWN",
      value: { rule: "tiered" },
    });
    expect(minnesota.civilService.removalProtection).toMatchObject({
      state: "KNOWN",
      value: { standard: expect.stringContaining("Just cause") },
    });
    expect(nebraska.laborBargaining.impasseRule.state).toBe("KNOWN");
    expect(nebraska.laborBargaining.strikeRestriction.state).toBe("UNKNOWN");
  });

  it("keeps unsupported jurisdictions valueless UNKNOWN field by field", () => {
    for (const key of ["US-IL", "US-KY", "US-TX", "US-NY"]) {
      const record = byKey(compiled().records, key);
      const serialized = JSON.parse(JSON.stringify(record)) as Record<
        string,
        unknown
      >;
      expect(JSON.stringify(serialized)).not.toContain('"state":"KNOWN"');
      expect(JSON.stringify(serialized)).not.toContain('"value"');
    }
  });
});
