/**
 * A law's own payments, for the law-wiring checker (check.ts): the money that
 * reached the people, households and organizations the law's rows name, told
 * apart from the drift between the treated and control worlds.
 */

/** One posting the journal made: date, source kind, signed amount, journal id. */
export type Posting = readonly [
  date: string,
  kind: string,
  delta: number,
  id: string,
];

/** Whom a law's rows reached: the target, the record naming it, and the money it recorded (signed: paid in is positive). */
export interface Reached {
  targetId: string;
  row: string;
  amountMinor: number;
  since: string;
}
/** Accounts by every id they name: a person's, organization's or counted group's fund names its owner. */
function accountIndex(
  ...maps: ReadonlyMap<string, readonly Posting[]>[]
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const m of maps)
    for (const accountId of m.keys()) {
      const parts = accountId.split(":");
      const tokens = new Set([...parts, parts.slice(1).join(":")]);
      for (const t of tokens) {
        if (!t) continue;
        const list = index.get(t);
        if (!list) index.set(t, [accountId]);
        else if (!list.includes(accountId)) list.push(accountId);
      }
    }
  return index;
}

/** How long after a law reaches a target its own payment shows: past it, the twin worlds' drift does. */
export const OWN_WINDOW_DAYS = 92;
/**
 * How many reached targets must get a payment of one kind and direction for
 * it to be the law's: one in twenty, and two wherever two or more were
 * reached (one target of many may be drift).
 */
export function ownLeast(targets: number): number {
  return Math.max(Math.min(2, targets), Math.ceil(targets * 0.05));
}

const plusDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * The law's own payments. For each target its rows reached, the payments on
 * that target's own accounts (a named household's are its members') that
 * differ from the control world's on the same day and source, within
 * OWN_WINDOW_DAYS of the day the law reached it: the law pays when it applies
 * (a raise's first paycheck, a premium's first payday), while the drift
 * between two worlds of the same seed takes months to reach anyone's money. A
 * repeal of a law in force at the opening stops money the control world still
 * pays, so there the control's payment is the law's. The payment the law
 * makes is the kind and direction (paid in or out) most targets share; each
 * target's first payment of that kind and direction is its evidence.
 */
export function ownPayments(
  membersOf: (targetId: string) => readonly string[],
  targets: readonly Reached[],
  treated: ReadonlyMap<string, readonly Posting[]>,
  control: ReadonlyMap<string, readonly Posting[]>,
  repeal: boolean,
  since: string,
) {
  const index = accountIndex(treated, control);
  const sums = (
    m: ReadonlyMap<string, readonly Posting[]>,
    accounts: string[],
    from: string,
    to: string,
  ) => {
    const by = new Map<string, { delta: number; id: string }>();
    for (const a of accounts)
      for (const [date, kind, delta, id] of m.get(a) ?? []) {
        if (date < from || date > to) continue;
        const k = `${date}|${kind}`;
        const v = by.get(k);
        if (v) v.delta += delta;
        else by.set(k, { delta, id });
      }
    return by;
  };
  interface Found {
    target: string;
    row: string;
    date: string;
    kind: string;
    way: "in" | "out";
    treatment: number;
    control: number;
    journal: string;
  }
  // Each target's first differing payment of each kind and direction.
  const byTarget: Map<string, Found>[] = [];
  const shared = new Map<string, number>();
  const earliest = new Map<string, string>();
  const moved = new Map<string, number>();
  for (const t of targets) {
    const owners = [t.targetId, ...membersOf(t.targetId)];
    const accounts = [...new Set(owners.flatMap((o) => index.get(o) ?? []))];
    if (!accounts.length) continue;
    const from = t.since > since ? t.since : since;
    const to = plusDays(from, OWN_WINDOW_DAYS);
    const tr = sums(treated, accounts, from, to);
    const co = sums(control, accounts, from, to);
    const first = new Map<string, Found>();
    for (const k of new Set([...tr.keys(), ...co.keys()])) {
      const a = tr.get(k)?.delta ?? 0;
      const b = co.get(k)?.delta ?? 0;
      if (a === b) continue;
      // The law's side: the treated world, or the control where a repeal stopped it.
      const [ours, theirs] = repeal ? [b, a] : [a, b];
      const way = ours > theirs ? "in" : "out";
      const [date, kind] = k.split("|") as [string, string];
      const pair = `${kind}|${way}`;
      const held = first.get(pair);
      if (held && held.date <= date) continue;
      first.set(pair, {
        target: t.targetId,
        row: t.row,
        date,
        kind,
        way,
        treatment: a,
        control: b,
        journal: (repeal ? co : tr).get(k)?.id ?? tr.get(k)?.id ?? "",
      });
    }
    byTarget.push(first);
    for (const [pair, f] of first) {
      shared.set(pair, (shared.get(pair) ?? 0) + 1);
      moved.set(
        pair,
        (moved.get(pair) ?? 0) + Math.abs(f.treatment - f.control),
      );
      if (!(earliest.get(pair)! <= f.date)) earliest.set(pair, f.date);
    }
  }
  // Most targets first; on a tie, the most money (a raise's paycheck over the
  // tax withheld from it), then the payment that came soonest after the law
  // reached them (a law pays when it applies, drift comes later).
  const pairs: OwnPair[] = [...shared]
    .map(([pair, count]) => {
      const [kind, way] = pair.split("|") as [string, "in" | "out"];
      const firsts = byTarget
        .flatMap((m) => (m.has(pair) ? [m.get(pair)!] : []))
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.target.localeCompare(b.target),
        );
      return {
        kind,
        way,
        targets: count,
        moved: moved.get(pair)!,
        earliest: earliest.get(pair)!,
        sample: firsts.slice(0, 4),
      };
    })
    .sort((a, b) => b.targets - a.targets || b.moved - a.moved)
    .slice(0, 10);
  return { targets: targets.length, pairs, ...pickOwn(targets.length, pairs) };
}

/** One kind and direction of payment the targets got, with how many got it and the money it moved. */
export interface OwnPair {
  kind: string;
  way: "in" | "out";
  targets: number;
  moved: number;
  earliest: string;
  sample: {
    target: string;
    row: string;
    date: string;
    kind: string;
    way: "in" | "out";
    treatment: number;
    control: number;
    journal: string;
  }[];
}

/**
 * Which payment is the law's own. Among the kinds and directions shared by
 * enough targets (ownLeast) and by at least half as many as the most shared,
 * the law's own payment comes first after the law reaches them: a raise's
 * paycheck, a premium, an employer's tax share, before the spending a raise
 * allows or a deposit moved later. Of those that began within a week of the
 * first, the one most targets got, then the one that moved the most money.
 */
export function pickOwn(targets: number, pairs: readonly OwnPair[]) {
  const most = Math.max(0, ...pairs.map((p) => p.targets));
  const enough = pairs.filter(
    (p) => p.targets >= ownLeast(targets) && p.targets * 2 >= most,
  );
  const first = enough.map((p) => p.earliest).sort()[0];
  const top = first
    ? enough
        .filter((p) => p.earliest <= plusDays(first, 7))
        .sort(
          (a, b) =>
            b.targets - a.targets ||
            b.moved - a.moved ||
            a.earliest.localeCompare(b.earliest) ||
            a.kind.localeCompare(b.kind),
        )[0]
    : undefined;
  return {
    paid: top?.targets ?? 0,
    pick: top ? `${top.kind}|${top.way}` : null,
    sample: top?.sample ?? [],
  };
}
