import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_SOURCE_REGISTRY,
  EventSourceRegistry,
  ExternalEventRouter,
  evaluateCalibrationStatus,
  summarizeRegistryCalibration,
  NOAA_TROPICAL_HURRICANE_SOURCE,
  CDC_PUBLIC_HEALTH_SOURCE,
  type EventSourceDefinition,
} from "../src/event_sources";

describe("National Crisis / External Event Routing Foundation", () => {
  it("registers all 6 authoritative provider families and 10 event families", () => {
    const registry = DEFAULT_EVENT_SOURCE_REGISTRY;
    const sources = registry.getAllSources();

    expect(sources.length).toBeGreaterThanOrEqual(10);

    const families = new Set(sources.map((s) => s.family));
    expect(families.has("tropical_hurricane")).toBe(true);
    expect(families.has("tornado_severe_weather")).toBe(true);
    expect(families.has("flooding")).toBe(true);
    expect(families.has("winter_storm")).toBe(true);
    expect(families.has("extreme_heat_cold")).toBe(true);
    expect(families.has("drought")).toBe(true);
    expect(families.has("wildfire")).toBe(true);
    expect(families.has("earthquake")).toBe(true);
    expect(families.has("major_power_disturbance")).toBe(true);
    expect(families.has("public_health_emergency")).toBe(true);

    const providers = new Set(sources.map((s) => s.provider));
    expect(providers.has("noaa_ncei_storm_events")).toBe(true);
    expect(providers.has("fema_disaster_declarations")).toBe(true);
    expect(providers.has("doe_417_electric_emergency")).toBe(true);
    expect(providers.has("usgs_earthquake_hazards")).toBe(true);
    expect(providers.has("nifc_wildfire_data")).toBe(true);
    expect(providers.has("cdc_public_health_emergencies")).toBe(true);
  });

  it("prevents duplicate source definition registrations", () => {
    const registry = new EventSourceRegistry([]);
    registry.registerSource(NOAA_TROPICAL_HURRICANE_SOURCE);

    expect(() => {
      registry.registerSource(NOAA_TROPICAL_HURRICANE_SOURCE);
    }).toThrow(/already registered/);
  });

  it("evaluates geographic and seasonal eligibility accurately without inventing probabilities", () => {
    const router = new ExternalEventRouter();

    // Tropical Hurricane in Florida in September (Valid)
    const flSept = router.evaluateEligibility({
      stateAbbr: "FL",
      date: "2026-09-15",
    });
    expect(flSept.eligible).toBe(true);
    expect(flSept.matchingSourceIds).toContain(
      "src-noaa-tropical-hurricane-v1",
    );

    // Tropical Hurricane in Kansas in September (Ineligible for Hurricane source)
    const ksSept = router.evaluateEligibility({
      stateAbbr: "KS",
      date: "2026-09-15",
    });
    expect(ksSept.matchingSourceIds).not.toContain(
      "src-noaa-tropical-hurricane-v1",
    );

    // Tropical Hurricane in Florida in January (Inactive season for Hurricane source, but overall eligible for other year-round events)
    const flJan = router.evaluateEligibility({
      stateAbbr: "FL",
      date: "2026-01-15",
    });
    expect(flJan.matchingSourceIds).not.toContain(
      "src-noaa-tropical-hurricane-v1",
    );
    expect(flJan.reasoning.some((r) => r.includes("inactive in month 1"))).toBe(
      true,
    );
  });

  it("differentiates empirical observations from simulation-generated event records", () => {
    const router = new ExternalEventRouter();

    const empiricalRecord = router.createEmpiricalEventRecord(
      "src-noaa-tropical-hurricane-v1",
      {
        id: "evt-emp-hurricane-andrew-1992",
        title: "Hurricane Andrew Landfall",
        date: "1992-08-24",
        empiricalRecordId: "NOAA-STORMEVENTS-1992-ANDREW",
        severity: {
          scaleName: "Saffir-Simpson",
          categoryLabel: "Category 5",
          numericValue: 5,
        },
        affectedGeography: {
          stateAbbrs: ["FL", "LA"],
          fipsCodes: ["12086"],
          locationDescription: "Miami-Dade County, FL",
        },
      },
    );

    expect(empiricalRecord.originKind).toBe("empirical_observation");
    expect(empiricalRecord.empiricalRecordId).toBe(
      "NOAA-STORMEVENTS-1992-ANDREW",
    );
    expect(empiricalRecord.provenance.providerId).toBe(
      "noaa_ncei_storm_events",
    );

    const simRecord = router.createSimulationEventRecord(
      "src-noaa-tropical-hurricane-v1",
      {
        id: "evt-sim-hurricane-2027-01",
        title: "Simulated Category 3 Hurricane",
        date: "2027-09-10",
        severity: {
          scaleName: "Saffir-Simpson",
          categoryLabel: "Category 3",
          numericValue: 3,
        },
        affectedGeography: {
          stateAbbrs: ["NC"],
          fipsCodes: ["37055"],
          locationDescription: "Dare County, NC",
        },
      },
    );

    expect(simRecord.originKind).toBe("simulation_sample");
    expect(simRecord.empiricalRecordId).toBeUndefined();
  });

  it("enforces explicit calibration derivation for calibrated sources and unresolved for ungrounded ones", () => {
    const hurricaneReport = evaluateCalibrationStatus(
      NOAA_TROPICAL_HURRICANE_SOURCE,
    );
    expect(hurricaneReport.status).toBe("calibrated");
    expect(hurricaneReport.isDefensiblyCalculated).toBe(true);
    expect(hurricaneReport.annualOccurrenceRate).toBeGreaterThan(0);
    expect(hurricaneReport.derivationFormula).toBeDefined();

    const cdcReport = evaluateCalibrationStatus(CDC_PUBLIC_HEALTH_SOURCE);
    expect(cdcReport.status).toBe("unresolved");
    expect(cdcReport.isDefensiblyCalculated).toBe(false);
    expect(cdcReport.annualOccurrenceRate).toBeUndefined();
    expect(cdcReport.unresolvedReason).toMatch(/novel pandemic pathogen/i);
  });

  it("summarizes total registry calibration metrics accurately", () => {
    const registry = DEFAULT_EVENT_SOURCE_REGISTRY;
    const summary = summarizeRegistryCalibration(registry.getAllSources());

    expect(summary.reports.length).toBeGreaterThanOrEqual(10);
    expect(summary.calibratedCount).toBeGreaterThan(0);
    expect(summary.unresolvedCount).toBeGreaterThanOrEqual(1); // CDC public health is unresolved
    expect(summary.calibratedCount + summary.unresolvedCount).toBe(
      summary.reports.length,
    );
  });

  it("rejects corrupted calibration definitions missing formulas or rates", () => {
    const corruptSource: EventSourceDefinition = {
      ...NOAA_TROPICAL_HURRICANE_SOURCE,
      id: "src-corrupt-v1",
      calibration: {
        status: "calibrated",
        annualOccurrenceRate: undefined as unknown as number, // missing rate
        formula: "",
      },
    };

    const report = evaluateCalibrationStatus(corruptSource);
    expect(report.status).toBe("unresolved");
    expect(report.isDefensiblyCalculated).toBe(false);
    expect(report.unresolvedReason).toMatch(/missing defensible formula/i);
  });
});
