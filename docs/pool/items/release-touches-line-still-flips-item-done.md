---
id: release-touches-line-still-flips-item-done
title: "A PR whose line 1 says \"Touches pool item:\" still flips its item to done when the item's pr field names the PR"
area: release
lead: cto
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/touches-line
pr: #6359
blocked-on:
source: laws-and-effects lead, Oct 27 (#6289)
claimed-at: 2026-10-27T17:05:47.102Z
---

**What.** A merger sent #6289 back so its item would not be marked done on merge, and the fix it asked for was changing line 1 to `Touches pool item: laws-in-force-every-question`. The bot still set the item done at 15:42 (commit bfaaa38af1). `idFromBody` in `scripts/pool/done-on-merge.ts` finds no id on a "Touches" line, but `itemForMergedPr` then falls back to the item whose `pr:` field names the PR with status in-pr, and flips that one. So a "Touches" line protects an item only if someone also clears its `pr:` field before the merge, which nobody does.

**Rules.** A PR body's first line decides: `Pool item: <id>` or a bare id flips that item; a line starting "Touches" flips nothing, and the `pr:` fallback is not used for it. Keep the fallback for bodies with no first-line id at all.

**Done when.** A unit test in `scripts/pool/done-on-merge.test.ts` shows a body whose first line is `Touches pool item: <id>`, with that item in-pr and pointing at the PR, flips nothing, while a body with `Pool item: <id>` and an empty body with the `pr:` fallback still flip their item; the merger skill's send-back wording matches.

**Time box.** 1 hour.

**Files.** scripts/pool/done-on-merge.ts, scripts/pool/done-on-merge.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. The item `laws-in-force-every-question` was reopened by hand afterwards.
