---
id: release-main-red-doors-fold-wait-for-filing
title: "campaign-doors-fold's pledge case is red on main by draw: it looks for a race the player may enter on the opening day only"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-doors-fold-wait-for-filing
pr: 8919
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (found while checking #8912)
---

**What.** src/core2/campaign-doors-fold.test.ts, "a race the player filed in keeps every pledge after it closes, its rivals' too", fails on clean main at DOORS_FOLD_SEED=574d099749f56f43 with "no race the player could enter" in all 6 drawn places (San Antonio, Puerto Rico; Sanbornville, New Hampshire; Pulpotio Bareas, New Mexico; Scituate, Massachusetts; Ellicott City, Maryland; Lawai, Hawaii). A merge desk that runs it on a pull request sees a red that is not the pull request's. Guards: the check that a closed race keeps its pledges keeps running on every draw.

**Cause.** Found in code: in src/core2/campaign-doors-fold.test.ts the case reads `openContests` once, on the game's first day, and every race opens its filing on its own real day, so in most places nothing is open yet (the first trap in the drawn-place-tests skill).

**Fix.** Test only, no assertion changed: in each drawn place, wait a week at a time, up to the last filing deadline in the place's calendar, until a race the player may enter takes their filing (`fileForOffice`), and name the date reached when none did.

**Time box.** 1 hours

**Rules.** One rule, all 56 places: the case still draws from all 56 and waits in each, with no place or seed pinned. No assertion is loosened, skipped or returned early.

**Done when.** A second session runs the case on main in the drawn place each run names, at DOORS_FOLD_SEED=574d099749f56f43 and at two fresh seeds, and each passes.

**Waits on.** Nothing.

**Files.** src/core2/campaign-doors-fold.test.ts
