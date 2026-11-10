// The one order work is taken in (docs/pool/order.json) and what `next` may take.
// Used by index.ts for Next up, Ready by model and `npm run pool -- next`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MODELS } from "./standard";

export interface OrderClass {
  name: string;
  idPrefixes?: string[];
  roots?: string[];
  milestone?: string;
}
export interface Order {
  levels: string[];
  classes: OrderClass[];
}

/** Item fields the order reads; `waits-on` and `time-box` are the item's sections, added when the item is read. */
export type Row = Record<string, string | undefined> & {
  id: string;
  status: string;
  priority: string;
};

/** The order with no order.json: the levels of the standard and no classes. */
export const DEFAULT_ORDER: Order = { levels: MODELS, classes: [] };

/** Reads docs/pool/order.json under a pool folder, or the default when it is missing. */
export function readOrder(poolDir: string): Order {
  const p = join(poolDir, "order.json");
  if (!existsSync(p)) return DEFAULT_ORDER;
  const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Order>;
  return {
    levels: raw.levels?.length ? raw.levels : MODELS,
    classes: raw.classes ?? [],
  };
}

/** The play-first lane's own order inside the stops-play class (docs/play-first/ORDER.md). */
const PLAY_FIRST = ["play-stop-23", "play-stop-21", "play-stop-22"];
const playRank = (i: Row): number => {
  const k = PLAY_FIRST.findIndex((p) => i.id.startsWith(p));
  return k < 0 ? PLAY_FIRST.length : k;
};
const EFFORT_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };
const SIZE_RANK: Record<string, number> = { S: 0, M: 1, L: 2 };

/** The first class in the order whose id prefix, root or milestone matches the item; the class count when none does. */
export function classOf(i: Row, order: Order): number {
  const k = order.classes.findIndex(
    (c) =>
      (c.idPrefixes ?? []).some((p) => i.id.startsWith(p)) ||
      (!!i.root && (c.roots ?? []).includes(i.root)) ||
      (!!c.milestone && i.milestone === c.milestone),
  );
  return k < 0 ? order.classes.length : k;
}

const ITEM_ID = /[a-z0-9]+(?:-[a-z0-9]+)+/g;

/** Item ids a piece of text names, in order, once each. */
export function idsNamed(text: string, known: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(ITEM_ID))
    if (known.has(m[0]) && !out.includes(m[0])) out.push(m[0]);
  return out;
}

const list = (v?: string): string[] =>
  (v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** The items an item waits on: its `after:`, its `blocked-on:` and the ids its Waits on section names. */
export function waitsOn(i: Row, known: ReadonlySet<string>): string[] {
  const out = new Set<string>();
  for (const a of [...list(i.after), ...list(i["blocked-on"])])
    if (known.has(a)) out.add(a);
  for (const a of idsNamed(i["waits-on"] ?? "", known)) out.add(a);
  out.delete(i.id);
  return [...out];
}

const LIVE = ["open", "claimed", "blocked"];

/** For each item id, how many live items wait on it. */
export function unblocks(items: Row[]): Map<string, number> {
  const known = new Set(items.map((i) => i.id));
  const n = new Map<string, number>();
  for (const i of items)
    if (LIVE.includes(i.status))
      for (const a of waitsOn(i, known)) n.set(a, (n.get(a) ?? 0) + 1);
  return n;
}

/**
 * The one order (docs/pool/order.json): priority; class; how many live items
 * wait on it, more first; effort; size; id. Inside the stops-play class the
 * play-first lane keeps its own order. Next up, Ready by model and `next` all
 * sort with it.
 */
export function makeOrder(
  items: Row[],
  order: Order,
): (a: Row, b: Row) => number {
  const waiting = unblocks(items);
  const cls = new Map(items.map((i) => [i.id, classOf(i, order)]));
  const play = order.classes.findIndex((c) => !!c.milestone);
  const clsOf = (i: Row): number => cls.get(i.id) ?? classOf(i, order);
  return (a, b) => {
    const byPriority = a.priority.localeCompare(b.priority);
    if (byPriority) return byPriority;
    const ca = clsOf(a);
    const cb = clsOf(b);
    if (ca !== cb) return ca - cb;
    if (play >= 0 && ca === play)
      return playRank(a) - playRank(b) || a.id.localeCompare(b.id);
    return (
      (waiting.get(b.id) ?? 0) - (waiting.get(a.id) ?? 0) ||
      (EFFORT_RANK[a.effort ?? ""] ?? 3) - (EFFORT_RANK[b.effort ?? ""] ?? 3) ||
      SIZE_RANK[a.size || "M"] - SIZE_RANK[b.size || "M"] ||
      a.id.localeCompare(b.id)
    );
  };
}

/** What may be left of a Waits on once its item ids are taken out: punctuation and joining words. */
const ONLY_JOINERS =
  /^[\s,.;:()`]*(?:(?:and|or|both|then|done|merged)\b[\s,.;:()`]*)*$/i;

/**
 * Whether `next` may take an item: open, checked by Fable, cause known, every
 * `after:` on main, and a Waits on that says Nothing or names only items that
 * are all on main. `onMain` holds the ids of merged and done items.
 */
export function claimable(
  i: Row,
  onMain: ReadonlySet<string>,
  known: ReadonlySet<string>,
): boolean {
  if (i.status !== "open") return false;
  if (!(i.checked ?? "").startsWith("fable")) return false;
  if (i["needs-cause"] === "1") return false;
  if (list(i.after).some((a) => !onMain.has(a))) return false;
  const w = (i["waits-on"] ?? "").trim();
  if (/^nothing\b/i.test(w)) return true;
  const named = idsNamed(w, known);
  if (!named.length) return false;
  let rest = w;
  for (const a of named) rest = rest.split(a).join(" ");
  return ONLY_JOINERS.test(rest) && named.every((a) => onMain.has(a));
}

/** The first number of hours in a Time box section; 4 when it names none. */
export function timeBoxHours(box: string | undefined): number {
  const m = /(\d+(?:\.\d+)?)\s*hours?\b/i.exec(box ?? "");
  return m ? Number(m[1]) : 4;
}
