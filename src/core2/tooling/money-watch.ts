/**
 * A dev-mode money watch: every journal entry that touches a watched
 * person's accounts, added up by what it was (the entry's source kind and
 * the leading part of its id, such as `work-payroll`, `purchase-tax` or
 * `accounts.transfer rent`). Read-only bookkeeping for the bench: it sees
 * what the journal posts and changes nothing. A watch starts when it is
 * opened; nothing before it is counted.
 */
import { coreAPI } from "../state";
import type { CoreState } from "../types";

export interface MoneyLine {
  /** What the money was for: source kind, and the id's leading part. */
  kind: string;
  inMinor: number;
  outMinor: number;
  entries: number;
  /** The latest entry's id, as a record to trace. */
  latestId: string;
}

interface Watch {
  since: string;
  openingMinor: number;
  /** The person's act counts when the watch opened, to count what they did since. */
  openingActs: Map<string, number>;
  lines: Map<string, MoneyLine>;
}

const watches = new WeakMap<CoreState, Map<string, Watch>>();

const label = (kind: string, id: string) => {
  const lead = id.split(/[:@]/)[0] ?? "";
  return lead && lead !== kind ? `${kind} ${lead}` : kind;
};

/** Starts watching these people's money from today. */
export function watchMoney(
  core: CoreState,
  personIds: readonly string[],
): void {
  let held = watches.get(core);
  if (!held) {
    held = new Map();
    watches.set(core, held);
    const api = coreAPI(core);
    const post = api.postJournal.bind(api);
    const map = held;
    api.postJournal = ((entry: Parameters<typeof post>[0]) => {
      const result = post(entry);
      // Each watched owner's net in this entry: a move between their own
      // accounts nets to nothing.
      const net = new Map<string, number>();
      for (const posting of entry.postings) {
        const owner = core.cashJournal.accounts.get(posting.accountId)?.ownerId;
        if (owner && map.has(owner))
          net.set(owner, (net.get(owner) ?? 0) + posting.deltaMinor);
      }
      for (const [owner, delta] of net) {
        if (delta === 0) continue;
        const watch = map.get(owner)!;
        const kind = label(entry.sourceRef.kind, entry.sourceRef.id);
        const line = watch.lines.get(kind) ?? {
          kind,
          inMinor: 0,
          outMinor: 0,
          entries: 0,
          latestId: entry.id,
        };
        if (delta > 0) line.inMinor += delta;
        else line.outMinor -= delta;
        line.entries += 1;
        line.latestId = entry.id;
        watch.lines.set(kind, line);
      }
      return result;
    }) as typeof api.postJournal;
  }
  for (const id of personIds)
    if (!held.has(id))
      held.set(id, {
        since: core.date,
        openingMinor: core.people.get(id)?.liquidMinor ?? 0,
        openingActs: new Map(core.people.get(id)?.actsByKind ?? []),
        lines: new Map(),
      });
}

/** A watched person's money since the watch opened: each kind in and out, cash then and now, and their acts since. */
export function moneySince(core: CoreState, personId: string) {
  const watch = watches.get(core)?.get(personId);
  if (!watch) return undefined;
  const lines = [...watch.lines.values()].sort(
    (a, b) => b.inMinor + b.outMinor - (a.inMinor + a.outMinor),
  );
  const inMinor = lines.reduce((n, row) => n + row.inMinor, 0);
  const outMinor = lines.reduce((n, row) => n + row.outMinor, 0);
  const acts: Record<string, number> = {};
  for (const [kind, count] of core.people.get(personId)?.actsByKind ?? []) {
    const done = count - (watch.openingActs.get(kind) ?? 0);
    if (done > 0) acts[kind] = done;
  }
  return {
    since: watch.since,
    through: core.date,
    openingMinor: watch.openingMinor,
    cashMinor: core.people.get(personId)?.liquidMinor ?? 0,
    inMinor,
    outMinor,
    lines,
    /** What they did since, by act kind (work shifts among them). */
    acts,
  };
}
