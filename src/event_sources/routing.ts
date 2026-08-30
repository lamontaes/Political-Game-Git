import { EventSourceRegistry } from "./registry";
import type {
  ExternalEventRecord,
  GeographicEligibilityRequest,
  GeographicEligibilityResult,
  MonthNumber,
} from "./types";

export class ExternalEventRouter {
  private readonly registry: EventSourceRegistry;

  constructor(registry?: EventSourceRegistry) {
    this.registry = registry ?? new EventSourceRegistry();
  }

  public getRegistry(): EventSourceRegistry {
    return this.registry;
  }

  /**
   * Evaluates geographic, seasonal, and temporal eligibility for external event sources.
   * DOES NOT invent probabilities or trigger random events.
   */
  public evaluateEligibility(
    request: GeographicEligibilityRequest,
  ): GeographicEligibilityResult {
    const allSources = this.registry.getAllSources();
    const matchingSourceIds: string[] = [];
    const reasoning: string[] = [];
    let seasonalEligible = true;

    // Extract month if date supplied
    let targetMonth: MonthNumber | undefined = request.month;
    if (!targetMonth && request.date) {
      const parts = request.date.split("-");
      if (parts.length >= 2) {
        const m = parseInt(parts[1]!, 10);
        if (m >= 1 && m <= 12) {
          targetMonth = m as MonthNumber;
        }
      }
    }

    for (const source of allSources) {
      let isGeoEligible = true;
      let isSeasonEligible = true;

      // Geographic check (State)
      if (request.stateAbbr) {
        const eligibleStates = source.geographicCoverage.eligibleStateAbbrs;
        if (eligibleStates && eligibleStates.length > 0) {
          if (!eligibleStates.includes(request.stateAbbr.toUpperCase())) {
            isGeoEligible = false;
            reasoning.push(
              `Source ${source.id} (${source.family}) ineligible for State ${request.stateAbbr}`,
            );
          }
        }
      }

      // Geographic check (FIPS prefix/county)
      if (request.fipsCode) {
        const eligiblePrefixes = source.geographicCoverage.eligibleFipsPrefixes;
        if (eligiblePrefixes && eligiblePrefixes.length > 0) {
          const matches = eligiblePrefixes.some((prefix) =>
            request.fipsCode!.startsWith(prefix),
          );
          if (!matches) {
            isGeoEligible = false;
            reasoning.push(
              `Source ${source.id} (${source.family}) ineligible for FIPS ${request.fipsCode}`,
            );
          }
        }
      }

      // Seasonal check
      if (targetMonth) {
        const season = source.seasonalApplicability;
        if (!season.appliesYearRound) {
          if (!season.activeMonths.includes(targetMonth)) {
            isSeasonEligible = false;
            reasoning.push(
              `Source ${source.id} (${source.family}) inactive in month ${targetMonth}`,
            );
          }
        }
      }

      if (isGeoEligible && isSeasonEligible) {
        matchingSourceIds.push(source.id);
      }
      if (!isSeasonEligible) {
        seasonalEligible = false;
      }
    }

    const eligible = matchingSourceIds.length > 0;

    return {
      eligible,
      matchingSourceIds,
      seasonalEligible,
      reasoning,
    };
  }

  /**
   * Adapts an empirical historical record into a standardized ExternalEventRecord.
   */
  public createEmpiricalEventRecord(
    sourceId: string,
    payload: {
      id: string;
      title: string;
      date: string; // YYYY-MM-DD
      endDate?: string;
      empiricalRecordId?: string;
      severity: ExternalEventRecord["severity"];
      affectedGeography: ExternalEventRecord["affectedGeography"];
    },
  ): ExternalEventRecord {
    const source = this.registry.requireSource(sourceId);

    return {
      id: payload.id,
      sourceDefinitionId: source.id,
      family: source.family,
      originKind: "empirical_observation",
      title: payload.title,
      date: payload.date,
      endDate: payload.endDate,
      empiricalRecordId: payload.empiricalRecordId,
      severity: payload.severity,
      affectedGeography: payload.affectedGeography,
      provenance: source.provenance,
    };
  }

  /**
   * Adapts a simulation-sampled event into a standardized ExternalEventRecord.
   * Ensures explicit source provenance and simulation origin tagging.
   */
  public createSimulationEventRecord(
    sourceId: string,
    payload: {
      id: string;
      title: string;
      date: string; // YYYY-MM-DD
      endDate?: string;
      severity: ExternalEventRecord["severity"];
      affectedGeography: ExternalEventRecord["affectedGeography"];
    },
  ): ExternalEventRecord {
    const source = this.registry.requireSource(sourceId);

    return {
      id: payload.id,
      sourceDefinitionId: source.id,
      family: source.family,
      originKind: "simulation_sample",
      title: payload.title,
      date: payload.date,
      endDate: payload.endDate,
      severity: payload.severity,
      affectedGeography: payload.affectedGeography,
      provenance: source.provenance,
    };
  }
}
