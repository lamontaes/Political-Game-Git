---
id: tests-source-ref-missing-module-red
title: "scripts/content/source-ref.test.mjs fails on main: it imports desktop/private-controller/private-update.mjs, which is not in the repository"
area: release
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4686
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The test `scripts/content/source-ref.test.mjs` fails on main because it imports `desktop/private-controller/private-update.mjs`, which is not in the repository. Either the module was removed and the test still names it, or it was never committed. Make the test import only what the repository holds, deleting the dead reference in the same change, so the suite passes without a stand-in file.

**Rules.** Replace, never layer: delete the dead import and any case that exists only for it; do not create an empty module to satisfy it. Never permanently delete what other code reads: search for readers first.

**Done when.** The test `scripts/content/source-ref.test.mjs` passes on main with no import of a missing file, shown by the changed-file checks named at the top of the pull request and by a search that finds no other reader of the missing path.

**Files.** scripts/content/source-ref.test.mjs, scripts/content/source-ref.mjs

**Notes.** Body repaired from the item's title and its pull request on 2026-10-16.

Sent back 2026-10-16 from PR #4686 (branch claude/source-ref-dead): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
