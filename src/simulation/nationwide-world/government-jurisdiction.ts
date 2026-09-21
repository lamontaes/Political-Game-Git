import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId } from "../types";
import {
  districtOfColumbiaJurisdictionId,
  isDistrictOfColumbia,
} from "./district-of-columbia";

/**
 * One government unit as RULES' government-unit index (rules-capability/v1)
 * describes it: structural identity from the Census 2025 Government Units
 * listing, never a legal power. RULES owns the index; this file only reads the
 * shape.
 */
export interface NationwideGovernmentUnit {
  /** `gus2025:<PID6>`. */
  readonly id: string;
  readonly publisherId: string;
  readonly name: string;
  readonly unitType: "county" | "municipality" | "township";
  readonly stateUsps: string;
  /** Five-digit county AREA. A city's county area does not govern the city. */
  readonly countyGeoid: string | null;
  /** Seven-digit Gazetteer place, set only for a municipality that has one. */
  readonly placeGeoid: string | null;
  readonly functionalActive: boolean;
  readonly asOf: string;
}

export type NationwideGovernmentScope =
  | { readonly kind: "state"; readonly stateUsps: string }
  | { readonly kind: "local"; readonly unit: NationwideGovernmentUnit };

/**
 * The single World jurisdiction a government governs from.
 *
 * Agreed with RULES and CIVIC SERVICE so that a resident's place, the
 * government that serves it and the public account keyed on it name one
 * jurisdiction, not three:
 * - a state is its existing state jurisdiction;
 * - the District of Columbia is one government, so its district-wide scope and
 *   its one city unit name the SAME jurisdiction (see `district-of-columbia`);
 * - a county government is the existing Gazetteer county jurisdiction;
 * - a municipality with a Gazetteer place is that place's jurisdiction;
 * - anything else (most townships) gets an identity of its own.
 *
 * A county unit uses its own county area, which for a county IS the county.
 * A municipality is never mapped to its county area.
 */
export function governingJurisdictionIdFor(
  scope: NationwideGovernmentScope,
): EntityId | null {
  if (scope.kind === "state") {
    // The District is not a state and does not get a second, district-wide
    // identity beside the city government that already governs it.
    if (isDistrictOfColumbia(scope.stateUsps))
      return districtOfColumbiaJurisdictionId();
    return stateJurisdictionForKey(`US-${scope.stateUsps}`)?.id ?? null;
  }
  const { unit } = scope;
  if (unit.unitType === "county" && unit.countyGeoid !== null) {
    return createStableId(
      "jurisdiction",
      `national-county:${unit.countyGeoid}`,
    );
  }
  if (unit.unitType === "municipality" && unit.placeGeoid !== null) {
    return createStableId("jurisdiction", `national-place:${unit.placeGeoid}`);
  }
  return createStableId("jurisdiction", `government-unit:${unit.id}`);
}
