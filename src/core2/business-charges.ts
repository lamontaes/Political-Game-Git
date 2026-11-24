/**
 * What a business pays straight out of its cash under a law or a tax, beside
 * its wages and the suppliers on its books: the employer's share of payroll
 * taxes, the property tax on its premises, what an energy price law adds to
 * its bills, health premiums it pays for its workers, its compliance duties
 * and its profit tax. Each payer engine records the payment here the moment it
 * moves the money, as a running total per business and kind, so the month's
 * books (business.ts, `bookedMonth`) read what the month added without
 * scanning any history. The kinds that are operating costs are weighed by the
 * staffing and closing decisions; profit tax is taken out of profit, so it is
 * read through the business's cash (its cushion, its room to hire), never as a
 * month's loss (lead's call, approved by the owner Nov 16).
 */
import { BUSINESS_MODULE_ID } from "./business-module-id";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, CoreState } from "./types";

export const FIRM_CHARGES_TABLE = "charges";

export const FIRM_CHARGE_KINDS = [
  "compliance",
  "payroll-taxes",
  "premises-tax",
  "energy-laws",
  "health-premiums",
  "profit-tax",
] as const;
export type FirmChargeKind = (typeof FIRM_CHARGE_KINDS)[number];

/** Whether the staffing and closing decisions weigh a kind as an operating cost. */
export function chargeWeighed(kind: FirmChargeKind): boolean {
  return kind !== "profit-tax";
}

export interface FirmChargeRow {
  /** `<business>|<kind>` */
  readonly id: string;
  readonly organizationId: string;
  readonly kind: FirmChargeKind;
  /** Paid since the business opened, signed (a refund lowers it). */
  readonly paidMinor: number;
  /** The law rows behind the payments, newest last. */
  readonly lawIds: readonly string[];
  readonly lastOn: string;
}

/**
 * Record that a business paid `paidMinor` of `kind` today under `lawIds`. A
 * no-op for anyone without business books, and in a world with no business
 * module.
 */
export function firmCharged(
  api: CoreAPI,
  organizationId: string,
  kind: FirmChargeKind,
  paidMinor: number,
  lawIds: readonly string[] = [],
): void {
  const c = api.state as CoreState;
  const amount = Math.round(paidMinor);
  if (amount === 0 || !c.modules.has(BUSINESS_MODULE_ID)) return;
  if (!c.finance.businesses.has(organizationId)) return;
  const table = api.moduleState(BUSINESS_MODULE_ID).table(FIRM_CHARGES_TABLE);
  const id = `${organizationId}|${kind}`;
  const held = table.get(id) as unknown as FirmChargeRow | undefined;
  const laws = [...(held?.lawIds ?? [])];
  for (const lawId of lawIds)
    if (lawId && !laws.includes(lawId)) laws.push(lawId);
  const row: FirmChargeRow = {
    id,
    organizationId,
    kind,
    paidMinor: (held?.paidMinor ?? 0) + amount,
    lawIds: laws,
    lastOn: c.date,
  };
  table.put(row as unknown as ModuleRow);
}

/** A business's running totals by kind (missing kinds paid nothing). */
export function firmChargesOf(
  api: CoreAPI,
  organizationId: string,
): Partial<Record<FirmChargeKind, FirmChargeRow>> {
  const c = api.state as CoreState;
  if (!c.modules.has(BUSINESS_MODULE_ID)) return {};
  const table = api.moduleState(BUSINESS_MODULE_ID).table(FIRM_CHARGES_TABLE);
  const out: Partial<Record<FirmChargeKind, FirmChargeRow>> = {};
  for (const kind of FIRM_CHARGE_KINDS) {
    const row = table.get(`${organizationId}|${kind}`) as unknown as
      FirmChargeRow | undefined;
    if (row) out[kind] = row;
  }
  return out;
}
