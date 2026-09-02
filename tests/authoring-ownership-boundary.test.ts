import { execFileSync } from "child_process";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The Packet 26 ownership boundary, as an executable check.
 *
 * This work stacks on PR #63 and is confined to graphics, art, scene-authoring,
 * tooling and data-contract surfaces. Several neighbouring systems are owned by
 * other in-flight branches, and touching them here would create exactly the
 * overlap that makes a stack painful to land.
 *
 * A prose promise not to touch those files is worth very little on a branch
 * this size, so the promise is a test. It compares the working tree against the
 * declared base and fails naming any forbidden path that moved.
 *
 * If the base commit is not in this clone — a shallow CI checkout, say — the
 * check reports that rather than passing quietly, because a boundary check that
 * silently no-ops is worse than none.
 */

/** PR #63 head: the exact commit this branch was cut from. */
const BASE_COMMIT = "1a6e5f089c92db623b979bd47c8ded6a9b75b6aa";

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/**
 * Paths this packet must not modify.
 *
 * Each entry names the system that owns it, so a future failure explains
 * itself instead of just listing a path.
 */
const FORBIDDEN: readonly {
  readonly pattern: RegExp;
  readonly owner: string;
}[] = [
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

function changedFiles(): readonly string[] | null {
  try {
    execFileSync("git", ["cat-file", "-e", `${BASE_COMMIT}^{commit}`], {
      cwd: REPOSITORY_ROOT,
      stdio: "ignore",
    });
  } catch {
    return null;
  }
  const output = execFileSync(
    "git",
    ["diff", "--name-only", BASE_COMMIT, "--"],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  );
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("Packet 26 ownership boundary", () => {
  const files = changedFiles();

  it("can see the base commit it is measuring against", () => {
    expect(
      files,
      `Base commit ${BASE_COMMIT} is not in this clone, so the ownership boundary could not be checked. Fetch it before trusting this suite.`,
    ).not.toBeNull();
  });

  it("changes nothing owned by player, save, legislation or name systems", () => {
    if (files === null) return;
    const violations = files.flatMap((file) => {
      const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
      return owner ? [`${file} — owned by ${owner.owner}`] : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps its changes inside the surfaces this packet owns", () => {
    if (files === null) return;
    const allowed =
      /^(src\/authoring\/|src\/environment\/|src\/presentation\/|src\/ui\/|src\/player\/player\.css|src\/App\.tsx|scripts\/art-asset-factory\/|tests\/|art\/|docs\/|package\.json|package-lock\.json|AGENTS\.md)/;
    const strays = files.filter((file) => !allowed.test(file));
    expect(strays).toEqual([]);
  });
});
