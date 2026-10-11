// Lifted unchanged from src/simulation/governing/constituent-views.ts; RULES-3, 2026-10-11.

export function distinguishable(leading: number, total: number): boolean {
  if (total === 0) return false;
  return Math.abs(leading / total - 0.5) > 1.96 * Math.sqrt(0.25 / total);
}
