/**
 * The saved verdicts on disk, and the one way they change: folding a
 * directory of reviewers' files into the store (`npm run words:verdicts --
 * --from <dir>`). One store for every rule a reviewer judges
 * (`src/english/judged.ts`): `data/english/judged/<store>.json` and
 * `<store>.yes.txt`, where the store is named by the rule's `test.reads` when
 * it has one (the reply rule's `reply-follows`) and by the rule's id
 * otherwise. Only the fold writes these files.
 *
 * A reviewer's file is `{ rule, verdicts: [{ id, passes, why }] }`, ids from a
 * sheet `npm run words:pairs -- --rule <id>` wrote; a "no" carries a
 * one-sentence `why`. The fold refuses an id the rule's current subjects do
 * not hold (an old sheet, or a line whose words changed since), drops a
 * verdict whose lines the bank no longer holds in those words, and changes
 * nothing when folded twice.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  idsHash,
  verdictId,
  type JudgedFile,
  type JudgedStore,
  type NoVerdict,
} from "../../src/english/judged";
import {
  REPLY_FOLLOWS_RUBRIC,
  REPLY_RULE,
} from "../../src/english/reply-follows";
import {
  exchangeSubjects,
  judgesExchanges,
  judgesScenes,
  lineSubjects,
  type LineRule,
  type RulePiece,
} from "../../src/english/line-rules";
import type { PartGradeLedger } from "../../src/english/english-grades";

export const JUDGED_DIR = "data/english/judged";

/** The store a rule's verdicts live in: its `test.reads` file, or its id. */
export function storeName(rule: LineRule): string {
  return rule.test.kind === "place" && rule.test.reads
    ? basename(rule.test.reads, ".json")
    : rule.id;
}

/** The question a reviewer answers for the rule, word for word. */
export function rubricOf(rule: LineRule): string {
  return rule.id === REPLY_RULE ? REPLY_FOLLOWS_RUBRIC : rule.says;
}

/** Whether a rule's verdicts are kept in the store. */
export function storeRule(rule: LineRule): boolean {
  return (
    rule.test.kind === "judged" ||
    (rule.test.kind === "place" && rule.test.reads !== undefined)
  );
}

/** One thing a reviewer judges for a rule: a line, a pair or a set, by key. */
export interface Subject {
  readonly id: string;
  readonly keys: readonly string[];
}

/** What the subjects are read from. `pairs` is only asked for the reply rule and the exchange rules. */
export interface SubjectSource {
  readonly pieces: readonly RulePiece[];
  readonly ledger: PartGradeLedger;
  readonly pairs: () => readonly { before: string; reply: string }[];
  /** The pairs the exchange rules judge (`exchangePairs`, what the run and the sheets read); `pairs` when not given. */
  readonly exchangePairs?: () => readonly { before: string; reply: string }[];
  /** A path rule's subjects (`scenePaths` over the built scenes); a path rule cannot be folded without it. */
  readonly paths?: (rule: LineRule) => readonly Subject[];
}

/** The text of every bank piece, by key. */
export const textsOf = (pieces: readonly RulePiece[]) =>
  new Map(pieces.map((piece) => [piece.key, piece.text]));

/**
 * What a rule judges now: the lines it applies to (a rule about one line, or
 * one line in its spot), the pairs play can offer (the reply rule), each line
 * after each line it can answer (an exchange rule, `exchangeSubjects`), and
 * none yet for a rule about a set (words-machine part 3's set reader).
 */
export function subjectsOf(rule: LineRule, source: SubjectSource): Subject[] {
  if (rule.id === REPLY_RULE) {
    const text = textsOf(source.pieces);
    return source.pairs().map((pair) => {
      const keys = [pair.before, pair.reply];
      return {
        id: verdictId(
          keys,
          keys.map((k) => text.get(k) ?? ""),
        ),
        keys,
      };
    });
  }
  if (judgesScenes(rule)) {
    if (!source.paths)
      throw new Error(
        `${rule.id} judges scene paths: give the fold the built scenes' paths`,
      );
    return source.paths(rule).map(({ id, keys }) => ({ id, keys }));
  }
  if (judgesExchanges(rule))
    return exchangeSubjects(
      rule,
      source.pieces,
      source.ledger,
      (source.exchangePairs ?? source.pairs)(),
    ).map(({ id, keys }) => ({ id, keys }));
  return lineSubjects(rule, source.pieces, source.ledger).map((piece) => ({
    id: verdictId([piece.key], [piece.text]),
    keys: [piece.key],
  }));
}

export function readStore(name: string, dir = JUDGED_DIR): JudgedStore {
  const path = join(dir, `${name}.json`);
  if (!existsSync(path)) return { no: new Map(), yes: new Set() };
  const file = JSON.parse(readFileSync(path, "utf8")) as JudgedFile;
  const yesPath = join(dir, `${name}.yes.txt`);
  const yes = existsSync(yesPath)
    ? readFileSync(yesPath, "utf8").split("\n").filter(Boolean)
    : [];
  return { no: new Map(Object.entries(file.no)), yes: new Set(yes) };
}

/** Every store on disk for these rules, by rule id. */
export function readStores(
  rules: readonly LineRule[],
  dir = JUDGED_DIR,
): Map<string, JudgedStore> {
  const stores = new Map<string, JudgedStore>();
  for (const rule of rules)
    if (storeRule(rule) && existsSync(join(dir, `${storeName(rule)}.json`)))
      stores.set(rule.id, readStore(storeName(rule), dir));
  return stores;
}

