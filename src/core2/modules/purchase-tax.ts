/**
 * Sales tax on purchases (core2-api-v21, for GOV's sales-tax laws). A tax in
 * force on a place applies to every paid sale by a seller there, full
 * households' and the counted residents' alike: the seller collects it inside
 * the price and remits it to the treasury the same day, one balanced transfer
 * each. A change in the tax a seller collects reaches its price at its next
 * review, at the researched pass-through (`sellerTaxShare`, read by the
 * business price review in finance-state.ts), so buyers pay more when a rate
 * rises and less when an exemption spares them. A grocery exemption is a list
 * of seller classifications (NAICS prefixes, e.g. "445") the tax skips.
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
import { appliedOn, lawApplied } from "../law-reach/applied";
import { residentsRuntime } from "./residents";

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
  /**
   * Part of what sellers of a classification sell is exempt: the share of
   * their sales (0 to 1) the tax skips, for sellers whose classification
   * starts with the prefix (a share of 1 exempts the seller entirely).
   * `lawKey` and `lawId` name the exemption law, recorded as applied to each
   * buyer and seller whose sale it spared.
   */
  exemptions?: readonly {
    readonly classificationPrefix: string;
    readonly share: number;
    readonly lawKey?: string;
    readonly lawId?: string;
  }[];
  /** The law rows this tax enforces (policy key and row id), each recorded as applied to every seller it taxes. */
  laws?: readonly { readonly key: string; readonly lawId: string }[];
  /** First day in force; the next day when left out. */
  from?: IsoDate;
  source: Source;
}

export interface PurchaseTaxState extends PurchaseTaxInput {
  from: IsoDate;
  endedAt?: IsoDate;
  collectedMinor: number;
  /** The rate and exemptions this tax had when the world opened (none for a tax first set later): what opening prices include. */
  opening: Pick<PurchaseTaxInput, "ratePercent" | "exemptions">;
}

const runtimes = new WeakMap<CoreState, Map<string, PurchaseTaxState>>();
registerWorldMapPart("core2-purchase-tax", runtimes);

/** Sales tax a seller couldn't remit: the next remittance adds it and pays it first. */
export interface SalesTaxArrears {
  id: string;
  taxId: string;
  sellerId: string;
  amountMinor: number;
  /** First day tax went unremitted (kept until the arrears clear). */
  since: IsoDate;
  /** The tax law row in force (its id). */
  lawRowId: string;
}

const arrearsRuntimes = new WeakMap<CoreState, Map<string, SalesTaxArrears>>();
registerWorldMapPart("core2-purchase-tax-arrears", arrearsRuntimes);

function arrearsRows(core: CoreState): Map<string, SalesTaxArrears> {
  let rows = arrearsRuntimes.get(core);
  if (!rows) {
    rows = new Map();
    arrearsRuntimes.set(core, rows);
  }
  return rows;
}

export function purchaseTaxArrears(
  core: CoreState,
): ReadonlyMap<string, Readonly<SalesTaxArrears>> {
  return arrearsRows(core);
}

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
  const from = input.from ?? core.date;
  taxes(core).set(input.id, {
    ...input,
    from,
    collectedMinor: prior?.collectedMinor ?? 0,
    opening:
      prior?.opening ??
      (from <= core.startedAt
        ? {
            ratePercent: input.ratePercent,
            ...(input.exemptions ? { exemptions: input.exemptions } : {}),
          }
        : { ratePercent: 0 }),
  });
}

/**
 * The share of a seller's tax-inclusive sales the sales tax takes, summed over
 * the general taxes on its place (a tax limited to some purchase kinds is left
 * out: which kinds a seller sells is not recorded), net of the exempt share of
 * its classification. `opening` reads the taxes as the world opened, the level
 * a seller's opening price already includes.
 */
