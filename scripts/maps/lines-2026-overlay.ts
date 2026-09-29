/**
 * The U.S. House lines in force for the 2026 general election, as a compact
 * overlay on the Census 119th Congress baseline.
 *
 * Compiled by `npm run compile:district-lines-2026` from the Census Bureau's
 * 120th Congress block equivalency files. States the Census did not republish
 * keep their baseline rows. This module only reads the compiled file so the
 * exporters that own the shipped tables can apply it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const LINES_2026_DIRECTORY = "data/research/district-lines-2026";
export const LINES_2026_FILE = `${LINES_2026_DIRECTORY}/lines-2026.json`;
export const LINES_2026_VINTAGE = "census-bef-cd120-2026";

/**
 * A whole place is one district code. Otherwise the place lists the districts
 * that hold land (`land`), every district that holds any part of it (`all`,
 * water-only slivers included) and whether Census left part of it in no
 * district (`residual`).
 */
export type PlaceLines =
  | string
  | {
      readonly land: readonly string[];
      readonly all: readonly string[];
      readonly residual: boolean;
    };

export interface StateLines2026 {
  readonly stateFips: string;
  readonly stateUsps: string;
  /** Three-digit county code to a district code or the districts with land. */
  readonly counties: Readonly<Record<string, string | readonly string[]>>;
  /** Five-digit place code (the place GEOID without its state) to its lines. */
  readonly places: Readonly<Record<string, PlaceLines>>;
}

export interface Lines2026 {
  readonly format: "ocd-district-lines-2026/v1";
  readonly vintage: typeof LINES_2026_VINTAGE;
  /** When Census published the block files these lines were compiled from. */
  readonly asOf: string;
  /**
   * The first game date the lines are in force.
   * PLACEHOLDER: the start of the 2026 election year for every state. Each
   * state's plan took effect on its own enactment date, which is not sourced
   * yet.
   */
  readonly effectiveFrom: string;
  readonly effectiveFromNote: string;
  readonly states: Readonly<Record<string, StateLines2026>>;
}

export function loadLines2026(root: string): Lines2026 {
  const parsed = JSON.parse(
    readFileSync(join(root, LINES_2026_FILE), "utf8"),
  ) as Lines2026;
  if (parsed.vintage !== LINES_2026_VINTAGE)
    throw new Error(`Unexpected district-lines vintage ${parsed.vintage}.`);
  return parsed;
}

/** District GEOID (state FIPS + district code) for one overlay code. */
export const districtGeoid = (stateFips: string, code: string): string =>
  `${stateFips}${code}`;

export interface PlaceMembership {
  readonly whole: string | null;
  /** Districts a split place touches, residual excluded. */
  readonly candidates: readonly string[];
}

/**
 * Membership as the shipped whole-place table defines it: whole only when the
 * place's entire published area, water included, lies in one district and none
 * of it is in a residual code.
 */
export function placeMembership(
  stateFips: string,
  lines: PlaceLines,
): PlaceMembership {
  if (typeof lines === "string")
    return { whole: districtGeoid(stateFips, lines), candidates: [] };
  const candidates = lines.all.map((code) => districtGeoid(stateFips, code));
  if (lines.all.length === 1 && !lines.residual)
    return { whole: candidates[0] as string, candidates: [] };
  return { whole: null, candidates };
}

/** Land-only candidates, as the map inspector's tables define them. */
export function placeLandDistricts(
  stateFips: string,
  lines: PlaceLines,
): readonly string[] {
  const codes = typeof lines === "string" ? [lines] : lines.land;
  return codes.map((code) => districtGeoid(stateFips, code));
}
