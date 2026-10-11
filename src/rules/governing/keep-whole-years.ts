// Lifted unchanged from src/simulation/nationwide-world/state-executives.ts; RULES-3, 2026-10-11.

export function wholeYears(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? value
    : null;
}
