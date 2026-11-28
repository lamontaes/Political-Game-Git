/**
 * The retirement claims made in play: the runtime map a world keeps, who has claimed, and a claimant returned to the counts. Written for the retirement-claims engine, which re-exports them and stays the map's one setter.
 */
import { addResidentFlow } from "./resident-flows";
import { residentsRuntime } from "./residents-reads";
import type { PersonId, IsoDate, CoreState, CoreAPI } from "./types";

export interface Runtime {
  known: Set<PersonId>;
  /** The year the counts were last checked for people nearing the earliest claim age. */
  countedIndexedYear?: string;
  byDate: Map<IsoDate, PersonId[]>;
  claimed: Map<PersonId, Claim>;
  indexedPeople?: number;
  /** The residents' fill-in count at that check: a household returning from the counts adds no record. */
  indexedFillIns?: number;
}

interface Claim {
  date: IsoDate;
  monthlyMinor: number;
  /** Paid into the place's residents account while the claimant is counted. */
  counted: boolean;
  obligationId: string;
}

export const runtimes = new WeakMap<CoreState, Runtime>();

/** Who has claimed in play, with the date and monthly award. */
export function retirementClaims(
  core: CoreState,
): ReadonlyMap<PersonId, Claim> {
  return runtimes.get(core)?.claimed ?? new Map();
}

/**
 * A claimant returned to the counts (counted-demotion.ts): their award stops
 * paying them and joins the residents' income in their place again, from its
 * next due date, as a counted claimant's does.
 */
export function returnClaimToCounts(
  api: CoreAPI,
  personId: PersonId,
  placeId: string,
): void {
  const rt = runtimes.get(api.state);
  const row = rt?.claimed.get(personId);
  if (!rt || !row || row.counted) return;
  const accounts = api.accounts();
  const own = accounts.obligation(row.obligationId);
  const residentsId = residentsRuntime(api.state)?.input.accounts.find(
    (account) => account.placeId === placeId,
  )?.accountId;
  const payerId = own && api.state.cashJournal.accounts.get(own.from)?.ownerId;
  if (
    !own ||
    own.endedAt !== undefined ||
    !own.nextDueAt ||
    !residentsId ||
    !payerId
  )
    return;
  // Read before it ends: ending clears the row's next due date.
  const { amountMinor, nextDueAt, source } = own;
  accounts.endObligation(row.obligationId);
  const id = `${row.obligationId}:counted:${api.state.date}`;
  addResidentFlow(api.state, {
    id,
    kind: "retirement",
    financeKind: "income.retirement",
    payerId,
    payeeId: residentsId,
    residentsId,
    placeId,
    amountMinor,
    firstAt: nextDueAt,
    cadence: {
      kind: "months",
      every: 1,
      day: Number(nextDueAt.slice(8, 10)),
    },
    salesReceipt: false,
    marketAdjusted: false,
    amountByContract: { [id]: amountMinor },
    source,
  });
  rt.claimed.set(personId, { ...row, counted: true, obligationId: id });
}
