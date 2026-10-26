---
id: release-pr-5235-not-on-main
title: "PR #5235 never reached main: its branch merged into a stacked parent branch"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/pr-5235-reland
pr: #5348
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:53:45.335Z
---

**What.** PR #5235 (words-archive-law-budget-ledes) merged into its parent branch claude/words-past-archive-news, not into main, so its archived law lede change stayed off main while the pool item was marked done. The fix is to open a PR from that branch tip (54b5d4c or newer) to main, merge it, and set words-archive-law-budget-ledes back to in-pr until it lands, then done with the new PR number. The build reads main, so until this lands players do not see archived laws worded in the news.

**Rules.** Wire to the world: a change counts only when it is on main where the build reads it, and this item is that rule applied to a merge that landed on a branch and never reached main.

**Done when.** git log origin/main --oneline | grep -i archive-law-budget-ledes shows the merge of the new PR, and npm test -- src/bench/archive-words.test.ts passes on main; the item words-archive-law-budget-ledes then shows done with the new PR number, and the archived lede test is the test that proves it.

**Files.** src/bench/archive-words.ts, src/bench/archive-words.test.ts, data/english/parts/news.json, docs/release/changes/words-archive-law-ledes.md

**Notes.** Found Oct 19. Carried by the new PR (its number is in the item once opened). The parent branch is 54b5d4c; its diff against main is only the four files listed.

Oct 20: PR #5348 merged to main and carried the #5235 branch tip with it.
