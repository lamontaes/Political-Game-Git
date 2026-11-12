/**
 * Runs the owner's rules (`data/english/line-rules.json`) over every bank
 * line and writes `data/english/pulled.json`, the list the game reads.
 *
 *   npm run words:rules                      writes the list, prints the report
 *   npm run words:rules -- --report out.md   also writes the report as Markdown
 *
 * After a grading, `apply-grades.ts` then this command is the whole update:
 * the first folds the grades into the ledger, the second runs every rule
 * over every line. Run it again after any change to a bank or a rule; a
 * second run changes nothing. A development tool: no model calls, no world.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { talkReplyFlow, talkScenes } from "../../src/director/scene-talk";
import {
  distinctPairs,
  replyFollowsReport as replyFollowsReportOf,
  replyPairs,
  type ReplyFollowsReport,
} from "../../src/english/reply-pairs";
import {
  REPLY_FOLLOWS,
  REPLY_RULE,
  REPLY_STORE,
} from "../../src/english/reply-follows";
import { verdictId, type JudgedStores } from "../../src/english/judged";
import { playable } from "../../src/english/bank-parts";
import type { BankPart } from "../../src/english/scene-talk-words";
import { readStore, readStores, textsOf } from "./verdicts";
import type { PartGradeLedger } from "../../src/english/english-grades";
import {
  gradeNotesOf,
  readingOf,
  type GradeRow,
  type NotesNotRulesFile,
  type ReadingReport,
  type RulingsReadFile,
} from "../../src/english/rulings-read";
import {
  awaitingAfter,
  pulledFileOf,
  runRules,
  usesWithTags,
  type PlaceReports,
  type LineRule,
  type LineRulesFile,
  type PulledFile,
  type RulePiece,
  type RunResult,
} from "../../src/english/line-rules";

export const RULES_FILE = "data/english/line-rules.json";
export const PULLED_FILE = "data/english/pulled.json";
export const LEDGER_FILE = "data/english/part-grades.json";
export const PARTS_DIR = "data/english/parts";
export const GRADES_DIR = "data/english/grades";
export const RULINGS_FILE = "data/english/rulings-read.json";
export const NOTES_FILE = "data/english/notes-not-rules.json";
export const SCENE_TALK_FILE = "data/english/parts/scene-talk.json";

/** The scene-talk bank's pieces play may say. */
export function playableParts(): BankPart[] {
  const bank = JSON.parse(readFileSync(SCENE_TALK_FILE, "utf8")) as {
    parts: BankPart[];
  };
  return bank.parts.filter(playable);
}

/** Every bank piece, in file order. */
export function readBankPieces(dir = PARTS_DIR): RulePiece[] {
  const pieces: RulePiece[] = [];
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const bank = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      parts?: ({
        key: string;
        text: unknown;
        kind?: string;
        move?: string;
        uses?: Record<string, unknown>[];
      } & Record<string, unknown>)[];
    };
    for (const part of bank.parts ?? [])
      pieces.push({
        bank: basename(name, ".json"),
        key: part.key,
        text:
          typeof part.text === "string" ? part.text : JSON.stringify(part.text),
        kind: part.kind ?? "",
        move: part.move ?? "",
        uses: usesWithTags(part, part.uses ?? []),
      });
  }
  return pieces;
}

export function readRules(file = RULES_FILE): LineRule[] {
  return (
    JSON.parse(readFileSync(file, "utf8")) as LineRulesFile
  ).rules.slice();
}

export function readLedger(file = LEDGER_FILE): PartGradeLedger {
  return JSON.parse(readFileSync(file, "utf8")) as PartGradeLedger;
}

/**
 * What the reply rule reports: the pairs play can offer now, the verdicts
 * so far and the lines no reply follows. Reads the scene-talk bank and the
 * rule's store, and asks the picker's own test (`replyPairs`).
 */
export function replyFollowsReport(
  pieces: readonly RulePiece[] = readBankPieces(),
): ReplyFollowsReport {
  const silenced: {
    before: string;
    purpose: string;
    move: string;
  }[] = [];
  const parts = playableParts();
  const pairs = distinctPairs(
    replyPairs(parts, {
      scenes: talkScenes(),
      flow: talkReplyFlow,
      verdicts: REPLY_FOLLOWS,
      onSilenced: (spot) => silenced.push(spot),
    }),
  );
  const store = readStore(REPLY_STORE);
  const text = textsOf(pieces);
  return replyFollowsReportOf({
    pairs,
    judgedIds: new Set([...store.yes, ...store.no.keys()]),
    idOf: (pair) =>
      verdictId(
        [pair.before, pair.reply],
        [text.get(pair.before) ?? "", text.get(pair.reply) ?? ""],
      ),
    no: REPLY_FOLLOWS,
    silenced,
  });
}

