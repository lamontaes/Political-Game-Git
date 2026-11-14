/**
 * Engines that act when a naturally voted income tax is withheld from a
 * person's pay: the price engine's reader ties it to its law once they have
 * heard a story about it. The list sits in its own file with no value
 * imports so the budget engine and the price engine need not import each
 * other, whatever order the modules load in.
 */
import type { CoreAPI } from "./types";

/** The law-row series of an income tax: what a story about its law is filed under. */
export const TAX_LAW_SERIES: ReadonlySet<string> = new Set(["income-tax"]);

/** The policy questions an income tax is adopted or graduated under: the key a learned effect names. */
export const ADOPT_INCOME_TAX_QUESTION =
  "us-policy-positions:fiscal.adopt-income-tax";
export const GRADUATED_INCOME_TAX_QUESTION =
  "us-policy-positions:fiscal.graduated-income-tax";

/** One payday's withholding under one law row an act enacted. */
export interface TaxWithheld {
  readonly id: string;
  readonly personId: string;
  readonly lawId: string;
  /** The policy question the tax belongs to, the key a learned effect names. */
  readonly key: string;
  readonly taxMinor: number;
  readonly monthlyEarningsMinor: number;
}

export type TaxListener = (api: CoreAPI, paid: TaxWithheld) => void;
const listeners: TaxListener[] = [];
export function onTaxWithheld(listener: TaxListener): void {
  if (!listeners.includes(listener)) listeners.push(listener);
}
export function notifyTaxWithheld(api: CoreAPI, paid: TaxWithheld): void {
  for (const listener of listeners) listener(api, paid);
}
