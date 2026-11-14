---
id: tests-election-day-browser-check-files-before-a-race-is-open
title: "The election-day browser check files on the first day of a new life, when no race is open for filing"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F6 while carrying #8815 (Nov 14)
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** `node --import tsx src/bench/election-day.browser.mjs` ends "no race the player could enter" on every seed tried: f6-eday-1 to f6-eday-5 (EDAY_SEED), six drawn places each, 30 places in all. Seen: the election-day browser check, run on a fresh bench.

**Cause.** Found in code: `src/bench/election-day.browser.mjs` (lines 40 to 77) makes a new life and, on that first day, posts `/api/file` for each contest the government route lists, expecting `petitioning` or `on-ballot`. A race can be filed for only inside its filing window, and at the opening day of these worlds no window is open, so every post is refused and `filed` stays null. The polling check (`src/bench/polling.browser.mjs`) gets past this by running the world to the filing window first with dev mode's run-until (`devRunUntilMayFile` in `src/bench/dev-setup.mjs`) and filing through Travel's filing office; this script never does.

**Fix.** After the new life, run `devRunUntilMayFile` (as polling does), file at Travel's filing office or through the route inside the window, and pin the place and seed in the file as polling does (a place whose race files straight onto the ballot, not by petition), so it cannot go red by draw. Then run it and keep its ballot and returns pictures.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: the check names its pinned place and seed in the file. Replace, never layer: the first-day filing loop is deleted, not left beside the new one.

**Done when.** A second session runs `node --import tsx src/bench/election-day.browser.mjs` on a fresh bench and sees it file inside the window, reach election day, vote, and end with the returns picture, on the pinned place and seed named in the file.

**Waits on.** The stuck-clock fix (`play-clock-refuses-to-cross-a-stop-nothing-shows`, #9131), because the check runs the world far ahead with dev mode.

**Files.** src/bench/election-day.browser.mjs, src/bench/dev-setup.mjs
