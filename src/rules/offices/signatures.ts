/** P11 KEEP: exact required signature count, including legacy validation. */
import type { PetitionThreshold } from "../../simulation/municipal-election-rules";
import { OFFICES_PARAMETERS } from "./parameters";
export function assertPetitionThreshold(
  threshold: PetitionThreshold,
  label: string,
): void {
  if (
    typeof threshold.percent !== "number" ||
    !Number.isFinite(threshold.percent) ||
    threshold.percent <= 0 ||
    threshold.percent > 100
  ) {
    throw new Error(
      `${label} must be a percentage in (0, 100]: ${threshold.percent}`,
    );
  }
}

export function resolveRequiredSignatures(
  threshold: PetitionThreshold,
  baseCount: number,
): number {
  assertPetitionThreshold(threshold, "A petition threshold");
  if (!Number.isSafeInteger(baseCount) || baseCount < 0) {
    throw new Error(
      `A petition signature base must be a non-negative integer: ${baseCount}`,
    );
  }
  return Math.max(
    0,
    Math.ceil(
      (baseCount * threshold.percent) / 100 -
        OFFICES_PARAMETERS.signatureRoundingTolerance.value,
    ),
  );
}
