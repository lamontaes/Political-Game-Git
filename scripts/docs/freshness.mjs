#!/usr/bin/env node
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
const run = (cmd, args) =>
  spawnSync(cmd, args, { encoding: "utf8" }).stdout?.trim() || "";
const git = ["ls-files", "--cached", "--others", "--exclude-standard"];
const files = run("git", git).split("\n").filter(existsSync);
const known = new Set();
for (const f of files)
  f.split("/").forEach((_, i, p) => known.add(p.slice(0, i + 1).join("/")));
const exists = (t, doc) => {
  const p = t.replace(/\/$/, "");
  if (known.has(p) || known.has(join(dirname(doc), p))) return true;
  return !rx.rooted.test(p) && files.some((f) => `/${f}/`.includes(`/${p}/`));
};
const states = {};
const ghState = (n) =>
  run("gh", ["pr", "view", n, "--json", "state", "--jq", ".state"]) ||
  "UNKNOWN";

const flags = [];
const docs = files.filter((f) => rx.scope.test(f) && !rx.record.test(f));
for (const doc of docs) {
  const lines = readFileSync(doc, "utf8").split("\n");
  const add = (check, at, detail) => flags.push([doc, check, at + detail]);
  if (rx.history.test(lines.slice(0, 12).join("\n"))) continue;
  const title = lines.findIndex((l) => l.startsWith("# "));
  const next = lines.slice(title + 1).find((l) => l.trim() !== "") ?? "";
  const stamp = rx.stamp.exec(next);
  const age = stamp ? (today - new Date(stamp[1])) / 864e5 : Infinity;
  if (!stamp)
    add("header", "", "no `Current as of YYYY-MM-DD (what changed)` line");
  else if (age > cfg.maxDays) add("header", "", `last refreshed ${stamp[1]}`);
  if (rx.logs.test(doc)) continue;
  lines.forEach((line, i) => {
    const at = `line ${i + 1}: `;
    for (const m of line.matchAll(rx.token)) {
      const t = (m[1] ?? m[2]).replace(/[:#].*$/, "").replace(/[.,;]$/, "");
      const bare = m[1] && !rx.fileLike.test(t) && !rx.rooted.test(t);
      if (bare || rx.skipToken.test(t)) continue;
      if (!exists(t, doc)) add("path", at, `${t} is gone`);
    }
    if (!rx.overruled.test(line))
      for (const b of banned) if (b.test(line)) add("overruled", at, b.source);
    if (!argv.includes("--prs") || !rx.openPr.test(line)) return;
    for (const [, n] of line.matchAll(/#(\d{3,5})\b/g))
      if (/MERGED|CLOSED/.test((states[n] ??= ghState(n))))
        add("pr", at, `#${n} is ${states[n]}`);
  });
}

const cell = (c) => c.replace(/\|/g, "\\|");
console.log("| path | check | detail |\n| --- | --- | --- |");
for (const f of flags) console.log(`| ${f.map(cell).join(" | ")} |`);
const flagged = new Set(flags.map((f) => f[0])).size;
console.log(
  `\n${docs.length} docs, ${flagged} flagged, ${flags.length} flags.`,
);
process.exit(flags.length && !report ? 1 : 0);
