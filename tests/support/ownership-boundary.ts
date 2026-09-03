import { execFileSync } from "child_process";

/**
 * The Packet 26 ownership boundary, as reusable machinery.
 *
 * The rules live here rather than inside the test that applies them so a second
 * suite can drive the same code against synthetic, CI-shaped histories. A
 * boundary check whose failure path is never exercised is a boundary check
 * nobody should trust.
 */

/** PR #63 head: the exact commit this branch was cut from. */
export const BASE_COMMIT = "1a6e5f089c92db623b979bd47c8ded6a9b75b6aa";

export interface OwnedSurface {
  /** Matched against a repository-relative path. */
  readonly pattern: RegExp;
  /** The system that owns it, so a failure explains itself. */
  readonly owner: string;
}

/** Paths this packet must not modify. */
export const FORBIDDEN: readonly OwnedSurface[] = [
  {
    pattern: /^src\/player\/PlayerGame/,
    owner: "PlayerGame / New Game",
  },
  {
    pattern: /^src\/persistence\//,
    owner: "saves, persistence and replay",
  },
  {
    pattern: /^src\/simulation\/life-places/,
    owner: "life-places",
  },
  {
    pattern: /^src\/simulation\/.*place-provider/,
    owner: "the national place provider",
  },
  {
    pattern: /^src\/presentation\/run-b-conversation/,
    owner: "conversations",
  },
  {
    pattern: /^src\/simulation\/legislation/,
    owner: "legislation",
  },
  {
    pattern: /^src\/simulation\/legislature-rule/,
    owner: "legislative rule packs",
  },
  {
    pattern: /^src\/simulation\/names/,
    owner: "name generation",
  },
  {
    pattern: /name-generation/,
    owner: "name generation",
  },
];

/**
 * The surfaces this packet does own.
 *
 * `.github/workflows/` is here because Packet 28 directs this branch to repair
 * the deterministic-validation checkout. No other in-flight branch owns CI
 * configuration, so widening this allowlist does not relax FORBIDDEN, which is
 * what actually guards other people's systems.
 */
export const ALLOWED =
  /^(\.github\/workflows\/|src\/authoring\/|src\/environment\/|src\/presentation\/|src\/ui\/|src\/player\/player\.css|src\/App\.tsx|scripts\/art-asset-factory\/|tests\/|art\/|docs\/|package\.json|package-lock\.json|AGENTS\.md)/;

function git(repositoryRoot: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

/** Whether `commit` is present as a commit object in this clone. */
export function hasCommit(repositoryRoot: string, commit: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Paths that differ between `baseCommit` and the current working tree.
 *
 * Returns null — rather than an empty list — when the base commit is missing,
 * so a shallow clone reports that it could not measure instead of reporting
 * that nothing moved.
 */
export function changedFilesSince(
  repositoryRoot: string,
  baseCommit: string = BASE_COMMIT,
): readonly string[] | null {
  if (!hasCommit(repositoryRoot, baseCommit)) return null;
  return git(repositoryRoot, ["diff", "--name-only", baseCommit, "--"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Changed paths owned by another branch, each labelled with its owner. */
export function ownershipViolations(
  files: readonly string[],
): readonly string[] {
  return files.flatMap((file) => {
    const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
    return owner ? [`${file} — owned by ${owner.owner}`] : [];
  });
}

/** Changed paths outside the surfaces this packet owns. */
export function straySurfaces(files: readonly string[]): readonly string[] {
  return files.filter((file) => !ALLOWED.test(file));
}
