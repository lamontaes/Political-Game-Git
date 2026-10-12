/**
 * One conserving cash move between two recorded owners, through postJournal,
 * for the economy engines' own payments (an owner's draw, founding capital).
 * Each move is a canonical record its module resolves for the journal.
 */
import type { ResolvedCashJournalSource } from "./journal";
import type {
  CoreAPI,
  CoreState,
  ModuleCashJournalSourceProvider,
  Source,
} from "./types";

export const WORLD_TRANSFER_KIND = "world:transfer";
type Canonical = ResolvedCashJournalSource & {
  postedJournalSequence?: number;
  completedAt?: string;
};
const records = new WeakMap<CoreState, Map<string, Canonical>>();

function byCore(core: CoreState): Map<string, Canonical> {
  let map = records.get(core);
  if (!map) records.set(core, (map = new Map()));
  return map;
}

export const worldTransferProvider: ModuleCashJournalSourceProvider = (
  api,
  reference,
) => {
  if (reference.kind !== WORLD_TRANSFER_KIND) return undefined;
  const row = byCore(api.state as CoreState).get(reference.id);
  return row ? { resolved: row, marker: row } : undefined;
};

/** Moves `amountMinor` from one owner's cash to another's; never more than the payer holds. */
export function transferCash(
  api: CoreAPI,
  id: string,
  fromOwnerId: string,
  toOwnerId: string,
  amountMinor: number,
  source: Source,
): number {
  const core = api.state as CoreState;
  const from = core.cashJournal.residualAccountByOwner.get(fromOwnerId),
    to = core.cashJournal.residualAccountByOwner.get(toOwnerId);
  const holder =
    core.people.get(fromOwnerId) ?? core.organizations.get(fromOwnerId);
  if (!from || !to || !holder || from === to)
    throw new Error("A transfer needs two recorded cash owners.");
  const amount = Math.min(Math.floor(amountMinor), holder.liquidMinor);
  if (!(amount > 0)) return 0;
  const postings = [
    { id: `${id}:out`, accountId: from, deltaMinor: -amount },
    { id: `${id}:in`, accountId: to, deltaMinor: amount },
  ];
  byCore(core).set(id, {
    kind: WORLD_TRANSFER_KIND,
    id,
    date: core.date,
    source,
    expectedPostings: postings.map((row) => ({ ...row })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  });
  api.postJournal({
    id: `journal:${core.date}:${core.cashJournal.nextSequence}`,
    date: core.date,
    expectedSequence: core.cashJournal.nextSequence,
    sourceRef: { kind: WORLD_TRANSFER_KIND, id },
    postings,
  });
  return amount;
}
