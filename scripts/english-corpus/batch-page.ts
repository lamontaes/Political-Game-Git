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
const TITLES: Record<string, [string, string]> = {
  conversation: ["Conversations", "conversation bank"],
  life: [
    "The journal, scenes, the clerk and people bringing things up",
    "journal, scene, clerk and bring-it-up banks",
  ],
  speech: [
    "Speeches, hearings, public comment, interviews and headlines",
    "speech, interview and headline banks",
  ],
};
const [heading, banks] = TITLES[what] ?? TITLES.conversation!;
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
    cell?: { place?: string };
  }[];
};
const cell = (text: string) => text.replace(/\|/g, "\\|");
const places = [
  ...new Set(batch.items.map((item) => item.cell?.place ?? "")),
].filter(Boolean);
const rows = batch.items.map(
  (item) =>
    `| ${item.i} | ${cell(item.prior || "(the talk opens)")} | ${cell(item.reply)} | | |`,
);
writeFileSync(
  out!,
  `# ${heading} in real Americans' words: grading batch ${id}

These ${batch.items.length} lines are what the story director writes when its words come from the mined ${banks} instead of hand-written lines. Each sentence was said in a public-domain federal record, with the names, employers and towns filled from a generated person's records.

## How to grade

Grade one thing per line: does it fit the line before it, the way a person would say it? Write good, rewrite or kill, and a note where it helps. A line you kill is never said again; another real sentence takes its place. Grades never block a merge. The lines come from ${places.length} drawn places: ${places.join("; ")}.

## The lines

| # | The line before | The line | Grade | Note |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`,
);
