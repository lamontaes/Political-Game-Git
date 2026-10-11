// Lifted unchanged from src/simulation/office-salary.ts; RULES-3, 2026-10-11.

export function weeklyMinor(annualMinor: number): number {
  return Math.round(annualMinor / 52);
}
