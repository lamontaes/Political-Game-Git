// stopgapId: "economy.operating-income-omits-other-costs"
export function modeledLocalBusinessOperatingIncomeMinor(
  receiptsMinor: number,
  payrollMinor: number,
): number {
  if (
    !Number.isSafeInteger(receiptsMinor) ||
    receiptsMinor < 0 ||
    !Number.isSafeInteger(payrollMinor) ||
    payrollMinor < 0
  )
    throw new Error(
      "Business receipts and payroll must be nonnegative minor units.",
    );
  return Math.max(0, receiptsMinor - payrollMinor);
}
