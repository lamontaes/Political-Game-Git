import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { CHANGES_DIR, parseDeclaration } from "./declarations";
import { consumedIds, parseLedger } from "./ledger";

export const ROLLOUT_PATH = join("docs", "release", "rollout.json");

export type DeclarationComparisonMode = "pr" | "push";

export interface DeclarationComparison {
  readonly base: string;
  readonly head: string;
  readonly mode: DeclarationComparisonMode;
}

export interface DeclarationTransitionResult {
  readonly baseCommit: string;
  readonly headCommit: string;
  readonly comparisonBase: string;
  readonly legacyExempt: boolean;
  readonly eligiblePaths: readonly string[];
  readonly declarationPaths: readonly string[];
  readonly problems: readonly string[];
}

interface RolloutMarker {
  readonly schemaVersion: 1;
  readonly legacyCutoffCommit: string;
}

function git(root: string, args: readonly string[]): string {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    const detail = stderr?.toString().trim();
    throw new Error(
      `Could not run 'git ${args.join(" ")}'${detail ? `: ${detail}` : "."}`,
    );
  }
}

function resolveCommit(root: string, revision: string): string {
  if (revision === "" || /^0+$/.test(revision)) {
    throw new Error(
      `Declaration comparison revision '${revision}' is invalid.`,
    );
  }
  return git(root, ["rev-parse", "--verify", `${revision}^{commit}`]);
}

function isAncestor(
  root: string,
  ancestor: string,
  descendant: string,
): boolean {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    { cwd: root, stdio: "ignore" },
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(
    `Could not prove whether ${ancestor} is an ancestor of ${descendant}.`,
  );
}

function changedPaths(root: string, from: string, to: string): string[] {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "-z", from, to, "--"],
    { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] },
  );
  return output
    .toString("utf8")
    .split("\0")
    .filter((path) => path !== "")
    .sort();
}

function gitFile(root: string, revision: string, path: string): string | null {
  const result = spawnSync("git", ["show", `${revision}:${path}`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout : null;
}

function parseMarker(text: string, where: string): RolloutMarker {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${where}: cannot parse rollout marker (${(error as Error).message}).`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${where}: must be a JSON object.`);
  }
  const marker = parsed as Record<string, unknown>;
  if (
    marker.schemaVersion !== 1 ||
    typeof marker.legacyCutoffCommit !== "string" ||
    !/^[0-9a-f]{40}$/.test(marker.legacyCutoffCommit)
  ) {
    throw new Error(
      `${where}: needs schemaVersion 1 and a 40-character legacyCutoffCommit.`,
    );
  }
  return marker as unknown as RolloutMarker;
}

function markerForComparison(
  root: string,
  comparisonBase: string,
  head: string,
): { readonly marker: RolloutMarker; readonly problems: readonly string[] } {
  const baseText = gitFile(root, comparisonBase, ROLLOUT_PATH);
  const headText = gitFile(root, head, ROLLOUT_PATH);

  if (baseText !== null) {
    const marker = parseMarker(
      baseText,
      `${ROLLOUT_PATH} at comparison base ${comparisonBase}`,
    );
    const problems =
      headText === baseText
        ? []
        : [
            `${ROLLOUT_PATH}: the rollout marker must remain byte-for-byte unchanged after rollout.`,
          ];
    return { marker, problems };
  }

  // Bootstrap only: the rollout change itself has no trusted marker in its
  // comparison base. Prefer the compared head, while the working-tree fallback
  // lets current trusted tooling inspect a historical branch that predates the
  // marker. Every post-rollout comparison instead takes the immutable marker
  // from its base above, so a branch cannot rewrite its own exemption cutoff.
  let bootstrapText = headText;
  if (bootstrapText === null) {
    try {
      bootstrapText = readFileSync(join(root, ROLLOUT_PATH), "utf8");
    } catch (error) {
      throw new Error(
        `${ROLLOUT_PATH}: cannot read rollout marker (${(error as Error).message}).`,
      );
    }
  }
  return {
    marker: parseMarker(bootstrapText, `${ROLLOUT_PATH} bootstrap marker`),
    problems: [],
  };
}

function isDeclarationPath(path: string): boolean {
  if (!path.startsWith(`${CHANGES_DIR}/`) || !path.endsWith(".md")) {
    return false;
  }
  return basename(path) !== "README.md";
}

