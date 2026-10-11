// Lifted unchanged from src/simulation/governing/public-program.ts; RULES-3, 2026-10-11.
import type { MoneyAmount } from "../../simulation/types";

export function dollars(amount: MoneyAmount): string {
  return (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
    maximumFractionDigits: amount.minorUnits % 100 === 0 ? 0 : 2,
  });
}
