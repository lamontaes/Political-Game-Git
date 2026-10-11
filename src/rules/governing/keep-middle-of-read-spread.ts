// Lifted unchanged from src/simulation/executive-authority-game-profile.ts; RULES-3, 2026-10-11.

export function middleOfReadSpread(
  values: readonly number[],
  fallback: number,
): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = (sorted.length - 1) / 2;
  if (Number.isInteger(middle)) return sorted[middle]!;
  return Math.round(
    (sorted[Math.floor(middle)]! + sorted[Math.ceil(middle)]!) / 2,
  );
}
