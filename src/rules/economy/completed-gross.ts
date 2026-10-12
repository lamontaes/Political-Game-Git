export function assessedCompletedHourlyGrossMinor(
  hourlyMinor: number,
  workedMinutes: number,
  contractualGrossMinor: number,
): number {
  if (!Number.isFinite(hourlyMinor) || hourlyMinor < 0)
    throw new Error(
      "Completed hourly gross requires a nonnegative finite rate.",
    );
  if (!Number.isSafeInteger(workedMinutes) || workedMinutes <= 0)
    throw new Error(
      "Completed hourly gross requires positive saved whole minutes.",
    );
  if (!Number.isSafeInteger(contractualGrossMinor) || contractualGrossMinor < 0)
    throw new Error(
      "Completed hourly gross requires a safe contractual amount.",
    );
  const legalGrossMinor = Math.round((hourlyMinor * workedMinutes) / 60);
  if (!Number.isSafeInteger(legalGrossMinor))
    throw new Error(
      "Completed hourly gross must be a safe whole minor-unit amount.",
    );
  return Math.max(contractualGrossMinor, legalGrossMinor);
}
