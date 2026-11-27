#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { posix as path } from "node:path";

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const source = args.find((arg) => !arg.startsWith("--"));
if (!source)
  throw new Error("Pass a repo-sort.json snapshot and optionally --apply");
const sort = JSON.parse(readFileSync(source, "utf8"));
const raw = git("ls-files", "-z").split("\0").filter(Boolean);
const tracked = new Set(raw);
const candidates = new Set(
  sort.neither.filter(
    (file) =>
      tracked.has(file) &&
      /^docs\/(?:play-first\/(?:shots[^/]*|screens)|reports|seen|lanes\/proof)(?:\/|$)/.test(
        file,
      ) &&
      !/(?:^|[\/_-])(?:owner|rulings?|grading|annotated)(?:[\/_-]|\.)/i.test(
        file,
      ) &&
      /\.(?:png|jpe?g|gif|webp|heic|bmp|tiff?|avif)$/i.test(file),
  ),
);
const oldText = new Set(
  sort.neither.filter((p) => p.startsWith("docs/") && p.endsWith(".md")),
);
const recent = new Set();
let snapshot = false;
for (const line of git(
  "log",
  "--since=2.days",
  "--remotes",
  "--format=commit %H",
  "--name-only",
  "--no-renames",
  "--",
  "docs",
).split("\n")) {
  if (line.startsWith("commit "))
    snapshot = line.startsWith("commit 742fb62c9b");
  else if (line && !snapshot) recent.add(line);
}
const protectedRoot =
  /^(?:docs\/(?:coordination\/playtest|design)\/|docs\/play-first\/(?:LAW|ORDER)\.md$|docs\/coordination\/OWNER-DECISIONS\.md$)/;
const kept = new Map();
for (const file of candidates)
  if (recent.has(file) || protectedRoot.test(file))
    kept.set(file, "recent or owner record");

const refs = new Map();
const folderRefs = new Map();
const ownership =
  /(?:the owner.{0,60}["“]|owner.{0,30}(?:said|ruled|ruling|verdict)|Lamontae.{0,35}(?:said|ruled|wrote|:)|^>.*(?:owner|Lamontae)|word.for.word)/im;
const suffix = "(?:png|jpe?g|gif|webp|heic|bmp|tiff?|avif)";
const bare = new RegExp(
  `(?:docs/)[^\\s"'<>` + "`" + `()\\[\\]]+\\.${suffix}(?![\\w.-])`,
  "gi",
);
const md = new RegExp(
  `(?:!?\\[[^\\]\\n]*\\]\\(<?|(?:^|\\n)\\[[^\\]\\n]*\\]:[ \\t]*<?)([^\\s<>()]+\\.${suffix})(?=[>\\s)#?])`,
  "gi",
);
const html = new RegExp(
  `(?:src|href)=["']([^"'\\n]+\\.${suffix})(?=["'#?])`,
  "gi",
);
function candidateAt(rawPath, ref) {
  if (/^\w+:\/\//.test(rawPath)) return;
  let name;
  try {
    name = decodeURIComponent(rawPath);
  } catch {
    name = rawPath;
  }
  const lookup = name.startsWith("docs/")
    ? name
    : name.startsWith("/docs/")
      ? name.slice(1)
      : path.normalize(path.join(path.dirname(ref), name));
  if (candidates.has(lookup)) return lookup;
}
for (const ref of raw) {
  if (
    !/\.(?:md|m?js|ts|json|ya?ml|txt|html)$/i.test(ref) ||
    ref === "docs/coordination/refactor/repo-sort.json" ||
    ref === "scripts/cleanup/retire-proof-shots.mjs" ||
    !/^(?:docs\/|\.agents\/|\.claude\/|AGENTS\.md$|scripts\/|tests\/|src\/|README\.md$)/.test(
      ref,
    )
  )
    continue;
  if (lstatSync(ref).size > 8 * 1024 * 1024) continue;
  const text = readFileSync(ref, "utf8");
  for (const match of text.matchAll(/`(docs\/[\w./-]+?)\/?`/g)) {
    const folder = match[1];
    if (!tracked.has(folder)) folderRefs.set(folder, ref);
  }
  if (!new RegExp(`\\.${suffix}\\b`, "i").test(text)) continue;
  const live =
    !oldText.has(ref) ||
    recent.has(ref) ||
    protectedRoot.test(ref) ||
    ownership.test(text);
  const matches = new Map();
  for (const pattern of [bare, md, html])
    for (const m of text.matchAll(pattern)) {
      const token = m[1] ?? m[0];
      const file = candidateAt(token, ref);
      if (!file) continue;
      if (live || !ref.endsWith(".md")) kept.set(file, ref);
      else matches.set(m.index + m[0].lastIndexOf(token), { file, token });
    }
  if (matches.size) refs.set(ref, matches);
}
const candidateFolders = new Map();
const remainingFolders = new Set();
for (const file of raw.filter((file) => file.startsWith("docs/"))) {
  for (let dir = path.dirname(file); dir !== "."; dir = path.dirname(dir)) {
    if (!folderRefs.has(dir)) continue;
    if (!candidates.has(file) || kept.has(file)) remainingFolders.add(dir);
    else {
      const members = candidateFolders.get(dir) ?? [];
      members.push(file);
      candidateFolders.set(dir, members);
    }
  }
}
for (const [dir, members] of candidateFolders)
  if (!remainingFolders.has(dir))
    for (const file of members) kept.set(file, folderRefs.get(dir));
const drop = [...candidates].filter((file) => !kept.has(file)).sort();
const dropped = new Set(drop);
const unchanged = [];
let pointerFiles = 0,
  bytes = 0;
const revision = git("rev-parse", "HEAD").trim();
const remote = "https://github.com/lamontaes/Political-Game-Git";
for (const [ref, matches] of refs) {
  const replace = [...matches]
    .filter(([, { file }]) => dropped.has(file))
    .sort(([a], [b]) => b - a);
  if (!replace.length) continue;
  let text = readFileSync(ref, "utf8");
  let end = text.length;
  for (const [offset, { file, token }] of replace) {
    if (offset + token.length > end) continue; // A Markdown link also matched the bare rule.
    const permalink = `${remote}/blob/${revision}/${file.split("/").map(encodeURIComponent).join("/")}`;
    text =
      text.slice(0, offset) + permalink + text.slice(offset + token.length);
    end = offset;
  }
  if (apply) writeFileSync(ref, text);
  pointerFiles++;
}
for (const file of drop) bytes += lstatSync(file).size;
for (const [file, reason] of kept) unchanged.push({ file, reason });
if (apply)
  for (let i = 0; i < drop.length; i += 100)
    git("rm", "--", ...drop.slice(i, i + 100));
const summary = {
  deleted: drop.length,
  bytes,
  pointerFiles,
  retained: unchanged.length,
};
console.log(JSON.stringify({ summary, drop, unchanged }, null, 2));
