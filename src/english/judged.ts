/**
 * The saved verdicts for rules a program cannot judge: one store, one shape,
 * for every rule a reviewer judges (`data/english/judged/<rule id>.json` and
 * `.yes.txt`; design: `docs/design/words-machine.md`, "three kinds of test").
 *
 * A verdict is about a subject: one line, a pair (the line before and the
 * reply) or a set of lines, named by their bank keys. Its id is a hash of the
 * keys and their exact text, so a line whose words change has no verdict until
 * it is judged again. The file lists only the "no" verdicts, each with its
 * reason, the count judged and a hash of the ids judged "yes"; the yes ids are
 * in `.yes.txt`. Only the fold (`npm run words:verdicts`) writes the store.
 *
 * Pure: no files. `scripts/words/verdicts.ts` reads and folds the store; the
 * run (`runRules`) and the reply picker (`reply-follows.ts`) read it.
 */

/** A short stable hash (53 bits) as eleven base-36 characters. */
export function hash53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0))
    .toString(36)
    .padStart(11, "0");
}

/** A hash of a sorted list of ids, for the store's `yesHash`. */
export const idsHash = (ids: readonly string[]): string =>
  hash53([...ids].sort().join("\n"));

/**
 * The id of a verdict: the subject's keys, in order, each with its exact text.
 * A line is one key, a pair is [line before, reply], a set is its keys sorted.
 */
export function verdictId(
  keys: readonly string[],
  texts: readonly string[],
): string {
  return hash53(keys.map((key, at) => `${key}\u0000${texts[at]}`).join("\n"));
}

/** A "no" verdict: what it is about and the reviewer's one-sentence reason. */
export interface NoVerdict {
  readonly keys: readonly string[];
  readonly why: string;
}

/** The store's main file, `data/english/judged/<rule id>.json`. */
export interface JudgedFile {
  readonly schema: "english-judged/2";
  readonly rule: string;
  /** The question the reviewer answers, word for word: the rule's `says` unless the rule has its own. */
  readonly rubric: string;
  /** How many subjects were judged, yes and no. */
  readonly judged: number;
  /** Only the "no" verdicts, by id. */
  readonly no: Readonly<Record<string, NoVerdict>>;
  /** A hash of the sorted ids judged yes (`<rule id>.yes.txt`). */
  readonly yesHash: string;
}

/** A store, read: the "no" verdicts by id and the ids judged yes. */
export interface JudgedStore {
  readonly no: ReadonlyMap<string, NoVerdict>;
  readonly yes: ReadonlySet<string>;
}

/** The stores the run reads, by rule id. A rule with no store has judged nothing. */
export type JudgedStores = ReadonlyMap<string, JudgedStore>;

/** What the store says about one subject: "no", "yes" or nothing yet. */
export function verdictOf(
  store: JudgedStore | undefined,
  id: string,
): "no" | "yes" | undefined {
  if (!store) return undefined;
  if (store.no.has(id)) return "no";
  if (store.yes.has(id)) return "yes";
  return undefined;
}
