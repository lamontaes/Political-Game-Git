import { execFileSync } from "child_process";

/**
 * The Packet 26 ownership boundary, as reusable machinery.
 *
 * The rules live here rather than inside the test that applies them so a second
 * suite can drive the same code against synthetic, CI-shaped histories. A
 * boundary check whose failure path is never exercised is a boundary check
 * nobody should trust.
 */

/**
 * `main` at the point this branch was cut.
 *
 * It used to be PR #63's head, because the graphics work began as the third
 * commit of a stack. The convergence branches replaced that stack with one
 * branch off `main`, and leaving the old value here measured the boundary
 * against a commit that is not an ancestor of this branch at all: the check
 * either errored or reported a diff nobody should trust. Measuring from `main`
 * covers the whole graphics change rather than the top slice of it — a strictly
 * wider measurement, over an unchanged FORBIDDEN list.
 *
 * It moves again when `main` moves under this branch. PR #60 merged and this
 * branch took its work in, so measuring from the old `main` counted #60's
 * accepted files — `PlayerGame.tsx`, the conversation and legislation
 * surfaces — as changes made here. They are not: they arrived from `main`
 * whole and unedited. The boundary asks what THIS branch adds to the `main`
 * it sits on, so the base is the `main` it sits on.
 */
export const BASE_COMMIT = "b986fbe229ea714e2940438acebfe3c4bfc5f986";

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
 * the deterministic-validation checkout. `PATCH_NOTES.md` is here because
 * Packet 50 asks this branch to describe what it changed for a player. No other
 * in-flight branch owns CI configuration or the player-facing changelog, so
 * widening this allowlist does not relax FORBIDDEN, which is what actually
 * guards other people's systems.
 */
export const ALLOWED =
  /^(\.github\/workflows\/|src\/authoring\/|src\/environment\/|src\/presentation\/|src\/ui\/|src\/player\/player\.css|src\/player\/OfficeScene\.tsx|src\/player\/ModularCharacter\.tsx|src\/player\/useRasterTier\.ts|src\/App\.tsx|scripts\/art-asset-factory\/|tests\/|art\/|docs\/|package\.json|package-lock\.json|AGENTS\.md|PATCH_NOTES\.md)/;

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
