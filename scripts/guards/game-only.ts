/** Strict game-folder inventory. Run before enabling the CI check once held files move. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const gamePath = /^(?:src|public|art)\//;
const testPath = /\.(?:test|spec|browser|node-test)\.[cm]?[jt]sx?$/i;
const notePath = /\.(?:md|markdown|mdx)$/i;
const sourcePath = /\.[cm]?[jt]sx?$/i;
const attribution =
  /\b(?:owner(?:'s)?\s*(?:[,:(]|said\b|ruled\b)|CTO\s*(?:[- ]line\b|[:#,]|ruling\b)|PR\s*#\d+|pull request\s*#\d+|(?:Co-)?Authored-by:)|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b|\b20\d{2}-\d{2}-\d{2}\b/i;

function sourceComments(file: string, contents: string): [number, string][] {
  const source = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Map<number, string>();
  const walk = (node: ts.Node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(contents, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(contents, node.end) ?? []),
    ])
      found.set(range.pos, contents.slice(range.pos, range.end));
    if (!ts.isJSDoc(node)) node.getChildren(source).forEach(walk);
  };
  walk(source);
  return [...found];
}

function findings(
  file: string,
  read: () => string,
): { key: string; message: string }[] {
  if (!gamePath.test(file)) return [];
  if (testPath.test(file))
    return [
      { key: "test", message: `${file}: test belongs outside the game tree` },
    ];
  if (notePath.test(file))
    return [
      {
        key: "note",
        message: `${file}: documentation belongs outside the game tree`,
      },
    ];
  if (!sourcePath.test(file) && !/\.(?:html|css)$/i.test(file)) return [];
  const contents = read();
  const comments: [number, string][] = sourcePath.test(file)
    ? sourceComments(file, contents)
    : [
        ...contents.matchAll(
          /\.(?:css)$/i.test(file) ? /\/\*[\s\S]*?\*\//g : /<!--[\s\S]*?-->/g,
        ),
      ].map((match) => [match.index, match[0]]);
  return comments
    .filter(([, comment]) => attribution.test(comment))
    .map(([offset, comment]) => {
      const line = contents.slice(0, offset).split("\n").length;
      return {
        key: comment,
        message: `${file}:${line}: dated note or attribution belongs outside game code`,
      };
    });
}

export function gameOnlyFindings(file: string, read: () => string): string[] {
  return findings(file, read).map((finding) => finding.message);
}

export function newGameOnlyFindings(
  file: string,
  before: string | null,
  after: () => string,
): string[] {
  const known = new Map<string, number>();
  if (before !== null)
    for (const prior of findings(file, () => before))
      known.set(prior.key, (known.get(prior.key) ?? 0) + 1);
  return findings(file, after).flatMap((current) => {
    const count = known.get(current.key) ?? 0;
    if (!count) return [current.message];
    known.set(current.key, count - 1);
    return [];
  });
}

function checkSince(root: string, base: string): string[] {
  const git = (args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  const changed = git([
    "diff",
    "--name-status",
    "-z",
    "--no-renames",
    "--diff-filter=AM",
    base,
    "HEAD",
    "--",
    "src",
    "public",
    "art",
  ])
    .split("\0")
    .filter(Boolean);
  const failures: string[] = [];
  for (let i = 0; i < changed.length; i += 2) {
    const status = changed[i],
      file = changed[i + 1]!;
    if (
      !sourcePath.test(file) &&
      !notePath.test(file) &&
      !/\.(?:html|css)$/i.test(file)
    )
      continue;
    const before = status === "A" ? null : git(["show", `${base}:${file}`]);
    failures.push(
      ...newGameOnlyFindings(file, before, () =>
        readFileSync(path.join(root, file), "utf8"),
      ),
    );
  }
  return failures;
}

export function checkGameOnly(root = process.cwd()): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "src", "public", "art"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean)
    .flatMap((file) =>
      gameOnlyFindings(file, () => readFileSync(path.join(root, file), "utf8")),
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const baseAt = process.argv.indexOf("--base");
  const base = baseAt === -1 ? undefined : process.argv[baseAt + 1];
  if (baseAt !== -1 && !base) throw new Error("--base needs a commit");
  for (const finding of base
    ? checkSince(process.cwd(), base)
    : checkGameOnly()) {
    console.error(finding);
    process.exitCode = 1;
  }
}
