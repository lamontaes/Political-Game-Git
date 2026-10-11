// Lifted unchanged from src/simulation/campaign-money-sources.ts; RULES-3, 2026-10-11.

export function dollars(minorUnits: number): string {
  return `$${(minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
