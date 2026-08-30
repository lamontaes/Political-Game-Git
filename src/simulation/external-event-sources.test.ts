import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import {
  AUTHORITATIVE_PROVIDER_REGISTRY,
  CORE_EVENT_SOURCE_CONTRACTS,
  filterEligibleEventFamilies,
  isJurisdictionEligibleForEventFamily,
  validateExternalEventSourceContract,
  type ExternalEventSourceContract,
} from "./external-event-sources";

describe("Authoritative External Event Source Routing Foundation", () => {
  it("registers valid authoritative provider metadata for all required sources", () => {
    const providerIds = Object.keys(AUTHORITATIVE_PROVIDER_REGISTRY);
    expect(providerIds).toContain("noaa_ncei_storm_events");
    expect(providerIds).toContain("fema_disaster_declarations");
    expect(providerIds).toContain("doe_417_electric_emergency");
    expect(providerIds).toContain("usgs_earthquake_hazards");
    expect(providerIds).toContain("nifc_wildfire_data");
    expect(providerIds).toContain("cdc_public_health_emergency");

    for (const provider of Object.values(AUTHORITATIVE_PROVIDER_REGISTRY)) {
      expect(provider.name.length).toBeGreaterThan(0);
      expect(provider.authoritativeOrganization.length).toBeGreaterThan(0);
      expect(provider.primaryUrl).toMatch(/^https?:\/\//);
      expect(provider.supportedFamilies.length).toBeGreaterThan(0);
      expect(provider.knownLimitations.length).toBeGreaterThan(0);
    }
  });

  it("validates all built-in core event contracts without errors", () => {
    expect(CORE_EVENT_SOURCE_CONTRACTS.length).toBeGreaterThanOrEqual(6);
    for (const contract of CORE_EVENT_SOURCE_CONTRACTS) {
      expect(() => validateExternalEventSourceContract(contract)).not.toThrow();
    }
  });

  it("strictly enforces calibration rules and rejects fabricated probabilities", () => {
    const invalidContract: ExternalEventSourceContract = {
      ...CORE_EVENT_SOURCE_CONTRACTS[0]!,
      contractId: "invalid:contract",
      calibration: {
        status: "calibrated",
        derivationFormula: "", // Invalid empty formula
        empiricalBasis: "test",
        samplePeriodYears: 10,
      },
    };
    expect(() => validateExternalEventSourceContract(invalidContract)).toThrow(
      /explicit derivationFormula/,
    );

    const unresolvedWithoutRationale: ExternalEventSourceContract = {
      ...CORE_EVENT_SOURCE_CONTRACTS[0]!,
      contractId: "invalid:unresolved",
      calibration: {
        status: "unresolved_requires_research",
        rationale: "", // Missing rationale
      },
    };
    expect(() =>
      validateExternalEventSourceContract(unresolvedWithoutRationale),
    ).toThrow(/explicit research rationale/);
  });

  it("resolves seasonal applicability deterministically", () => {
    const hurricaneContract = CORE_EVENT_SOURCE_CONTRACTS.find(
      (c) => c.eventFamily === "hurricane_tropical_storm",
    )!;

    // Florida in August (Month 8) -> Eligible
    expect(
      isJurisdictionEligibleForEventFamily(
        "FL",
        "hurricane_tropical_storm",
        makeIsoDate("2026-08-15"),
        hurricaneContract,
      ),
    ).toBe(true);

    // Florida in March (Month 3) -> Not eligible seasonally
    expect(
      isJurisdictionEligibleForEventFamily(
        "FL",
        "hurricane_tropical_storm",
        makeIsoDate("2026-03-15"),
        hurricaneContract,
      ),
    ).toBe(false);
  });

  it("resolves geographic eligibility deterministically based on coastal and state constraints", () => {
    const hurricaneContract = CORE_EVENT_SOURCE_CONTRACTS.find(
      (c) => c.eventFamily === "hurricane_tropical_storm",
    )!;

    // Michigan (landlocked) in August -> Ineligible for hurricane contract
    expect(
      isJurisdictionEligibleForEventFamily(
        "MI",
        "hurricane_tropical_storm",
        makeIsoDate("2026-08-15"),
        hurricaneContract,
      ),
    ).toBe(false);

    // North Carolina (coastal) in August -> Eligible
    expect(
      isJurisdictionEligibleForEventFamily(
        "NC",
        "hurricane_tropical_storm",
        makeIsoDate("2026-08-15"),
        hurricaneContract,
      ),
    ).toBe(true);
  });

  it("filters eligible event families for a given jurisdiction and date", () => {
    const flAugust = filterEligibleEventFamilies(
      "FL",
      makeIsoDate("2026-08-15"),
    );
    const flFamilies = flAugust.map((c) => c.eventFamily);
    expect(flFamilies).toContain("hurricane_tropical_storm");
    expect(flFamilies).toContain("major_power_disturbance");
    expect(flFamilies).toContain("wildfire");
    expect(flFamilies).toContain("public_health_emergency");

    const miMarch = filterEligibleEventFamilies(
      "MI",
      makeIsoDate("2026-03-15"),
    );
    const miFamilies = miMarch.map((c) => c.eventFamily);
    expect(miFamilies).not.toContain("hurricane_tropical_storm");
    expect(miFamilies).toContain("tornado_severe_weather");
    expect(miFamilies).toContain("major_power_disturbance");
  });

  it("distinguishes empirical incidents from simulation generated events", () => {
    for (const contract of CORE_EVENT_SOURCE_CONTRACTS) {
      expect(["empirical_incident", "simulation_generated_event"]).toContain(
        contract.recordType,
      );
    }
  });
});
