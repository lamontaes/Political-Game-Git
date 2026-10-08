import data from "../../../data/research/physical-disaster-estimates.json" with { type: "json" };
import type { EntityId } from "../types";
import type {
  DisasterDamageLevel,
  HazardFamily,
  HazardMagnitude,
} from "./types";

export const PHYSICAL_DISASTER_REFERENCE = data;
export interface HazardPhysicalConditions {
  readonly floodDepthFeet: number;
  readonly windSpeedMph: number;
  readonly source: string;
  readonly estimatedFrom: string | null;
}
export interface HazardAssetProtection {
  readonly targetId: EntityId;
  readonly occupiedFloorFeet: number;
  readonly windResistanceMph: number;
  readonly backupServiceDays: number;
  readonly source: string;
  readonly estimatedFrom: string | null;
}

export function estimatedPhysicalConditions(
  family: HazardFamily,
  magnitude: HazardMagnitude,
): HazardPhysicalConditions {
  return {
    ...data.conditions[family][magnitude],
    source: data.source,
    estimatedFrom: data.estimatedFrom,
  };
}
export function estimatedAssetProtection(
  targetId: EntityId,
): HazardAssetProtection {
  return {
    targetId,
    ...data.protection,
    source: data.source,
    estimatedFrom: data.estimatedFrom,
  };
}
export function validatePhysicalConditions(
  conditions: HazardPhysicalConditions,
): void {
  if (
    ![conditions.floodDepthFeet, conditions.windSpeedMph].every(
      (value) => Number.isFinite(value) && value >= 0,
    ) ||
    !conditions.source.trim()
  )
    throw new Error(
      "A physical hazard needs finite nonnegative observations and their source.",
    );
}
export function validateAssetProtection(
  protection: HazardAssetProtection,
): void {
  if (
    ![protection.occupiedFloorFeet, protection.backupServiceDays].every(
      (value) => Number.isFinite(value) && value >= 0,
    ) ||
    !Number.isFinite(protection.windResistanceMph) ||
    protection.windResistanceMph <= 0 ||
    !protection.source.trim()
  )
    throw new Error(
      "Asset protection needs finite physical capacities and their source.",
    );
}

/** Depth above the occupied floor or wind load above the building capacity. */
export function physicalDamage(
  family: HazardFamily,
  conditions: HazardPhysicalConditions,
  protection: HazardAssetProtection,
  mitigation = 1,
): {
  readonly load: number;
  readonly level: DisasterDamageLevel | null;
  readonly serviceDays: number;
} {
  validatePhysicalConditions(conditions);
  validateAssetProtection(protection);
  if (!Number.isFinite(mitigation) || mitigation < 0)
    throw new Error(
      "Mitigation must be a nonnegative physical exposure factor.",
    );
  const load =
    family === "flood"
      ? Math.max(
          0,
          conditions.floodDepthFeet * mitigation - protection.occupiedFloorFeet,
        )
      : Math.max(
          0,
          (conditions.windSpeedMph / protection.windResistanceMph) ** 2 - 1,
        );
  const limit =
    family === "flood" ? data.destroyedDepthFeet : data.destroyedWindOverload;
  const days =
    load *
    (family === "flood"
      ? data.serviceDaysPerFloodFoot
      : data.serviceDaysPerWindOverload);
  return {
    load,
    level: load > 0 ? (load >= limit ? "destroyed" : "damaged") : null,
    serviceDays: Math.max(0, Math.ceil(days - protection.backupServiceDays)),
  };
}

/** Actual presence, mobility and age bear on injury load; nobody is sampled. */
export function physicalInjury(
  family: HazardFamily,
  load: number,
  capacity: "capable" | "limited" | "incapacitated",
  age: number,
  present: boolean,
): "acute" | "serious" | "fatal" | null {
  if (!present) return null;
  const mobility = data.mobility[capacity];
  const excess =
    family === "flood"
      ? load - mobility.floodEscapeFeet
      : (load - mobility.windShelterOverload) * data.windInjuryScale;
  const strain =
    Math.max(0, excess) * Math.max(1, age / data.ageReferenceYears);
  return strain >= data.fatalInjuryLoad
    ? "fatal"
    : strain >= data.seriousInjuryLoad
      ? "serious"
      : strain > 0
        ? "acute"
        : null;
}