/** What was read besides the rules' words: his grade notes and his rulings from the other places. */
export function readReading(rules: readonly LineRule[]): ReadingReport {
  const files = readdirSync(GRADES_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      grades: (
        JSON.parse(readFileSync(join(GRADES_DIR, file), "utf8")) as {
          grades: GradeRow[];
        }
      ).grades,
    }));
  return readingOf(
    rules,
    gradeNotesOf(files),
    JSON.parse(readFileSync(RULINGS_FILE, "utf8")) as RulingsReadFile,
    JSON.parse(readFileSync(NOTES_FILE, "utf8")) as NotesNotRulesFile,
  );
}

/** The waiting-for-a-verdict counts in the committed `pulled.json`, if it has them. */
export function committedAwaiting(
  file = PULLED_FILE,
): Readonly<Record<string, number>> | undefined {
  if (!existsSync(file)) return undefined;
  return (JSON.parse(readFileSync(file, "utf8")) as Partial<PulledFile>)
    .awaitingVerdict;
}

/**
 * A fresh run over the files on disk. `pulledFile` is what the run writes:
 * its waiting-for-a-verdict counts never rise above the committed ones, and
 * `rose` names each rule whose fresh count would.
 */
export function freshRun(): {
  readonly result: RunResult;
  readonly pulledFile: PulledFile;
  readonly rose: ReturnType<typeof awaitingAfter>["rose"];
  readonly rules: LineRule[];
  readonly pieces: RulePiece[];
  readonly stores: JudgedStores;
} {
  const rules = readRules();
  const pieces = readBankPieces();
  const stores = readStores(rules);
  const result = runRules(
    rules,
    pieces,
    readLedger(),
    { [REPLY_RULE]: replyFollowsReport(pieces) } satisfies PlaceReports,
    stores,
  );
  const { counts, rose } = awaitingAfter(
    result.awaitingVerdict,
    committedAwaiting(),
  );
  return {
    result,
    pulledFile: pulledFileOf(result, counts),
    rose,
    rules,
    pieces,
    stores,
  };
}

/** The message for a rule with more lines waiting for a verdict than committed. */
export const roseMessage = (row: {
  rule: string;
  fresh: number;
  committed: number;
}) =>
  `${row.rule}: ${row.fresh} lines wait for a verdict, more than the ${row.committed} committed. Judge the new or changed lines: npm run words:pairs -- --rule ${row.rule} --out <dir outside the repository>, then npm run words:verdicts -- --from <dir>.`;

const quote = (text: string) => `"${text.replace(/\s+/g, " ").trim()}"`;

/** The top lines of the report: what was read and how much of it is attached. */
function readingTotals(reading: ReadingReport): string[] {
  const notes = reading.notes.length;
  const noteAttached = notes - reading.unattachedNotes.length;
  const rulings = reading.rulings.length;
  const places = Object.entries(reading.perPlace)
    .map(([name, count]) => `${name} ${count}`)
    .join(", ");
  return [
    `- Grade notes read: ${notes}. Attached to a rule: ${noteAttached}. Attached to none: ${reading.unattachedNotes.length}.`,
    `- Rulings read from the other places: ${rulings} (${places}). Attached to a rule: ${reading.attachedRulings}. Not rules: ${rulings - reading.attachedRulings}.`,
  ];
}

/** The two lists at the end of the report: notes no rule cites, and rulings that are not rules. */
function readingSections(reading: ReadingReport): string[] {
  const batch = (file: string) => file.replace(/\.json$/, "");
  return [
    `## Grade notes attached to no rule (${reading.unattachedNotes.length})`,
    "",
    ...reading.unattachedNotes.map(
      (note) =>
        `- ${note.date || "no date"}, ${batch(note.file)}, ${quote(note.note)}: ${note.reason || "NO REASON GIVEN"}`,
    ),
    "",
    `## Rulings that are not rules (${reading.rulings.length - reading.attachedRulings})`,
    "",
    ...reading.rulings
      .filter((r) => !r.rule)
      .map(
        (r) =>
          `- ${r.id}, ${r.date}, ${r.source}, ${quote(r.words)}: ${r.notARule ?? "NO REASON GIVEN"}`,
      ),
    "",
  ];
}

