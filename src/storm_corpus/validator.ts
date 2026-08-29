/**
 * Integrity Validator for NOAA Storm Events Corpus
 *
 * Enforces architectural invariants:
 * 1. Magnitude unit safety
 * 2. Event/episode identity and referential integrity
 * 3. Date ordering (begin <= end)
 * 4. Missing != zero preservation
 * 5. Historical coverage metadata and era boundary validation
 */

import { SCALE_TRANSITION_DATE_EF } from "./coverage";
import type {
  StormCorpus,
  StormEpisodeRecord,
  StormEventRecord,
} from "./types";

export interface ValidationIssue {
  readonly severity: "error" | "warning";
  readonly rule: string;
  readonly entityId: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

export function validateStormCorpus(corpus: StormCorpus): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const episodeMap = new Map<number, StormEpisodeRecord>();
  for (const ep of corpus.episodes) {
    if (episodeMap.has(ep.sourceEpisodeId)) {
      errors.push({
        severity: "error",
        rule: "episode-identity",
        entityId: ep.id,
        message: `Duplicate episode ID: ${ep.sourceEpisodeId}`,
      });
    }
    episodeMap.set(ep.sourceEpisodeId, ep);

    // Episode date ordering
    if (ep.beginDateTime > ep.endDateTime) {
      errors.push({
        severity: "error",
        rule: "date-ordering",
        entityId: ep.id,
        message: `Episode beginDateTime (${ep.beginDateTime}) is after endDateTime (${ep.endDateTime})`,
      });
    }
  }

  const eventIds = new Set<string>();
  const sourceEventIds = new Set<number>();

  for (const event of corpus.events) {
    // 1. Identity uniqueness
    if (eventIds.has(event.id)) {
      errors.push({
        severity: "error",
        rule: "event-identity",
        entityId: event.id,
        message: `Duplicate event id: ${event.id}`,
      });
    }
    eventIds.add(event.id);

    if (sourceEventIds.has(event.sourceEventId)) {
      errors.push({
        severity: "error",
        rule: "event-identity",
        entityId: event.id,
        message: `Duplicate sourceEventId: ${event.sourceEventId}`,
      });
    }
    sourceEventIds.add(event.sourceEventId);

    // 2. Date ordering
    if (event.beginDateTime > event.endDateTime) {
      errors.push({
        severity: "error",
        rule: "date-ordering",
        entityId: event.id,
        message: `Event beginDateTime (${event.beginDateTime}) is after endDateTime (${event.endDateTime})`,
      });
    }

    // 3. Magnitude unit safety & Scale transition
    validateEventMagnitude(event, errors, warnings);

    // 4. Missing != zero preservation checks
    validateMissingZeroIntegrity(event, errors);

    // 5. Historical coverage era validation
    validateCoverageEra(event, errors, warnings);

    // 6. Episode referential integrity
    const parentEpisode = episodeMap.get(event.episodeId);
    if (!parentEpisode) {
      warnings.push({
        severity: "warning",
        rule: "episode-reference",
        entityId: event.id,
        message: `Event references episode ID ${event.episodeId} which is not present in episodes array`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateEventMagnitude(
  event: StormEventRecord,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  const { magnitude, eventFamily, beginDateTime } = event;

  if (eventFamily === "tornado") {
    const isPostEf = beginDateTime >= SCALE_TRANSITION_DATE_EF;
    if (
      magnitude.value !== null &&
      (magnitude.value < 0 || magnitude.value > 5)
    ) {
      errors.push({
        severity: "error",
        rule: "magnitude-unit-safety",
        entityId: event.id,
        message: `Tornado scale value out of range (0-5): ${magnitude.value}`,
      });
    }

    if (magnitude.unit !== null) {
      if (isPostEf && magnitude.unit !== "ef_scale") {
        warnings.push({
          severity: "warning",
          rule: "magnitude-unit-safety",
          entityId: event.id,
          message: `Post-2007 tornado should use EF-scale, but found unit: ${magnitude.unit}`,
        });
      } else if (!isPostEf && magnitude.unit !== "f_scale") {
        warnings.push({
          severity: "warning",
          rule: "magnitude-unit-safety",
          entityId: event.id,
          message: `Pre-2007 tornado should use F-scale, but found unit: ${magnitude.unit}`,
        });
      }
    }
  }

  if (
    eventFamily === "tropical_hurricane" &&
    magnitude.hurricaneCategory !== null
  ) {
    if (magnitude.hurricaneCategory < 1 || magnitude.hurricaneCategory > 5) {
      errors.push({
        severity: "error",
        rule: "magnitude-unit-safety",
        entityId: event.id,
        message: `Hurricane category out of range (1-5): ${magnitude.hurricaneCategory}`,
      });
    }
  }

  if (
    magnitude.unit === "knots" &&
    magnitude.value !== null &&
    magnitude.value < 0
  ) {
    errors.push({
      severity: "error",
      rule: "magnitude-unit-safety",
      entityId: event.id,
      message: `Negative wind speed value: ${magnitude.value}`,
    });
  }
}

function validateMissingZeroIntegrity(
  event: StormEventRecord,
  errors: ValidationIssue[],
): void {
  // Check location coordinates: 0,0 is Gulf of Guinea (invalid null placeholder)
  if (event.location.beginCoordinates) {
    const { latitude, longitude } = event.location.beginCoordinates;
    if (latitude === 0 && longitude === 0) {
      errors.push({
        severity: "error",
        rule: "missing-not-zero",
        entityId: event.id,
        message: "Coordinates (0, 0) should be normalized to null, not zero",
      });
    }
  }

  // Damage qualifier integrity
  if (
    event.damage.property.qualifier === "missing" &&
    event.damage.property.estimatedDollars !== null
  ) {
    errors.push({
      severity: "error",
      rule: "missing-not-zero",
      entityId: event.id,
      message: "Missing property damage cannot have non-null estimated dollars",
    });
  }

  if (
    event.damage.crops.qualifier === "missing" &&
    event.damage.crops.estimatedDollars !== null
  ) {
    errors.push({
      severity: "error",
      rule: "missing-not-zero",
      entityId: event.id,
      message: "Missing crop damage cannot have non-null estimated dollars",
    });
  }
}

function validateCoverageEra(
  event: StormEventRecord,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  const year = parseInt(event.beginDateTime.slice(0, 4), 10);
  if (year < 1955 && event.eventFamily !== "tornado") {
    warnings.push({
      severity: "warning",
      rule: "historical-coverage-era",
      entityId: event.id,
      message: `Non-tornado event in 1950-1954 era (${event.eventType}) violates standard NCEI collection scope`,
    });
  }
}