export function sellerTaxShare(
  core: CoreState,
  organizationId: string,
  at: "now" | "opening",
): number {
  const seller = core.organizations.get(organizationId);
  if (!seller) return 0;
  const classification = seller.classification ?? "";
  let share = 0;
  for (const tax of taxes(core).values()) {
    if (tax.placeId !== seller.placeId || tax.kinds) continue;
    const terms =
      at === "opening"
        ? tax.opening
        : tax.from > core.date ||
            (tax.endedAt !== undefined && tax.endedAt <= core.date)
          ? undefined
          : tax;
    if (!terms) continue;
    const exempt =
      terms.exemptions?.find((row) =>
        classification.startsWith(row.classificationPrefix),
      )?.share ?? 0;
    share += (1 - exempt) * (terms.ratePercent / (100 + terms.ratePercent));
  }
  return share;
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

interface Pending {
  readonly key: string;
  readonly lawId: string;
  readonly targetId: string;
  readonly target: "person" | "group" | "organization";
  /** The place whose counted residents a group target stands for. */
  readonly countedIn?: PlaceId;
  readonly what: string;
  amountMinor: number;
}

/**
 * What the day's sales did to each law's targets, summed per law and target
 * and recorded once when the day ends: a law row per sale would write the
 * same few rows thousands of times.
 */
const pending = new WeakMap<CoreState, Map<string, Pending>>();

function note(
  core: CoreState,
  input: Omit<Pending, "amountMinor">,
  minor: number,
) {
  let day = pending.get(core);
  if (!day) pending.set(core, (day = new Map()));
  const id = `${input.key}|${input.lawId}|${input.targetId}|${input.what}`;
  const held = day.get(id);
  if (held) held.amountMinor += minor;
  else day.set(id, { ...input, amountMinor: minor });
}

/**
 * Record the day's sums as applied rows. A counted household buyer stands for
 * the people its own record counts; the place's residents account (the payer
 * of a flow no household owns) stands for the place's counted people the law's
 * household rows do not already stand for, so a law's counted reach adds up to
 * no more than the town's counted people, once.
 */
function flushApplied(api: CoreAPI): void {
  const day = pending.get(api.state);
  if (!day?.size) return;
  const store = residentsRuntime(api.state)?.store;
  const householdCount = (targetId: string): number | undefined => {
    const index = store?.householdOf.get(targetId);
    const household =
      index === undefined ? undefined : store!.households[index];
    return household ? store!.weightedCount(household) : undefined;
  };
  const record = (row: Pending, count: number | undefined) =>
    lawApplied(api, {
      key: row.key,
      lawId: row.lawId,
      targetId: row.targetId,
      target: row.target,
      ...(count === undefined ? {} : { count: Math.max(1, count) }),
      engine: PURCHASE_TAX_MODULE_ID,
      what: row.what,
      amountMinor: row.amountMinor,
    });
  const accounts: Pending[] = [];
  for (const row of day.values()) {
    if (row.target !== "group") record(row, undefined);
    else if (householdCount(row.targetId) === undefined) accounts.push(row);
    else record(row, householdCount(row.targetId));
  }
  for (const row of accounts) {
    const whole = store?.weightedPeople(row.countedIn!) ?? 1;
    const covered = appliedOn(api, row.key)
      .filter(
        (r) =>
          r.lawId === row.lawId &&
          r.target === "group" &&
          r.targetId !== row.targetId,
      )
      .reduce((n, r) => n + r.count, 0);
    record(row, whole - covered);
  }
  day.clear();
}

/**
 * A sale's buyers and seller, noted under a law. The buyers' money is the tax
 * inside the price they paid (positive); the seller's is what it remitted
 * (positive) or kept of the remittance under an exemption (negative). A
 * buyer's cash is the same either way, so an exemption notes the buyers with 0.
 */
function noteSale(
  core: CoreState,
  sale: SalesReceiptNotice,
  law: { readonly key: string; readonly lawId: string },
  what: string,
  buyersMinor: number,
  sellerMinor: number,
): void {
  const share = Math.round(buyersMinor / Math.max(1, sale.buyerIds.length));
  for (const buyerId of sale.buyerIds)
    note(
      core,
      {
        ...law,
        targetId: buyerId,
        target: sale.counted ? "group" : "person",
        ...(sale.counted ? { countedIn: sale.placeId } : {}),
        what,
      },
      share,
    );
  note(
    core,
    { ...law, targetId: sale.sellerId, target: "organization", what },
    sellerMinor,
  );
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
    const exempt = tax.exemptions?.find((row) =>
      classification.startsWith(row.classificationPrefix),
    );
    const taxable = exempt
      ? sale.paidMinor * (1 - exempt.share)
      : sale.paidMinor;
    const amountMinor = taxInside(taxable, tax.ratePercent);
    if (exempt && exempt.lawKey && exempt.lawId) {
      const spared = taxInside(sale.paidMinor, tax.ratePercent) - amountMinor;
      if (spared > 0)
        noteSale(
          core,
          sale,
          { key: exempt.lawKey, lawId: exempt.lawId },
          "sales-tax-exempt",
          // Prices are tax-inclusive: the buyers pay the same, the seller remits less.
          0,
          -spared,
        );
    }
    if (amountMinor <= 0) continue;
    for (const law of tax.laws ?? [])
      noteSale(
        core,
        sale,
        law,
        "sales-tax-paid",
        amountMinor / tax.laws!.length,
        amountMinor / tax.laws!.length,
      );
    // Tax left unremitted earlier is added to this remittance and paid first.
    const key = `${tax.id}:${seller.id}`,
      prior = arrearsRows(core).get(key),
      owed = amountMinor + (prior?.amountMinor ?? 0);
    const receipt = transfer(core, api, {
      id: `${tax.id}:${sale.id}`,
      from: core.cashJournal.residualAccountByOwner.get(seller.id)!,
      to: tax.payeeAccountId,
      amountMinor: owed,
      reasonKey: "tax.sales",
      source: tax.source,
      partial: true,
    });
    tax.collectedMinor += receipt.paidMinor;
    if (receipt.shortMinor > 0)
      arrearsRows(core).set(key, {
        id: key,
        taxId: tax.id,
        sellerId: seller.id,
        amountMinor: receipt.shortMinor,
        since: prior?.since ?? sale.date,
        lawRowId: tax.id,
      });
    else if (prior) arrearsRows(core).delete(key);
  }
}

export const PURCHASE_TAX_MODULE: CoreModule = {
  id: PURCHASE_TAX_MODULE_ID,
  onSalesReceipt: collect,
  onAfterDay: flushApplied,
};
