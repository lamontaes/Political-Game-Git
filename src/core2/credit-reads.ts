/** The credit engine's front door for reads: the town bank, its books, a household's credit months and the loans lent. Each function answers one question; none returns a table. */
import { CREDIT_MODULE_ID } from "./modules/credit";
import type { CoreAPI, CoreState } from "./types";

/** A loan's kept row, the fields the screens and dev views read. */
export interface CreditLoanRow {
  readonly id: string;
  readonly kind: string;
  readonly askedMinor?: number;
  readonly principalMinor?: number;
  readonly annualRate?: number;
  readonly webFactor?: number;
  readonly webLinks?: readonly string[];
  readonly webRecordId?: string;
}

type Row = Readonly<Record<string, unknown>>;

function store(api: CoreAPI) {
  return api.moduleState(CREDIT_MODULE_ID);
}

/** Whether this world keeps the credit engine. */
export function creditKept(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(CREDIT_MODULE_ID);
}

/** The town bank's record (its organization id among its fields). */
export function townBankRecord(api: CoreAPI): Row | undefined {
  if (!creditKept(api)) return undefined;
  return store(api).table("banks").get("credit:bank");
}

/** The bank's books, one row per kept date. */
export function bankBookRows(api: CoreAPI): readonly Row[] {
  if (!creditKept(api)) return [];
  return store(api).table("books").rows();
}

/** A household's kept credit months. */
export function householdCreditMonths(
  api: CoreAPI,
  householdId: string,
): readonly Row[] {
  if (!creditKept(api)) return [];
  return store(api).table("households").query("byHousehold", [householdId]);
}

/** Every loan the engine has lent. */
export function allCreditLoans(api: CoreAPI): readonly CreditLoanRow[] {
  if (!creditKept(api)) return [];
  return store(api).table("loans").rows() as unknown as CreditLoanRow[];
}
