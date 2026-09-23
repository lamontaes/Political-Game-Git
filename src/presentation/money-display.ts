import type { MoneyAmount } from "../simulation";
import { moneyText } from "../simulation/money-text";

/**
 * An amount of money as a player reads it: "$35,410" or "$17.03".
 *
 * Several screens printed the record's own shape, "USD 0.00", which is how an
 * account ledger stores a figure and not how anybody says one. The rule lives
 * in `moneyText`, which the simulation's own sentences use too, so a line the
 * simulation wrote and a line a screen wrote never disagree.
 */
export function displayMoney(amount: MoneyAmount): string {
  return moneyText(amount);
}