function pushBranchPoint(
  root: string,
  base: string,
  head: string,
): string | null {
  const commits = git(root, [
    "rev-list",
    "--first-parent",
    "--reverse",
    `${base}..${head}`,
  ])
    .split("\n")
    .filter((commit) => commit !== "");
  if (commits.length !== 1 || commits[0] !== head) return null;
  const parents = git(root, ["show", "-s", "--format=%P", head])
    .split(" ")
    .filter((parent) => parent !== "");
  if (parents.length < 2 || parents[0] !== base) return null;
  const branchPoints = parents
    .slice(1)
    .map((parent) => git(root, ["merge-base", base, parent]));
  return branchPoints.every((point) => point === branchPoints[0])
    ? (branchPoints[0] ?? null)
    : null;
}

/**
 * Enforce the declaration convention only for work demonstrably created after
 * rollout. A branch whose merge-base is at or before the recorded cutoff keeps
 * the promised legacy exemption; an unresolved comparison never gets one.
 */
export function checkDeclarationTransition(
  root: string,
  comparison: DeclarationComparison,
): DeclarationTransitionResult {
  const base = resolveCommit(root, comparison.base);
  const head = resolveCommit(root, comparison.head);

  let comparisonBase: string;
  let branchPoint: string | null;
  if (comparison.mode === "pr") {
    comparisonBase = git(root, ["merge-base", base, head]);
    branchPoint = comparisonBase;
  } else {
    if (!isAncestor(root, base, head)) {
      throw new Error(
        `Declaration push comparison requires base ${base} to be an ancestor of head ${head}.`,
      );
    }
    comparisonBase = base;
    branchPoint = pushBranchPoint(root, base, head);
  }

  const markerResult = markerForComparison(root, comparisonBase, head);
  const cutoff = resolveCommit(root, markerResult.marker.legacyCutoffCommit);

  let legacyExempt = false;
  if (branchPoint !== null) {
    const pointBeforeCutoff = isAncestor(root, branchPoint, cutoff);
    const cutoffBeforePoint = isAncestor(root, cutoff, branchPoint);
    if (!pointBeforeCutoff && !cutoffBeforePoint) {
      throw new Error(
        `Cannot relate compared branch point ${branchPoint} to rollout cutoff ${cutoff}; refusing an unproven legacy exemption.`,
      );
    }
    legacyExempt = pointBeforeCutoff;
  }

  const paths = changedPaths(root, comparisonBase, head);
  const eligiblePaths = paths.filter((path) => !isDeclarationPath(path));
  const declarationPaths = paths.filter(
    (path) => isDeclarationPath(path) && gitFile(root, head, path) !== null,
  );
  const problems: string[] = [...markerResult.problems];

  if (
    !legacyExempt &&
    eligiblePaths.length > 0 &&
    declarationPaths.length === 0
  ) {
    problems.push(
      `Post-rollout eligible change ${comparisonBase}..${head} modifies ` +
        `${eligiblePaths.length} non-declaration path(s) but adds or changes no declaration in ${CHANGES_DIR}. ` +
        `Declare impact: patch, minor, or explicit none.`,
    );
  }

  let priorConsumed = new Set<string>();
  const ledgerText = gitFile(
    root,
    comparisonBase,
    join("docs", "release", "consumed-changes.json"),
  );
  if (ledgerText !== null) {
    priorConsumed = consumedIds(
      parseLedger(
        ledgerText,
        "docs/release/consumed-changes.json at comparison base",
      ),
    );
  }
  const seen = new Map<string, string>();
  for (const path of declarationPaths) {
    const text = gitFile(root, head, path);
    if (text === null) continue;
    try {
      const id = basename(path, ".md");
      const declaration = parseDeclaration(text, path, id);
      const previous = seen.get(declaration.id);
      if (previous !== undefined) {
        problems.push(
          `${path}: id '${declaration.id}' is also declared by ${previous}.`,
        );
      } else {
        seen.set(declaration.id, path);
      }
      if (priorConsumed.has(declaration.id)) {
        problems.push(
          `${path}: change id '${declaration.id}' was already consumed before this change range.`,
        );
      }
    } catch (error) {
      problems.push((error as Error).message);
    }
  }

  return {
    baseCommit: base,
    headCommit: head,
    comparisonBase,
    legacyExempt,
    eligiblePaths,
    declarationPaths,
    problems,
  };
}
