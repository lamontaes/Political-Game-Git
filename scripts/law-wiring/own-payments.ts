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
/**
 * The treasury's payments on a budget line in a window: the payment ids that
 * name the government and the line (a provider's, a payee group's, and a law's
 * own share of the line, which names the law row before its date), summed, for
 * payments dated before `before` (the day a body in play first changed the
 * law, after which the two worlds no longer differ by the checker's change).
 * A payment's id reads `<kind>:<payee>:<government>:budget-line:<line>[:<law
 * row>]:<date>`, so the line is named after `budget-line:`, never straight
 * after the government.
 */
export function lineMoney(
  paid: ReadonlyMap<string, { gross: number; ids: string[] }>,
  governmentId: string,
  line: string,
  before: string | null,
): { gross: number; ids: string[] } {
  const named = new RegExp(
    `(^|:)${(governmentId + ":budget-line:" + line).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(:|$)`,
  );
  const out = { gross: 0, ids: [] as string[] };
  for (const [id, row] of paid) {
    const dated = /^(.*):(\d{4}-\d{2}-\d{2})$/.exec(id);
    if (!dated || !named.test(dated[1]!)) continue;
    if (before && dated[2]! >= before) continue;
    out.gross += row.gross;
    for (const at of row.ids) if (out.ids.length < 3) out.ids.push(at);
  }
  return out;
}

/**
 * Accounts by every id they name: a person's, organization's or counted
 * group's fund names its owner. A cash account is `cash:<owner id>:residual`
 * and an owner's id may hold colons (a treasury's
 * `organization:treasury:place:2666300`), so the owner id between the kind and
 * the account's name is indexed whole too: without it a treasury, or any owner
 * whose id has colons, matches no account and its payments are never seen.
 */
export function accountIndex(
  ...maps: ReadonlyMap<string, readonly Posting[]>[]
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const m of maps)
    for (const accountId of m.keys()) {
      const parts = accountId.split(":");
      const tokens = new Set([...parts, parts.slice(1).join(":")]);
      if (parts[0] === "cash") tokens.add(parts.slice(1, -1).join(":"));
      for (const t of tokens) {
        if (!t) continue;
        const list = index.get(t);
        if (!list) index.set(t, [accountId]);
        else if (!list.includes(accountId)) list.push(accountId);
      }
    }
  return index;
}

/** What a posting's kind names after this: the laws its source cites (check.ts, `underOf`), joined by "+". */
export const UNDER = " under ";

/** Whether a payment was made under other laws and not under `key`: a price a law sets is that law's money, not a raise's. */
function foreignTo(key: string | undefined) {
  const seen = new Map<string, boolean>();
  return (kind: string): boolean => {
    if (!key) return false;
    let v = seen.get(kind);
    if (v === undefined) {
      const at = kind.indexOf(UNDER);
      v =
        at >= 0 &&
        !kind
          .slice(at + UNDER.length)
          .split("+")
          .includes(key);
      seen.set(kind, v);
    }
    return v;
  };
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
 * target's first payment of that kind and direction is its evidence. A
 * payment whose source cites other laws and not this one (`key`) is theirs:
 * a raise lets a worker use more electricity, but the electricity standard's
 * share of that bill is the standard's payment, not the raise's.
 */
export function ownPayments(
  membersOf: (targetId: string) => readonly string[],
  targets: readonly Reached[],
  treated: ReadonlyMap<string, readonly Posting[]>,
  control: ReadonlyMap<string, readonly Posting[]>,
  repeal: boolean,
  since: string,
  key?: string,
) {
  const index = accountIndex(treated, control);
  const foreign = foreignTo(key);
  // Where the law's records name money, its own payment is looked for among
  // those it paid or charged: a right that names none (every employed person
  // may refuse a union fee) is not expected to show a payment of its own.
  const payees = targets.filter((t) => t.amountMinor !== 0);
  const looked = payees.length ? payees : targets;
  const sums = (
    m: ReadonlyMap<string, readonly Posting[]>,
    accounts: string[],
    from: string,
    to: string,
  ) => {
    const by = new Map<string, { delta: number; id: string }>();
    for (const a of accounts)
      for (const [date, kind, delta, id] of m.get(a) ?? []) {
        if (date < from || date > to || foreign(kind)) continue;
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
  for (const t of looked) {
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
  return {
    targets: looked.length,
    among: payees.length ? ("paid" as const) : ("reached" as const),
    pairs,
    ...pickOwn(looked.length, pairs),
  };
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
 * first, the one most targets got; among equals, the one that began first (a
 * raise's paycheck the day before the household spends it), then the one that
 * moved the most money (the paycheck over the tax withheld from it).
 */
export function pickOwn(targets: number, pairs: readonly OwnPair[]) {
  const most = Math.max(0, ...pairs.map((p) => p.targets));
  const enough = pairs.filter(
    (p) => p.targets >= ownLeast(targets) && p.targets * 2 >= most,
  );
  const first = enough.map((p) => p.earliest).sort()[0];
  const near = first
    ? enough.filter((p) => p.earliest <= plusDays(first, 7))
    : [];
  const top = [...near].sort(
    (a, b) =>
      b.targets - a.targets ||
      a.earliest.localeCompare(b.earliest) ||
      b.moved - a.moved ||
      a.kind.localeCompare(b.kind),
  )[0];
  return {
    paid: top?.targets ?? 0,
    pick: top ? `${top.kind}|${top.way}` : null,
    sample: top?.sample ?? [],
    /** Every payment that began that week, in the order they began: a raise's paycheck and the spending it allows are both the law's money. */
    near: near
      .sort(
        (a, b) => a.earliest.localeCompare(b.earliest) || b.targets - a.targets,
      )
      .map((p) => ({
        kind: p.kind,
        way: p.way,
        targets: p.targets,
        first: p.sample[0],
      })),
  };
}
