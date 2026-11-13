---
id: release-main-red-campaign-turn-pairs-wait-for-filing
title: "Campaign-turn's two-candidate cases file on the start date and find no race open in any of eight drawn places"
area: release
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-campaign-turn-pairs-wait
pr:
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 13 (merger codex-4629 on #8928, comment 6843205369)
---

**What.** `src/core2/campaign-turn.test.ts`, "a world candidate's turn is a campaign day taken through the player's own choices" (shared-day) and the questions case, fail on clean main 8cf594ae at GOLDEN_PATH_SEED=2203a4f9e9da5453d59cffbabf5e513e7a7d0862: all eight drawn places say "no two candidates for the first contest". At 2156a52d6c6f3a95 seven of eight places say the same. Seen: the campaign-turn cases run in a drawn place where a race is open for filing.

**Cause.** Found in code: `worldWithPair` in campaign-turn.test.ts builds each world on its start date (2026-01-05) and calls `twoCandidates`, which files for what `openContests` lists that day, but most places open their filing windows later (the nomination calendar's own dates). The file's petition case already moves the clock with `advanceToFilingOpen`, and the thirteen files of `tests-filing-fixed-date-thirteen-files` were the same defect; this file's pair cases were not in that list.

**Fix.** Test only: `worldWithPair` calls `advanceToFilingOpen` before `twoCandidates`, as the petition case does. Every assertion is unchanged.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: a test that needs a race draws, waits for its window, and names each place and seed (`drawn-place-tests`). No assertion is loosened.

**Done when.** A second session runs campaign-turn.test.ts on main at GOLDEN_PATH_SEED=2203a4f9e9da5453d59cffbabf5e513e7a7d0862 and at a fresh seed, each naming its drawn place, and the shared-day and questions cases pass.

**Waits on.** Nothing.

**Files.** src/core2/campaign-turn.test.ts
