/**
 * Rule 108 (words machine): a question is offered only if the record can
 * answer it. Walks every composed scene talk (every purpose and variant, the
 * way tests/support/scene-talk-fixture builds them) and sorts each line the
 * English engine says asks into the Words lead's four classes, by path:
 *   1 courtesy opener (out of the rule)
 *   2 a question the player's own offered replies answer (passes while a reply follows)
 *   3 a challenge that wants no information (passes while any reply follows)
 *   4 a real request for information (needs an answer line on the path, guarded on a record fact)
 * It lists failures; it changes no bank.
 *
 *   node --import tsx scripts/words/answerable-asks.ts [--out file.md]
 */
import { writeFileSync, readFileSync } from "node:fs";
import { buildTalks } from "../../tests/support/scene-talk-fixture";
import type {
  SceneTalk,
  SceneTalkLine,
  TreeNode,
} from "../../src/director/scene-talk";
import bank from "../../data/english/parts/scene-talk.json" with { type: "json" };

const out = (() => {
  const at = process.argv.indexOf("--out");
  return at >= 0 ? process.argv[at + 1]! : "";
})();

interface Part {
  key: string;
  requiresFacts?: string[];
  onlyWhen?: string[];
  uses?: { requiresFacts?: string[]; onlyWhen?: string[] }[];
}
const parts = new Map<string, Part>();
const walk = (o: unknown): void => {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === "object") {
    const row = o as Part & { text?: string };
    if (typeof row.key === "string" && typeof row.text === "string")
      parts.set(row.key, row);
    Object.values(o).forEach(walk);
  }
};
walk(bank);
const factsOf = (line: SceneTalkLine): string[] =>
  line.parts.flatMap((key) => {
    const part = parts.get(key);
    if (!part) return [];
    return [
      ...(part.requiresFacts ?? []),
      ...(part.onlyWhen ?? []),
      ...(part.uses ?? []).flatMap((use) => [
        ...(use.requiresFacts ?? []),
        ...(use.onlyWhen ?? []),
      ]),
    ];
  });

const COURTESY =
  /^(?:have you got a (?:few )?minutes?|is now a bad time|hey\. have you got|how are you|you okay|are you okay|are you all right|how'?s it going|how have you been|what'?s up|how are things|got a minute|do you have a (?:minute|moment))/i;
