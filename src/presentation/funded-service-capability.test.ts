import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  COVERAGE_PATH,
  renderCoverageDocument,
} from "../../scripts/civic-service/coverage";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import {
  FUNDED_SERVICE_FIELDS,
  fundedServiceRefusal,
  nationwideFundedServiceCoverage,
  resolveStateFundedServiceCapability,
} from "./funded-service-capability";
import { transitOffice } from "./transit-work";

describe("funded civic service capability across the registry", () => {
  it("admits every field for Alaska from the registries that own them", () => {
    const alaska = resolveStateFundedServiceCapability("US-AK");
    expect(alaska.supported).toBe(true);
    expect(alaska.readings.map((row) => row.field)).toEqual([
      ...FUNDED_SERVICE_FIELDS,
    ]);
    expect(alaska.missing).toEqual([]);
  });

  it("names the exact missing fields instead of a whole-state gate", () => {
    // Nevada has compiled procedure, so only the unrelated fields are missing.
    const nevada = resolveStateFundedServiceCapability("US-NV");
    expect(nevada.supported).toBe(false);
    expect(nevada.missing).not.toContain("legislative-procedure");
    expect(nevada.missing).toEqual(
      expect.arrayContaining(["revenue-decision", "tax-power"]),
    );
    const wyoming = resolveStateFundedServiceCapability("US-WY");
    expect(wyoming.missing).toContain("legislative-procedure");
    expect(fundedServiceRefusal(wyoming)).toMatch(
      /^Funded public service is not yet playable for Wyoming\. Missing: compiled legislative procedure;/,
    );
  });

  it("covers all 50 states and every loaded local government, claiming none it cannot run", () => {
    const coverage = nationwideFundedServiceCoverage();
    expect(coverage.states.map((row) => row.jurisdictionKey)).toEqual([
      ...ARTICLE_V_STATE_KEYS,
    ]);
    expect(coverage.states.filter((row) => row.supported)).toHaveLength(1);
    expect(coverage.local.governments).toBeGreaterThan(0);
    expect(coverage.local.supported).toBe(0);
  });

  it("uses the same resolution at the player's office gate", () => {
    const kentucky = suppliedLegislativeSeat("US-KY", "house");
    const office = transitOffice(kentucky.world, kentucky.personId);
    expect(office).toEqual({
      kind: "unavailable",
      reason: fundedServiceRefusal(
        resolveStateFundedServiceCapability("US-KY"),
      ),
    });
    const alaska = suppliedLegislativeSeat("US-AK", "house");
    expect(transitOffice(alaska.world, alaska.personId).kind).toBe("available");
  });

  it("keeps the generated coverage document current", async () => {
    expect(readFileSync(COVERAGE_PATH, "utf8")).toBe(
      await renderCoverageDocument(),
    );
  });
});
