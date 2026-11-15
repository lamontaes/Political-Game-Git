---
id: release-repository-job-changed-files-on-one-command-line
title: "The repository job's prettier and eslint steps fail on a pull request whose diff against main is the whole Train"
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
source: reported on #9487 by its builder (Nov 15)
claimed-at:
checked:
---

**What.** The `repository` job of CI stops on a pull request built on the Train: it prints "Checking 2599 changed file(s)." and ends with exit 249 before prettier says anything. On a diff of 2,373 files the same step ran and failed only on prettier. Every Train-based pull request fails the `validate` aggregate on it. Seen: run 43707272107, job 132795149395 on #9487.

**Cause.** Found in code: `.github/workflows/validate.yml` lines 92 to 100. The step reads every changed path into one array and gives all of them to one `npx prettier --check --ignore-unknown "${changed[@]}"` and then to one `npx eslint --no-warn-ignored "${code[@]}"`. The Train's diff against main is about 2,600 paths and 138,445 bytes (measured with `git diff --name-only --diff-filter=AMR $(git merge-base HEAD origin/main) HEAD | wc -lc`), so the one command line is as long as the whole list. The exit code and the missing output are not read from the job's log beyond that, so this is the likely cause and not proven: a smaller list ran at 2,373.

**Fix.** In `.github/workflows/validate.yml` lines 97 and 100, give each tool the list in batches and keep the step failing if any batch fails: `printf '%s\n' "${changed[@]}" | xargs -r -d '\n' -n 400 npx prettier --check --ignore-unknown`, and the same with `"${code[@]}"` and `npx eslint --no-warn-ignored`. `-r` keeps an empty list from running the tool on the whole tree, and `xargs` exits 123 when any batch fails, which fails the step under the step's `set -euo pipefail`. The same files get the same checks; nothing is skipped. The player sees nothing change.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** Replace, never layer: the one long command line is replaced by the batched one in the same lines. The workflow is CI itself, so the owner says yes to the change first (Account lead's ruling of Nov 15): it is held until he does.

**Done when.** A second session, on a pull request built on the Train, sees the repository job's prettier and eslint steps run all the changed files and pass, and sees the same step go red on a branch with one deliberately mis-formatted file, and plays one new life at a drawn place from all 56, named in the PR, to see nothing about the game moved. Seen: the repository job is green on a Train-based pull request.

**Waits on.** The owner's yes to a change to the CI workflow.

**Files.** .github/workflows/validate.yml

**Notes.** Done on the Train (owner, Nov 15 17:20Z: "Yes, the train can."): lines 97 and 100 of validate.yml now give prettier and eslint the list in batches of 400, and a failing batch still fails the step. Nothing else in the workflow changed.