const CHALLENGE =
  /^(?:are you (?:threatening|serious|kidding|saying)|who else|did it ever|do you (?:really )?think i|why would i|what do you want me to|so (?:that'?s|you)|is that (?:a|supposed)|are you (?:trying|here to)|what'?s that supposed)/i;
const INFO =
  /^(?:what|where|when|who|whom|whose|which|why|how|is |are |does |did |do you (?:know|remember|see|have)|has |have |was |were |would i|will i|could i|can i )/i;

type Klass = 1 | 2 | 3 | 4;
const firstQuestion = (text: string): string =>
  text.split(/(?<=[.!?])\s+/).find((sentence) => sentence.endsWith("?")) ??
  text;
const classOf = (text: string): Klass => {
  const q = firstQuestion(text).trim();
  if (COURTESY.test(text.trim()) || COURTESY.test(q)) return 1;
  if (CHALLENGE.test(q)) return 3;
  if (INFO.test(q)) return 4;
  return 2;
};

interface Fail {
  klass: Klass;
  purpose: string;
  line: SceneTalkLine;
  why: string;
}
const fails: Fail[] = [];
let seen = 0;

function check(
  talk: SceneTalk,
  line: SceneTalkLine,
  rest: SceneTalkLine[],
  node: TreeNode,
): void {
  seen += 1;
  const klass = classOf(line.text);
  if (klass === 1) return;
  const next = rest[0];
  const endsHere = !next && node.replies.length === 0 && !node.branches;
  const playerNext = !next && node.replies.length > 0;
  if (klass === 2) {
    if (endsHere)
      fails.push({
        klass,
        purpose: talk.purpose,
        line,
        why: "the scene ends on the question",
      });
    return;
  }
  if (klass === 3) {
    if (endsHere)
      fails.push({
        klass,
        purpose: talk.purpose,
        line,
        why: "the scene ends on the challenge",
      });
    return;
  }
  // Class 4: an answer line from the other person, guarded on a record fact.
  if (endsHere) {
    fails.push({
      klass,
      purpose: talk.purpose,
      line,
      why: "the scene ends on the question",
    });
    return;
  }
  if (playerNext) return; // the player answers from their own life: the choices carry it
  if (next && next.role !== line.role) {
    const answering = /answer|tell/.test(next.move) || next.after === line.move;
    if (!answering)
      fails.push({
        klass,
        purpose: talk.purpose,
        line,
        why: `next line is ${next.move}, not an answer`,
      });
    else if (factsOf(next).length === 0)
      fails.push({
        klass,
        purpose: talk.purpose,
        line,
        why: `the answer (${next.move}) carries no record fact`,
      });
    return;
  }
  fails.push({
    klass,
    purpose: talk.purpose,
    line,
    why: "no answer line follows it",
  });
}

function visit(talk: SceneTalk, node: TreeNode): void {
  node.lines.forEach((line, index) => {
    if (line.role !== "narrator" && line.asks)
      check(talk, line, node.lines.slice(index + 1), node);
  });
  for (const reply of node.replies) {
    if (reply.line.asks)
      check(
        talk,
        reply.line,
        reply.next?.lines.slice(0, 1) ?? [],
        reply.next ?? { lines: [], replies: [] },
      );
    if (reply.next) visit(talk, reply.next);
  }
  for (const branch of node.branches ?? []) visit(talk, branch.node);
}

const talks = buildTalks();
for (const talk of talks) {
  for (const line of [talk.open, talk.state, ...talk.intro].filter(
    (l): l is SceneTalkLine => !!l,
  )) {
    if (line.asks && line.role !== "narrator") {
      const first = talk.tree.lines[0];
      const probe: TreeNode = talk.tree;
      check(
        talk,
        line,
        first && line !== talk.state ? [] : talk.tree.lines.slice(0, 1),
        probe,
      );
    }
  }
  visit(talk, talk.tree);
}

// Play counts from the ranked runs, when a key is on them.
const plays = new Map<string, number>();
for (const file of [
  "/mnt/project-files/words-lead/one-line-spots/ranked-nov14-train-ee82407b.md",
  "/mnt/project-files/words-lead/one-line-spots/ranked-nov10.md",
]) {
  try {
    for (const row of readFileSync(file, "utf8").split("\n")) {
      const m = /^\|\s*\d+\s*\|\s*(\d+)\s*\|[^|]*\|[^|]*\|\s*`([^`]+)`/.exec(
        row,
      );
      if (m) plays.set(m[2]!, Math.max(plays.get(m[2]!) ?? 0, Number(m[1])));
    }
  } catch {
    /* the ranked files are optional */
  }
}

const byKey = new Map<string, Fail & { count: number }>();
for (const fail of fails) {
  const key = `${fail.line.parts[0] ?? fail.line.text}\u0000${fail.why}`;
  const row = byKey.get(key);
  if (row) row.count += 1;
  else byKey.set(key, { ...fail, count: 1 });
}
const rows = [...byKey.values()].sort(
  (a, b) =>
    (plays.get(b.line.parts[0] ?? "") ?? 0) -
      (plays.get(a.line.parts[0] ?? "") ?? 0) || b.count - a.count,
);
const lines = [
  "# Rule 108: failures by class, by path (M1)\n",
  `${talks.length} composed talks, ${seen} asking lines read, ${rows.length} distinct failing lines. Class 4 = a real request for information with no answer line guarded on a record fact; classes 2 and 3 are listed only where the scene ends on the question. Sorted by plays in the ranked runs, then by how many talks hold the line.\n`,
];
for (const klass of [4, 3, 2] as const) {
  const list = rows.filter((row) => row.klass === klass);
  lines.push(`\n## Class ${klass}: ${list.length} lines\n`);
  for (const row of list)
    lines.push(
      `- \`${row.line.parts[0] ?? ""}\` (${row.purpose}, in ${row.count} tree positions${plays.get(row.line.parts[0] ?? "") ? `, ${plays.get(row.line.parts[0] ?? "")} plays` : ""}): "${row.line.text}" - ${row.why}`,
    );
}
const text = lines.join("\n") + "\n";
if (out) writeFileSync(out, text);
else process.stdout.write(text);
