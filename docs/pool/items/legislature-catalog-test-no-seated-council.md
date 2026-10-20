---
id: legislature-catalog-test-no-seated-council
title: "legislature.test.ts catalog test finds no town with a seated council on some seeds, on main too"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/political-game-pool-udtiwn
pr: #5217
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:22:35.834Z
---

**What.** The test "the bill paper's catalog" in src/core2/legislature.test.ts throws "no town with a seated council (catalog, seed ...)" on some seeds before it checks anything. With GOLDEN_PATH_SEED=7520680f30601752a6e7d0aaa6d0069bb0438cd8ba1fa6c48456d5e6c2e12296 it fails identically on main's code and on the budget-season branch, so it is not new. The helper tries a fixed number of drawn towns and gives up when none has three seated council members with people behind them. Find out why none of the drawn towns qualifies on that seed (towns of one seat, councils filled by husks, or too few attempts) and make the draw reach a qualifying town.

**Rules.** One rule, all 56 places: the draw covers every place and names place and seed, and no place is named in the test's logic. The failure must not be hidden by loosening what the test checks. This is a test-drawing fix and changes no game rule.

**Done when.** With GOLDEN_PATH_SEED=7520680f30601752a6e7d0aaa6d0069bb0438cd8ba1fa6c48456d5e6c2e12296 the test "the bill paper's catalog" in src/core2/legislature.test.ts passes, and on five other random seeds named in the PR body it passes or fails only on its own checks, with the drawn place and the seed in the message.

**Files.** src/core2/legislature.test.ts

**Notes.** Found by the session on PR #5217 (Oct 20): the same seed fails on origin/main's src/core2, so the budget-season branch did not cause it.
