/* global process, console */
// Flags live docs that say something no longer true (.agents/skills/doc-freshness/SKILL.md).
// Scope, patterns, banned phrases: freshness.json. --prs checks PR states; --report never fails.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);
const report = argv.includes("--report");
process.on("uncaughtException", (e) => {
  console.error(`docs:fresh failed: ${e.message}`);
  process.exit(report ? 0 : 2);
});
const cfg = JSON.parse(readFileSync("scripts/docs/freshness.json", "utf8"));
const day = argv.find((a) => a.startsWith("--today="))?.slice(8);
const today = day ? new Date(day) : new Date();
const rx = {};
for (const [k, v] of Object.entries(cfg.patterns))
  rx[k] = new RegExp(...[v].flat());
const banned = cfg.banned.map((s) => new RegExp(s, "i"));
const run = (cmd, args, input) =>
  spawnSync(cmd, args, { encoding: "utf8", input }).stdout?.trim() || "";
const git = ["ls-files", "--cached", "--others", "--exclude-standard"];
const files = run("git", git).split("\n").filter(existsSync);
const [known, parts] = [new Set(), new Set()];
const stems = files.map((f) => f.replace(/\.(tsx?|mjs)$/, ""));
for (const s of [...files, ...stems].map((f) => f.split("/")))
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j <= s.length; j++)
      (i ? parts : known).add(s.slice(i, j).join("/"));
const missing = (t, doc) => {
  const ps = [t, join(dirname(doc), t)];
  const loose = !rx.rooted.test(t);
  const hit = (q) => known.has(q) || (loose && parts.has(q));
  return ps.some((q) => hit(q.replace(/\/$/, ""))) ? null : ps;
};
const states = {};
const ghState = (n) =>
  run("gh", ["pr", "view", n, "--json", "state", "--jq", ".state"]);
const flags = [];
const docs = files.filter((f) => rx.scope.test(f) && !rx.record.test(f));
for (const doc of docs) {
  const lines = readFileSync(doc, "utf8").split("\n");
  const add = (k, at, what, ps = []) => flags.push([doc, k, at + what, ps]);
  if (rx.history.test(lines.slice(0, 12).join("\n"))) continue;
  const title = lines.findIndex((l) => l.startsWith("# "));
  const next = lines.slice(title + 1).find((l) => l.trim() !== "") ?? "";
  const stamp = rx.stamp.exec(next);
  const age = stamp ? (today - new Date(stamp[1])) / 864e5 : Infinity;
  if (!stamp) add("header", "", "no `Current as of` line");
  else if (age > cfg.maxDays) add("header", "", `last refreshed ${stamp[1]}`);
  if (rx.logs.test(doc)) continue;
  lines.forEach((line, i) => {
    const at = `line ${i + 1}: `;
    for (const m of line.matchAll(rx.token)) {
      const t = (m[1] ?? m[2]).replace(/[:#].*$/, "").replace(/[.,;]$/, "");
      const bare = m[1] && !rx.fileLike.test(t) && !rx.rooted.test(t);
      if (bare || rx.skipToken.test(t)) continue;
      const ps = missing(t, doc);
      if (ps) add("path", at, `${t} is gone`, ps);
    }
    if (!rx.overruled.test(line))
      for (const b of banned) if (b.test(line)) add("overruled", at, b.source);
    if (!argv.includes("--prs") || !rx.openPr.test(line)) return;
    for (const [, n] of line.matchAll(/#(\d{3,5})\b/g))
      if (/MERGED|CLOSED/.test((states[n] ??= ghState(n))))
        add("pr", at, `#${n} is ${states[n]}`);
  });
}
const ignore = ["check-ignore", "--no-index", "--stdin"];
const asked = flags.flatMap((f) => f[3]).join("\n");
const built = new Set(run("git", ignore, asked).split("\n"));
const shown = flags.filter((f) => !f[3].some((p) => built.has(p)));
const cell = (c) => c.replace(/\|/g, "\\|");
console.log("| path | check | detail |\n| --- | --- | --- |");
for (const f of shown)
  console.log(`| ${f.slice(0, 3).map(cell).join(" | ")} |`);
const nDocs = new Set(shown.map((f) => f[0])).size;
console.log(`\n${docs.length} docs, ${nDocs} flagged, ${shown.length} flags.`);
process.exit(shown.length && !report ? 1 : 0);
