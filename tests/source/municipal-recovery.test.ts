import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  openGovernmentUnitsProduction,
  readPublishedGeneralPurposeUnits,
} from "../../src/source/domains/government-units/index";
import type { ArtifactLock } from "../../src/source/core/index";
import {
  municipalGovernmentByKey,
  municipalGovernments,
  primaryReading,
  lawReading,
} from "../../src/simulation/municipal-government";
import {
  compileMunicipalProduction,
  openMunicipalProduction,
} from "../../src/source/domains/municipal-governance/index";
import inventory from "../../data/source/municipal-governance/research-inventory.json";

function lock(domain: string) {
  return JSON.parse(
    readFileSync(`data/source/${domain}/artifact-lock.json`, "utf8"),
  ) as ArtifactLock;
}
describe("recovered municipal evidence reaches the consumer without identity guesses", () => {
  it("retains the declared packets and every supported state without a fixture/sample ceiling", () => {
    expect(inventory.files.map((row) => row.packet)).toEqual([
      "43A",
      "44",
      "45",
      "46",
      "92I",
    ]);
    expect(municipalGovernments().length).toBeGreaterThan(100);
    expect(new Set(municipalGovernments().map((row) => row.state)).size).toBe(
      51,
    );
    expect(
      primaryReading(municipalGovernmentByKey("us-ar-fayetteville")!).bodySize,
    ).toBe(8);
    expect(
      primaryReading(municipalGovernmentByKey("us-ar-fayetteville")!).form,
    ).toBeNull();
    expect(
      primaryReading(municipalGovernmentByKey("us-nh-new-london")!).form,
    ).toBe("TOWN_MEETING");
  });
  it("proves the new provision against locked bytes and keeps missing procedure unknown", () => {
    const corpus = compileMunicipalProduction(
      openMunicipalProduction(lock("municipal-governance")),
    );
    expect(
      corpus.records.some((row) => row.recordId === "us-or-portland"),
    ).toBe(true);
    const reading = lawReading(municipalGovernmentByKey("us-or-portland")!)!;
    expect(reading.bodySize).toBe(12);
    expect(reading.composition?.note).toContain("three Councilors");
    expect(reading.procedure.passageText).toBeNull();
    expect(reading.procedure.readings).toBeNull();
  });
  it("reads the actual publisher workbook, retaining PID6 and dormant inventory rows", () => {
    const rows = readPublishedGeneralPurposeUnits(
      openGovernmentUnitsProduction(lock("government-units")),
    );
    expect(rows).toHaveLength(38704);
    const unit = rows.find((row) => row.publisherId === "194943")!;
    expect(unit.unitName).toBe("CITY OF CARSON CITY");
    expect(unit.placeFips).toBe("09700");
    expect(unit.evidence.asOf).toBe("2025-06-30");
    expect(rows.some((row) => !row.functionalActive)).toBe(true);
    expect(rows.every((row) => /^\d{6}$/.test(row.publisherId))).toBe(true);
    expect(new Set(rows.map((row) => row.publisherId)).size).toBe(rows.length);
  }, 30000);
  it("never reinterprets county/township geography as a municipal place or PID as GID", () => {
    for (const government of municipalGovernments()) {
      if (
        government.identity &&
        government.identity.governmentUnit.unitType !== "2 - MUNICIPAL"
      )
        expect(government.placeGeoid).toBeNull();
      if (government.identity?.censusGovernmentUnitId) {
        expect(government.identity.censusGovernmentUnitId).toMatch(/^\d{14}$/);
        expect(government.identity.censusGovernmentUnitId).not.toBe(
          government.identity.publisherId,
        );
      }
      if (!government.identity) expect(government.placeGeoid).toBeNull();
    }
  });
});
