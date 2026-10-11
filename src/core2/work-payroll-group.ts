/** Same-payee bookkeeping only. No debt-age, legal priority or cash authority is inferred. */
import type { FinanceReadGuard } from "./finance-plan";
import type { PublicWorkPayDue, Source } from "./types";
import type { WorkPayrollRequest } from "./work-pay-period";

export type WorkPayrollAttributionRule = "arrears-then-newly-due-commitment-id";
export interface PublicWorkPayrollGroupDue {
  kind: string;
  id: string;
  date: string;
  authorityId: string;
  ownerId: string;
  organizationId: string;
  personId: string;
  calendarId: string;
  amountMinor: number;
  components: readonly PublicWorkPayDue[];
  source: Source;
}
export interface WorkPayrollAllocation {
  commitmentId: string;
  paidArrearsMinor: number;
  paidNewlyDueMinor: number;
  paidMinor: number;
}
function minor(value: number, zero: number): number {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Payroll group amount is not a safe nonnegative stock.");
  return value;
}
function add(left: number, right: number, zero: number): number {
  return minor(
    Number(BigInt(minor(left, zero)) + BigInt(minor(right, zero))),
    zero,
  );
}
/** ID order is accounting attribution within one owned claim group, never debt age. */
export function allocateWorkPayrollGroup(
  r: FinanceReadGuard,
  supplied: readonly WorkPayrollRequest[],
  actualPaidMinor: number,
  rule: WorkPayrollAttributionRule,
  zero: number,
  one: number,
): Readonly<{
  requestedMinor: number;
  newlyDueMinor: number;
  arrearsBeforeMinor: number;
  allocations: readonly WorkPayrollAllocation[];
}> {
  if (zero !== zero - zero || one !== Math.sign(one) || one <= zero)
    throw new Error(
      "Payroll grouping requires registered exact zero/one units.",
    );
  if (rule !== "arrears-then-newly-due-commitment-id")
    throw new Error(
      "Payroll group has no supported data-owned accounting attribution rule.",
    );
  const rows = r.array(supplied, zero, one);
  if (rows.length <= one)
    throw new Error(
      "Payroll group requires several genuine retained commitments.",
    );
  for (const row of rows) r.payload(row, zero, one);
  const first = rows[zero]!,
    ids = new Set<string>(),
    jobs = new Set<string>();
  let requestedMinor = zero,
    newlyDueMinor = zero,
    arrearsBeforeMinor = zero;
  for (const row of rows) {
    const id = r.field(row, "commitmentId"),
      jobId = r.field(row, "jobId");
    if (
      typeof id !== "string" ||
      !id ||
      id !== id.trim() ||
      ids.has(id) ||
      typeof jobId !== "string" ||
      !jobId ||
      jobId !== jobId.trim() ||
      jobs.has(jobId)
    )
      throw new Error(
        "Payroll group requires distinct actual commitment and admitted job owners.",
      );
    ids.add(id);
    jobs.add(jobId);
    for (const key of [
      "calendarId",
      "personId",
      "organizationId",
      "date",
      "index",
      "fromAt",
      "throughAt",
      "dueAt",
    ] as const)
      if (r.field(row, key) !== r.field(first, key))
        throw new Error(
          "Payroll group changed its actual payee/employer/calendar/payday.",
        );
    const old = minor(r.field(row, "arrearsBeforeMinor"), zero),
      fresh = minor(r.field(row, "newlyDueMinor"), zero),
      requested = minor(r.field(row, "requestedMinor"), zero);
    if (requested !== add(old, fresh, zero))
      throw new Error(
        "Payroll group component request does not conserve old and newly due wages.",
      );
    requestedMinor = add(requestedMinor, requested, zero);
    newlyDueMinor = add(newlyDueMinor, fresh, zero);
    arrearsBeforeMinor = add(arrearsBeforeMinor, old, zero);
  }
  let remaining = minor(actualPaidMinor, zero);
  if (remaining > requestedMinor)
    throw new Error(
      "Payroll group cash exceeds its genuine aggregate request.",
    );
  const sorted = [...rows].sort((a, b) =>
      r.field(a, "commitmentId") < r.field(b, "commitmentId")
        ? -one
        : r.field(a, "commitmentId") > r.field(b, "commitmentId")
          ? one
          : zero,
    ),
    allocations = sorted.map((row) => ({
      commitmentId: r.field(row, "commitmentId"),
      paidArrearsMinor: zero,
      paidNewlyDueMinor: zero,
      paidMinor: zero,
    }));
  for (const key of ["arrearsBeforeMinor", "newlyDueMinor"] as const)
    for (let index = zero; index < sorted.length; index += one) {
      const amount = Math.min(remaining, r.field(sorted[index]!, key));
      remaining -= amount;
      if (key === "arrearsBeforeMinor")
        allocations[index]!.paidArrearsMinor = amount;
      else allocations[index]!.paidNewlyDueMinor = amount;
      allocations[index]!.paidMinor = add(
        allocations[index]!.paidMinor,
        amount,
        zero,
      );
    }
  if (remaining !== zero)
    throw new Error("Payroll group left actual cash unattributed.");
  return Object.freeze({
    requestedMinor,
    newlyDueMinor,
    arrearsBeforeMinor,
    allocations: Object.freeze(allocations.map((row) => Object.freeze(row))),
  });
}
