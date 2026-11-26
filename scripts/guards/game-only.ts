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

export function gameOnlyFindings(file: string, read: () => string): string[] {
  if (!gamePath.test(file)) return [];
  if (testPath.test(file))
    return [`${file}: test belongs outside the game tree`];
  if (notePath.test(file))
    return [`${file}: documentation belongs outside the game tree`];
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
    .map(([offset]) => {
      const line = contents.slice(0, offset).split("\n").length;
      return `${file}:${line}: dated note or attribution belongs outside game code`;
    });
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
  for (const finding of checkGameOnly()) {
    console.error(finding);
    process.exitCode = 1;
  }
}
