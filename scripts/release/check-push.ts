import { execFileSync } from "node:child_process";

/**
 * Will the gate accept the push I am about to make?
 *
 * The hosted release job checks the PUSH range — `github.event.before..sha` —
 * not the PR range. Those disagree constantly: a branch whose PR scope has
 * carried a declaration for days still fails the moment somebody pushes a
 * commit that touches only a report, because that push's own range declares
 * nothing. This branch has now failed exactly that way twice, both times on a
 * documentation-only final commit, and both times after a PR-scope check said
 * OK.
 *
 * `release:check` can already answer the question; what was missing was a way
 * to ask it about the right range without hand-assembling two revisions. This
 * derives them: base is what the remote already has, head is what is about to
 * leave. Run it before pushing and the answer is the one the hosted job will
 * give.
 *
 * It deliberately reuses the existing checker rather than reimplementing the
 * rule. A second copy of a gate is a second thing to drift.
 */

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function main(): void {
  const branch = git("branch", "--show-current");
  if (!branch) {
    console.error("release:check-push — detached HEAD has no push range.");
    process.exitCode = 1;
    return;
  }

  let base: string;
  try {
    base = git("rev-parse", `${branch}@{upstream}`);
  } catch {
    /*
     * No upstream yet means the whole branch is the push. The hosted job uses
     * the merge-base with the default branch for a first push, and so does
     * this: guessing an empty base would declare every commit in history.
     */
    base = git("merge-base", "origin/main", "HEAD");
    console.log(
      `release:check-push — no upstream for ${branch}; using merge-base with origin/main.`,
    );
  }

  const head = git("rev-parse", "HEAD");
  if (base === head) {
    console.log("release:check-push — nothing to push.");
    return;
  }

  const changed = git("diff", "--name-only", `${base}..${head}`)
    .split("\n")
    .filter(Boolean);
  console.log(
    `release:check-push — ${base.slice(0, 8)}..${head.slice(0, 8)}, ${changed.length} path(s).`,
  );

  try {
    execFileSync(
      "node",
      [
        "--import",
        "tsx",
        "scripts/release/index.ts",
        "check",
        "--base",
        base,
        "--head",
        head,
        "--mode",
        "push",
      ],
      { stdio: "inherit" },
    );
  } catch {
    /*
     * The checker already printed the specific reason; adding the remedy is
     * the part that was missing at three in the morning.
     */
    console.error(
      "\nrelease:check-push — this push would fail the hosted gate. " +
        "Add or change a declaration in docs/release/changes (npm run release:declare -- <id>), " +
        "or fold the documentation into a commit that already carries one.",
    );
    process.exitCode = 1;
  }
}

main();
