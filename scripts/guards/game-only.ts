/**
 * The game folder holds only the game. A test file, or a file that exists
 * only to run tests, belongs under tests/, never under src/, public/ or art/.
 *
 *   node --import tsx scripts/guards/game-only.ts            check the tree
 *   node --import tsx scripts/guards/game-only.ts --ref <c>  check a commit
 *
 * A file in the game tree is refused when its name says it is a test (.test,
 * .spec, .browser, .node-test), when it sits in a test folder, or when it
 * imports a test runner (vitest, node:test).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GAME_ROOTS = /^(?:src|public|art)\//;
const TEST_NAME = /\.(?:test|spec|browser|node-test)\.[cm]?[jt]sx?$/;
const TEST_FOLDER = /(?:^|\/)(?:__tests__|__snapshots__)\//;
const CODE = /\.[cm]?[jt]sx?$/;
const RUNNER_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\(\s*)["'](?:vitest|node:test)["']/;

export type Finding = { file: string; reason: string };

/** What is wrong with one file of the game tree, or null. `read` is only called for code files. */
export function gameOnlyFinding(
  file: string,
  read: () => string,
): Finding | null {
  if (!GAME_ROOTS.test(file)) return null;
  if (TEST_NAME.test(file))
    return { file, reason: "a test file belongs under tests/" };
  if (TEST_FOLDER.test(file))
    return { file, reason: "a test folder belongs under tests/" };
  if (CODE.test(file) && RUNNER_IMPORT.test(read()))
    return {
      file,
      reason: "imports a test runner, so it belongs under tests/support",
    };
  return null;
}

function gitText(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

/** Every finding in the working tree's tracked files, or in a commit's tree. */
export function gameOnlyFindings(
  root = process.cwd(),
  ref?: string,
): Finding[] {
  const listing = ref
    ? gitText(root, [
        "ls-tree",
        "-r",
        "-z",
        "--name-only",
        ref,
        "--",
        "src",
        "public",
        "art",
      ])
    : gitText(root, ["ls-files", "-z", "--", "src", "public", "art"]);
  return listing
    .split("\0")
    .filter(Boolean)
    .flatMap((file) => {
      const finding = gameOnlyFinding(file, () =>
        ref
          ? gitText(root, ["show", `${ref}:${file}`])
          : readFileSync(path.join(root, file), "utf8"),
      );
      return finding ? [finding] : [];
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const at = process.argv.indexOf("--ref");
  const ref = at === -1 ? undefined : process.argv[at + 1];
  if (at !== -1 && !ref) throw new Error("--ref needs a commit");
  const findings = gameOnlyFindings(process.cwd(), ref);
  for (const { file, reason } of findings) console.error(`${file}: ${reason}`);
  console.log(
    `game-only: ${findings.length} file(s) in src, public and art that are not game code.`,
  );
  process.exitCode = findings.length ? 1 : 0;
}
