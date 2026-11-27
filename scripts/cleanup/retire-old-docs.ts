import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { posix as path } from "node:path";
import { CODE, pathsNamed } from "../current/pointers";

const git = (...args: string[]) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const source = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!source)
  throw new Error("Pass a repo-sort.json snapshot and optionally --apply");
const apply = process.argv.includes("--apply");
const sort = JSON.parse(readFileSync(source, "utf8")) as { neither: string[] };
const raw = git("ls-files", "-z").split("\0").filter(Boolean);
const tracked = new Set(raw);
const candidates = new Set(
  sort.neither.filter(
    (file) =>
      tracked.has(file) &&
      /^docs\/(?:reports|lanes|codex|archive)\/.+\.(?:md|jsonl?|log|txt|html|mjs|patch|err|sh|py|mts|csv|css|ts|cjs|js)$/.test(
        file,
      ),
  ),
);
const keep = new Map<string, string>();
const add = (file: string, reason: string) => {
  if (!keep.has(file)) keep.set(file, reason);
};
let synthetic = false;
for (const line of git(
  "log",
  "--since=2.days",
  "--remotes",
  "--format=commit %H",
  "--no-renames",
  "--name-only",
  "--",
  "docs",
).split("\n")) {
  if (line.startsWith("commit "))
    synthetic = line.startsWith("commit 742fb62c9b");
  else if (line && !synthetic && candidates.has(line))
    add(line, "changed on a recent branch");
}
const owner =
  /\b(?:owner|Lamontae|ruling|verbatim|his words|playtest|design)\b/i;
const anchor =
  /(?:!?\[[^\]\n]*\]\(<?|(?:^|\n)\[[^\]\n]*\]:[ \t]*<?|(?:src|href)=["'])([^\s<>()"'#]+)(?=[>\s"'#)])/g;
const bare = /(?<![\w./:-])docs\/[\w./-]+\.[a-z0-9]{1,5}(?![\w.-])/g;
const candidateDirs = new Map<string, string[]>();
const liveDirs = new Set<string>();
for (const file of raw) {
  if (!file.startsWith("docs/")) continue;
  for (let dir = path.dirname(file); dir !== "."; dir = path.dirname(dir)) {
    if (!candidates.has(file)) liveDirs.add(dir);
    else {
      const files = candidateDirs.get(dir) ?? [];
      files.push(file);
      candidateDirs.set(dir, files);
    }
  }
}
const edges = new Map<string, Set<string>>();
for (const file of raw) {
  if (
    !/\.(?:md|m?js|m?ts|jsonl?|ya?ml|txt|html|log|err|patch|sh|py|csv|css|cjs)$/i.test(
      file,
    ) ||
    file === "docs/coordination/refactor/repo-sort.json" ||
    !/^(?:docs\/|\.agents\/|\.claude\/|\.github\/|scripts\/|tests\/|src\/|[^/]+\.md$)/.test(
      file,
    )
  )
    continue;
  if (statSync(file).size > 16 * 1024 * 1024) continue;
  const text = readFileSync(file, "utf8");
  if (candidates.has(file) && (owner.test(text) || owner.test(file)))
    add(file, "may hold a ruling or owner evidence");
  const targets = new Set<string>();
  function match(rawPath: string) {
    if (/^(?:https?:|mailto:|#)/.test(rawPath)) return;
    const p = rawPath.replace(/\/$/, "");
    if (candidates.has(p)) targets.add(p);
    else if (!liveDirs.has(p))
      for (const child of candidateDirs.get(p) ?? []) targets.add(child);
  }
  for (const name of pathsNamed(text, CODE.test(file))) match(name);
  for (const [name] of text.matchAll(bare)) match(name);
  for (const [, name] of text.matchAll(anchor)) {
    if (!name || /^\w+:/.test(name)) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(name);
    } catch {
      decoded = name;
    }
    match(
      decoded.startsWith("docs/")
        ? decoded
        : decoded.startsWith("/docs/")
          ? decoded.slice(1)
          : path.normalize(path.join(path.dirname(file), decoded)),
    );
  }
  if (candidates.has(file)) edges.set(file, targets);
  else for (const target of targets) add(target, file);
}
for (const [file] of keep)
  for (const target of edges.get(file) ?? [])
    if (target !== file) add(target, file);
const drop = [...candidates].filter((file) => !keep.has(file)).sort();
if (apply)
  for (let i = 0; i < drop.length; i += 100)
    git("rm", "--", ...drop.slice(i, i + 100));
console.log(
  JSON.stringify(
    {
      deleted: drop.length,
      retained: keep.size,
      drop,
      retainedBecause: Object.fromEntries(keep),
    },
    null,
    2,
  ),
);
