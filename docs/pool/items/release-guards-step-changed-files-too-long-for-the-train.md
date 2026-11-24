---
id: release-guards-step-changed-files-too-long-for-the-train
title: "The guards step of CI fails with 'Argument list too long' when a pull request's diff against main is the whole Train"
area: release
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: account
model: sonnet
effort: medium
root: none
source: reported on #9462, #9463, #9482 and #9433 by their builders (Nov 15)
claimed-at:
checked:
---

**What.** CI on every pull request against the Train branch fails the guards step with exit 249 and "Argument list too long", though none of those pull requests changed anything that step reads. The same step will be red on the Train's own pull request, #9052, when it goes to the CTO. Seen: the failed guards step on #9462, #9463, #9482 and #9433.

**Cause.** Found in code: `.github/workflows/validate.yml` line 154 runs `CHANGED_FILES="$(git diff --name-only --diff-filter=AMR "$base" HEAD)" npm run guards`. The list goes in as one environment variable and every guard is started as a child process of it. A Linux process refuses a single environment string over 131,072 bytes, and the Train's diff against main is 2,605 paths and 138,445 bytes (measured at 3d648a25 with `git diff --name-only --diff-filter=AMR $(git merge-base HEAD origin/main) HEAD | wc -lc`). The one reader of the list is `scripts/pool/index.ts` line 1569, which keeps only paths under `docs/pool/items/` for the pool's writing checks, as the comment in `scripts/guards/index.ts` line 16 says.

**Fix.** In `.github/workflows/validate.yml` line 154, pass only what the reader keeps: add the path filter `-- docs/pool/items/` to the `git diff`. The list is then a few hundred bytes, no guard reads a path outside the pool's items, and the only change is how the list is passed. The player sees nothing change.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** Replace, never layer: the whole-diff list is replaced by the filtered one in the same line, and no second list is kept beside it.

**Done when.** A second session, on the Train's own pull request, sees the guards step pass and the pool's writing checks still name an item changed in that pull request (change one item's What on a draw branch and see the check read it), and plays one new life at a drawn place from all 56, named in the PR, to see nothing about the game moved. Seen: the guards step is green on the Train's own pull request.

**Waits on.** Nothing.

**Files.** .github/workflows/validate.yml