/** The store's two files, byte for byte what the fold writes. */
export function storeFiles(
  rule: LineRule,
  store: JudgedStore,
): { readonly json: string; readonly yesText: string } {
  const no: Record<string, NoVerdict> = {};
  for (const id of [...store.no.keys()].sort()) {
    const row = store.no.get(id)!;
    no[id] = { keys: [...row.keys], why: row.why };
  }
  const yes = [...store.yes].sort();
  const file: JudgedFile = {
    schema: "english-judged/2",
    rule: rule.id,
    rubric: rubricOf(rule),
    judged: yes.length + Object.keys(no).length,
    no,
    yesHash: idsHash(yes),
  };
  return {
    json: `${JSON.stringify(file, null, 2)}\n`,
    yesText: yes.length ? `${yes.join("\n")}\n` : "",
  };
}

export function writeStore(
  rule: LineRule,
  store: JudgedStore,
  dir = JUDGED_DIR,
): string[] {
  const files = storeFiles(rule, store);
  const name = storeName(rule);
  const paths = [join(dir, `${name}.json`), join(dir, `${name}.yes.txt`)];
  writeFileSync(paths[0]!, files.json);
  writeFileSync(paths[1]!, files.yesText);
  return paths;
}

/** What a reviewer writes for one sheet. */
export interface VerdictSheet {
  readonly rule: string;
  readonly verdicts: readonly {
    readonly id: string;
    readonly passes: boolean;
    readonly why?: string;
  }[];
}

export interface FoldCount {
  readonly yes: number;
  readonly no: number;
  /** Verdicts whose lines the bank no longer holds in those words, dropped. */
  readonly dropped: number;
}

export interface FoldResult {
  readonly sheets: number;
  readonly perRule: Readonly<Record<string, FoldCount>>;
  /** The files written. */
  readonly written: readonly string[];
}

/**
 * Folds every `*.json` reviewer file in `from` (none when `from` is
 * undefined) into the stores in `dir`, then drops every verdict that no longer
 * applies, in every store on disk and every store the files name. Throws,
 * writing nothing, on a rule it does not know, an id the rule's subjects do
 * not hold, a verdict with no `passes` or a "no" with no reason.
 */
export function foldVerdicts(
  from: string | undefined,
  rules: readonly LineRule[],
  source: SubjectSource,
  dir = JUDGED_DIR,
): FoldResult {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const sheets = from
    ? readdirSync(from)
        .filter((name) => name.endsWith(".json"))
        .sort()
    : [];
  const refused: string[] = [];
  const changes = new Map<
    string,
    { id: string; passes: boolean; why: string }[]
  >();
  const subjects = new Map<string, Map<string, Subject>>();
  const subjectsFor = (rule: LineRule) => {
    let found = subjects.get(rule.id);
    if (!found) {
      found = new Map(subjectsOf(rule, source).map((s) => [s.id, s]));
      subjects.set(rule.id, found);
    }
    return found;
  };
  for (const name of sheets) {
    const sheet = JSON.parse(
      readFileSync(join(from!, name), "utf8"),
    ) as VerdictSheet;
    const rule = byId.get(sheet.rule);
    if (!rule || !storeRule(rule)) {
      refused.push(`${name}: no judged rule "${String(sheet.rule)}"`);
      continue;
    }
    const current = subjectsFor(rule);
    const list = changes.get(rule.id) ?? [];
    for (const row of sheet.verdicts ?? []) {
      if (!current.has(row.id)) refused.push(`${name}: ${row.id}`);
      else if (typeof row.passes !== "boolean")
        refused.push(`${name}: ${row.id} has no passes true or false`);
      else if (!row.passes && !row.why?.trim())
        refused.push(`${name}: ${row.id} is a "no" with no reason`);
      else list.push({ id: row.id, passes: row.passes, why: row.why ?? "" });
    }
    changes.set(rule.id, list);
  }
  if (refused.length)
    throw new Error(
      `${refused.length} verdicts refused (judged an old sheet, or a line changed since? write the sheet again with npm run words:pairs):\n${refused.slice(0, 10).join("\n")}`,
    );
  const text = textsOf(source.pieces);
  const perRule: Record<string, FoldCount> = {};
  const written: string[] = [];
  for (const rule of rules) {
    if (!storeRule(rule)) continue;
    const onDisk = existsSync(join(dir, `${storeName(rule)}.json`));
    if (!onDisk && !changes.has(rule.id)) continue;
    const read = readStore(storeName(rule), dir);
    const no = new Map(read.no);
    const yes = new Set(read.yes);
    const current = subjectsFor(rule);
    for (const change of changes.get(rule.id) ?? []) {
      if (change.passes) {
        no.delete(change.id);
        yes.add(change.id);
      } else {
        yes.delete(change.id);
        no.set(change.id, {
          keys: current.get(change.id)!.keys,
          why: change.why,
        });
      }
    }
    // A verdict is tied to the exact words: a "no" goes when its lines are
    // gone or say something else; a "yes" (an id alone) goes when the rule no
    // longer judges that subject in those words. An exchange rule's "no" also
    // goes when the rule no longer judges that subject: a line judged alone
    // that now has lines before it is judged after each of them instead.
    let dropped = 0;
    for (const [id, row] of [...no])
      if (
        ((judgesExchanges(rule) || judgesScenes(rule)) && !current.has(id)) ||
        row.keys.some((key) => !text.has(key)) ||
        verdictId(
          row.keys,
          row.keys.map((key) => text.get(key)!),
        ) !== id
      ) {
        no.delete(id);
        dropped += 1;
      }
    for (const id of [...yes])
      if (!current.has(id)) {
        yes.delete(id);
        dropped += 1;
      }
    written.push(...writeStore(rule, { no, yes }, dir));
    perRule[rule.id] = { yes: yes.size, no: no.size, dropped };
  }
  return { sheets: sheets.length, perRule, written };
}
