// Writes docs/CURRENT.md from docs/current.json, the one place that says what
// is current (owner, Nov 11, 2026). Run: node --import tsx scripts/current/write.ts
// tests/guards/current-pointers.test.ts fails when the two differ.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface Current {
  about: string;
  current: { kind: string; path: string }[];
  topLevel: { path: string; what: string }[];
  records: string[];
  replaced: { old: string; now: string; when: string; why: string }[];
}

const cell = (text: string): string => text.replace(/\|/g, "\\|");

/** The readable page, from the data. */
export function currentPage(data: Current): string {
  const lines = [
    "# What is current",
    "",
    "Written from `docs/current.json` by `node --import tsx scripts/current/write.ts`. Change the JSON, never this page.",
    "",
    'Owner, Nov 11, 2026: "updates all documents so that nothing is pointing at anything old, and have somewhere as like a master updater or something, to where in the future old things aren\'t pointing at all different things at all different times."',
    "",
    "**The rule.** Whoever replaces or removes something adds its old path to the replaced list below and fixes every pointer to it, in the same pull request. A guard (`tests/guards/current-pointers.test.ts`) fails when a document, rule, skill or code comment names a path that is not in the repository, and when something new appears at the top of the repository with no row here. The skill `current-pointers` says how.",
    "",
    "## The current thing, by kind",
    "",
    "| Kind | Where |",
    "| --- | --- |",
    ...data.current.map((row) => `| ${cell(row.kind)} | \`${row.path}\` |`),
    "",
    "## The top of the repository",
    "",
    "| Path | What it is |",
    "| --- | --- |",
    ...data.topLevel.map((row) => `| \`${row.path}\` | ${cell(row.what)} |`),
    "",
    "## Records, which are never rewritten",
    "",
    "These keep what was said or shipped. A path they name may be long gone, and the guard does not read them.",
    "",
    ...data.records.map((path) => `- \`${path}\``),
    "",
    "## Replaced or removed, kept forever",
    "",
    "| Old path | Now | When | Why |",
    "| --- | --- | --- | --- |",
    ...data.replaced.map(
      (row) =>
        `| \`${row.old}\` | ${row.now.includes(" ") ? cell(row.now) : `\`${row.now}\``} | ${row.when} | ${cell(row.why)} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = process.cwd();
  const data = JSON.parse(
    readFileSync(join(root, "docs/current.json"), "utf8"),
  ) as Current;
  writeFileSync(join(root, "docs/CURRENT.md"), currentPage(data));
  console.log("Wrote docs/CURRENT.md");
}
