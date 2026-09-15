import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  COVERAGE_AS_OF,
  COVERAGE_PATH,
  renderCoverageDocument,
} from "../../scripts/civic-service/coverage";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { makeIsoDate } from "../simulation/dates";
import {
  RULES_CAPABILITY_VERSION,
  resolveCapability,
} from "../simulation/rule-capability-resolver";
import {
  FUNDED_SERVICE_FIELDS,
  fundedServiceRefusal,
  nationwideFundedServiceCoverage,
  resolveStateFundedServiceCapability,
} from "./funded-service-capability";
import { transitOffice } from "./transit-work";

const ON = makeIsoDate("2027-02-01");

describe("funded civic service capability across the registry", () => {
  it("admits every field for Alaska, taking its institution from rules-capability/v1", () => {
    const alaska = resolveStateFundedServiceCapability("US-AK", ON);
    expect(alaska.supported).toBe(true);
    expect(alaska.readings.map((row) => row.field)).toEqual([
      ...FUNDED_SERVICE_FIELDS,
    ]);
    expect(alaska.missing).toEqual([]);
    expect(
      alaska.readings.find((row) => row.field === "legislative-procedure")!
        .basis,
    ).toContain(`${RULES_CAPABILITY_VERSION} institution.form`);
  });

  it("follows RULES' institution answer and names the exact missing fields", () => {
    for (const key of ["US-NV", "US-WY"]) {
      const rules = resolveCapability({
        scope: { kind: "state", stateUsps: key.slice(3) },
        action: "inspect",
        onDate: ON,
      }).fields.find((entry) => entry.field === "institution.form")!;
      const capability = resolveStateFundedServiceCapability(key, ON);
      expect(capability.missing.includes("legislative-procedure")).toBe(
        rules.state !== "ADMITTED",
      );
      expect(capability.supported).toBe(false);
    }
    const nevada = resolveStateFundedServiceCapability("US-NV", ON);
    expect(nevada.missing).toEqual(
      expect.arrayContaining(["revenue-decision", "tax-power"]),
    );
    const wyoming = resolveStateFundedServiceCapability("US-WY", ON);
    expect(wyoming.missing).toContain("legislative-procedure");
    expect(fundedServiceRefusal(wyoming)).toMatch(
      /^Funded public service is not yet playable for Wyoming\. Missing: a compiled legislative institution;/,
    );
  });

  it("covers all 50 states and every loaded local government, claiming none it cannot run", () => {
    const coverage = nationwideFundedServiceCoverage(ON);
    expect(coverage.states.map((row) => row.jurisdictionKey)).toEqual([
      ...ARTICLE_V_STATE_KEYS,
    ]);
    expect(coverage.states.filter((row) => row.supported)).toHaveLength(1);
    expect(coverage.local.governments).toBeGreaterThan(0);
    expect(coverage.local.supported).toBe(0);
  });

  it("uses the same resolution at the player's office gate on the world's date", () => {
    const kentucky = suppliedLegislativeSeat("US-KY", "house");
    expect(transitOffice(kentucky.world, kentucky.personId)).toEqual({
      kind: "unavailable",
      reason: fundedServiceRefusal(
        resolveStateFundedServiceCapability(
          "US-KY",
          kentucky.world.currentDate,
        ),
      ),
    });
    const alaska = suppliedLegislativeSeat("US-AK", "house");
    expect(transitOffice(alaska.world, alaska.personId).kind).toBe("available");
  });

  it("keeps the generated coverage document current on its declared date", async () => {
    expect(COVERAGE_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readFileSync(COVERAGE_PATH, "utf8")).toBe(
      await renderCoverageDocument(),
    );
  });
});
