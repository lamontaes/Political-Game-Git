/**
 * Tags every part in every bank (data/english/parts/*.json) with its shared
 * move and, where the sentence fits only one kind of moment, its situation
 * key, from the rules in scripts/english-corpus/moves.json. Development
 * tooling: it writes no sentence and changes none; it only sorts the parts so
 * the coverage table (scripts/dialogue-batch/coverage-table.ts) can count them
 * against the director's situation catalog.
 *
 *   node --import tsx scripts/english-corpus/tag-moves.ts           write tags
 *   node --import tsx scripts/english-corpus/tag-moves.ts --check   exit 1 on drift
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import movesJson from "./moves.json" with { type: "json" };

export interface MoveRule {
  move: string;
  text?: string;
  tag: string;
  key?: string;
}

export interface PartTag {
  move: string;
  key?: string;
}

export interface MovesTable {
  moves: Record<string, string>;
  keys: Record<string, string>;
  endpoints: Record<string, string>;
  registers: {
    splitBySubject: string[];
    narrated: Record<string, string[]>;
  };
  rules: Record<string, MoveRule[]>;
}

export const MOVES = movesJson as unknown as MovesTable;

export const PARTS_DIR = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../data/english/parts",
);

/** A rule's pattern; a leading `(?i)` makes it ignore case. */
function pattern(source: string): RegExp {
  return source.startsWith("(?i)")
    ? new RegExp(source.slice(4), "i")
    : new RegExp(source);
}

/** The shared move and key one part takes under its bank's rules. */
export function tagFor(
  register: string,
  part: { move: string; text: string; uses?: { key?: string }[] },
  table: MovesTable = MOVES,
): PartTag | undefined {
  for (const rule of table.rules[register] ?? []) {
    if (!pattern(rule.move).test(part.move)) continue;
    if (rule.text !== undefined && !pattern(rule.text).test(part.text))
      continue;
    // A part that names its situation key in its use (a scene-talk piece
    // that fits one kind of moment) keeps that key.
    const key = rule.key ?? part.uses?.find((use) => use.key)?.key;
    return key ? { move: rule.tag, key } : { move: rule.tag };
  }
  return undefined;
}

export interface BankFile {
  file: string;
  register: string;
  parts: {
    key: string;
    move: string;
    text: string;
    tag?: PartTag;
    uses?: { subject?: string; key?: string }[];
  }[];
}

export function readBanks(dir: string = PARTS_DIR): BankFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const bank = JSON.parse(readFileSync(join(dir, name), "utf8"));
      return { file: name, register: bank.register, parts: bank.parts };
    });
}

function main(): void {
  const check = process.argv.includes("--check");
  const problems: string[] = [];
  let drift = 0;
  for (const name of readdirSync(PARTS_DIR).filter((n) =>
    n.endsWith(".json"),
  )) {
    const path = join(PARTS_DIR, name);
    const bank = JSON.parse(readFileSync(path, "utf8"));
    for (const part of bank.parts) {
      const tag = tagFor(bank.register, part);
      if (!tag) {
        problems.push(
          `${part.key}: no rule for ${bank.register} move ${part.move}`,
        );
        continue;
      }
      if (!(tag.move in MOVES.moves))
        problems.push(`${part.key}: unknown move ${tag.move}`);
      if (tag.key && !(tag.key in MOVES.keys))
        problems.push(`${part.key}: unknown key ${tag.key}`);
      if (JSON.stringify(part.tag) !== JSON.stringify(tag)) {
        drift += 1;
        part.tag = tag;
      }
    }
    if (!check) writeFileSync(path, `${JSON.stringify(bank, null, 2)}\n`);
  }
  for (const line of problems) console.error(line);
  console.log(
    `${drift} part tags ${check ? "differ from the rules" : "written"}`,
  );
  if (problems.length || (check && drift)) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