const short = (text: string, max = 80) =>
  text.length > max ? `${text.slice(0, max - 1)}...` : text;

/** The report: each rule, what it said, what it pulled, then the totals and conflicts. */
export function reportOf(
  rules: readonly LineRule[],
  pieces: readonly RulePiece[],
  result: RunResult,
  reading?: ReadingReport,
): string {
  const text = new Map(pieces.map((piece) => [piece.key, piece.text]));
  const lines: string[] = ["# Rules run", ""];
  if (reading) {
    const mismatched = rules
      .filter((rule) => rule.detectorReads)
      .map((rule) => `${rule.id} (${rule.judges})`);
    lines.push(
      ...readingTotals(reading),
      `- Rules: ${rules.length}. Rules that judge a set or an exchange but whose detector reads one line: ${mismatched.length ? mismatched.join(", ") : "none"}.`,
      "",
    );
  }
  for (const rule of rules) {
    const row = result.perRule[rule.id]!;
    lines.push(
      `## ${rule.id} (${rule.status}, ${rule.test.kind})`,
      "",
      rule.says,
      "",
      `Notes behind it: ${rule.from.length}${rule.research ? `, research ${rule.research.length}` : ""}. ` +
        `Lines it flags: ${row.flagged}. Pulled: ${row.pulled}. Waiting: ${row.waiting}.`,
    );
    if (row.verdicts)
      lines.push(
        "",
        `Lines judged: ${row.verdicts.judged}. Judged bad: ${row.verdicts.bad}. Waiting for a verdict: ${row.verdicts.waiting}; they play.`,
      );
    else if (rule.test.kind === "composed")
      lines.push(
        "",
        "Reads whole composed texts, not bank lines: npm run words:composed counts its breaks.",
      );
    else if (rule.test.kind === "judged")
      lines.push(
        "",
        `Judged by ${rule.judges}: the store keys a ${rule.judges} once words-machine part 3 builds them; nothing judged yet.`,
      );
    if (row.report) {
      const r = row.report;
      lines.push(
        "",
        `Pairs play can offer: ${r.pairs}. Judged: ${r.judged}, of which "no": ${r.no} (replies with at least one "no": ${r.repliesWithNo}). Not yet judged: ${r.unjudged}; they play as before.`,
        `Lines no reply follows, where a new reply is needed: ${Object.keys(r.noReplyFollows).length}.`,
        ...Object.entries(r.noReplyFollows)
          .slice(0, 5)
          .map(([key, spots]) => `- ${key}: ${spots.join(", ")}`),
      );
    }
    if (row.examples.length)
      lines.push(
        "",
        ...row.examples.map((key) => `- ${key}: ${short(text.get(key) ?? "")}`),
      );
    lines.push("");
  }
  const t = result.totals;
  lines.push(
    "## Totals",
    "",
    `- Pieces: ${t.pieces}. Held by the grades before the run: ${t.heldByGrades}.`,
    `- Playable before the rules: ${t.playableBefore}. After: ${t.playableAfter}.`,
    `- Pulled: ${t.pulled}. Waiting for a rewrite: ${t.waiting}. Flagged by a sample rule: ${t.sample}.`,
    `- Spots: ${t.spots}. Spots with one line: ${t.spotsWithOneLine}. Spots left with only waiting lines: ${t.spotsLeftWithOnlyWaiting}. Spots made silent: ${t.spotsMadeSilent}.`,
    "",
    "## Conflicts (an enforced rule flags a line he graded good)",
    "",
    ...(result.conflicts.length
      ? result.conflicts.map(
          (row) =>
            `- ${row.rule} flags ${row.key}: ${short(text.get(row.key) ?? "")}`,
        )
      : ["None."]),
    "",
    ...(reading ? readingSections(reading) : []),
  );
  return lines.join("\n");
}

function main() {
  const { result, pulledFile, rose, rules, pieces } = freshRun();
  writeFileSync(PULLED_FILE, `${JSON.stringify(pulledFile, null, 2)}\n`);
  execSync(`npx prettier --write ${PULLED_FILE}`, { stdio: "ignore" });
  const report = reportOf(rules, pieces, result, readReading(rules));
  console.log(report);
  for (const row of rose) console.error(roseMessage(row));
  if (rose.length) process.exitCode = 1;
  const at = process.argv.indexOf("--report");
  if (at >= 0 && process.argv[at + 1]) {
    writeFileSync(process.argv[at + 1]!, report);
    console.log(`Wrote ${process.argv[at + 1]}.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
