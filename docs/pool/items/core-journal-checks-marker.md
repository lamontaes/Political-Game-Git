---
id: core-journal-checks-marker
title: "Show when the cash journal's structural checks are skipped"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/journal-checks-marker
pr: #5379
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 6 (PR #5109)"
claimed-at: 2026-10-20T01:23:27.967Z
---

**What.** PR #5109 skips the cash journal's structural re-checks in play to make a big town's year faster (448 s to 406 s). The skip is a debug switch, so a result produced in play looks the same whether the checks ran or not. Add a visible marker when the checks are skipped, and one line in the bench so a disputed result can turn them on for the same seed.

**Rules.** Ask why and the rest: a skipped check must show that it was skipped, so a disputed result can be rechecked with the checks on.

**Done when.** A played year in a drawn place (buildBenchWorld, seed named in the PR body) shows the marker while the checks are skipped. The bench line turns the checks on for the same seed, and the year then runs them.

**Files.** src/core2/journal.ts, src/core2/journal.test.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. Speed item: core-year-speed-activate-and-gc.
