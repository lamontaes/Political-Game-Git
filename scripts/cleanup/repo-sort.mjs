#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, matchesGlob } from "node:path";

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const destination = "docs/coordination/refactor/repo-sort.json";
const input = process.argv[2] ?? "dist/shipped-files.json";
const { files: bundled } = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(bundled) || !bundled.includes("src/bench/play.html"))
  throw new Error("Expected a shipping manifest from the actual game build");
const apiInput = process.argv[3] ?? "test-results/play-api-shipped-files.json";
const { files: apiFiles } = JSON.parse(readFileSync(apiInput, "utf8"));
if (!Array.isArray(apiFiles) || !apiFiles.includes("src/bench/handler.ts"))
  throw new Error(
    "Expected a shipping manifest from the actual desktop Play API build",
  );
const ship = new Set([...bundled, ...apiFiles]);
const indexed = readFileSync(
  ".claude/skills/story-writer/references/his-words.md",
  "utf8",
);
const ownerPaths = [
  ...indexed.matchAll(/`((?:docs|data|\.claude)\/[^\s`]+)`/g),
].map((m) => m[1]);
const current = JSON.parse(readFileSync("docs/current.json", "utf8"));
const protectedPaths = new Set([
  ...current.current.map((row) => row.path),
  ...current.records,
  ...ownerPaths,
  "docs/design/",
  "docs/play-first/LAW.md",
  "docs/play-first/ORDER.md",
  "data/source/",
  "data/research/",
]);
const ownerText = new Set();
try {
  for (const file of git(
    "grep",
    "-Iilz",
    "-E",
    '(the owner.{0,60}["“]|owner.{0,30}(said|ruled|ruling|verdict)|Lamontae.{0,35}(said|ruled|wrote|:)|^>.*(owner|Lamontae)|word.for.word)',
    "--",
    "docs",
  ).split("\0"))
    ownerText.add(file);
} catch (error) {
  if (error.status !== 1) throw error;
}
const protectedFile = (file) =>
  ownerText.has(file) ||
  [...protectedPaths].some(
    (p) =>
      file === p ||
      (p.endsWith("/") && file.startsWith(p)) ||
      (p.includes("*") && matchesGlob(file, p)),
  );
const isImage = /\.(?:png|jpe?g|gif|webp|heic|bmp|tiff?|avif)$/i;
const proofTree =
  /^docs\/(?:play-first\/(?:shots[^/]*|screens)|reports|seen|lanes\/proof|archive|codex)(?:\/|$)/;
const oldDocs = /^docs\/(?:reports|lanes|codex|archive)(?:\/|$)/;
const dev =
  /^(?:(?:src|scripts|tests|art|data|tooling|desktop|deployment)\/|(?:vite\.config\.ts|tsconfig(?:\.[^.]+)?\.json|package(?:-lock)?\.json|eslint\.config\.js|\.gitattributes|\.gitignore|\.prettierignore)$)/;
const documentedShell = /^desktop\/(?:build\/|[^/]+\.(?:mjs|d\.mts|json)$)/;
const files = [
  ...new Set([
    ...git("ls-files", "-z").split("\0").filter(Boolean),
    destination,
  ]),
].sort();
const sorted = {
  ships: [],
  buildsOrTestsGame: [],
  runsCrew: [],
  neither: [],
};
for (const file of files) {
  const category =
    ship.has(file) ||
    documentedShell.test(file) ||
    file.startsWith("deployment/sites-worker/")
      ? "ships"
      : dev.test(file)
        ? "buildsOrTestsGame"
        : protectedFile(file)
          ? "runsCrew"
          : (proofTree.test(file) && isImage.test(file)) ||
              (oldDocs.test(file) && !isImage.test(file)) ||
              /^calendar-(?:day|today|holidays-hidden)\.png$/.test(file)
            ? "neither"
            : "runsCrew";
  sorted[category].push(file);
}
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(sorted, null, 2) + "\n");
for (const [category, paths] of Object.entries(sorted))
  console.log(`${category}: ${paths.length}`);
