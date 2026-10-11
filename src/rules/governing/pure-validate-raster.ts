// STOPGAP RULES3-GOV-100: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/environment/environment-scene-spec.ts; RULES-3, 2026-10-11.

export interface SceneRasterTierSpec {
  width: number;
  height: number;
  /** Repository-relative path under art/. */
  path: string;
  hash: string;
  derivation:
    | "native-master"
    | "deterministic-downscale"
    | "external-upscale-derivative"
    | "upscaled-development-fixture";
  /**
   * Real detail carried, when less than `width`. Required for any derivation
   * with enlarged lineage, forbidden for the derivations whose pixel width is
   * itself the truth.
   */
  native_detail_width?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function describeValue(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number")
    return Number.isNaN(value) ? "NaN" : `${value}`;
  if (typeof value === "boolean" || typeof value === "undefined") {
    return `${value}`;
  }
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return "symbol";
  if (typeof value === "function") return "function";
  return "object";
}

export const RASTER_DERIVATIONS = new Set<SceneRasterTierSpec["derivation"]>([
  "native-master",
  "deterministic-downscale",
  "external-upscale-derivative",
  "upscaled-development-fixture",
]);

export const DERIVATIONS_REQUIRING_NATIVE_DETAIL = new Set<
  SceneRasterTierSpec["derivation"]
>(["external-upscale-derivative", "upscaled-development-fixture"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function validateRaster(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push("raster must be an object when present.");
    return;
  }
  if (!isNonEmptyString(value.asset_id)) {
    errors.push("raster.asset_id must be a non-empty string.");
  }
  if (!Array.isArray(value.tiers) || value.tiers.length === 0) {
    errors.push("raster.tiers must be a non-empty array.");
    return;
  }
  let previousWidth = 0;
  let previousAspect: number | null = null;
  value.tiers.forEach((tier, index) => {
    const path = `raster.tiers[${index}]`;
    if (!isRecord(tier)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!isPositiveNumber(tier.width) || !isPositiveNumber(tier.height)) {
      errors.push(`${path} must declare positive width and height.`);
      return;
    }
    if (tier.width <= previousWidth) {
      errors.push(`${path} must be wider than the tier before it.`);
    }
    previousWidth = tier.width;
    const aspect = tier.width / tier.height;
    if (previousAspect !== null && Math.abs(aspect - previousAspect) > 0.005) {
      errors.push(`${path} does not preserve the ladder's source aspect.`);
    }
    previousAspect = aspect;
    if (!isNonEmptyString(tier.path)) {
      errors.push(`${path}.path must be a non-empty string.`);
    }
    if (!isNonEmptyString(tier.hash)) {
      errors.push(`${path}.hash must be a non-empty string.`);
    }
    if (
      typeof tier.derivation !== "string" ||
      !RASTER_DERIVATIONS.has(
        tier.derivation as SceneRasterTierSpec["derivation"],
      )
    ) {
      errors.push(
        `${path}.derivation has invalid value ${describeValue(tier.derivation)}.`,
      );
    }
    const declaresDetail = DERIVATIONS_REQUIRING_NATIVE_DETAIL.has(
      tier.derivation as SceneRasterTierSpec["derivation"],
    );
    if (declaresDetail) {
      if (
        !isPositiveNumber(tier.native_detail_width) ||
        tier.native_detail_width > tier.width
      ) {
        errors.push(
          `${path} carries enlarged lineage and must declare the native_detail_width its detail stops at.`,
        );
      }
    } else if (tier.native_detail_width !== undefined) {
      errors.push(
        `${path} declares native_detail_width but its derivation claims full native detail.`,
      );
    }
  });
}

/** Pure adapter: validation appends only to a local copy of the error buffer. */
export function validateRasterRule(
  value: unknown,
  priorErrors: readonly string[] = [],
) {
  const errors = [...priorErrors];
  validateRaster(value, errors);
  return errors;
}
