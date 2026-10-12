/**
 * Writes a grading batch as a page the owner grades on: each line with the
 * line before it, and a column for good, rewrite or kill. His grades go to
 * `data/english/grades/<batch>.json` as `{ "batch": "<id>", "grades":
 * [{ "i": 0, "grade": "good" }] }` and fold into the engine's ledger through
 * `scripts/dialogue-batch/apply-grades.ts`. Developer tooling.
 *
 *   node --import tsx scripts/english-corpus/batch-page.ts <batch-id> <out.md> [conversation|life]
 */
import { readFileSync, writeFileSync } from "node:fs";

const [id, out, what = "conversation"] = process.argv.slice(2);
const batch = JSON.parse(
  readFileSync(`data/english/batches/${id}.json`, "utf8"),
) as {
  variety: { places: number };
  items: {
    i: number;
    situation: string;
    prior: string;
    reply: string;
    kind: string;
  }[];
};
const cell = (text: string) => text.replace(/\|/g, "\\|");
const places = [
  ...new Set(
    batch.items.map((item) => /, in (.+), on /.exec(item.situation)?.[1] ?? ""),
  ),
].filter(Boolean);
const rows = batch.items.map(
  (item) =>
    `| ${item.i} | ${cell(item.prior || "(the talk opens)")} | ${cell(item.reply)} | | |`,
);
writeFileSync(
  out!,
  `# ${what === "conversation" ? "Conversations" : "The journal, scenes, the clerk and people bringing things up"} in real Americans' words: grading batch ${id}

These ${batch.items.length} lines are what the story director writes when its words come from the mined ${what === "conversation" ? "conversation bank" : "journal, scene, clerk and bring-it-up banks"} instead of hand-written lines. Each sentence was said in a public-domain federal transcript, with the names, employers and towns filled from a generated person's records. They come from conversations in ${places.length} drawn places: ${places.join("; ")}.

Grade one thing per line: does it fit the line before it, the way a person would say it? Write good, rewrite or kill, and a note where it helps. A line you kill is never said again; another real sentence takes its place. Grades never block a merge.

| # | The line before | The line | Grade | Note |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`,
);
