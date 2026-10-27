/**
 * Splits the outcome-web links that fired in a run by whether a production
 * engine reads their factor. A fired monthly ledger row is a record, not a
 * read (AGENTS.md, "An effect is a read, not a record"): a link listed in
 * src/core2/data/outcome-web/unwired.json under a stopgap that is still open
 * moves only the web's ledger, so it is not wiring.
 */
export interface UnreadRow {
  readonly link: string;
  readonly stopgapId: string;
}

export function splitByReader<
  T extends { readonly f: { readonly link: string } },
>(
  fired: readonly T[],
  unwired: readonly UnreadRow[],
  stopgapOpen: (id: string) => boolean,
): { read: T[]; unread: { item: T; stopgapId: string }[] } {
  const open = new Map(
    unwired
      .filter((u) => stopgapOpen(u.stopgapId))
      .map((u) => [u.link, u.stopgapId]),
  );
  const read: T[] = [];
  const unread: { item: T; stopgapId: string }[] = [];
  for (const item of fired) {
    const stopgapId = open.get(item.f.link);
    if (stopgapId) unread.push({ item, stopgapId });
    else read.push(item);
  }
  return { read, unread };
}
