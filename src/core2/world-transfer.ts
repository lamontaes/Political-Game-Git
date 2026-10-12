/**
 * One conserving cash move between two recorded owners' main accounts, for
 * the economy engines' own payments (an owner's draw, founding capital, a
 * loan payment). It is the core's `accounts.transfer`, paying what the payer
 * holds; the reason is the id's leading part.
 */
import type { CoreAPI, Source } from "./types";

/** Moves `amountMinor` from one owner's cash to another's; never more than the payer holds. */
export function transferCash(
  api: CoreAPI,
  id: string,
  fromOwnerId: string,
  toOwnerId: string,
  amountMinor: number,
  source: Source,
): number {
  const amount = Math.floor(amountMinor);
  if (!(amount > 0)) return 0;
  const accounts = api.accounts();
  return accounts.transfer({
    id,
    from: accounts.main(fromOwnerId),
    to: accounts.main(toOwnerId),
    amountMinor: amount,
    reasonKey: id.split(":")[0]!,
    source,
    partial: true,
  }).paidMinor;
}
