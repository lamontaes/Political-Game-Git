---
id: release-spelling-labelled-stopgaps
title: "Historical American English spelling defect in stopgaps.json"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #4645
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The American English sweep (`tests/american-english-sweep.test.ts`) fails on main because `src/core2/data/stopgaps.json` line 4188 says `labelled`, which the sweep flags. Change the word to "labeled" in that line's text, keeping the persisted identifiers unchanged, so the sweep passes without weakening it. `npm run spelling` lists what the sweep would flag.

**Rules.** American English everywhere (owner), enforced by the sweep; persisted identifiers keep their spelling. Replace, never layer: change the word, add no exception to the sweep.

**Done when.** The test `tests/american-english-sweep.test.ts` passes on main with the word changed in `stopgaps.json`, and `npm run spelling` lists no stopgaps.json line, shown by the changed-file checks named at the top of the pull request.

**Files.** src/core2/data/stopgaps.json, tests/american-english-sweep.test.ts

**Notes.** Body repaired from the item's title and its pull request on 2026-10-16.

Sent back 2026-10-16 from PR #4645 (branch claude/spelling-labeled): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4745 (branch claude/spelling-label): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
