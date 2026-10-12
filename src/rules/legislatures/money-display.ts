export function formatMinorUnits(minorUnits: number, currency: string): string {
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
    throw new Error(
      `A clause amount must be a non-negative whole number of minor units; received ${minorUnits}.`,
    );
  }
  if (currency !== "USD") {
    throw new Error(
      `This content bank is written in USD; received '${currency}'.`,
    );
  }
  const major = Math.trunc(minorUnits / 100);
  const cents = minorUnits % 100;
  const body = major.toLocaleString("en-US");
  return cents === 0
    ? `$${body}`
    : `$${body}.${String(cents).padStart(2, "0")}`;
}

// stopgapId: "SG-P14-legislatures-legacy-money-english"
