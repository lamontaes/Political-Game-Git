/**
 * Sales tax on purchases (core2-api-v21, for GOV's sales-tax laws). A tax in
 * force on a place applies to every paid sale by a seller there, full
 * households' and the counted residents' alike: the seller collects it inside
 * the price and remits it to the treasury the same day, one balanced transfer
 * each. Household budgets don't grow with the tax, so a higher rate leaves
 * sellers less, as a fixed budget buys less. A grocery exemption is a list of
 * seller classifications (NAICS prefixes, e.g. "445") the tax skips.
 */
import { transfer } from "../accounts";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PlaceId,
  SalesReceiptNotice,
  Source,
} from "../types";
import { registerWorldMapPart } from "../snapshot";

export const PURCHASE_TAX_MODULE_ID = "core2-purchase-tax-v1";

export interface PurchaseTaxInput {
  id: string;
  /** The sellers' place the tax covers. */
  placeId: PlaceId;
  /** Percent of the pre-tax price (6.25 for 6.25%). */
  ratePercent: number;
  /** The treasury account the tax is remitted to. */
  payeeAccountId: string;
  /** Purchase kinds taxed; all purchase kinds when left out. */
  kinds?: readonly string[];
  /** Sellers whose classification starts with one of these are exempt. */
  exemptClassificationPrefixes?: readonly string[];
  /** First day in force; the next day when left out. */
  from?: IsoDate;
  source: Source;
}

export interface PurchaseTaxState extends PurchaseTaxInput {
  from: IsoDate;
  endedAt?: IsoDate;
  collectedMinor: number;
}

const runtimes = new WeakMap<CoreState, Map<string, PurchaseTaxState>>();
registerWorldMapPart("core2-purchase-tax", runtimes);

function taxes(core: CoreState): Map<string, PurchaseTaxState> {
  let rows = runtimes.get(core);
  if (!rows) {
    rows = new Map();
    runtimes.set(core, rows);
  }
  return rows;
}

export function setPurchaseTax(core: CoreState, input: PurchaseTaxInput): void {
  if (!(input.ratePercent >= 0) || !Number.isFinite(input.ratePercent))
    throw new Error(`Purchase tax ${input.id} needs a rate of 0 or more.`);
  if (!core.cashJournal.accounts.has(input.payeeAccountId))
    throw new Error(`Unknown treasury account: ${input.payeeAccountId}`);
  const prior = taxes(core).get(input.id);
  taxes(core).set(input.id, {
    ...input,
    from: input.from ?? core.date,
    collectedMinor: prior?.collectedMinor ?? 0,
  });
}

export function endPurchaseTax(core: CoreState, id: string): void {
  const row = taxes(core).get(id);
  if (!row) throw new Error(`Unknown purchase tax: ${id}`);
  row.endedAt = core.date;
}

export function purchaseTaxes(
  core: CoreState,
): ReadonlyMap<string, Readonly<PurchaseTaxState>> {
  return taxes(core);
}

/** The tax inside a tax-inclusive payment: paid × rate / (100 + rate). */
export function taxInside(paidMinor: number, ratePercent: number): number {
  return Math.floor((paidMinor * ratePercent) / (100 + ratePercent));
}

function collect(api: CoreAPI, sale: SalesReceiptNotice): void {
  const core = api.state;
  const rows = runtimes.get(core);
  if (!rows?.size) return;
  const seller = core.organizations.get(sale.sellerId);
  if (!seller) return;
  for (const tax of rows.values()) {
    if (tax.endedAt !== undefined && tax.endedAt <= sale.date) continue;
    if (tax.from > sale.date || tax.placeId !== seller.placeId) continue;
    if (tax.kinds && !tax.kinds.includes(sale.kind)) continue;
    const classification = seller.classification ?? "";
    if (
      tax.exemptClassificationPrefixes?.some((prefix) =>
        classification.startsWith(prefix),
      )
    )
      continue;
    const amountMinor = taxInside(sale.paidMinor, tax.ratePercent);
    if (amountMinor <= 0) continue;
    const receipt = transfer(core, api, {
      id: `${tax.id}:${sale.id}`,
      from: core.cashJournal.residualAccountByOwner.get(seller.id)!,
      to: tax.payeeAccountId,
      amountMinor,
      reasonKey: "tax.sales",
      source: tax.source,
      partial: true,
    });
    tax.collectedMinor += receipt.paidMinor;
  }
}

export const PURCHASE_TAX_MODULE: CoreModule = {
  id: PURCHASE_TAX_MODULE_ID,
  onSalesReceipt: collect,
};
