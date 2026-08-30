import { describe, expect, it } from "vitest";
import {
  AUTHORITATIVE_PROVIDER_REGISTRY,
  CORE_EVENT_SOURCE_CONTRACTS,
  validateExternalEventSourceContract,
  type ExternalEventSourceContract,
} from "./index";

describe("Isolated Event Source Package Guard Tests", () => {
  it("preserves authoritative provider metadata with explicit physical vs administrative nature", () => {
    const fema = AUTHORITATIVE_PROVIDER_REGISTRY["fema_disaster_declarations"];
    expect(fema.reportedEventNature).toBe(
      "administrative_declaration_or_response",
    );

    const noaa = AUTHORITATIVE_PROVIDER_REGISTRY["noaa_ncei_storm_events"];
    expect(noaa.reportedEventNature).toBe("underlying_physical_hazard");

    const doe = AUTHORITATIVE_PROVIDER_REGISTRY["doe_417_electric_emergency"];
    expect(doe.reportedEventNature).toBe("utility_grid_report");

    const cdc = AUTHORITATIVE_PROVIDER_REGISTRY["cdc_public_health_emergency"];
    expect(cdc.reportedEventNature).toBe("public_health_surveillance_record");
  });

  it("validates core contracts and enforces non-conflation of physical hazards and administrative responses", () => {
    for (const contract of CORE_EVENT_SOURCE_CONTRACTS) {
      expect(() => validateExternalEventSourceContract(contract)).not.toThrow();
    }

    const conflatedContract: ExternalEventSourceContract = {
      ...CORE_EVENT_SOURCE_CONTRACTS[1]!, // FEMA contract
      eventNature: "underlying_physical_hazard", // Violates provider's administrative_declaration_or_response nature
    };

    expect(() =>
      validateExternalEventSourceContract(conflatedContract),
    ).toThrow(
      /Administrative declarations and physical hazards must not be conflated/,
    );
  });

  it("prohibits hard seasonal and duration prohibitions in contracts", () => {
    const hardProhibitionContract: ExternalEventSourceContract = {
      ...CORE_EVENT_SOURCE_CONTRACTS[0]!,
      seasonality: {
        peakObservationNote: "Invalid hard prohibition",
        observedActiveMonths: [6, 7],
        isHardProhibition: true as unknown as false,
      },
    };

    expect(() =>
      validateExternalEventSourceContract(hardProhibitionContract),
    ).toThrow(
      /Seasonal observations must never impose binary impossibility rules/,
    );
  });

  it("requires explicit research rationale and missing evidence for unresolved calibration status", () => {
    const invalidUnresolvedContract: ExternalEventSourceContract = {
      ...CORE_EVENT_SOURCE_CONTRACTS[0]!,
      calibration: {
        status: "unresolved_requires_research",
        rationale: "",
        missingEvidence: [],
      },
    };

    expect(() =>
      validateExternalEventSourceContract(invalidUnresolvedContract),
    ).toThrow(/Unresolved calibration status must specify explicit rationale/);
  });

  it("ensures earthquake calibration is unresolved when regional parameter matrices are missing", () => {
    const eqContract = CORE_EVENT_SOURCE_CONTRACTS.find(
      (c) => c.eventFamily === "earthquake",
    )!;
    expect(eqContract.calibration.status).toBe("unresolved_requires_research");
    expect(
      (eqContract.calibration as { missingEvidence: readonly string[] })
        .missingEvidence,
    ).toContain("Localized Gutenberg-Richter (a,b) grids");
  });

  it("distinguishes empirical incident records from simulation-generated event records", () => {
    for (const contract of CORE_EVENT_SOURCE_CONTRACTS) {
      expect(["empirical_incident", "simulation_generated_event"]).toContain(
        contract.recordType,
      );
    }
  });
});
