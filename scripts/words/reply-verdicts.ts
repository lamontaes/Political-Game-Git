/**
 * The reply verdicts (`data/english/judged/reply-follows.json`, `.yes.txt`,
 * `.why.json`) and the one way they change: folding a directory of verdict
 * files a judge wrote into them (`npm run words:verdicts -- --from <dir>`).
 * Only the fold writes these files. See `src/english/reply-follows.ts`.
 *
 * A judge's file is `{ purpose, verdicts: [{ id, follows, why }] }`, ids from
 * a sheet `npm run words:pairs` wrote. The fold refuses an id the current pairs
 * do not hold, drops a verdict about a line the bank no longer has, and
 * changes nothing when folded twice.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  REPLY_FOLLOWS_RUBRIC,
  type ReplyFollowsFile,
} from "../../src/english/reply-follows";
import { idsHash, pairId, type ReplyPair } from "../../src/english/reply-pairs";

export const JUDGED_DIR = "data/english/judged";
const NAME = "reply-follows";

/** What a judge writes for one sheet. */
export interface VerdictSheet {
  readonly purpose: string;
  readonly verdicts: readonly {
    readonly id: string;
    readonly follows: boolean;
    readonly why?: string;
  }[];
}

export interface WhyFile {
  readonly schema: "english-judged-why/1";
  readonly why: Readonly<
    Record<string, { reply: string; before: string; why: string }>
  >;
}

/** The three files, read: the pairs judged no (id to pair), the ids judged yes and the reasons. */
export interface Verdicts {
  readonly no: Map<string, { reply: string; before: string; why: string }>;
  readonly yes: Set<string>;
}

export function readVerdicts(dir = JUDGED_DIR): Verdicts {
  const file = JSON.parse(
    readFileSync(join(dir, `${NAME}.json`), "utf8"),
  ) as ReplyFollowsFile;
  const whyFile = existsSync(join(dir, `${NAME}.why.json`))
    ? (JSON.parse(
        readFileSync(join(dir, `${NAME}.why.json`), "utf8"),
      ) as WhyFile)
    : { why: {} };
  const no = new Map<string, { reply: string; before: string; why: string }>();
  for (const [reply, befores] of Object.entries(file.no))
    for (const before of befores) {
      const id = pairId(before, reply);
      no.set(id, { reply, before, why: whyFile.why[id]?.why ?? "" });
    }
  const text = existsSync(join(dir, `${NAME}.yes.txt`))
    ? readFileSync(join(dir, `${NAME}.yes.txt`), "utf8")
    : "";
  return { no, yes: new Set(text.split("\n").filter(Boolean)) };
}

/** The verdict files' contents for these verdicts, byte for byte what the fold writes. */
export function verdictFiles(verdicts: Verdicts): {
  readonly verdictJson: string;
  readonly yesText: string;
  readonly whyJson: string;
} {
  const no: Record<string, string[]> = {};
  const why: Record<string, { reply: string; before: string; why: string }> =
    {};
  const ids = [...verdicts.no.keys()].sort();
  for (const id of ids) {
    const row = verdicts.no.get(id)!;
    (no[row.reply] ??= []).push(row.before);
    why[id] = row;
  }
  const sortedNo = Object.fromEntries(
    Object.keys(no)
      .sort()
      .map((reply) => [reply, no[reply]!.sort()]),
  );
  const yes = [...verdicts.yes].sort();
  const file: ReplyFollowsFile = {
    schema: "english-judged/1",
    rule: "reply-follows-the-line-before",
    rubric: REPLY_FOLLOWS_RUBRIC,
    judged: yes.length + ids.length,
    no: sortedNo,
    yesHash: idsHash(yes),
  };
  const whyFile: WhyFile = { schema: "english-judged-why/1", why };
  return {
    verdictJson: `${JSON.stringify(file, null, 2)}\n`,
    yesText: yes.length ? `${yes.join("\n")}\n` : "",
    whyJson: `${JSON.stringify(whyFile, null, 2)}\n`,
  };
}

export function writeVerdicts(verdicts: Verdicts, dir = JUDGED_DIR): void {
  const files = verdictFiles(verdicts);
  writeFileSync(join(dir, `${NAME}.json`), files.verdictJson);
  writeFileSync(join(dir, `${NAME}.yes.txt`), files.yesText);
  writeFileSync(join(dir, `${NAME}.why.json`), files.whyJson);
}

export interface FoldResult {
  readonly sheets: number;
  readonly yes: number;
  readonly no: number;
  /** Verdicts in the files that the current pairs no longer hold, dropped. */
  readonly dropped: number;
}

/**
 * Folds every `*.json` verdict sheet in `from` into the verdicts in `dir`,
 * for exactly the pairs given. Throws, writing nothing, on an id the pairs do
 * not hold or a verdict with no `follows`.
 */
export function foldVerdicts(
  from: string,
  pairs: readonly ReplyPair[],
  bankKeys: ReadonlySet<string>,
  dir = JUDGED_DIR,
): FoldResult {
  const current = new Set(pairs.map((pair) => pairId(pair.before, pair.reply)));
  const byId = new Map(
    pairs.map((pair) => [pairId(pair.before, pair.reply), pair]),
  );
  const verdicts = readVerdicts(dir);
  const sheets = readdirSync(from)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const refused: string[] = [];
  const changes: { id: string; follows: boolean; why: string }[] = [];
  for (const name of sheets) {
    const sheet = JSON.parse(
      readFileSync(join(from, name), "utf8"),
    ) as VerdictSheet;
    for (const row of sheet.verdicts ?? []) {
      if (!current.has(row.id)) refused.push(`${name}: ${row.id}`);
      else if (typeof row.follows !== "boolean")
        refused.push(`${name}: ${row.id} has no follows true or false`);
      else
        changes.push({ id: row.id, follows: row.follows, why: row.why ?? "" });
    }
  }
  if (refused.length)
    throw new Error(
      `${refused.length} verdicts the current pairs do not hold (judged an old sheet? run npm run words:pairs again):\n${refused.slice(0, 10).join("\n")}`,
    );
  for (const change of changes) {
    const pair = byId.get(change.id)!;
    if (change.follows) {
      verdicts.no.delete(change.id);
      verdicts.yes.add(change.id);
    } else {
      verdicts.yes.delete(change.id);
      verdicts.no.set(change.id, {
        reply: pair.reply,
        before: pair.before,
        why: change.why,
      });
    }
  }
  // A verdict about a line the bank no longer has goes. The yes list holds
  // only ids, so one is kept while the pairs still hold it.
  let dropped = 0;
  for (const id of [...verdicts.yes])
    if (!current.has(id)) {
      verdicts.yes.delete(id);
      dropped += 1;
    }
  for (const [id, row] of [...verdicts.no])
    if (!bankKeys.has(row.reply) || !bankKeys.has(row.before)) {
      verdicts.no.delete(id);
      dropped += 1;
    }
  writeVerdicts(verdicts, dir);
  return {
    sheets: sheets.length,
    yes: verdicts.yes.size,
    no: verdicts.no.size,
    dropped,
  };
}
