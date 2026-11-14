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
import {
  answerableAsks,
  type AskFail,
  type FactPart,
} from "../../src/english/answerable-asks";
import bank from "../../data/english/parts/scene-talk.json" with { type: "json" };

const out = (() => {
  const at = process.argv.indexOf("--out");
  return at >= 0 ? process.argv[at + 1]! : "";
})();

const parts = new Map<string, FactPart>();
const walk = (o: unknown): void => {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === "object") {
    const row = o as FactPart & { text?: string };
    if (typeof row.key === "string" && typeof row.text === "string")
      parts.set(row.key, row);
    Object.values(o).forEach(walk);
  }
};
walk(bank);
const talks = buildTalks();
const { fails, seen } = answerableAsks(talks, parts);

if (process.argv.includes("--write-baseline")) {
  const keys = [
    ...new Set(
      fails.map((f) => `${f.line.parts[0] ?? f.line.text} | ${f.why}`),
    ),
  ].sort();
  writeFileSync(
    "tests/english-answerable-asks-baseline.json",
    JSON.stringify(
      {
        about:
          "Rule 108: each asking line of a composed scene talk that has no answer from a record, as `part key | why`. The list may only shrink: tests/english-answerable-asks.test.ts fails on a line not here. Rewrite it with `node --import tsx scripts/words/answerable-asks.ts --write-baseline` after a change that removes lines.",
        failing: keys,
      },
      null,
      2,
    ) + "\n",
  );
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

const byKey = new Map<string, AskFail & { count: number }>();
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
