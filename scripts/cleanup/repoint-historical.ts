import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  asPath,
  data,
  deadPointers,
  exists,
  pathsNamed,
  scanned,
} from "../current/pointers";

const git = (args: string[], input?: string) =>
  execFileSync("git", args, {
    input,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
process.chdir(git(["rev-parse", "--show-toplevel"]).trim());
const history = process.argv
  .find((arg) => arg.startsWith("--history="))
  ?.slice("--history=".length);
const apply = process.argv.includes("--apply");
const protectedText =
  /\b(?:the owner.{0,60}["“]|owner.{0,30}(?:said|ruled|ruling|verdict)|Lamontae.{0,35}(?:said|ruled|wrote|:)|word.for.word)\b/im;
const scope = /^(?:docs\/(?:archive|codex|reports)\/).*\.md$/;
const sources = new Map<string, string>();
const targets = new Set<string>();
const unedited: { file: string; path: string; reason: string }[] = [];
for (const file of scanned) {
  if (!scope.test(file)) continue;
  const text = readFileSync(file, "utf8");
  const named = pathsNamed(text, false).filter((path) => !exists(path));
  if (!named.length) continue;
  if (protectedText.test(text) || /\b(?:owner|rulings|grading)\b/i.test(file)) {
    for (const path of named)
      unedited.push({ file, path, reason: "Owner record." });
    continue;
  }
  sources.set(file, text);
  for (const path of named)
    if (path !== "docs/coordination/BOARD.md") targets.add(path);
}
const deleted = history
  ? readFileSync(history, "utf8")
  : git([
      "log",
      "--first-parent",
      "--no-renames",
      "--diff-filter=D",
      "--format=%x00commit:%H%x00",
      "--name-only",
      "-z",
      "HEAD",
      "--",
      "src",
      "data",
      "docs",
      "tests",
      "scripts",
      "art",
      "public",
      "desktop",
      ".claude",
      ".agents",
    ]);
const parents = new Map(
  git(["rev-list", "--parents", "--first-parent", "HEAD"])
    .trim()
    .split("\n")
    .map((line) => {
      const [head, first] = line.split(" ");
      return [head, first];
    }),
);
const match = new Map<string, { revision: string; kind: string }>();
let parent: string | undefined;
for (const token of deleted.split("\0")) {
  if (!token) continue;
  const line = token.replace(/^\n/, "");
  if (line.startsWith("commit:")) {
    parent = parents.get(line.slice("commit:".length));
    continue;
  }
  if (!parent || !line || line.startsWith("\n")) continue;
  let path = line;
  // A deletion compared to the first parent proves both the entry and its
  // containing directories existed there. No archived blobs need fetching.
  while (path) {
    if (targets.has(path) && !match.has(path))
      match.set(path, {
        revision: parent,
        kind: path === line ? "blob" : "tree",
      });
    const slash = path.lastIndexOf("/");
    if (slash < 0) break;
    path = path.slice(0, slash);
  }
}
const replaced = new Map(
  data.replaced
    .filter(({ now }) => exists(now))
    .map(({ old, now }) => [old, now]),
);
const unchanged = [...unedited];
const updates: { file: string; count: number }[] = [];
let count = 0;
for (const [file, text] of sources) {
  let touched = 0;
  const named = new Set(
    pathsNamed(text, false).filter((path) => !exists(path)),
  );
  let fence: string | undefined;
  const output = text
    .split("\n")
    .map((line) => {
      // A quotation stays word for word. A fenced shell example should stay runnable, not turn into a link.
      const delimiter = /^\s*([`~])\1{2,}/.exec(line)?.[1];
      if (delimiter && !fence) {
        fence = delimiter;
        return line;
      }
      if (delimiter && delimiter === fence) {
        fence = undefined;
        return line;
      }
      if (fence || /^\s*>/.test(line)) return line;
      return line.replace(
        /`([^`\s]+)`( \(new\)| \(removed\))?/g,
        (token, word: string, marker?: string) => {
          if (marker) return token;
          const path = asPath(word);
          if (
            !path ||
            !named.has(path) ||
            path === "docs/coordination/BOARD.md"
          )
            return token;
          const now = replaced.get(path);
          if (now && word === path) {
            touched++;
            return `\`${now}\``;
          }
          const historical = match.get(path);
          if (!historical) return token;
          const { kind, revision } = historical;
          const encoded = path.split("/").map(encodeURIComponent).join("/");
          const suffix = word.startsWith(path) ? word.slice(path.length) : "";
          const label = word.replaceAll("[", "\\[").replaceAll("]", "\\]");
          touched++;
          return `[${label}](https://github.com/lamontaes/Political-Game-Git/${kind}/${revision}/${encoded}${suffix.startsWith("#") ? suffix : ""})`;
        },
      );
    })
    .join("\n");
  for (const path of pathsNamed(output, false).filter((path) => !exists(path)))
    unchanged.push({
      file,
      path,
      reason:
        path === "docs/coordination/BOARD.md"
          ? "Handled by the separate archived-board branch."
          : "No verified history or inside protected quoting.",
    });
  if (!touched) continue;
  count += touched;
  updates.push({ file, count: touched });
  if (apply) writeFileSync(file, output);
}
const currentLinks = new Map([
  [
    "docs/mocks/2026-11-23-campaign-board/README.md",
    "docs/coordination/playtest/2026-11-23-1.md",
  ],
  [
    "docs/mocks/2026-11-24-journal/README.md",
    "docs/coordination/grading/2026-11-24-page-1-verbatim.md",
  ],
]);
const coordination = git([
  "rev-parse",
  "origin/claude/cto-playtest-nov23",
]).trim();
for (const [file, target] of currentLinks) {
  if (!exists(file) || exists(target)) continue;
  if (!git(["ls-tree", "--name-only", coordination, "--", target]).trim())
    throw new Error("Missing coordination record: " + target);
  const before = readFileSync(file, "utf8");
  const after = before.replaceAll(
    `\`${target}\``,
    `[${target}](https://github.com/lamontaes/Political-Game-Git/blob/${coordination}/${target})`,
  );
  if (after === before) continue;
  if (apply) writeFileSync(file, after);
  count++;
  updates.push({ file, count: 1 });
}

const commentFile = "src/director/reply-set-check.ts";
const directorData = "src/director/data/director.json";
if (exists(commentFile) && exists(directorData)) {
  const before = readFileSync(commentFile, "utf8");
  const after = before.replace(
    /^\s*\/\*\*.*\(data\/director\.json\).*\*\/$/m,
    (comment) => comment.replace("(data/director.json)", `(${directorData})`),
  );
  if (after !== before) {
    if (apply) writeFileSync(commentFile, after);
    count++;
    updates.push({ file: commentFile, count: 1 });
  }
}
if (apply) {
  const file = "tests/guards/current-pointers-baseline.json";
  const baseline = JSON.parse(readFileSync(file, "utf8"));
  const now = deadPointers();
  for (const area of Object.keys(baseline.areas)) {
    const next = Math.min(baseline.areas[area], now[area]?.length ?? 0);
    if (next) baseline.areas[area] = next;
    else delete baseline.areas[area];
  }
  baseline.total = Object.values(baseline.areas).reduce(
    (sum, n) => Number(sum) + Number(n),
    0,
  );
  writeFileSync(file, JSON.stringify(baseline, null, 2) + "\n");
}
console.log(JSON.stringify({ count, updates, unchanged }, null, 2));
