/**
 * Magnitude Unit Safety and Scale Parser for NOAA Storm Events
 *
 * Implements strict unit safety and validation for:
 * - Wind (knots vs mph, estimated vs measured qualifiers)
 * - Hail (inches diameter)
 * - Tornado (Fujita F0-F5 vs Enhanced Fujita EF0-EF5 with 2007-02-01 cutoff)
 * - Hurricane (Saffir-Simpson category 1-5)
 * - Flood (cause and crest height in feet)
 */

import type {
  StormEventFamily,
  StormMagnitude,
  StormMagnitudeUnit,
} from "./types";
import { SCALE_TRANSITION_DATE_EF } from "./coverage";

export interface RawMagnitudeInput {
  readonly magnitude?: number | string | null;
  readonly magnitudeType?: string | null;
  readonly torFScale?: string | null;
  readonly torLength?: number | string | null;
  readonly torWidth?: number | string | null;
  readonly category?: number | string | null;
  readonly floodCause?: string | null;
}

export function knotsToMph(knots: number): number {
  return Math.round(knots * 1.15077945 * 10) / 10;
}

export function mphToKnots(mph: number): number {
  return Math.round((mph / 1.15077945) * 10) / 10;
}

/**
 * Parses and validates raw NOAA magnitude fields into a unit-safe StormMagnitude object.
 */
export function parseStormMagnitude(
  input: RawMagnitudeInput,
  eventFamily: StormEventFamily,
  beginDate: string,
): StormMagnitude {
  const rawMagnitude = parseNumeric(input.magnitude);
  const rawMagnitudeType = input.magnitudeType
    ? input.magnitudeType.trim()
    : null;
  const rawTorFScale = input.torFScale
    ? input.torFScale.trim().toUpperCase()
    : null;
  const torLengthMiles = parseNumeric(input.torLength);
  const torWidthYards = parseNumeric(input.torWidth);
  const hurricaneCategory = parseInteger(input.category);
  const floodCause = input.floodCause ? input.floodCause.trim() : null;

  // Tornado magnitude resolution
  if (eventFamily === "tornado") {
    const isPostEfTransition = beginDate >= SCALE_TRANSITION_DATE_EF;
    let unit: StormMagnitudeUnit = isPostEfTransition ? "ef_scale" : "f_scale";
    let scaleValue: number | null = null;

    if (rawTorFScale) {
      const match = rawTorFScale.match(/^(?:EF|F)?([0-5])$/);
      if (match && match[1] !== undefined) {
        scaleValue = parseInt(match[1], 10);
      }
      if (rawTorFScale.startsWith("EF")) {
        unit = "ef_scale";
      } else if (rawTorFScale.startsWith("F")) {
        unit = "f_scale";
      }
    } else if (
      rawMagnitude !== null &&
      rawMagnitude >= 0 &&
      rawMagnitude <= 5
    ) {
      scaleValue = Math.floor(rawMagnitude);
    }

    return {
      value: scaleValue,
      unit,
      magnitudeType: rawMagnitudeType,
      rawMagnitude,
      rawMagnitudeType,
      rawTorFScale,
      torLengthMiles,
      torWidthYards,
      hurricaneCategory: null,
      floodCause: null,
    };
  }

  // Hail magnitude resolution (inches diameter)
  if (
    eventFamily === "severe_storm" &&
    (input.magnitudeType === "INCHES" || rawMagnitudeType === null) &&
    rawMagnitude !== null &&
    rawMagnitude > 0 &&
    rawMagnitude <= 12
  ) {
    // If it's a hail event with magnitude <= 12 inches
    return {
      value: rawMagnitude,
      unit: "inches",
      magnitudeType: rawMagnitudeType,
      rawMagnitude,
      rawMagnitudeType,
      rawTorFScale: null,
      torLengthMiles: null,
      torWidthYards: null,
      hurricaneCategory: null,
      floodCause: null,
    };
  }

  // Tropical / Hurricane resolution
  if (eventFamily === "tropical_hurricane") {
    if (hurricaneCategory !== null) {
      return {
        value: hurricaneCategory,
        unit: "category",
        magnitudeType: rawMagnitudeType,
        rawMagnitude,
        rawMagnitudeType,
        rawTorFScale: null,
        torLengthMiles: null,
        torWidthYards: null,
        hurricaneCategory,
        floodCause,
      };
    }
    if (rawMagnitude !== null && rawMagnitude > 0) {
      const isKnots =
        !rawMagnitudeType ||
        ["EG", "MG", "ES", "MS", "E", "M", "KT", "KTS", "UNK"].includes(
          rawMagnitudeType.toUpperCase(),
        );
      return {
        value: rawMagnitude,
        unit: isKnots ? "knots" : "mph",
        magnitudeType: rawMagnitudeType,
        rawMagnitude,
        rawMagnitudeType,
        rawTorFScale: null,
        torLengthMiles: null,
        torWidthYards: null,
        hurricaneCategory: null,
        floodCause,
      };
    }
  }

  // Wind magnitude resolution (knots vs mph)
  if (eventFamily === "severe_storm") {
    if (rawMagnitude !== null && rawMagnitude > 0) {
      // In NOAA NCEI details, wind magnitudes are stored in Knots (KT).
      // If magnitudeType is EG/MG/ES/MS/E/M or standard NWS wind, it is in Knots.
      const isKnots =
        !rawMagnitudeType ||
        ["EG", "MG", "ES", "MS", "E", "M", "KT", "KTS", "UNK"].includes(
          rawMagnitudeType.toUpperCase(),
        );
      const unit: StormMagnitudeUnit = isKnots ? "knots" : "mph";

      return {
        value: rawMagnitude,
        unit,
        magnitudeType: rawMagnitudeType,
        rawMagnitude,
        rawMagnitudeType,
        rawTorFScale: null,
        torLengthMiles: null,
        torWidthYards: null,
        hurricaneCategory,
        floodCause,
      };
    }
  }

  // Flood cause
  if (eventFamily === "flood") {
    return {
      value: rawMagnitude,
      unit: rawMagnitude !== null ? "feet" : null,
      magnitudeType: rawMagnitudeType,
      rawMagnitude,
      rawMagnitudeType,
      rawTorFScale: null,
      torLengthMiles: null,
      torWidthYards: null,
      hurricaneCategory: null,
      floodCause,
    };
  }

  // Fallback generic magnitude
  return {
    value: rawMagnitude,
    unit: rawMagnitude !== null ? "unknown" : null,
    magnitudeType: rawMagnitudeType,
    rawMagnitude,
    rawMagnitudeType,
    rawTorFScale,
    torLengthMiles,
    torWidthYards,
    hurricaneCategory,
    floodCause,
  };
}

function parseNumeric(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null") return null;
  const num = parseFloat(trimmed);
  return Number.isFinite(num) ? num : null;
}

function parseInteger(val: number | string | null | undefined): number | null {
  const num = parseNumeric(val);
  return num !== null ? Math.floor(num) : null;
}
