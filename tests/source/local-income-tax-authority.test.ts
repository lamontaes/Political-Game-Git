import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  currentTaxPermission,
  queryFiscalAuthority,
  type PortableTaxAuthority,
} from "../../src/fiscal-authority/query";
import type { ArtifactLock } from "../../src/source/core/index";
import { adaptFiscalAuthorityRecords } from "../../src/source/adapters/fiscal-authority";
import { sourceDomain } from "../../src/source/domains/state-local-fiscal-authority";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";

/**
 * A city income tax exists only where the city really has the power to levy
 * one. ChatGPT's A15 answer (DEPTH2, 2026-09-22) established that Ohio
 * Revised Code 718.04 lets a municipal corporation levy one, and that
 * Philadelphia levies one. It did not establish county authority, and it is
 * not a nationwide survey: that is filed as
 * `local-income-tax-authority-56-places`.
 */
const ROOT = resolve(import.meta.dirname, "../..");
const INSTRUMENT = "INDIVIDUAL_INCOME_TAX";

function productionRecords() {
  const lock = JSON.parse(
    readFileSync(
      resolve(
        ROOT,
        "data/source/state-local-fiscal-authority/artifact-lock.json",
      ),
      "utf-8",
    ),
  ) as ArtifactLock;
  return adaptFiscalAuthorityRecords(
    sourceDomain.compileProduction(lock).records,
  );
}

/**
 * The shape a first-party Ohio record will take once the statute text is
 * acquired. A test fixture, not a production record: the corpus has none.
 */
function ohioShapedRecord(
  effectiveFrom: string,
  recordId = "fixture:oh-municipal-income-tax",
): PortableTaxAuthority {
  return {
    kind: "TAX_INSTRUMENT",
    recordId,
    stateUsps: "OH",
    level: "MUNICIPALITY",
    instrument: INSTRUMENT,
    authorization: "AUTHORIZED",
    effectiveFrom,
    effectiveThrough: null,
    sourceAsOf: "2026-09-22",
    source: {
      artifactId: "fixture:oh-rc-718.04",
      citation: "Ohio Revised Code 718.04(A)",
      url: "https://codes.ohio.gov/ohio-revised-code/section-718.04",
      evidenceLocator: "718.04(A)",
      effectiveDateDerivation: null,
      versionApplicability: "CONTINUOUS_INTERVAL",
    },
    constraints: ["Subject to the limits of Ohio Revised Code chapter 718."],
    uncertainty: null,
  };
}

describe("where a local income tax may be levied", () => {
  it("is a question a city decides, in the policy catalog", () => {
    const catalog = createProductionPolicyCatalog();
    const issue = Object.values(catalog.issues).find(
      (candidate) =>
        candidate.stableKey === "us-state-and-local:fiscal.income-tax",
    );
    expect(issue?.levels).toEqual(["state", "municipality"]);
  });

  it("is permitted to no city or county by the production corpus today", () => {
    const records = productionRecords();
    // Proves the sweep below reads a real corpus rather than nothing.
    expect(records.length).toBeGreaterThan(0);
    expect(
      records.filter(
        (record) =>
          record.kind === "TAX_INSTRUMENT" && record.instrument === INSTRUMENT,
      ),
    ).toEqual([]);
    for (const stateUsps of ["OH", "PA", "AK", "MI", "IN"]) {
      for (const level of ["MUNICIPALITY", "COUNTY"]) {
        const result = queryFiscalAuthority(records, {
          stateUsps,
          level,
          instrument: INSTRUMENT,
          asOfDate: "2026-01-15",
        });
        expect(currentTaxPermission(result), `${stateUsps} ${level}`).toBe(
          "UNESTABLISHED",
        );
      }
    }
  });

  it("follows a record to the one state and level it names", () => {
    const records = [ohioShapedRecord("2015-09-29")];
    const ask = (stateUsps: string, level: string) =>
      currentTaxPermission(
        queryFiscalAuthority(records, {
          stateUsps,
          level,
          instrument: INSTRUMENT,
          asOfDate: "2026-01-15",
        }),
      );
    expect(ask("OH", "MUNICIPALITY")).toBe("PERMITTED");
    // Ohio's municipal power is not county power, and not Indiana's.
    expect(ask("OH", "COUNTY")).toBe("UNESTABLISHED");
    expect(ask("IN", "MUNICIPALITY")).toBe("UNESTABLISHED");
  });

  it("does not apply a July rule to January", () => {
    const result = queryFiscalAuthority([ohioShapedRecord("2026-07-01")], {
      stateUsps: "OH",
      level: "MUNICIPALITY",
      instrument: INSTRUMENT,
      asOfDate: "2026-01-15",
    });
    expect(result.state).toBe("NOT_YET_EFFECTIVE");
    expect(currentTaxPermission(result)).toBe("UNESTABLISHED");
  });
});
