/**
 * One conserving cash move between two recorded owners' main accounts, for
 * the economy engines' own payments (an owner's draw, founding capital, a
 * loan payment). It is the core's `accounts.transfer`, paying what the payer
 * holds; the reason is the id's leading part.
 */
import { countedPayment } from "./counted-money";
import { RESIDENTS_KIND } from "./residents";
import type { CoreAPI, CoreState, Source } from "./types";

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
  // A place's counted residents pay and are paid group by group, from
  // their groups' own accounts (one model, two tiers).
  const organizations = (api.state as CoreState).organizations;
  const from = organizations.get(fromOwnerId),
    to = organizations.get(toOwnerId);
  if (from?.kind === RESIDENTS_KIND || to?.kind === RESIDENTS_KIND)
    return countedPayment(api, {
      id,
      placeId: (from?.kind === RESIDENTS_KIND ? from : to)!.placeId,
      otherOwnerId: from?.kind === RESIDENTS_KIND ? toOwnerId : fromOwnerId,
      amountMinor: from?.kind === RESIDENTS_KIND ? amount : -amount,
      reasonKey: id.split(":")[0]!,
      source,
    });
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
